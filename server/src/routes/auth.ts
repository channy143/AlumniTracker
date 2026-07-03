import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { sendOtpEmail } from '../services/email';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// In-memory OTP store (keyed by email)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/send-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400);

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new AppError('Email already registered', 400);
    }

    // Rate-limit: allow resend only after 30s
    const existingEntry = otpStore.get(email);
    if (existingEntry && Date.now() - (existingEntry.expiresAt - 600000) < 30000) {
      throw new AppError('Please wait before requesting a new OTP', 429);
    }

    const otp = generateOtp();
    otpStore.set(email, { otp, expiresAt: Date.now() + 600000 }); // 10 min expiry

    await sendOtpEmail(email, otp);

    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, program, yearGraduated, idNumber, otp } = req.body;

    if (!otp) throw new AppError('OTP is required', 400);

    const stored = otpStore.get(email);
    if (!stored) throw new AppError('No OTP requested for this email', 400);
    if (Date.now() > stored.expiresAt) throw new AppError('OTP has expired', 400);
    if (stored.otp !== otp) throw new AppError('Invalid OTP', 400);

    otpStore.delete(email);

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
      .select()
      .single();

    if (userError) throw new AppError(userError.message, 500);

    await supabase.from('profiles').insert({
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      id_number: idNumber || null,
    });

    await supabase.from('education').insert({
      profile_id: user.id,
      program,
      year_graduated: parseInt(yearGraduated),
      campus: 'Naga Extension Campus',
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
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

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400);

    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new AppError('No account found with this email', 404);
    }

    const existingEntry = otpStore.get(`reset:${email}`);
    if (existingEntry && Date.now() - (existingEntry.expiresAt - 600000) < 30000) {
      throw new AppError('Please wait before requesting a new code', 429);
    }

    const otp = generateOtp();
    otpStore.set(`reset:${email}`, { otp, expiresAt: Date.now() + 600000 });

    await sendOtpEmail(email, otp);

    res.json({ message: 'Reset code sent to email' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) throw new AppError('Email, OTP, and new password are required', 400);

    const stored = otpStore.get(`reset:${email}`);
    if (!stored) throw new AppError('No reset code requested for this email', 400);
    if (Date.now() > stored.expiresAt) throw new AppError('Reset code has expired', 400);
    if (stored.otp !== otp) throw new AppError('Invalid reset code', 400);

    otpStore.delete(`reset:${email}`);

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

router.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, is_verified, created_at')
      .eq('id', req.user!.userId)
      .single();

    if (error) throw new AppError('User not found', 404);

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
