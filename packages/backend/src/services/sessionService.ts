import { Session } from '../models/Session.js';

export async function createSession(userId: string, employeeCode: string, tokenId: string, ip: string, userAgent: string, expiresIn: string) {
  const expiresAt = new Date(Date.now() + parseExpiry(expiresIn));

  const session = await Session.create({
    user: userId,
    employeeCode,
    tokenId,
    ip,
    userAgent,
    createdAt: new Date(),
    expiresAt,
    isActive: true,
  });

  return session;
}

export async function invalidateSession(tokenId: string) {
  await Session.updateOne({ tokenId }, { isActive: false });
}

export async function invalidateAllUserSessions(userId: string) {
  await Session.updateMany({ user: userId }, { isActive: false });
}

export async function validateSession(tokenId: string) {
  const session = await Session.findOne({ tokenId, isActive: true });

  if (!session || Date.now() > session.expiresAt.getTime()) {
    return null;
  }

  return session;
}

function parseExpiry(expiresIn: string): number {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}
