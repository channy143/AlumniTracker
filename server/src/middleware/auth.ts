import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthPayload } from '../types';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long');
  return secret;
}

const MAX_ADMIN_TOKEN_AGE_SECONDS = 2 * 60 * 60; // 2 hours

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as AuthPayload;

    // Enforce shorter max lifetime for admin tokens
    if (decoded.role === 'admin' && typeof decoded.iat === 'number') {
      const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
      if (tokenAge > MAX_ADMIN_TOKEN_AGE_SECONDS) {
        return res.status(401).json({ message: 'Admin token has expired. Please log in again.' });
      }
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}
