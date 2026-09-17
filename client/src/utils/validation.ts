import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const verifyAlumniSchema = z.object({
  studentId: z.string().min(3, 'Student ID is required'),
  birthDate: z.string().min(1, 'Birthdate is required'),
});

export const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/;

export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be under 128 characters')
  .regex(
    strongPasswordRegex,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

export interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function checkPasswordCriteria(password: string): PasswordCriteria {
  return {
    minLength: (password || '').length >= 8,
    hasUpper: /[A-Z]/.test(password || ''),
    hasLower: /[a-z]/.test(password || ''),
    hasNumber: /\d/.test(password || ''),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password || ''),
  };
}

export function isPasswordStrong(password: string): boolean {
  const c = checkPasswordCriteria(password);
  return c.minLength && c.hasUpper && c.hasLower && c.hasNumber && c.hasSpecial;
}

export const registerSchema = z
  .object({
    studentId: z.string().min(3, 'Student ID is required'),
    birthDate: z.string().min(1, 'Birthdate is required'),
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    program: z.string().min(1, 'Program is required'),
    yearGraduated: z.string().min(4, 'Graduation year is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const mfaLoginSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code'),
});

export const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  headline: z.string().optional(),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  portfolioUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const employmentSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  position: z.string().min(1, 'Position is required'),
  employmentStatus: z.string().min(1, 'Status is required'),
  jobType: z.string().min(1, 'Job type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  salaryRange: z.string().optional(),
  description: z.string().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type VerifyAlumniFormData = z.infer<typeof verifyAlumniSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type MfaLoginFormData = z.infer<typeof mfaLoginSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type EmploymentFormData = z.infer<typeof employmentSchema>;
