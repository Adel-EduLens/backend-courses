import type { Response } from 'express';

interface SuccessResponseOptions {
  message?: string;
  data?: any;
  statusCode?: number;
}

interface ErrorResponseOptions {
  message?: string;
  statusCode?: number;
  details?: any;
}

export const successResponse = (
  res: Response,
  { message, data, statusCode = 200 }: SuccessResponseOptions
) => {
  const response: any = { success: true };

  if (message) response.message = message;
  if (data && Object.keys(data).length > 0) response.data = data;

  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  { message, statusCode = 500, details }: ErrorResponseOptions
) => {
  const response: any = { success: false };

  if (message) response.message = message;
  if (details) response.details = details;

  return res.status(statusCode).json(response);
};
