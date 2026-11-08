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

  // Handle common PostgreSQL / Supabase low-level database exceptions
  const pgCode = (err as any).code;
  if (pgCode === '23505') {
    return res.status(409).json({
      message: 'A record with this information already exists in the system.',
    });
  }
  if (pgCode === '23503') {
    return res.status(400).json({
      message: 'Referenced account or document record could not be found.',
    });
  }
  if (pgCode === '42P01' || pgCode === 'PGRST205') {
    return res.status(503).json({
      message: 'The requested service is temporarily undergoing maintenance. Please try again shortly.',
    });
  }

  // Handle PostgREST relationship ambiguity errors
  if (typeof (err as any).message === 'string' && (err as any).message.includes('Could not embed')) {
    console.error('[PostgREST Relationship Conflict]:', (err as any).message);
    return res.status(500).json({
      message: 'A database synchronization error occurred. Please refresh the page or try again shortly.',
    });
  }

  console.error('[Unhandled Server Error]:', err.message || err);
  if (err.stack) console.error(err.stack);

  // In production, never leak raw internal server or SQL traces to the client
  const clientMessage = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : (err.message || 'Internal server error');

  return res.status(500).json({
    message: clientMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
