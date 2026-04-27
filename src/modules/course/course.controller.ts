import { Request, Response, NextFunction } from 'express';
import { Course } from './course.model.js';
import Enrollment from './enrollment.model.js';
import { Payment } from '../payment/payment.model.js';
import { createPaymentSession, calculateAmountWithFees } from '../../utils/kashier.service.js';

/**
 * @desc    Get all courses
 * @route   GET /api/courses
 * @access  Public
 */
export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await Course.find();
    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single course by ID
 * @route   GET /api/courses/:id
 * @access  Public
 */
export const getCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findById(req.params.id);
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
 * @desc    Enroll in a course — initiates Kashier payment if course has a price
 * @route   POST /api/courses/enroll
 * @access  Public
 */
export const enrollInCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, fullName, email, phone, additionalInfo } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Free course → direct enrollment
    if (!course.price || course.price === 0) {
      const enrollment = await Enrollment.create({ referenceId: courseId, referenceModel: 'Course', fullName, email, phone, additionalInfo });
      return res.status(201).json({
        success: true,
        message: 'Successfully enrolled in the course!',
        data: enrollment
      });
    }

    // Paid course → initiate Kashier payment
    // Cancel any stale pending payments for the same course + email
    await Payment.updateMany(
      { referenceId: courseId, referenceModel: 'Course', 'customer.email': email, status: 'pending' },
      { status: 'cancelled' }
    );

    const orderId = `Course_${courseId}_${Date.now()}`;
    const amountWithFees = calculateAmountWithFees(course.price);

    const payment = await Payment.create({
      orderId,
      referenceId: courseId,
      referenceModel: 'Course',
      amount: course.price,
      status: 'pending',
      customer: { name: fullName, email, phone }
    });

    // Store additionalInfo in paymentDetails so webhook can use it
    await Payment.findByIdAndUpdate(payment._id, {
      paymentDetails: { additionalInfo }
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
        message: 'You have already enrolled in this course with this phone number.'
      });
    }
    next(error);
  }
};

/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private/Admin
 */
export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.create(req.body);
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
 * @route   PATCH /api/courses/:id
 * @access  Private/Admin
 */
export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
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
 * @route   DELETE /api/courses/:id
 * @access  Private/Admin
 */
export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.status(200).json({ success: true, message: 'Course deleted successfully' });
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
    const enrollments = await Enrollment.find().populate('referenceId', 'title');
    res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    next(error);
  }
};
