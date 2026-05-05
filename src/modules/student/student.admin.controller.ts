import { Request, Response, NextFunction } from 'express';
import { Student } from './student.model.js';
import Enrollment from '../course/enrollment.model.js';
import { Payment } from '../payment/payment.model.js';
import { successResponse } from '../../utils/response.util.js';
import AppError from '../../utils/AppError.util.js';
import { enrichEnrollment } from './student.controller.js';
import { paginateModel } from '../../utils/pagination.util.js';

/**
 * @desc    Get all students with search and pagination
 * @route   GET /api/admin/students
 * @access  Private/Admin
 */
export const getAllStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const { items: students, pagination } = await paginateModel(Student, {
      query: req.query as Record<string, unknown>,
      filter: query,
      sort: { createdAt: -1 },
      defaultLimit: 10,
    });

    successResponse(res, {
      data: {
        students,
        pagination
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single student with their enrollments
 * @route   GET /api/admin/students/:id
 * @access  Private/Admin
 */
export const getStudentDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return next(new AppError('Student not found', 404));
    }

    const enrollments = await Enrollment.find({ 
      $or: [
        { studentId: student._id },
        { phone: student.phone }
      ]
    })
    .populate('referenceId')
    .populate('selectedCourses', 'title')
    .sort({ createdAt: -1 });

    for (const enrollment of enrollments) {
      if (enrollment.referenceModel === 'Round' && enrollment.referenceId) {
        await (enrollment.referenceId as any).populate({
          path: 'course',
          select: 'title brief img'
        });
      }
    }

    const paymentOrderIds = enrollments
      .map((e: any) => e.paymentOrderId)
      .filter(Boolean);

    const payments = paymentOrderIds.length > 0
      ? await Payment.find({ orderId: { $in: paymentOrderIds } })
          .select('orderId amount status transactionId paymentDetails customer createdAt updatedAt')
          .lean()
      : [];

    const paymentByOrderId = new Map(
      payments.map((p: any) => [p.orderId, p])
    );

    const enrichedEnrollments = await Promise.all(enrollments.map(async (e) => {
      const enriched = await enrichEnrollment(e);
      return {
        ...enriched,
        payment: e.paymentOrderId ? paymentByOrderId.get(e.paymentOrderId) ?? null : null
      };
    }));

    successResponse(res, {
      data: {
        student,
        enrollments: enrichedEnrollments
      }
    });
  } catch (error) {
    next(error);
  }
};
