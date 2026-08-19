import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/error.js';
import { EmployeeMaster } from '../models/EmployeeMaster.js';
import { type AuthRequest } from './auth.js';

export interface EmployeeAuthRequest extends AuthRequest {
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

export async function verifyEmployeeSession(req: EmployeeAuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const employee = await EmployeeMaster.findOne({ official_email: req.user.email });

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
    console.error('Employee session verification error:', error);
    res.status(500).json({ error: 'Employee verification failed' });
  }
}
