import path from 'path';
import { Request, Response, NextFunction } from 'express';
import Event from './event.model.js';
import { deleteFile, getRelativePathFromUrl } from '../../utils/fileSystem.util.js';

const getFileUrl = (req: Request, file: Express.Multer.File) => {
  const relativePath = path.relative(path.resolve('public'), file.path).split(path.sep).join('/');
  return `${req.protocol}://${req.get('host')}/${relativePath}`;
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
  getFilesByFieldName(req, 'eventGallery').map((file) => getFileUrl(req, file));

const deleteGalleryImages = async (gallery: string[]) => {
  await Promise.all(
    gallery.map(async (imageUrl) => {
      const relativePath = getRelativePathFromUrl(imageUrl);

      if (!relativePath) return;

      await deleteFile(path.resolve('public', relativePath));
    })
  );
};

/**
 * @desc    Get all events
 * @route   GET /api/events
 * @access  Public
 */
export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single event by ID
 * @route   GET /api/events/:id
 * @access  Public
 */
export const getEvent = async (req: Request, res: Response, next: NextFunction) => {
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
    const events = await Event.find({ status: 'past' }).sort({ date: -1 });
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
    const events = await Event.find({ status: 'upcoming' }).sort({ date: 1 });
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

  try {
    if (Array.isArray(req.body.speakers)) {
      req.body.speakers = req.body.speakers.map((speaker: any, index: number) => {
        const file = getFileByFieldName(req, `speaker_img_${index}`);
        if (file) {
          speaker.img = getFileUrl(req, file);
        }
        return speaker;
      });
    }

    const currentGallery = Array.isArray(req.body.eventGallery) ? req.body.eventGallery : [];
    const event = await Event.create({
      ...req.body,
      eventGallery: [...currentGallery, ...uploadedGalleryUrls]
    });

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    await deleteGalleryImages(uploadedGalleryUrls);
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

  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      await deleteGalleryImages(uploadedGalleryUrls);
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (Array.isArray(req.body.speakers)) {
      req.body.speakers = req.body.speakers.map((speaker: any, index: number) => {
        const file = getFileByFieldName(req, `speaker_img_${index}`);
        if (file) {
          speaker.img = getFileUrl(req, file);
        }
        return speaker;
      });
    }

    const currentGallery = Array.isArray(req.body.eventGallery) ? req.body.eventGallery : event.eventGallery;
    const nextGallery = [...currentGallery, ...uploadedGalleryUrls];
    const removedGallery = event.eventGallery.filter((image) => !nextGallery.includes(image));

    event.set({
      ...req.body,
      eventGallery: nextGallery
    });

    await event.save();
    await deleteGalleryImages(removedGallery);

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    await deleteGalleryImages(uploadedGalleryUrls);
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

    await deleteGalleryImages(event.eventGallery);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
