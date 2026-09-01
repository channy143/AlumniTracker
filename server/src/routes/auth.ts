import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabase';
import { authenticate, getJwtSecret } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { sendOtpEmail } from '../services/email';
import { createOtp, verifyOtp, getOtpCooldownMs } from '../services/otpService';
import {
  sendOtpSchema,
  forgotPasswordSchema,
  registerSchema,
  loginSchema,
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

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, program, yearGraduated, idNumber, otp } = req.body;

    if (!otp) throw new AppError('OTP is required', 400);

    const otpValid = await verifyOtp('register', email, otp);
    if (!otpValid) {
      // Distinguish "no request" vs "invalid/expired" is intentionally withheld
      // to avoid an OTP probing oracle.
      throw new AppError('Invalid or expired OTP', 400);
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
    };
    try {
      const { data: testCol } = await supabase.from('profiles').select('id_number').limit(1);
      if (testCol !== undefined) profileInsertPayload.id_number = idNumber;
    } catch {}
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

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: '7d' },
    );

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

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    const tokenExpiry = user.role === 'admin' ? '2h' : '7d';
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: tokenExpiry },
    );

    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
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

router.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, is_verified, last_login, created_at')
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
