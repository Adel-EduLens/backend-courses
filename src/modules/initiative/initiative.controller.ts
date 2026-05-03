import { Request, Response, NextFunction } from 'express';
import { InitiativeCourse } from './initiative_course.model.js';
import { Initiative } from './initiative.model.js';
import Enrollment from '../course/enrollment.model.js';
import { Payment } from '../payment/payment.model.js';
import { createPaymentSession, calculateAmountWithFees } from '../../utils/kashier.service.js';

const initiativePopulate = [
  { path: 'track' },
  { path: 'packages.courses' }
];

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
    const initiatives = await Initiative.find().populate(initiativePopulate);
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
    const initiative = await Initiative.findById(req.params.id).populate(initiativePopulate);
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
 * @desc    Update an initiative
 * @route   PATCH /api/admin/initiatives/all/:id
 * @access  Private/Admin
 */
export const updateInitiative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const initiative = await Initiative.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true
    }).populate(initiativePopulate);

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
 * @desc    Enroll in an initiative track or package — initiates Kashier payment
 * @route   POST /api/initiatives/enroll
 * @access  Public
 */
export const enrollInInitiative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      initiativeId,
      enrollmentTarget,
      packageId,
      selectedCourseIds = [],
      fullName,
      email,
      phone,
      additionalInfo
    } = req.body;

    const initiative = await Initiative.findById(initiativeId).populate(initiativePopulate);
    if (!initiative) {
      return res.status(404).json({ success: false, message: 'Initiative not found' });
    }

    const duplicateQuery: Record<string, unknown> = {
      referenceId: initiativeId,
      referenceModel: 'Initiative',
      phone,
      enrollmentTarget
    };

    if (enrollmentTarget === 'package' && packageId) {
      duplicateQuery.initiativePackageId = packageId;
    }

    const existing = await Enrollment.findOne(duplicateQuery);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already enrolled in this initiative selection with this phone number.'
      });
    }

    let amount = 0;
    let selectedCourses: string[] = [];
    let packageIdentifier: string | undefined;

    if (enrollmentTarget === 'track') {
      const track = initiative.track as any;
      if (!track) {
        return res.status(400).json({ success: false, message: 'This initiative does not have a track configured yet.' });
      }

      amount = track.price ?? 0;
      selectedCourses = [track._id.toString()];
    } else {
      const initiativePackage = initiative.packages.find(
        (item: any) => item._id?.toString() === packageId
      ) as any;

      if (!initiativePackage) {
        return res.status(404).json({ success: false, message: 'Initiative package not found' });
      }

      packageIdentifier = initiativePackage._id.toString();
      const packageCourseIds = initiativePackage.courses.map((course: any) => course._id.toString());

      if (initiativePackage.type === 'full') {
        selectedCourses = packageCourseIds;
      } else {
        const uniqueSelectedCourseIds = Array.from(
          new Set(selectedCourseIds as string[])
        ) as string[];

        if (uniqueSelectedCourseIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Select at least one course for a custom package.'
          });
        }

        if (uniqueSelectedCourseIds.length > initiativePackage.maxCourses) {
          return res.status(400).json({
            success: false,
            message: `You can select up to ${initiativePackage.maxCourses} courses in this custom package.`
          });
        }

        const hasInvalidCourse = uniqueSelectedCourseIds.some((courseId) => !packageCourseIds.includes(courseId));
        if (hasInvalidCourse) {
          return res.status(400).json({
            success: false,
            message: 'One or more selected courses do not belong to this package.'
          });
        }

        selectedCourses = uniqueSelectedCourseIds;
      }

      amount = initiativePackage.price ?? 0;
    }

    if (amount === 0) {
      const enrollmentData: Record<string, unknown> = {
        referenceId: initiativeId,
        referenceModel: 'Initiative',
        enrollmentTarget,
        selectedCourses,
        fullName,
        email,
        phone,
        additionalInfo
      };

      if (packageIdentifier) {
        enrollmentData.initiativePackageId = packageIdentifier;
      }

      const enrollment = await Enrollment.create(enrollmentData);

      return res.status(201).json({
        success: true,
        message: 'Successfully enrolled in the initiative!',
        data: enrollment
      });
    }

    await Payment.updateMany(
      {
        referenceId: initiativeId,
        referenceModel: 'Initiative',
        'customer.email': email,
        status: 'pending',
        'paymentDetails.enrollmentTarget': enrollmentTarget,
        ...(packageIdentifier ? { 'paymentDetails.initiativePackageId': packageIdentifier } : {})
      },
      { status: 'cancelled' }
    );

    const orderId = `Initiative_${initiativeId}_${Date.now()}`;
    const amountWithFees = calculateAmountWithFees(amount);

    await Payment.create({
      orderId,
      referenceId: initiativeId,
      referenceModel: 'Initiative',
      amount,
      status: 'pending',
      customer: { name: fullName, email, phone },
      paymentDetails: {
        additionalInfo,
        enrollmentTarget,
        initiativePackageId: packageIdentifier,
        selectedCourses
      }
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
    if ((error as any).code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already enrolled in this initiative selection with this phone number.'
      });
    }
    next(error);
  }
};
