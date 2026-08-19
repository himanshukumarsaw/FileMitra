import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/error.js';

interface Attempt {
  count: number;
  resetAt: Date;
}

const rateLimitStore = new Map<string, Attempt>();

const GENERAL_LIMIT = 100;
const GENERAL_WINDOW_MS = 15 * 60 * 1000;

const AUTH_LIMIT = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000;

function getClientId(req: Request): string {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

function checkRateLimit(clientId: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = new Date();
  const record = rateLimitStore.get(clientId);

  if (!record || now > record.resetAt) {
    const resetAt = new Date(now.getTime() + windowMs);
    rateLimitStore.set(clientId, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

export function generalRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientId = getClientId(req);
  const result = checkRateLimit(clientId, GENERAL_LIMIT, GENERAL_WINDOW_MS);

  res.setHeader('X-RateLimit-Limit', GENERAL_LIMIT);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  next();
}

export function authRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientId = getClientId(req);
  const result = checkRateLimit(clientId, AUTH_LIMIT, AUTH_WINDOW_MS);

  res.setHeader('X-RateLimit-Limit', AUTH_LIMIT);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'Too many authentication attempts. Please try again later.' });
    return;
  }

  next();
}
