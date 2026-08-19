import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, type IUser } from '../models/User.js';
import { EmployeeMaster } from '../models/EmployeeMaster.js';
import { env } from '../config/env.js';

export interface AuthRequest extends Request {
  user?: IUser;
  employee?: {
    employeeCode: string;
    fullName: string;
    dob: Date;
    designation: string;
    department: string;
    employmentStatus: string;
    registrationStatus: string;
  };
}

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

export function requireRole(
  ...roles: Array<'admin' | 'officer' | 'viewer' | 'employee'>
) {
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

export async function requireEmployeeAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const employee = await EmployeeMaster.findOne({ employee_code: req.user.employee_code });

    if (!employee) {
      res.status(403).json({ error: 'Employee portal access required.' });
      return;
    }

    req.employee = {
      employeeCode: employee.employee_code,
      fullName: employee.full_name,
      dob: employee.dob,
      designation: employee.designation,
      department: employee.department,
      employmentStatus: employee.employment_status,
      registrationStatus: employee.registration_status,
    };

    next();
  } catch (error) {
    console.error('Employee auth error:', error);
    res.status(500).json({ error: 'Employee verification failed' });
  }
}
