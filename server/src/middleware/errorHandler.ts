import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle Multer upload errors
  if ((err as any).name === 'MulterError') {
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: 'The uploaded file is too large. Maximum allowed file size is 10MB.',
      });
    }
    return res.status(400).json({
      message: `File upload error: ${err.message}`,
    });
  }

  // Handle raw-body / body-parser PayloadTooLargeError
  if ((err as any).status === 413 || (err as any).statusCode === 413 || (err as any).type === 'entity.too.large') {
    return res.status(413).json({
      message: 'The uploaded file or request body is too large (413). Please choose a file under 10MB.',
    });
  }

  console.error('Unhandled error:', err.message || err);
  if (err.stack) console.error(err.stack);

  return res.status(500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
