import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/error.js';
import { type AuthRequest } from './auth.js';

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const allowedRoles = ['admin', 'super_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }

  next();
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if ((req.user.role as string) !== 'super_admin') {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }

  next();
}
