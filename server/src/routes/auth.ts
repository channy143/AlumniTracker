import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabase';
import { authenticate, getJwtSecret } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { sendOtpEmail } from '../services/email';
import {
  createOtp,
  verifyOtp,
  getOtpCooldownMs,
  recordMfaFailure,
  getMfaLockoutMs,
  resetMfaFailures,
} from '../services/otpService';
import {
  recordFailedAttempt,
  getCoolDownMs,
  resetFailedAttempts,
} from '../services/failedAuthTracker';
import {
  sendOtpSchema,
  forgotPasswordSchema,
  registerV2Schema,
  verifyAlumniSchema,
  loginSchema,
  mfaVerifySchema,
  mfaEnableSchema,
  mfaSendCodeSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} from '../middleware/validationSchemas';

const router = Router();

async function verifyTurnstileToken(token: string): Promise<boolean> {
  let secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return false;
  // Try configured key first, then test key as fallback for localhost
  for (const key of [secretKey, '1x0000000000000000000000000000000AA']) {
    try {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: key, response: token }),
      });
      const data = await res.json() as { success?: boolean };
      if (data.success === true) return true;
    } catch { /* skip */ }
  }
  return false;
}

// Normalize an account identifier for rate-limiting keying without revealing
// whether an account exists. We key on the normalized email + client IP.
function normalizedKey(email: string): string {
  return email.trim().toLowerCase();
}

// Client IP extraction (respects X-Forwarded-For behind proxies).
function clientIp(req: { ip?: string; headers: Record<string, any> }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || 'unknown';
}

/**
 * Sign an access token for a user, enforcing role-based lifetime.
 * Returns the raw JWT string.
 */
function signAccessToken(userId: string, email: string, role: string): string {
  const tokenExpiry = role === 'admin' ? '2h' : '7d';
  return jwt.sign({ userId, email, role }, getJwtSecret(), { expiresIn: tokenExpiry });
}

router.post('/send-otp', validate(sendOtpSchema), async (req, res, next) => {
  try {
    const { email, turnstileToken } = req.body;
    if (!email) throw new AppError('Email is required', 400);
    if (!turnstileToken) throw new AppError('Security check is required', 400);
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) throw new AppError('Security check failed. Please try again.', 400);

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new AppError('Email already registered', 400);
    }

    // Rate-limit: allow resend only after 30s
    const cooldown = await getOtpCooldownMs('register', email);
    if (cooldown > 0) {
      throw new AppError('Please wait before requesting a new OTP', 429);
    }

    const { code: otp } = await createOtp('register', email);

    await sendOtpEmail(email, otp);

    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    next(err);
  }
});

router.post('/register', validate(registerV2Schema), async (req, res, next) => {
  try {
    const { studentId, birthDate, firstName, lastName, email, password, program, yearGraduated, otp } = req.body;

    if (!otp) throw new AppError('OTP is required', 400);

    const otpValid = await verifyOtp('register', email, otp);
    if (!otpValid) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Verify the student ID + birthdate against the eligible-alumni registry.
    const { data: eligible, error } = await supabase
      .from('alumni_eligible')
      .select('id, student_id, birth_date, user_id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error && error.code === '42P01') {
      throw new AppError('Alumni registry is not configured', 500);
    }
    if (error) throw new AppError(error.message, 500);

    if (!eligible) {
      throw new AppError('We could not verify your alumni information. Please contact the registrar.', 400);
    }

    const storedDate = new Date(eligible.birth_date);
    const inputDate = new Date(birthDate);
    const datesMatch =
      !isNaN(storedDate.getTime()) &&
      !isNaN(inputDate.getTime()) &&
      storedDate.getUTCFullYear() === inputDate.getUTCFullYear() &&
      storedDate.getUTCMonth() === inputDate.getUTCMonth() &&
      storedDate.getUTCDate() === inputDate.getUTCDate();

    if (!datesMatch) {
      throw new AppError('We could not verify your alumni information. Please contact the registrar.', 400);
    }

    if (eligible.user_id) {
      throw new AppError('An account for this alumni record already exists. Please sign in.', 409);
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new AppError('Email already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        role: 'alumni',
        is_verified: true,
      })
      .select('id, email, role')
      .single();

    if (userError) throw new AppError(userError.message, 500);

    let profileInsertPayload: Record<string, any> = {
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      country: 'Philippines',
      birth_date: birthDate,
      id_number: studentId,
    };
    const { data: profileRecord, error: profileError } = await supabase.from('profiles').insert(profileInsertPayload).select('id').single();

    if (profileError) {
      console.error('[Register] Profile insert error:', profileError);
      throw new AppError('Failed to create profile', 500);
    }

    const { error: eduError } = await supabase.from('education').insert({
      profile_id: profileRecord.id,
      program,
      year_graduated: parseInt(yearGraduated),
      campus: 'Naga Extension Campus',
    });

    if (eduError) {
      console.error('[Register] Education insert error:', eduError);
    }

    // Link the eligible registry record to the newly created account so the
    // student ID cannot be re-registered.
    await supabase.from('alumni_eligible').update({ user_id: user.id }).eq('id', eligible.id);

    const token = signAccessToken(user.id, user.email, user.role);

    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const identifier = normalizedKey(email);
    const ip = clientIp(req);

    const user = await supabase
      .from('users')
      .select('id, email, password_hash, role, mfa_enabled')
      .eq('email', email)
      .single();

    // Regardless of whether the account exists, if this (email, IP) is
    // temporarily rate-limited, block with 429 and a generic message.
    const cooldown = getCoolDownMs(identifier, ip);

    const exists = !user.error && user.data;
    const passwordOk = exists
      ? await bcrypt.compare(password, (user.data as any).password_hash).catch(() => false)
      : false;

    if (!exists || !passwordOk) {
      const attempts = recordFailedAttempt(identifier, ip);
      if (attempts >= 5 || getCoolDownMs(identifier, ip) > 0) {
        return res.status(429).json({ message: 'Too many unsuccessful attempts. Please try again later.' });
      }
      // Generic message whether the account is missing or the password is wrong.
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const record = user.data as any;

    // Successful password match -> clear failed counters.
    resetFailedAttempts(identifier, ip);

    // If MFA is enabled, do NOT issue a full token yet. Issue an MFA challenge
    // JWT and require a verified code before completing authentication.
    if (record.mfa_enabled) {
      const mfaPending = jwt.sign(
        { userId: record.id, email: record.email, role: record.role, mfa: 'pending' },
        getJwtSecret(),
        { expiresIn: '10m' },
      );
      return res.json({ requiresMfa: true, mfaToken: mfaPending });
    }

    const token = signAccessToken(record.id, record.email, record.role);
    return res.json({
      user: { id: record.id, email: record.email, role: record.role },
      token,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Step 2 of MFA login: verify the emailed code and complete authentication.
 */
router.post('/mfa-verify', validate(mfaVerifySchema), async (req, res, next) => {
  try {
    const { email, otp, mfaToken } = req.body;
    const ip = clientIp(req);

    let decoded: any;
    try {
      decoded = jwt.verify(mfaToken, getJwtSecret()) as any;
    } catch {
      throw new AppError('Invalid or expired verification token', 401);
    }
    if (decoded.mfa !== 'pending') {
      throw new AppError('Invalid verification token', 401);
    }
    // Ensure the MFA step is tied to the account that requested it.
    if (decoded.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new AppError('Invalid verification token', 401);
    }

    const lockout = getMfaLockoutMs(email);
    if (lockout > 0) {
      return res.status(429).json({ message: 'Too many unsuccessful attempts. Please try again later.' });
    }

    const otpValid = await verifyOtp('mfa', email, otp);
    if (!otpValid) {
      recordMfaFailure(email);
      return res.status(401).json({ message: 'Invalid or expired verification code.' });
    }

    resetMfaFailures(email);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role')
      .eq('email', email)
      .single();
    if (error || !user) throw new AppError('Invalid email or password.', 401);

    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);
    const token = signAccessToken(user.id, user.email, user.role);
    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Verify a Student ID + Birthdate against the eligible-alumni registry.
 * Returns only a boolean-ish confirmation; never leaks other record data.
 */
router.post('/verify-alumni', validate(verifyAlumniSchema), async (req, res, next) => {
  try {
    const { studentId, birthDate } = req.body;

    const { data, error } = await supabase
      .from('alumni_eligible')
      .select('id, student_id, first_name, last_name, program, year_graduated, user_id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error && error.code === '42P01') {
      throw new AppError('Alumni registry is not configured', 500);
    }
    if (error) throw new AppError(error.message, 500);

    if (!data) {
      // Do not reveal whether the student ID exists.
      throw new AppError('We could not verify your alumni information. Please contact the registrar.', 400);
    }

    const { data: record, error: recError } = await supabase
      .from('alumni_eligible')
      .select('birth_date')
      .eq('id', data.id)
      .single();

    if (recError || !record) {
      throw new AppError('We could not verify your alumni information. Please contact the registrar.', 400);
    }

    const storedDate = new Date(record.birth_date);
    const inputDate = new Date(birthDate);
    const datesMatch =
      !isNaN(storedDate.getTime()) &&
      !isNaN(inputDate.getTime()) &&
      storedDate.getUTCFullYear() === inputDate.getUTCFullYear() &&
      storedDate.getUTCMonth() === inputDate.getUTCMonth() &&
      storedDate.getUTCDate() === inputDate.getUTCDate();

    if (!datesMatch) {
      // Generic failure — avoid confirming the ID exists.
      throw new AppError('We could not verify your alumni information. Please contact the registrar.', 400);
    }

    // If the eligible record is already linked to a registered account,
    // block duplicate registration.
    if (data.user_id) {
      throw new AppError('An account for this alumni record already exists. Please sign in.', 409);
    }

    // The person can only reach this point by knowing their own Student ID
    // and Birthdate, so returning their own record fields (name / program /
    // year) is safe and lets the form auto-fill instead of re-typing them.
    res.json({
      verified: true,
      identity: {
        studentId: data.student_id,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        program: data.program || '',
        yearGraduated: data.year_graduated != null ? String(data.year_graduated) : '',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email, turnstileToken } = req.body;
    if (!email) throw new AppError('Email is required', 400);
    if (!turnstileToken) throw new AppError('Security check is required', 400);
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) throw new AppError('Security check failed. Please try again.', 400);

    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new AppError('No account found with this email', 404);
    }

    const cooldown = await getOtpCooldownMs('reset', email);
    if (cooldown > 0) {
      throw new AppError('Please wait before requesting a new code', 429);
    }

    const { code: otp } = await createOtp('reset', email);

    await sendOtpEmail(email, otp);

    res.json({ message: 'Reset code sent to email' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) throw new AppError('Email, OTP, and new password are required', 400);

    const otpValid = await verifyOtp('reset', email, otp);
    if (!otpValid) {
      throw new AppError('Invalid or expired reset code', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('email', email);

    if (error) throw new AppError(error.message, 500);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', authenticate, validate(changePasswordSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new AppError('Current password and new password are required', 400);
    if (newPassword.length < 6) throw new AppError('New password must be at least 6 characters', 400);

    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user!.userId)
      .single();

    if (error || !user) throw new AppError('User not found', 404);

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new AppError('Current password is incorrect', 401);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', req.user!.userId);

    if (updateError) throw new AppError(updateError.message, 500);

    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
});

router.post('/send-verification', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('email, is_verified')
      .eq('id', req.user!.userId)
      .single();

    if (!user) throw new AppError('User not found', 404);
    if (user.is_verified) throw new AppError('Email is already verified', 400);

    const email = user.email;
    const cooldown = await getOtpCooldownMs('verify', email);
    if (cooldown > 0) {
      throw new AppError('Please wait before requesting a new code', 429);
    }

    const { code: otp } = await createOtp('verify', email);

    await sendOtpEmail(email, otp);

    res.json({ message: 'Verification code sent to email' });
  } catch (err) { next(err); }
});

router.post('/verify-email', authenticate, validate(verifyEmailSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) throw new AppError('Verification code is required', 400);

    const { data: user } = await supabase
      .from('users')
      .select('email, is_verified')
      .eq('id', req.user!.userId)
      .single();

    if (!user) throw new AppError('User not found', 404);
    if (user.is_verified) throw new AppError('Email is already verified', 400);

    const otpValid = await verifyOtp('verify', user.email, otp);
    if (!otpValid) {
      throw new AppError('Invalid or expired verification code', 400);
    }

    const { error } = await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('id', req.user!.userId);

    if (error) throw new AppError(error.message, 500);

    res.json({ message: 'Email verified successfully' });
  } catch (err) { next(err); }
});

router.post('/send-mfa-code', authenticate, validate(mfaSendCodeSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { email } = req.body;
    // Only allow sending an MFA code to the authenticated user's own email.
    if (req.user?.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new AppError('Forbidden', 403);
    }

    const cooldown = await getOtpCooldownMs('mfa', email);
    if (cooldown > 0) {
      throw new AppError('Please wait before requesting a new code', 429);
    }

    const { code: otp } = await createOtp('mfa', email);
    await sendOtpEmail(email, otp);
    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    next(err);
  }
});

router.post('/enable-mfa', authenticate, validate(mfaEnableSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { email, otp } = req.body;
    if (req.user?.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new AppError('Forbidden', 403);
    }

    const otpValid = await verifyOtp('mfa', email, otp);
    if (!otpValid) throw new AppError('Invalid or expired verification code', 400);

    resetMfaFailures(email);
    const { error } = await supabase
      .from('users')
      .update({ mfa_enabled: true })
      .eq('id', req.user!.userId);
    if (error) throw new AppError(error.message, 500);

    res.json({ message: 'MFA enabled successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/disable-mfa', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ mfa_enabled: false })
      .eq('id', req.user!.userId);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'MFA disabled' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, is_verified, last_login, created_at, mfa_enabled')
      .eq('id', req.user!.userId)
      .single();

    if (error) throw new AppError('User not found', 404);

    let firstName = '';
    let lastName = '';
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', req.user!.userId)
      .single();
    if (profile) {
      firstName = profile.first_name || '';
      lastName = profile.last_name || '';
    }

    res.json({ user: { ...user, first_name: firstName, last_name: lastName } });
  } catch (err) {
    next(err);
  }
});

export default router;
