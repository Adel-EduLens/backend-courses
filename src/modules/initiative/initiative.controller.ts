import { Request, Response, NextFunction } from 'express';
import { InitiativeCourse } from './initiative_course.model.js';
import { Initiative } from './initiative.model.js';
import Enrollment from '../course/enrollment.model.js';
import { Payment } from '../payment/payment.model.js';
import { createPaymentSession, calculateAmountWithFees } from '../../utils/kashier.service.js';

/**
 * @desc    Get all initiative courses
 * @route   GET /api/initiatives
 * @access  Public
 */
export const getInitiativeCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await InitiativeCourse.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single initiative course by ID
 * @route   GET /api/initiatives/:id
 * @access  Public
 */
export const getInitiativeCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Initiative course not found'
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
 * @desc    Create a new initiative course
 * @route   POST /api/admin/initiatives
 * @access  Private/Admin
 */
export const createInitiativeCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.create(req.body);
    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an initiative course
 * @route   PATCH /api/admin/initiatives/:id
 * @access  Private/Admin
 */
export const updateInitiativeCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Initiative course not found'
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
 * @desc    Delete an initiative course
 * @route   DELETE /api/admin/initiatives/:id
 * @access  Private/Admin
 */
export const deleteInitiativeCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Initiative course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Initiative course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all initiatives
 * @route   GET /api/initiatives/all
 * @access  Public
 */
export const getInitiatives = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const initiatives = await Initiative.find().populate('courses');
    res.status(200).json({
      success: true,
      data: initiatives
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single initiative by ID
 * @route   GET /api/initiatives/all/:id
 * @access  Public
 */
export const getInitiative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const initiative = await Initiative.findById(req.params.id).populate('courses');
    if (!initiative) {
      return res.status(404).json({
        success: false,
        message: 'Initiative not found'
      });
    }
    res.status(200).json({
      success: true,
      data: initiative
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new initiative
 * @route   POST /api/admin/initiatives/all
 * @access  Private/Admin
 */
export const createInitiative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const initiative = await Initiative.create(req.body);
    res.status(201).json({
      success: true,
      data: initiative
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Enroll in an initiative course — initiates Kashier payment
 * @route   POST /api/initiatives/enroll
 * @access  Public
 */
export const enrollInInitiativeCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { initiativeCourseId, fullName, email, phone, additionalInfo } = req.body;

    const course = await InitiativeCourse.findById(initiativeCourseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Initiative course not found' });
    }

    // Prevent duplicate enrollment before hitting payment
    const existing = await Enrollment.findOne({ referenceId: initiativeCourseId, referenceModel: 'InitiativeCourse', phone });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already enrolled in this initiative course with this phone number.'
      });
    }

    // Cancel stale pending payments for the same course + email
    await Payment.updateMany(
      { referenceId: initiativeCourseId, referenceModel: 'InitiativeCourse', 'customer.email': email, status: 'pending' },
      { status: 'cancelled' }
    );

    const orderId = `InitiativeCourse_${initiativeCourseId}_${Date.now()}`;
    const amountWithFees = calculateAmountWithFees(course.price);

    await Payment.create({
      orderId,
      referenceId: initiativeCourseId,
      referenceModel: 'InitiativeCourse',
      amount: course.price,
      status: 'pending',
      customer: { name: fullName, email, phone },
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
  } catch (error) {
    next(error);
  }
};
