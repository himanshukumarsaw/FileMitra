import { hashOTP, compareOTP } from '../utils/crypto.js';
import { AppError } from '../middleware/error.js';

interface OTPRecord {
  otpHash: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

const otpStore = new Map<string, OTPRecord>();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN_MS = 30 * 1000;

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(phoneNumber: string, otp: string): Promise<void> {
  cleanup();

  const existing = otpStore.get(phoneNumber);
  if (existing && Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const remainingCooldown = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.createdAt.getTime())) / 1000);
    throw new AppError(`Please wait ${remainingCooldown} seconds before requesting a new OTP.`, 429);
  }

  const otpHash = await hashOTP(otp);

  const now = new Date();
  const record: OTPRecord = {
    otpHash,
    createdAt: now,
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
  };

  otpStore.set(phoneNumber, record);
}

export async function verifyOTP(phoneNumber: string, inputOtp: string): Promise<{ success: boolean; remainingAttempts: number }> {
  cleanup();

  const record = otpStore.get(phoneNumber);
  if (!record) {
    return { success: false, remainingAttempts: 0 };
  }

  if (Date.now() > record.expiresAt.getTime()) {
    otpStore.delete(phoneNumber);
    return { success: false, remainingAttempts: 0 };
  }

  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(phoneNumber);
    return { success: false, remainingAttempts: 0 };
  }

  const isMatch = await compareOTP(inputOtp, record.otpHash);

  if (isMatch) {
    otpStore.delete(phoneNumber);
    return { success: true, remainingAttempts: 0 };
  }

  record.attempts += 1;
  const remaining = record.maxAttempts - record.attempts;

  if (remaining <= 0) {
    otpStore.delete(phoneNumber);
  }

  return { success: false, remainingAttempts: remaining };
}

export async function resendOTP(phoneNumber: string): Promise<string> {
  otpStore.delete(phoneNumber);
  const otp = generateOTP();
  await sendOTP(phoneNumber, otp);
  return otp;
}

export function cleanup(): void {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt.getTime()) {
      otpStore.delete(key);
    }
  }
}
