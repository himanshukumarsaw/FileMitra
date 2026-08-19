import { Router, type Request, type Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { EmployeeMaster } from '../models/EmployeeMaster.js';
import { RegistrationRequest } from '../models/RegistrationRequest.js';
import { AuditLog } from '../models/AuditLog.js';
import { CaptchaChallenge } from '../models/CaptchaChallenge.js';
import { verifyToken, requireRole, type AuthRequest } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/adminAuth.js';
import { AppError } from '../middleware/error.js';
import { generateChallenge } from '../services/captchaService.js';
import { invalidateAllUserSessions } from '../services/sessionService.js';
import { log, getLogs } from '../services/auditService.js';

const router = Router();

router.use(verifyToken, requireAdmin);

router.get(
  '/employees',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const search = (req.query.search as string) || '';
      const department = (req.query.department as string) || '';
      const status = (req.query.status as string) || '';

      const query: Record<string, unknown> = {};

      if (search) {
        query.$or = [
          { employee_code: { $regex: search, $options: 'i' } },
          { full_name: { $regex: search, $options: 'i' } },
          { official_email: { $regex: search, $options: 'i' } },
        ];
      }

      if (department) {
        query.department = { $regex: department, $options: 'i' };
      }

      if (status) {
        query.employment_status = status;
      }

      const [employees, total] = await Promise.all([
        EmployeeMaster.find(query)
          .sort({ created_at: -1 })
          .limit(limit)
          .skip((page - 1) * limit),
        EmployeeMaster.countDocuments(query),
      ]);

      res.status(200).json({
        employees,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('List employees error:', error);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  }
);

router.post(
  '/employees',
  requireSuperAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const employee = await EmployeeMaster.create(req.body);

      await log('admin_create_employee', {
        userId: (req as AuthRequest).user?._id?.toString(),
        employeeCode: employee.employee_code,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || '',
        success: true,
      });

      res.status(201).json({ employee });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('Create employee error:', error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  }
);

router.put(
  '/employees/:id',
  requireSuperAdmin,
  [
    param('id').isMongoId().withMessage('Invalid employee ID'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { employee_code, ...updateData } = req.body;

      const employee = await EmployeeMaster.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      await log('admin_update_employee', {
        userId: (req as AuthRequest).user?._id?.toString(),
        employeeCode: employee.employee_code,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || '',
        success: true,
      });

      res.status(200).json({ employee });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('Update employee error:', error);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  }
);

router.patch(
  '/employees/:id/status',
  requireSuperAdmin,
  [
    param('id').isMongoId().withMessage('Invalid employee ID'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { employment_status, registration_status, is_active } = req.body;

      const updateData: Record<string, unknown> = {};
      if (employment_status !== undefined) updateData.employment_status = employment_status;
      if (registration_status !== undefined) updateData.registration_status = registration_status;
      if (is_active !== undefined) updateData.is_active = is_active;

      const employee = await EmployeeMaster.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      await log('admin_update_employee_status', {
        userId: (req as AuthRequest).user?._id?.toString(),
        employeeCode: employee.employee_code,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || '',
        success: true,
        metadata: { updateData },
      });

      res.status(200).json({ employee });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('Update employee status error:', error);
      res.status(500).json({ error: 'Failed to update employee status' });
    }
  }
);

router.get(
  '/registrations',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const status = (req.query.status as string) || '';

      const query: Record<string, unknown> = {};
      if (status) {
        query.status = status;
      }

      const [registrations, total] = await Promise.all([
        RegistrationRequest.find(query)
          .sort({ created_at: -1 })
          .limit(limit)
          .skip((page - 1) * limit),
        RegistrationRequest.countDocuments(query),
      ]);

      res.status(200).json({
        registrations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('List registrations error:', error);
      res.status(500).json({ error: 'Failed to fetch registrations' });
    }
  }
);

router.post(
  '/registrations/:id/approve',
  requireSuperAdmin,
  [
    param('id').isMongoId().withMessage('Invalid registration ID'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const registration = await RegistrationRequest.findById(id);

      if (!registration) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }

      registration.status = 'ACCOUNT_CREATED';
      await registration.save();

      await log('admin_approve_registration', {
        userId: (req as AuthRequest).user?._id?.toString(),
        employeeCode: registration.employee_code,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || '',
        success: true,
        metadata: { registrationId: id },
      });

      res.status(200).json({ registration });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('Approve registration error:', error);
      res.status(500).json({ error: 'Failed to approve registration' });
    }
  }
);

router.post(
  '/registrations/:id/reject',
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid registration ID'),
    body('reason').trim().notEmpty().withMessage('Reason is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;
      const registration = await RegistrationRequest.findById(id);

      if (!registration) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }

      registration.status = 'REJECTED';
      await registration.save();

      const employee = await EmployeeMaster.findOne({ employee_code: registration.employee_code });
      if (employee) {
        employee.registration_status = 'REJECTED';
        await employee.save();
      }

      await log('admin_reject_registration', {
        userId: (req as AuthRequest).user?._id?.toString(),
        employeeCode: registration.employee_code,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || '',
        success: true,
        metadata: { registrationId: id, reason },
      });

      res.status(200).json({ registration });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('Reject registration error:', error);
      res.status(500).json({ error: 'Failed to reject registration' });
    }
  }
);

router.get(
  '/audit-logs',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const eventType = (req.query.eventType as string) || '';
      const employeeCode = (req.query.employeeCode as string) || '';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await getLogs({
        eventType: eventType || undefined,
        employeeCode: employeeCode || undefined,
        startDate,
        endDate,
        limit,
        offset: (page - 1) * limit,
      });

      res.status(200).json({
        logs: result.logs,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

router.post(
  '/employees/:id/reset-access',
  requireSuperAdmin,
  [
    param('id').isMongoId().withMessage('Invalid employee ID'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const employee = await EmployeeMaster.findById(id);

      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      const user = await User.findOne({ employee_master: employee._id });

      if (user) {
        await invalidateAllUserSessions(user._id.toString());
      }

      await log('admin_reset_access', {
        userId: (req as AuthRequest).user?._id?.toString(),
        employeeCode: employee.employee_code,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || '',
        success: true,
      });

      res.status(200).json({ success: true, message: 'Employee access has been reset' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('Reset access error:', error);
      res.status(500).json({ error: 'Failed to reset employee access' });
    }
  }
);

router.post(
  '/captcha/generate',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const ip = req.ip || req.connection.remoteAddress || 'unknown'
      const { challengeId, question } = await generateChallenge(ip)

      res.status(200).json({ challengeId, question })
    } catch (error) {
      console.error('Generate captcha error:', error)
      res.status(500).json({ error: 'Failed to generate CAPTCHA' })
    }
  }
);

router.get(
  '/stats',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const [totalEmployees, activeRegistrations, pendingApprovals, auditEvents] = await Promise.all([
        EmployeeMaster.countDocuments(),
        RegistrationRequest.countDocuments({ status: { $in: ['PENDING', 'OTP_VERIFIED'] } }),
        RegistrationRequest.countDocuments({ status: 'PENDING' }),
        AuditLog.countDocuments(),
      ])

      res.status(200).json({
        totalEmployees,
        activeRegistrations,
        pendingApprovals,
        auditEvents,
      })
    } catch (error) {
      console.error('Get admin stats error:', error)
      res.status(500).json({ error: 'Failed to fetch stats' })
    }
  }
);

export default router;
