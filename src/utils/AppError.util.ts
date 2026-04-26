class AppError extends Error {
  statusCode: number;
  details: any;

  constructor(message: string, statusCode: number = 500, details: any = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
