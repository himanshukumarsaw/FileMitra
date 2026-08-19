import crypto from 'crypto';
import { CaptchaChallenge } from '../models/CaptchaChallenge.js';

const CAPTCHA_TTL_MS = 5 * 60 * 1000;

export async function generateChallenge(ip: string) {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const operators = ['+', '-', '×'];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  let answer: number;
  if (operator === '+') answer = a + b;
  else if (operator === '-') answer = a - b;
  else answer = a * b;

  const question = `What is ${a} ${operator} ${b}?`;

  const challengeId = crypto.randomBytes(16).toString('hex');
  const solutionHash = crypto.createHash('sha256').update(String(answer)).digest('hex');

  await CaptchaChallenge.create({
    challenge_id: challengeId,
    challenge_text: question,
    solution: solutionHash,
    ip_address: ip,
    created_at: new Date(),
    expires_at: new Date(Date.now() + CAPTCHA_TTL_MS),
    attempts: 0,
  });

  return { challengeId, question };
}

export async function verifyChallenge(challengeId: string, answer: string) {
  const challenge = await CaptchaChallenge.findOne({ challenge_id: challengeId });

  if (!challenge) {
    return false;
  }

  if (Date.now() > challenge.expires_at.getTime()) {
    await CaptchaChallenge.deleteOne({ challenge_id: challengeId });
    return false;
  }

  const answerHash = crypto.createHash('sha256').update(answer).digest('hex');
  const isValid = answerHash === challenge.solution;

  if (isValid) {
    await CaptchaChallenge.deleteOne({ challenge_id: challengeId });
  }

  return isValid;
}
