import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthPayload } from '../types';
import { isTokenRevoked } from '../services/revokedTokenService';
import { markUserActive } from '../services/presenceService';
import { supabase } from '../services/supabase';
import { isTokenBeforeSessionCutoff } from '../services/sessionSecurityService';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long');
  return secret;
}

const MAX_ADMIN_TOKEN_AGE_SECONDS = 2 * 60 * 60; // 2 hours

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const cookieToken = (req as any).cookies?.ctu_access_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
  const token = cookieToken || bearerToken;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as AuthPayload;

    // Refresh tokens cannot be used as access tokens
    if ((decoded as any).type === 'refresh') {
      return res.status(401).json({ message: 'Invalid access token' });
    }

    // Check if token has been revoked / logged out (Rule 6)
    const revoked = await isTokenRevoked(token);
    if (revoked) {
      return res.status(401).json({ message: 'Session has been logged out. Please log in again.' });
    }

    // Pending MFA challenge tokens cannot access authenticated routes
    if ((decoded as any).mfa === 'pending') {
      return res.status(401).json({ message: 'MFA verification required' });
    }

    // Enforce shorter max lifetime for admin tokens
    if (decoded.role === 'admin' && typeof decoded.iat === 'number') {
      const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
      if (tokenAge > MAX_ADMIN_TOKEN_AGE_SECONDS) {
        return res.status(401).json({ message: 'Admin token has expired. Please log in again.' });
      }
    }

    // Verify account still exists, is active/not archived, and token wasn't issued before cutoff
    let userRec: any = null;
    let userErr: any = null;
    const primaryRes = await supabase
      .from('users')
      .select('id, is_active, is_archived, token_valid_after')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (primaryRes.error && primaryRes.error.code === '42703') {
      const fallbackRes = await supabase
        .from('users')
        .select('id, is_active, is_archived')
        .eq('id', decoded.userId)
        .maybeSingle();
      userRec = fallbackRes.data;
      userErr = fallbackRes.error;
    } else {
      userRec = primaryRes.data;
      userErr = primaryRes.error;
    }

    if (!userErr && !userRec) {
      return res.status(401).json({
        code: 'ACCOUNT_DELETED',
        message: 'Your account has been deleted by an administrator.',
      });
    }

    if (!userErr && userRec && (userRec.is_active === false || userRec.is_archived)) {
      return res.status(401).json({
        code: 'ACCOUNT_DISABLED',
        message: 'Your account has been deactivated or archived by an administrator.',
      });
    }

    if (isTokenBeforeSessionCutoff(decoded.userId, decoded.iat, userRec?.token_valid_after)) {
      return res.status(401).json({
        message: 'Session invalidated due to a security or role update. Please log in again.',
      });
    }

    req.user = decoded;
    req.token = token;

    // Mark user active in real-time presence service
    markUserActive(decoded.userId).catch(() => {});

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
