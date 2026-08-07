import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, type IUser } from '../models/User.js';
import { env } from '../config/env.js';

/** Extend Express Request to include authenticated user */
export interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * JWT verification middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * and attaches the user document to req.user.
 */
export async function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid token. User not found.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Role-based access control middleware factory.
 * Returns middleware that checks if req.user.role is in the allowed roles.
 * @param roles - Allowed role values
 */
export function requireRole(...roles: Array<'admin' | 'officer' | 'viewer'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }

    next();
  };
}
