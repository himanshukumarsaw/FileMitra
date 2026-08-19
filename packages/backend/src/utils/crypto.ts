import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function compareOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
