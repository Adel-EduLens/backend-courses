import { Request, Response, NextFunction } from 'express';
import { Course } from './course.model.js';
import { Round } from './round.model.js';
import { Lecture } from './lecture.model.js';
import Enrollment from './enrollment.model.js';
import { Payment } from '../payment/payment.model.js';
import { createPaymentSession, calculateAmountWithFees } from '../../utils/kashier.service.js';
import { paginateModel } from '../../utils/pagination.util.js';
import { PromoCode } from '../promoCode/promoCode.model.js';
import { sendBulkMessage } from '../../utils/wapilot.service.js';

const lectureDateTimeFormatter = new Intl.DateTimeFormat('en-EG', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Cairo'
});

const formatLectureStartTime = (date: Date) => lectureDateTimeFormatter.format(date);

const normalizePhoneForWapilot = (phone: string) => {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0')) return '2' + digits;
  return '20' + digits;
};

const buildLectureNotificationMessage = (
  courseTitle: string,
  roundTitle: string,
  lectureTitle: string,
  startTime: string,
  meetingUrl: string
) => `Lecture reminder: "${lectureTitle}" for ${courseTitle} (${roundTitle}) starts at ${startTime}. Meeting URL: ${meetingUrl}`;

/**
 * @desc    Get all courses (with their rounds)
 * @route   GET /api/courses
 * @access  Public
 */
export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const hasPagination = Boolean(req.query.page || req.query.limit || search);
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    if (!hasPagination) {
      const courses = await Course.find(filter).populate({ path: 'rounds', populate: { path: 'lectures' } });
      return res.status(200).json({
        success: true,
        data: courses
      });
    }

    const { items: courses, pagination } = await paginateModel(Course, {
      query: req.query as Record<string, unknown>,
      filter,
      populate: { path: 'rounds', populate: { path: 'lectures' } },
      defaultLimit: 10,
    });

    res.status(200).json({
      success: true,
      data: {
        courses,
        pagination
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single course by ID (with rounds)
 * @route   GET /api/courses/:id
 * @access  Public
 */
export const getCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findById(req.params.id).populate({ path: 'rounds', populate: { path: 'lectures' } });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Enroll in a round — initiates Kashier payment if round has a price
 * @route   POST /api/courses/enroll
 * @access  Private/Student
 */
export const enrollInRound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roundId, additionalInfo, promoCode: promoCodeInput } = req.body;
    const { _id: studentId, name: fullName, email, phone } = (req as any).user;

    if (!studentId || !fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Your student profile is missing required contact information. Please update your account before enrolling.'
      });
    }

    const round = await Round.findById(roundId).populate('course');
    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }

    if (round.status === 'completed') {
      return res.status(400).json({ success: false, message: 'This round has already completed' });
    }

    // Prevent duplicate enrollment before hitting payment
    const existing = await Enrollment.findOne({ referenceId: roundId, referenceModel: 'Round', studentId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already enrolled in this round.'
      });
    }

    const course = round.course as any;
    let price = course.price || 0;

    // Validate and apply promo code
    let appliedPromoCode: string | undefined;
    if (promoCodeInput && price > 0) {
      const promo = await PromoCode.findOneAndUpdate(
        {
          code: promoCodeInput.toUpperCase(),
          isActive: true,
          $expr: { $lt: ['$currentUses', '$maxUses'] }
        },
        {},
        { new: true }
      );

      if (!promo) {
        return res.status(400).json({ success: false, message: 'Invalid or expired promo code.' });
      }

      if (promo.applicableTo.type === 'specific') {
        const isApplicable = promo.applicableTo.courses.some(
          (cId) => cId.toString() === course._id.toString()
        );
        if (!isApplicable) {
          return res.status(400).json({ success: false, message: 'This promo code does not apply to this course.' });
        }
      }

      price = Math.round(price * (1 - promo.discountPercentage / 100));
      appliedPromoCode = promo.code;
    }

    // Free course (or promo made it free) → direct enrollment
    if (!price || price === 0) {
      if (appliedPromoCode) {
        await PromoCode.findOneAndUpdate(
          { code: appliedPromoCode, $expr: { $lt: ['$currentUses', '$maxUses'] } },
          { $inc: { currentUses: 1 } }
        );
      }
      const enrollment = await Enrollment.create({
        studentId,
        referenceId: roundId, referenceModel: 'Round', fullName, email, phone, additionalInfo,
        ...(appliedPromoCode ? { promoCode: appliedPromoCode } : {})
      });
      return res.status(201).json({
        success: true,
        message: 'Successfully enrolled in the round!',
        data: enrollment
      });
    }

    // Paid course → initiate Kashier payment
    await Payment.updateMany(
      { referenceId: roundId, referenceModel: 'Round', 'customer.email': email, status: 'pending' },
      { status: 'cancelled' }
    );

    const orderId = `Round_${roundId}_${Date.now()}`;
    const amountWithFees = calculateAmountWithFees(price);

    const payment = await Payment.create({
      orderId,
      referenceId: roundId,
      referenceModel: 'Round',
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
        message: 'You have already enrolled in this round.'
      });
    }
    next(error);
  }
};

/**
 * @desc    Create a new course
 * @route   POST /api/admin/courses
 * @access  Private/Admin
 */
export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseData = { ...req.body };
    if (req.file) {
      courseData.img = `/uploads/courses/${req.file.filename}`;
    }

    if (typeof courseData.aboutCourse === 'string') {
      try {
        courseData.aboutCourse = JSON.parse(courseData.aboutCourse);
      } catch (e) {
        delete courseData.aboutCourse;
      }
    }

    if (typeof courseData.targetAudience === 'string') {
      try {
        courseData.targetAudience = JSON.parse(courseData.targetAudience);
      } catch (e) {
        delete courseData.targetAudience;
      }
    }
    const course = await Course.create(courseData);
    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a course
 * @route   PATCH /api/admin/courses/:id
 * @access  Private/Admin
 */
export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseData = { ...req.body };
    if (req.file) {
      courseData.img = `/uploads/courses/${req.file.filename}`;
    }

    if (typeof courseData.aboutCourse === 'string') {
      try {
        courseData.aboutCourse = JSON.parse(courseData.aboutCourse);
      } catch (e) {
        delete courseData.aboutCourse;
      }
    }

    if (typeof courseData.targetAudience === 'string') {
      try {
        courseData.targetAudience = JSON.parse(courseData.targetAudience);
      } catch (e) {
        delete courseData.targetAudience;
      }
    }

    const course = await Course.findByIdAndUpdate(req.params.id, courseData, {
      returnDocument: 'after',
      runValidators: true
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a course
 * @route   DELETE /api/admin/courses/:id
 * @access  Private/Admin
 */
export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Also delete all rounds associated with this course
    await Round.deleteMany({ course: course._id });

    res.status(200).json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a round for a course
 * @route   POST /api/admin/courses/rounds
 * @access  Private/Admin
 */
export const createRound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, ...roundData } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const round = await Round.create({ course: courseId, ...roundData });
    res.status(201).json({
      success: true,
      data: round
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a round
 * @route   PATCH /api/admin/courses/rounds/:id
 * @access  Private/Admin
 */
export const updateRound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const round = await Round.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true
    });

    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }

    res.status(200).json({ success: true, data: round });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a round
 * @route   DELETE /api/admin/courses/rounds/:id
 * @access  Private/Admin
 */
export const deleteRound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const round = await Round.findByIdAndDelete(req.params.id);

    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }

    await Lecture.deleteMany({ round: round._id });

    res.status(200).json({ success: true, message: 'Round deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a lecture for a round
 * @route   POST /api/admin/courses/lectures
 * @access  Private/Admin
 */
export const createLecture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roundId, title, startDate, meetingUrl, status } = req.body;

    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }

    const lecture = await Lecture.create({ round: roundId, title, startDate, meetingUrl, status });
    res.status(201).json({ success: true, data: lecture });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a lecture
 * @route   PATCH /api/admin/courses/lectures/:id
 * @access  Private/Admin
 */
export const updateLecture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lecture = await Lecture.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true
    });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    res.status(200).json({ success: true, data: lecture });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Notify enrolled students about a lecture via WhatsApp
 * @route   POST /api/admin/courses/lectures/:id/notify-students
 * @access  Private/Admin
 */
export const notifyLectureStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lectureRecord = await Lecture.findById(req.params.id).populate({
      path: 'round',
      populate: { path: 'course', select: 'title' }
    });

    if (!lectureRecord) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const lecture = lectureRecord as any;
    const round = lecture.round as any;

    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found for this lecture' });
    }

    if (!lecture.meetingUrl) {
      return res.status(400).json({ success: false, message: 'Add a meeting URL before notifying students' });
    }

    const enrollments = await Enrollment.find({
      referenceId: round._id,
      referenceModel: 'Round'
    }).select('phone');

    if (enrollments.length === 0) {
      return res.status(400).json({ success: false, message: 'No enrolled students found for this round' });
    }

    const phones = Array.from(
      new Set(
        enrollments
          .map((enrollment) => normalizePhoneForWapilot(enrollment.phone))
          .filter(Boolean)
      )
    );

    if (phones.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid student phone numbers found' });
    }

    const message = buildLectureNotificationMessage(
      round.course?.title ?? 'Course',
      round.title ?? 'Round',
      lecture.title,
      formatLectureStartTime(new Date(lecture.startDate)),
      lecture.meetingUrl
    );

    console.log('--- WhatsApp Notification Start ---');
    console.log('Lecture ID:', req.params.id);
    console.log('Recipients:', phones);
    console.log('Message:', message);

    const results = await sendBulkMessage(phones, message);

    console.log('Notification results:', JSON.stringify(results, null, 2));
    console.log('--- WhatsApp Notification End ---');
    const sentCount = results.filter((result) => result.success).length;
    const failedCount = results.length - sentCount;

    res.status(200).json({
      success: failedCount === 0,
      message: failedCount === 0 ? 'Students notified successfully' : 'Some notifications failed to send',
      data: {
        totalStudents: phones.length,
        sentCount,
        failedCount,
        results
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a lecture
 * @route   DELETE /api/admin/courses/lectures/:id
 * @access  Private/Admin
 */
export const deleteLecture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lecture = await Lecture.findByIdAndDelete(req.params.id);

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    res.status(200).json({ success: true, message: 'Lecture deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all enrollments
 * @route   GET /api/admin/courses/enrollments
 * @access  Private/Admin
 */
export const getEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, courseId, roundId, dateFrom, dateTo } = req.query;
    const hasPaginationOrFilters = Boolean(
      req.query.page ||
      req.query.limit ||
      search ||
      courseId ||
      roundId ||
      dateFrom ||
      dateTo
    );

    if (!hasPaginationOrFilters) {
      const enrollments = await Enrollment.find()
        .populate('referenceId', 'title')
        .populate('selectedCourses', 'title')
        .lean();
      const paymentOrderIds = enrollments
        .map((enrollment: any) => enrollment.paymentOrderId)
        .filter(Boolean);

      const payments = paymentOrderIds.length > 0
        ? await Payment.find({ orderId: { $in: paymentOrderIds } })
            .select('orderId amount status transactionId paymentDetails customer createdAt updatedAt')
            .lean()
        : [];

      const paymentByOrderId = new Map(
        payments.map((payment: any) => [payment.orderId, payment])
      );

      const enrollmentsWithPayments = enrollments.map((enrollment: any) => ({
        ...enrollment,
        payment: enrollment.paymentOrderId ? paymentByOrderId.get(enrollment.paymentOrderId) ?? null : null
      }));

      return res.status(200).json({ success: true, data: enrollmentsWithPayments });
    }

    const query: any = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (roundId && roundId !== 'all') {
      query.referenceModel = 'Round';
      query.referenceId = roundId;
    } else if (courseId && courseId !== 'all') {
      const rounds = await Round.find({ course: courseId }).select('_id').lean();
      query.referenceModel = 'Round';
      query.referenceId = { $in: rounds.map((round) => round._id) };
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};

      if (dateFrom) {
        query.createdAt.$gte = new Date(`${dateFrom}T00:00:00`);
      }

      if (dateTo) {
        query.createdAt.$lte = new Date(`${dateTo}T23:59:59.999`);
      }
    }

    const { items: enrollmentsWithPayments, pagination } = await paginateModel(Enrollment, {
      query: req.query as Record<string, unknown>,
      filter: query,
      populate: ['referenceId', { path: 'selectedCourses', select: 'title' }],
      sort: { createdAt: -1 },
      lean: true,
      defaultLimit: 10,
      transform: async (enrollments: any[]) => {
        const paymentOrderIds = enrollments
          .map((enrollment) => enrollment.paymentOrderId)
          .filter(Boolean);

        const payments = paymentOrderIds.length > 0
          ? await Payment.find({ orderId: { $in: paymentOrderIds } })
              .select('orderId amount status transactionId paymentDetails customer createdAt updatedAt')
              .lean()
          : [];

        const paymentByOrderId = new Map(
          payments.map((payment: any) => [payment.orderId, payment])
        );

        return enrollments.map((enrollment) => ({
          ...enrollment,
          payment: enrollment.paymentOrderId ? paymentByOrderId.get(enrollment.paymentOrderId) ?? null : null
        }));
      }
    });

    res.status(200).json({
      success: true,
      data: {
        enrollments: enrollmentsWithPayments,
        pagination
      }
    });
  } catch (error) {
    next(error);
  }
};
