import path from 'path';
import { Request, Response, NextFunction } from 'express';
import Event from './event.model.js';
import Enrollment from '../course/enrollment.model.js';
import { Payment } from '../payment/payment.model.js';
import { PromoCode } from '../promoCode/promoCode.model.js';
import { deleteFile, getRelativePathFromUrl } from '../../utils/fileSystem.util.js';
import { calculateAmountWithFees, createPaymentSession } from '../../utils/kashier.service.js';
import { paginateModel } from '../../utils/pagination.util.js';

const getFileUrl = (file: Express.Multer.File) => {
  const relativePath = path.relative(path.resolve('public'), file.path).split(path.sep).join('/');
  return `/${relativePath}`;
};

const getFilesByFieldName = (req: Request, fieldName: string) => {
  const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  return files.filter((f) => f.fieldname === fieldName);
};

const getFileByFieldName = (req: Request, fieldName: string) => {
  const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  return files.find((f) => f.fieldname === fieldName);
};

const getUploadedGalleryUrls = (req: Request) =>
  getFilesByFieldName(req, 'eventGallery').map((file) => getFileUrl(file));

const getUploadedEventImageUrl = (req: Request) => {
  const file = getFileByFieldName(req, 'img');
  return file ? getFileUrl(file) : undefined;
};

const deleteGalleryImages = async (gallery: string[]) => {
  await Promise.all(
    gallery.map(async (imageUrl) => {
      const relativePath = getRelativePathFromUrl(imageUrl);

      if (!relativePath) return;

      await deleteFile(path.resolve('public', relativePath));
    })
  );
};

const availableEventFilter = { isAvailable: { $ne: false } };

const listEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
  baseFilter: Record<string, unknown> = {}
) => {
  try {
    const { search } = req.query;
    const hasPagination = Boolean(req.query.page || req.query.limit || search);
    const filter: Record<string, unknown> = { ...baseFilter };

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    if (!hasPagination) {
      const events = await Event.find(filter).sort({ date: -1 }).lean();

      const eventIds = events.map((event: any) => event._id);
      const eventEnrollmentCounts = eventIds.length > 0
        ? await Enrollment.aggregate([
            { $match: { referenceId: { $in: eventIds }, referenceModel: 'Event' } },
            { $group: { _id: '$referenceId', count: { $sum: 1 } } },
          ])
        : [];

      const countByEventId = new Map(
        eventEnrollmentCounts.map((item: any) => [String(item._id), item.count as number])
      );

      const eventsWithCounts = events.map((event: any) => ({
        ...event,
        enrollmentCount: (event.baseEnrollmentCount || 0) + (countByEventId.get(String(event._id)) || 0),
      }));

      return res.status(200).json({
        success: true,
        data: eventsWithCounts
      });
    }

    const { items: events, pagination } = await paginateModel(Event, {
      query: req.query as Record<string, unknown>,
      filter,
      sort: { date: -1 },
      defaultLimit: 10,
    });

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all events
 * @route   GET /api/events
 * @access  Public
 */
export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  return listEvents(req, res, next, availableEventFilter);
};

/**
 * @desc    Get all events for admin (including unavailable)
 * @route   GET /api/admin/events
 * @access  Private/Admin
 */
export const getAdminEvents = async (req: Request, res: Response, next: NextFunction) => {
  return listEvents(req, res, next);
};

/**
 * @desc    Get single event by ID
 * @route   GET /api/events/:id
 * @access  Public
 */
export const getEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = req.params.id;
    if (typeof eventId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(eventId);
    if (!event || event.isAvailable === false) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reserve a seat in an event — initiates Kashier payment if the event has a price
 * @route   POST /api/events/reserve
 * @access  Private/Student
 */
export const reserveEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId, additionalInfo, promoCode: promoCodeInput } = req.body;
    const { _id: studentId, name: fullName, email, phone } = (req as any).user;

    if (!studentId || !fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Your student profile is missing required contact information. Please update your account before reserving.'
      });
    }

    const event = await Event.findById(eventId);
    if (!event || event.isAvailable === false) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: 'This event is no longer accepting reservations.' });
    }

    const existing = await Enrollment.findOne({ referenceId: eventId, referenceModel: 'Event', studentId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already reserved this event.'
      });
    }

    let price = event.price || 0;

    let appliedPromoCode: string | undefined;
    if (promoCodeInput && price > 0) {
      const promo = await PromoCode.findOneAndUpdate(
        {
          code: promoCodeInput.toUpperCase(),
          isActive: true,
          $expr: { $lt: ['$currentUses', '$maxUses'] }
        },
        {},
        { returnDocument: 'after' }
      );

      if (!promo) {
        return res.status(400).json({ success: false, message: 'Invalid or expired promo code.' });
      }

      if (promo.applicableTo.type === 'specific') {
        const isApplicable = (promo.applicableTo.events ?? []).some(
          (targetEventId) => targetEventId.toString() === event._id.toString()
        );
        if (!isApplicable) {
          return res.status(400).json({ success: false, message: 'This promo code does not apply to this event.' });
        }
      }

      price = Math.round(price * (1 - promo.discountPercentage / 100));
      appliedPromoCode = promo.code;
    }

    if (!price) {
      if (appliedPromoCode) {
        await PromoCode.findOneAndUpdate(
          { code: appliedPromoCode, $expr: { $lt: ['$currentUses', '$maxUses'] } },
          { $inc: { currentUses: 1 } }
        );
      }

      const enrollment = await Enrollment.create({
        studentId,
        referenceId: eventId,
        referenceModel: 'Event',
        fullName,
        email,
        phone,
        additionalInfo,
        ...(appliedPromoCode ? { promoCode: appliedPromoCode } : {})
      });

      return res.status(201).json({
        success: true,
        message: 'Successfully reserved your event seat!',
        data: enrollment
      });
    }

    await Payment.updateMany(
      { referenceId: eventId, referenceModel: 'Event', 'customer.email': email, status: 'pending' },
      { status: 'cancelled' }
    );

    const orderId = `Event_${eventId}_${Date.now()}`;
    const amountWithFees = calculateAmountWithFees(price);

    await Payment.create({
      orderId,
      referenceId: eventId,
      referenceModel: 'Event',
      amount: price,
      status: 'pending',
      customer: { name: fullName, email, phone },
      paymentDetails: { studentId, additionalInfo, promoCode: appliedPromoCode }
    });

    const sessionResponse = await createPaymentSession({
      amount: amountWithFees,
      merchantOrderId: orderId,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone
    });

    return res.status(200).json({
      success: true,
      data: {
        requiresPayment: true,
        orderId,
        sessionUrl: sessionResponse.sessionUrl
      }
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reserved this event.'
      });
    }
    next(error);
  }
};

/**
 * @desc    Get single event by ID for admin
 * @route   GET /api/admin/events/:id
 * @access  Private/Admin
 */
export const getAdminEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Get past events
 * @route   GET /api/events/past
 * @access  Public
 */
export const getPastEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await Event.find({ status: 'past', ...availableEventFilter }).sort({ date: -1 });
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get upcoming events
 * @route   GET /api/events/upcoming
 * @access  Public
 */
export const getUpcomingEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await Event.find({ status: 'upcoming', ...availableEventFilter }).sort({ date: 1 });
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Create a new event
 * @route   POST /api/events
 * @access  Private/Admin
 */
export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  const uploadedGalleryUrls = getUploadedGalleryUrls(req);
  const uploadedEventImageUrl = getUploadedEventImageUrl(req);

  try {
    if (Array.isArray(req.body.speakers)) {
      req.body.speakers = req.body.speakers.map((speaker: any, index: number) => {
        const file = getFileByFieldName(req, `speaker_img_${index}`);
        if (file) {
          speaker.img = getFileUrl(file);
        }
        return speaker;
      });
    }

    if (Array.isArray(req.body.partners)) {
      req.body.partners = req.body.partners.map((partner: any, index: number) => {
        const file = getFileByFieldName(req, `partner_img_${index}`);
        if (file) {
          partner.img = getFileUrl(file);
        }
        return partner;
      });
    }

    const currentGallery = Array.isArray(req.body.eventGallery) ? req.body.eventGallery : [];
    const event = await Event.create({
      ...req.body,
      ...(uploadedEventImageUrl ? { img: uploadedEventImageUrl } : {}),
      eventGallery: [...currentGallery, ...uploadedGalleryUrls]
    });

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    await deleteGalleryImages([...uploadedGalleryUrls, ...(uploadedEventImageUrl ? [uploadedEventImageUrl] : [])]);
    next(error);
  }
};

/**
 * @desc    Update an event
 * @route   PATCH /api/events/:id
 * @access  Private/Admin
 */
export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  const uploadedGalleryUrls = getUploadedGalleryUrls(req);
  const uploadedEventImageUrl = getUploadedEventImageUrl(req);

  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      await deleteGalleryImages([...uploadedGalleryUrls, ...(uploadedEventImageUrl ? [uploadedEventImageUrl] : [])]);
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (Array.isArray(req.body.speakers)) {
      req.body.speakers = req.body.speakers.map((speaker: any, index: number) => {
        const file = getFileByFieldName(req, `speaker_img_${index}`);
        if (file) {
          speaker.img = getFileUrl(file);
        }
        return speaker;
      });
    }

    if (Array.isArray(req.body.partners)) {
      req.body.partners = req.body.partners.map((partner: any, index: number) => {
        const file = getFileByFieldName(req, `partner_img_${index}`);
        if (file) {
          partner.img = getFileUrl(file);
        }
        return partner;
      });
    }

    const currentGallery = Array.isArray(req.body.eventGallery) ? req.body.eventGallery : event.eventGallery;
    const nextGallery = [...currentGallery, ...uploadedGalleryUrls];
    const removedGallery = event.eventGallery.filter((image) => !nextGallery.includes(image));
    const previousEventImage = event.img || '';
    const nextEventImage = uploadedEventImageUrl ?? req.body.img;
    const removedEventImages = nextEventImage !== undefined && previousEventImage && previousEventImage !== nextEventImage && !nextGallery.includes(previousEventImage)
      ? [previousEventImage]
      : [];

    event.set({
      ...req.body,
      ...(uploadedEventImageUrl ? { img: uploadedEventImageUrl } : {}),
      eventGallery: nextGallery
    });

    await event.save();
    await deleteGalleryImages([...removedGallery, ...removedEventImages]);

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    await deleteGalleryImages([...uploadedGalleryUrls, ...(uploadedEventImageUrl ? [uploadedEventImageUrl] : [])]);
    next(error);
  }
};

/**
 * @desc    Delete an event
 * @route   DELETE /api/events/:id
 * @access  Private/Admin
 */
export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await deleteGalleryImages([...(event.eventGallery ?? []), ...(event.img ? [event.img] : [])]);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
