import rateLimit from 'express-rate-limit';

// Global per-IP limiter applied to all API requests.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 2500 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.NODE_ENV !== 'production' ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip === 'localhost' ||
    Boolean(req.ip?.includes('127.0.0.1')),
  message: { message: 'Too many requests, please try again later.' },
});

// Stricter limiter for authentication endpoints (login, register, OTP, password reset).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.NODE_ENV !== 'production' &&
    (req.ip === '127.0.0.1' || req.ip === '::1' || Boolean(req.ip?.includes('127.0.0.1'))),
  message: { message: 'Too many authentication attempts, please try again later.' },
});

// Per-endpoint limiter for high-volume write endpoints (messaging, submissions).
// Only applies to mutating methods (POST, PUT, DELETE, PATCH). GET/OPTIONS/HEAD are exempt.
export const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 500 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.method === 'GET' ||
    req.method === 'OPTIONS' ||
    req.method === 'HEAD' ||
    process.env.NODE_ENV !== 'production' ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip === 'localhost' ||
    Boolean(req.ip?.includes('127.0.0.1')),
  message: { message: 'Too many write requests, please try again later.' },
});

