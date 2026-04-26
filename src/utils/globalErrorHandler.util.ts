import type { Request, Response, NextFunction } from 'express';
import { errorResponse } from './response.util.js';
import AppError from './AppError.util.js';

/**
 * asyncHandler wraps an async function to catch any errors and pass them to the global error handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * globalErrorHandler is the global middleware for handling errors in the application.
 */
export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the full error to the console in all environments
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  // Handle Unexpected Errors
  if (!(err instanceof AppError)) {
    return errorResponse(res, {
      message: err.message || "An unexpected error occurred.",
      details: { stack: err.stack },
      statusCode: 500,
    });
  }

  // Handle AppError
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return errorResponse(res, {
    message,
    statusCode,
    details: { 
      stack: err.stack,
      ...(err.details || {}) 
    },
  });
}
