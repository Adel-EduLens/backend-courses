import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Student } from './student.model.js';
import Enrollment from '../course/enrollment.model.js';
import { Initiative } from '../initiative/initiative.model.js';
import AppError from '../../utils/AppError.util.js';
import { successResponse } from '../../utils/response.util.js';
import { sendSingleMessage } from '../../utils/wapilot.service.js';

const signToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: '90d'
  });
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const saveAndSendOtp = async (student: any, phone: string) => {
  const otpCode = generateOtp();
  student.otpCode = otpCode;
  student.otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  await student.save();
  await sendSingleMessage(phone, `Your verification code is: ${otpCode}`);
};

const verifyOtp = (student: any, otpCode: string) => {
  if (!student.otpCode || student.otpCode !== otpCode) {
    throw new AppError('Invalid OTP code', 400);
  }
  if (!student.otpExpiresAt || new Date() > student.otpExpiresAt) {
    throw new AppError('OTP code has expired', 400);
  }
};

const buildStudentResponse = (student: any) => ({
  id: student._id,
  name: student.name,
  email: student.email,
  phone: student.phone,
  role: student.role
});

export const enrichEnrollment = async (enrollment: any) => {
  const plainEnrollment = enrollment.toObject();
  const reference = plainEnrollment.referenceId;

  if (!reference || typeof reference === 'string') {
    return plainEnrollment;
  }

  if (plainEnrollment.referenceModel === 'Round') {
    const course = reference.course;

    return {
      ...plainEnrollment,
      displayTitle: course?.title || reference.title || 'Course',
      displaySubtitle: reference.title,
      displayImage: course?.img || '',
      displayDescription: course?.brief || '',
      detailsPath: course?._id ? `/courses/${course._id}` : null
    };
  }

  if (plainEnrollment.referenceModel === 'Initiative') {
    return {
      ...plainEnrollment,
      displayTitle: reference.title || 'Initiative',
      displaySubtitle: plainEnrollment.enrollmentTarget === 'package' ? 'Initiative Package' : 'Initiative Track',
      displayImage: reference.img || '',
      displayDescription: reference.description || '',
      detailsPath: reference._id ? `/initiatives/${reference._id}` : null
    };
  }

  const initiative = await Initiative.findOne({
    $or: [
      { tracks: reference._id },
      { 'packages.courses': reference._id }
    ]
  }).select('_id title img description');

  return {
    ...plainEnrollment,
    displayTitle: reference.title || initiative?.title || 'Initiative Course',
    displaySubtitle: initiative?.title || 'Initiative Course',
    displayImage: reference.img || initiative?.img || '',
    displayDescription: reference.description || initiative?.description || '',
    detailsPath: initiative?._id ? `/initiatives/${initiative._id}` : null
  };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, password } = req.body;

    const existing = await Student.findOne({ phone });
    if (existing?.isVerified) {
      return next(new AppError('A user with this phone number already exists', 400));
    }

    const student = existing || new Student({ name, email, phone, password });
    if (existing) {
      student.name = name;
      student.email = email;
      student.password = password;
    }

    await saveAndSendOtp(student, phone);

    successResponse(res, {
      message: 'Verification code sent to your WhatsApp',
      statusCode: 200
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRegisterOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otpCode } = req.body;

    const student = await Student.findOne({ phone }).select('+otpCode +otpExpiresAt');
    if (!student) {
      return next(new AppError('Student not found. Please register first.', 404));
    }

    verifyOtp(student, otpCode);

    student.isVerified = true;
    student.otpCode = undefined;
    student.otpExpiresAt = undefined;
    await student.save();

    // Link existing enrollments with this phone number to the student
    await Enrollment.updateMany(
      {
        phone,
        $or: [
          { studentId: { $exists: false } },
          { studentId: null }
        ]
      },
      { studentId: student._id }
    );

    const token = signToken(student._id.toString(), 'student');

    successResponse(res, {
      message: 'Registration complete',
      data: {
        token,
        student: buildStudentResponse(student)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const resendRegisterOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;

    const student = await Student.findOne({ phone });
    if (!student) {
      return next(new AppError('Student not found. Please register first.', 404));
    }

    if (student.isVerified) {
      return next(new AppError('This account is already verified. Please login instead.', 400));
    }

    await saveAndSendOtp(student, phone);

    successResponse(res, {
      message: 'A new verification code was sent to your WhatsApp'
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = req.body;

    const student = await Student.findOne({ phone, isVerified: true }).select('+password');
    if (!student) {
      return next(new AppError('No account found with this phone number', 404));
    }

    const isPasswordCorrect = await student.comparePassword(password, student.password);
    if (!isPasswordCorrect) {
      return next(new AppError('Incorrect phone number or password', 401));
    }

    const token = signToken(student._id.toString(), 'student');

    successResponse(res, {
      message: 'Logged in successfully',
      data: {
        token,
        student: buildStudentResponse(student)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    successResponse(res, {
      data: {
        student: buildStudentResponse((req as any).user)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user._id;

    const enrollments = await Enrollment.find({ studentId })
      .populate('referenceId')
      .sort({ createdAt: -1 });

    // Manually populate 'course' only for Round enrollments to avoid StrictPopulateError
    for (const enrollment of enrollments) {
      if (enrollment.referenceModel === 'Round' && enrollment.referenceId) {
        await (enrollment.referenceId as any).populate({
          path: 'course',
          select: 'title brief img'
        });
      }
    }

    const enrichedEnrollments = await Promise.all(enrollments.map(enrichEnrollment));

    successResponse(res, {
      data: { enrollments: enrichedEnrollments }
    });
  } catch (error) {
    next(error);
  }
};
