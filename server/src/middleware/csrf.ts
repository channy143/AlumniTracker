import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getAllowedOrigins(req: Request): Set<string> {
  const allowed = new Set<string>([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ]);

  const clientUrl = process.env.CLIENT_URL;
  if (clientUrl) {
    clientUrl
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean)
      .forEach((origin) => allowed.add(origin));
  }

  const host = req.headers.host;
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }

  return allowed;
}

function extractOrigin(headerVal?: string): string | null {
  if (!headerVal) return null;
  try {
    return new URL(headerVal).origin;
  } catch {
    return null;
  }
}

/**
 * Origin/Referer CSRF check for cookie-authenticated mutating requests.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const originHeader = req.headers.origin as string | undefined;
  const refererHeader = req.headers.referer as string | undefined;
  const requestOrigin = extractOrigin(originHeader) || extractOrigin(refererHeader);

  if (requestOrigin) {
    const allowed = getAllowedOrigins(req);
    if (!allowed.has(requestOrigin)) {
      return res.status(403).json({
        code: 'CSRF_FORBIDDEN',
        message: 'Cross-origin state-changing request blocked by CSRF policy.',
      });
    }
  }

  next();
}

