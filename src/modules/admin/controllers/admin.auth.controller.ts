import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../admin.model.js';
import AppError from '../../../utils/AppError.util.js';
import { successResponse } from '../../../utils/response.util.js';

const signToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '90d'
  });
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }

    // 2) Check if user exists && password is correct
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin || !(await (admin as any).comparePassword(password, admin.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // 3) If everything ok, send token to client
    const token = signToken(admin._id.toString());

    successResponse(res, {
      message: 'Logged in successfully',
      data: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user should be populated by protect middleware
    successResponse(res, {
      data: {
        admin: (req as any).user
      }
    });
  } catch (error) {
    next(error);
  }
};

