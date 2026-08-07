import { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Custom application error with HTTP status code.
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware.
 * Catches Mongoose validation/cast/duplicate-key errors and AppError instances,
 * returning structured JSON error responses.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // AppError (intentional operational errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({
      error: 'Validation failed',
      details: messages,
    });
    return;
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: `Invalid ${err.path}: ${err.value}`,
    });
    return;
  }

  // MongoDB duplicate key error
  if (
    err instanceof mongoose.Error &&
    'code' in err &&
    (err as { code: number }).code === 11000
  ) {
    const duplicateErr = err as unknown as { keyValue: Record<string, unknown> };
    const field = Object.keys(duplicateErr.keyValue).join(', ');
    res.status(409).json({
      error: `Duplicate value for field: ${field}`,
    });
    return;
  }

  // Unexpected errors
  console.error('Unexpected error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
}
