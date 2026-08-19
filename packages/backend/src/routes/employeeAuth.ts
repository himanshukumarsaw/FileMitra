import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { UserAccount } from '../models/UserAccount.js';
import { RegistrationRequest } from '../models/RegistrationRequest.js';
import { PasswordResetRequest } from '../models/PasswordResetRequest.js';
import { EmployeeMaster } from '../models/EmployeeMaster.js';
import { env } from '../config/env.js';
import { verifyToken, requireEmployeeAuth, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { verifyEmployee } from '../services/employeeService.js';
import { generateOTP, sendOTP, verifyOTP } from '../services/otpService.js';
import { generateChallenge } from '../services/captchaService.js';
import { verifyCaptcha } from '../middleware/captchaMiddleware.js';
import { createSession, invalidateSession, invalidateAllUserSessions } from '../services/sessionService.js';
import { log } from '../services/auditService.js';
import { authRateLimiter, generalRateLimiter } from '../middleware/rateLimiter.js';
import { hashOTP } from '../utils/crypto.js';

const router = Router();

router.get('/captcha', generalRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    const { challengeId, question } = await generateChallenge(ip)
    res.status(200).json({ challengeId, question })
  } catch (error) {
    console.error('Generate captcha error:', error)
    res.status(500).json({ error: 'Failed to generate CAPTCHA' })
  }
})

const COMMON_BREACHED_PASSWORDS = new Set([
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
  'password1',
  'admin123',
]);

function validatePassword(password: string, employeeCode: string, mobile: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  if (password.toLowerCase().includes(employeeCode.toLowerCase())) {
    errors.push('Password must not contain your employee code');
  }
  if (mobile && password.includes(mobile)) {
    errors.push('Password must not contain your registered mobile number');
  }
  if (COMMON_BREACHED_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a more secure password');
  }

  return { valid: errors.length === 0, errors };
}

function generateToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

function maskMobile(mobile: string): string {
  if (!mobile || mobile.length <= 4) return '****';
  return '**' + mobile.slice(-4);
}

router.post(
  '/verify',
  [
    body('employeeCode').trim().notEmpty().withMessage('Employee code is required'),
    body('dob').isISO8601().withMessage('Valid date of birth is required'),
    body('captchaToken').notEmpty().withMessage('CAPTCHA token is required'),
    body('captchaAnswer').notEmpty().withMessage('CAPTCHA answer is required'),
  ],
  verifyCaptcha,
  generalRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { employeeCode, dob } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || '';

      let employee;
      try {
        employee = await verifyEmployee(employeeCode, new Date(dob), '');
      } catch {
        await log('employee_signup_verify', {
          employeeCode,
          ipAddress,
          userAgent,
          success: false,
          metadata: { step: 'verify' },
        });
        res.status(400).json({ error: 'Employee details could not be verified. Please check your Employee ID or contact the department administrator.' });
        return;
      }

      const existingRegistration = await RegistrationRequest.findOne({
        employee_code: employeeCode,
        status: { $in: ['PENDING', 'OTP_VERIFIED'] },
      });

      if (existingRegistration) {
        await RegistrationRequest.deleteOne({ _id: existingRegistration._id });
      }

      const otp = generateOTP();
      const otpHash = await hashOTP(otp);

      const registration = await RegistrationRequest.create({
        employee_code: employeeCode,
        full_name: employee.fullName,
        dob: new Date(dob),
        registered_mobile_last4: '0000',
        otp_code: otpHash,
        otp_sent_at: new Date(),
        otp_expires_at: new Date(Date.now() + 5 * 60 * 1000),
        otp_attempts: 0,
        max_otp_attempts: 3,
        status: 'PENDING',
        ip_address: ipAddress,
        user_agent: userAgent,
        captcha_token: req.body.captchaToken,
        verification_attempts: 0,
        max_verification_attempts: 5,
        is_locked: false,
      });

      const employeeRecord = await EmployeeMaster.findOne({ employee_code: employeeCode });
      if (employeeRecord) {
        await sendOTP(employeeRecord.registered_mobile, otp);
      }

      await log('employee_signup_verify', {
        employeeCode,
        ipAddress,
        userAgent,
        success: true,
        metadata: { registrationId: registration._id },
      });

      res.status(200).json({
        success: true,
        message: `Employee verified. OTP sent to registered mobile ending in ${maskMobile(employeeRecord?.registered_mobile || '')}`,
        registrationId: registration._id,
        employee: {
          full_name: employee.fullName,
          employee_code: employee.employeeCode,
          designation: employee.designation,
          department: employee.department,
          office: employee.office,
          district: '',
        },
      });
    } catch (error) {
      console.error('Employee verify error:', error);
      res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
  }
);

router.post(
  '/send-otp',
  [
    body('registrationId').notEmpty().withMessage('Registration ID is required'),
  ],
  generalRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { registrationId } = req.body;
      const registration = await RegistrationRequest.findById(registrationId);

      if (!registration) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }

      if (registration.status !== 'PENDING') {
        res.status(400).json({ error: 'Invalid registration status' });
        return;
      }

      const otp = generateOTP();
      const otpHash = await hashOTP(otp);

      registration.otp_code = otpHash;
      registration.otp_sent_at = new Date();
      registration.otp_expires_at = new Date(Date.now() + 5 * 60 * 1000);
      registration.otp_attempts = 0;
      await registration.save();

      const employeeRecord = await EmployeeMaster.findOne({ employee_code: registration.employee_code });
      if (employeeRecord) {
        await sendOTP(employeeRecord.registered_mobile, otp);
      }

      await log('employee_signup_resend_otp', {
        employeeCode: registration.employee_code,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || '',
        success: true,
        metadata: { registrationId },
      });

      res.status(200).json({ success: true, message: 'OTP resent' });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ error: 'Failed to resend OTP' });
    }
  }
);

router.post(
  '/verify-otp',
  [
    body('registrationId').notEmpty().withMessage('Registration ID is required'),
    body('otp').trim().notEmpty().withMessage('OTP is required'),
  ],
  generalRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { registrationId, otp } = req.body;
      const registration = await RegistrationRequest.findById(registrationId);

      if (!registration) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }

      if (registration.is_locked) {
        res.status(403).json({ error: 'Registration is locked. Please request a new OTP.' });
        return;
      }

      if (registration.status !== 'PENDING') {
        res.status(400).json({ error: 'Invalid registration status' });
        return;
      }

      const employeeRecord = await EmployeeMaster.findOne({ employee_code: registration.employee_code });
      if (!employeeRecord) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      const result = await verifyOTP(employeeRecord.registered_mobile, otp);

      if (result.success) {
        registration.status = 'OTP_VERIFIED';
        registration.otp_code = '';
        await registration.save();

        await log('employee_signup_verify_otp', {
          employeeCode: registration.employee_code,
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || '',
          success: true,
          metadata: { registrationId },
        });

        res.status(200).json({ success: true, message: 'OTP verified. Proceed to create account.' });
        return;
      }

      registration.otp_attempts = (registration.otp_attempts || 0) + 1;
      if (registration.otp_attempts >= registration.max_otp_attempts) {
        registration.is_locked = true;
        registration.locked_at = new Date();
      }
      await registration.save();

      await log('employee_signup_verify_otp', {
        employeeCode: registration.employee_code,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || '',
        success: false,
        metadata: { registrationId, remainingAttempts: result.remainingAttempts },
      });

      res.status(400).json({ error: `Invalid OTP. ${result.remainingAttempts} attempts remaining.` });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ error: 'OTP verification failed' });
    }
  }
);

router.post(
  '/register',
  [
    body('registrationId').notEmpty().withMessage('Registration ID is required'),
    body('loginId').trim().notEmpty().withMessage('Login ID is required'),
    body('password').trim().isLength({ min: 1 }).withMessage('Password is required'),
    body('confirmPassword').trim().notEmpty().withMessage('Confirm password is required'),
  ],
  generalRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { registrationId, loginId, password, confirmPassword } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || '';

      const registration = await RegistrationRequest.findById(registrationId);
      if (!registration) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }

      if (registration.status !== 'OTP_VERIFIED') {
        res.status(400).json({ error: 'Registration is not verified. Please verify OTP first.' });
        return;
      }

      if (loginId !== registration.employee_code) {
        res.status(400).json({ error: 'Login ID must match your Employee ID' });
        return;
      }

      if (password !== confirmPassword) {
        res.status(400).json({ error: 'Passwords do not match' });
        return;
      }

      const existingUser = await User.findOne({ employee_code: loginId });
      if (existingUser) {
        res.status(409).json({ error: 'An account with this Employee ID already exists' });
        return;
      }

      const employeeRecord = await EmployeeMaster.findOne({ employee_code: registration.employee_code });
      if (!employeeRecord) {
        res.status(404).json({ error: 'Employee record not found' });
        return;
      }

      const passwordValidation = validatePassword(password, registration.employee_code, employeeRecord.registered_mobile);
      if (!passwordValidation.valid) {
        res.status(400).json({ error: 'Password does not meet requirements', details: passwordValidation.errors });
        return;
      }

      const user = await User.create({
        email: employeeRecord.official_email || `${loginId}@forest.gov`,
        password,
        name: registration.full_name,
        role: 'employee',
        employee_code: loginId,
        employee_master: employeeRecord._id,
        is_employee_portal: true,
      });

      await UserAccount.create({
        user: user._id,
        employee_master: employeeRecord._id,
        employee_code: loginId,
      });

      employeeRecord.registration_status = 'REGISTERED';
      await employeeRecord.save();

      registration.status = 'ACCOUNT_CREATED';
      await registration.save();

      const token = generateToken(user._id.toString());

      await log('employee_signup_register', {
        userId: user._id.toString(),
        employeeCode: loginId,
        ipAddress,
        userAgent,
        success: true,
        metadata: { registrationId },
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: user._id,
          loginId: user.employee_code,
          full_name: user.name,
          role: user.role,
          employee_code: user.employee_code,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

router.post(
  '/login',
  [
    body('loginId').trim().notEmpty().withMessage('Login ID is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { loginId, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || '';

      const user = await User.findOne({ employee_code: loginId }).select('+password');
      if (!user) {
        await log('employee_login', {
          employeeCode: loginId,
          ipAddress,
          userAgent,
          success: false,
          metadata: { reason: 'user_not_found' },
        });
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const employee = await EmployeeMaster.findOne({ employee_code: loginId });
      if (!employee || employee.employment_status !== 'ACTIVE') {
        await log('employee_login', {
          userId: user._id.toString(),
          employeeCode: loginId,
          ipAddress,
          userAgent,
          success: false,
          metadata: { reason: 'employee_inactive' },
        });
        res.status(403).json({ error: 'Your account is not active. Please contact your administrator.' });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        await log('employee_login', {
          userId: user._id.toString(),
          employeeCode: loginId,
          ipAddress,
          userAgent,
          success: false,
          metadata: { reason: 'invalid_password' },
        });
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = generateToken(user._id.toString());
      const tokenId = Buffer.from(token).toString('base64').slice(0, 32);

      await createSession(user._id.toString(), loginId, tokenId, ipAddress, userAgent, env.JWT_EXPIRES_IN);

      await log('employee_login', {
        userId: user._id.toString(),
        employeeCode: loginId,
        ipAddress,
        userAgent,
        success: true,
      });

      res.status(200).json({
        token,
        user: {
          id: user._id,
          loginId: user.employee_code,
          full_name: user.name,
          role: user.role,
          employee_code: user.employee_code,
          department: employee.department,
          designation: employee.designation,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

router.post(
  '/logout',
  verifyToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1] || '';
      const tokenId = Buffer.from(token).toString('base64').slice(0, 32);

      await invalidateSession(tokenId);

      await log('employee_logout', {
        userId: req.user!._id.toString(),
        employeeCode: req.user!.employee_code || '',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || '',
        success: true,
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }
);

router.post(
  '/forgot-password',
  [
    body('employeeCode').trim().notEmpty().withMessage('Employee code is required'),
    body('captchaToken').notEmpty().withMessage('CAPTCHA token is required'),
    body('captchaAnswer').notEmpty().withMessage('CAPTCHA answer is required'),
  ],
  verifyCaptcha,
  generalRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { employeeCode } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || '';

      const employee = await EmployeeMaster.findOne({ employee_code: employeeCode });
      if (!employee || employee.employment_status !== 'ACTIVE') {
        await log('employee_forgot_password', {
          employeeCode,
          ipAddress,
          userAgent,
          success: false,
          metadata: { step: 'verify_employee' },
        });
        res.status(400).json({ error: 'Employee details could not be verified. Please check your Employee ID or contact the department administrator.' });
        return;
      }

      const existingReset = await PasswordResetRequest.findOne({
        employee_code: employeeCode,
        is_locked: false,
      }).sort({ created_at: -1 });

      if (existingReset) {
        await PasswordResetRequest.deleteOne({ _id: existingReset._id });
      }

      const otp = generateOTP();
      const otpHash = await hashOTP(otp);

      await PasswordResetRequest.create({
        employee_code: employeeCode,
        full_name: employee.full_name,
        otp_hash: otpHash,
        otp_sent_at: new Date(),
        otp_expires_at: new Date(Date.now() + 5 * 60 * 1000),
        otp_attempts: 0,
        max_otp_attempts: 3,
        is_locked: false,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      await sendOTP(employee.registered_mobile, otp);

      await log('employee_forgot_password', {
        employeeCode,
        ipAddress,
        userAgent,
        success: true,
        metadata: { step: 'otp_sent' },
      });

      res.status(200).json({
        success: true,
        message: `OTP sent to registered mobile ending in ${maskMobile(employee.registered_mobile)}`,
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Password reset request failed' });
    }
  }
);

router.post(
  '/verify-reset-otp',
  [
    body('employeeCode').trim().notEmpty().withMessage('Employee code is required'),
    body('otp').trim().notEmpty().withMessage('OTP is required'),
  ],
  generalRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { employeeCode, otp } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || '';

      const resetRequest = await PasswordResetRequest.findOne({ employee_code: employeeCode }).sort({ created_at: -1 });

      if (!resetRequest) {
        res.status(404).json({ error: 'Password reset request not found' });
        return;
      }

      if (resetRequest.is_locked) {
        res.status(403).json({ error: 'Reset request is locked. Please request a new OTP.' });
        return;
      }

      if (Date.now() > resetRequest.otp_expires_at.getTime()) {
        res.status(400).json({ error: 'OTP has expired' });
        return;
      }

      const employee = await EmployeeMaster.findOne({ employee_code: employeeCode });
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      const result = await verifyOTP(employee.registered_mobile, otp);

      if (result.success) {
        const resetToken = jwt.sign(
          { employeeCode, type: 'password_reset' },
          env.JWT_SECRET,
          { expiresIn: '10m' } as jwt.SignOptions
        );

        await log('employee_verify_reset_otp', {
          employeeCode,
          ipAddress,
          userAgent,
          success: true,
        });

        res.status(200).json({ success: true, resetToken });
        return;
      }

      resetRequest.otp_attempts = (resetRequest.otp_attempts || 0) + 1;
      if (resetRequest.otp_attempts >= resetRequest.max_otp_attempts) {
        resetRequest.is_locked = true;
        resetRequest.locked_at = new Date();
      }
      await resetRequest.save();

      await log('employee_verify_reset_otp', {
        employeeCode,
        ipAddress,
        userAgent,
        success: false,
      });

      res.status(400).json({ error: `Invalid OTP. ${result.remainingAttempts} attempts remaining.` });
    } catch (error) {
      console.error('Verify reset OTP error:', error);
      res.status(500).json({ error: 'OTP verification failed' });
    }
  }
);

router.post(
  '/reset-password',
  [
    body('resetToken').notEmpty().withMessage('Reset token is required'),
    body('newPassword').trim().isLength({ min: 1 }).withMessage('New password is required'),
    body('confirmPassword').trim().notEmpty().withMessage('Confirm password is required'),
  ],
  generalRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { resetToken, newPassword, confirmPassword } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || '';

      let decoded: { employeeCode: string; type: string };
      try {
        decoded = jwt.verify(resetToken, env.JWT_SECRET) as { employeeCode: string; type: string };
      } catch {
        res.status(401).json({ error: 'Invalid or expired reset token' });
        return;
      }

      if (decoded.type !== 'password_reset') {
        res.status(401).json({ error: 'Invalid reset token' });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({ error: 'Passwords do not match' });
        return;
      }

      const user = await User.findOne({ employee_code: decoded.employeeCode });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const employee = await EmployeeMaster.findOne({ employee_code: decoded.employeeCode });
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      const passwordValidation = validatePassword(newPassword, decoded.employeeCode, employee.registered_mobile);
      if (!passwordValidation.valid) {
        res.status(400).json({ error: 'Password does not meet requirements', details: passwordValidation.errors });
        return;
      }

      user.password = newPassword;
      await user.save();

      await invalidateAllUserSessions(user._id.toString());

      await log('employee_reset_password', {
        userId: user._id.toString(),
        employeeCode: decoded.employeeCode,
        ipAddress,
        userAgent,
        success: true,
      });

      res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Password reset failed' });
    }
  }
);

router.post(
  '/refresh-session',
  verifyToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const newToken = generateToken(req.user!._id.toString());
      res.status(200).json({ token: newToken });
    } catch (error) {
      console.error('Refresh session error:', error);
      res.status(500).json({ error: 'Failed to refresh session' });
    }
  }
);

router.get(
  '/me',
  verifyToken,
  requireEmployeeAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const employee = await EmployeeMaster.findOne({ employee_code: req.employee!.employeeCode });
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      const { registered_mobile, ...safeEmployee } = employee.toObject();

      res.status(200).json({
        employee: {
          ...safeEmployee,
          registered_mobile: maskMobile(registered_mobile),
        },
      });
    } catch (error) {
      console.error('Get employee profile error:', error);
      res.status(500).json({ error: 'Failed to fetch employee profile' });
    }
  }
);

export default router;
