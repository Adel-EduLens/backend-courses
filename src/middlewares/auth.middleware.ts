import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../modules/admin/admin.model.js';
import { Student } from '../modules/student/student.model.js';
import AppError from '../utils/AppError.util.js';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verification token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

    // 3) Check if user still exists (use role to determine model)
    let currentUser;
    if (decoded.role === 'student') {
      currentUser = await Student.findById(decoded.id);
    } else {
      currentUser = await Admin.findById(decoded.id);
    }

    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          401
        )
      );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    (req as any).user = currentUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token. Please log in again!', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Your token has expired! Please log in again.', 401));
    }
    next(error);
  }
};
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // roles ['admin']. user.role is 'admin'
    if (!roles.includes((req as any).user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};
