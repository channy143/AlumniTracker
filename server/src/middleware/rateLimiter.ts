import rateLimit from 'express-rate-limit';

// Global per-IP limiter applied to all API requests.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// Stricter limiter for authentication endpoints (login, register, OTP, password reset).
// Per-account brute-force protection is handled by the failedAuthTracker (5 failures ->
// escalating cooldown, reset on success). This global per-IP limiter is a coarse safety
// net only, so it is set high enough not to lock out a legitimate user who performs a
// handful of auth actions (logins, MFA, resends) from a shared IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
});

// Per-endpoint limiter for high-volume write endpoints (messaging, submissions).
export const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
