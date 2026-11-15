import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';
import { getJwtSecret } from './auth';
import { getAdminSecurityPolicy } from '../services/sessionSecurityService';

export const ADMIN_SUDO_COOKIE = 'ctu_admin_sudo';
const SUDO_TTL_SECONDS = 10 * 60; // 10 minutes

export function signAdminSudoCookie(res: Response, userId: string): void {
  const token = jwt.sign(
    { userId, type: 'admin_sudo' },
    getJwtSecret(),
    { expiresIn: SUDO_TTL_SECONDS },
  );
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(ADMIN_SUDO_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/admin',
    maxAge: SUDO_TTL_SECONDS * 1000,
  });
}

export function clearAdminSudoCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(ADMIN_SUDO_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/admin',
  });
}

export async function requireAdminSudo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const policy = await getAdminSecurityPolicy();
    if (!policy.requireSudoForSensitive) {
      return next();
    }

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }

    const sudoToken = (req as any).cookies?.[ADMIN_SUDO_COOKIE];
    if (!sudoToken) {
      return res.status(403).json({
        code: 'SUDO_REQUIRED',
        message: 'Please confirm your password to perform this sensitive action.',
      });
    }

    const decoded = jwt.verify(sudoToken, getJwtSecret()) as any;
    if (decoded?.type !== 'admin_sudo' || decoded?.userId !== req.user.userId) {
      return res.status(403).json({
        code: 'SUDO_REQUIRED',
        message: 'Please confirm your password to perform this sensitive action.',
      });
    }

    return next();
  } catch {
    return res.status(403).json({
      code: 'SUDO_REQUIRED',
      message: 'Your security confirmation expired. Please re-enter your password.',
    });
  }
}

