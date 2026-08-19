import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/error.js';
import { verifyChallenge } from '../services/captchaService.js';

export async function verifyCaptcha(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { captcha_token, captcha_answer, captchaToken, captchaAnswer } = req.body;
    const token = captcha_token || captchaToken;
    const answer = captcha_answer || captchaAnswer;

    if (!token || !answer) {
      throw new AppError('Invalid CAPTCHA', 400);
    }

    const isValid = await verifyChallenge(token, String(answer));

    if (!isValid) {
      throw new AppError('Invalid CAPTCHA', 400);
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('CAPTCHA verification error:', error);
    res.status(500).json({ error: 'CAPTCHA verification failed' });
  }
}
