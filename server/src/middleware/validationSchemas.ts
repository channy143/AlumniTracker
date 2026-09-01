import { z } from 'zod';

// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------

export const sendOtpSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  turnstileToken: z.string().min(1, 'Security check is required').max(2048),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  turnstileToken: z.string().min(1, 'Security check is required').max(2048),
}).strict();

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Valid email is required').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  program: z.string().min(1, 'Program is required').max(200),
  yearGraduated: z.string().min(1).max(10),
  idNumber: z.string().max(50).optional().or(z.literal('')),
  otp: z.string().min(6).max(6),
}).strict();

export const loginSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  password: z.string().min(1, 'Password is required').max(128),
}).strict();

export const resetPasswordSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  otp: z.string().min(6).max(6),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
}).strict();

export const verifyEmailSchema = z.object({
  otp: z.string().min(6).max(6),
}).strict();

// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

export const updateProfileSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  middle_name: z.string().max(100).optional().nullable(),
  email: z.string().email('Valid email is required').max(255).optional(),
  phone: z.string().max(20).optional().nullable(),
  birth_date: z.string().max(20).optional().nullable(),
  gender: z.string().max(10).optional().nullable(),
  address: z.string().max(5000).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  id_number: z.string().max(50).optional().nullable(),
  headline: z.string().max(200).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
  linkedin_url: z.string().url().max(500).optional().nullable(),
  github_url: z.string().url().max(500).optional().nullable(),
  portfolio_url: z.string().url().max(500).optional().nullable(),
}).strict();

export const updateCareerSchema = z.object({
  employment_status: z.enum(['Employed', 'Unemployed', 'Self-employed', 'Seeking Opportunities', 'Retired']).nullable().optional(),
  current_job_title: z.string().max(200).optional().nullable(),
  company_name: z.string().max(200).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  salary_range: z.string().max(50).optional().nullable(),
}).strict();

export const addSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(100),
  category: z.string().max(100).optional().nullable(),
  proficiency_level: z.number().int().min(1).max(5).optional(),
}).strict();

export const batchSkillsSchema = z.object({
  skills: z.array(z.union([
    z.string().max(100),
    z.object({
      name: z.string().min(1).max(100),
      category: z.string().max(100).optional().nullable(),
      proficiency_level: z.number().int().min(1).max(5).optional(),
    }).strict(),
  ])).max(200),
}).strict();

export const addEducationSchema = z.object({
  program: z.string().min(1, 'Program is required').max(200),
  major: z.string().max(200).optional().nullable(),
  year_started: z.number().int().min(1900).max(2100).optional().nullable(),
  year_graduated: z.number().int().min(1900).max(2100).optional().nullable(),
  campus: z.string().max(200).optional().nullable(),
  institution: z.string().max(200).optional().nullable(),
  honors: z.string().max(200).optional().nullable(),
}).strict();

export const addCertificationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  issuer: z.string().min(1, 'Issuer is required').max(200),
  issue_date: z.string().min(1, 'Issue date is required').max(20),
  expiry_date: z.string().max(20).optional().nullable(),
  credential_url: z.string().url().max(500).optional().nullable(),
}).strict();

export const addAchievementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  date_achieved: z.string().max(20).optional().nullable(),
}).strict();

// -----------------------------------------------------------------------------
// Jobs
// -----------------------------------------------------------------------------

export const applyJobSchema = z.object({
  cover_letter: z.string().max(10000).optional(),
}).strict();

// -----------------------------------------------------------------------------
// Messages
// -----------------------------------------------------------------------------

export const sendMessageSchema = z.object({
  receiver_id: z.string().min(1, 'Receiver is required').max(64),
  subject: z.string().max(300).optional().nullable(),
  body: z.string().min(1, 'Message body is required').max(10000),
  connection_id: z.string().max(64).optional().nullable(),
}).strict();

// -----------------------------------------------------------------------------
// Connections
// -----------------------------------------------------------------------------

export const connectionRequestSchema = z.object({
  recipient_id: z.string().min(1, 'Recipient is required').max(64),
  message: z.string().max(2000).optional().nullable(),
}).strict();

export const connectionRespondSchema = z.object({
  status: z.enum(['accepted', 'declined']),
}).strict();

// -----------------------------------------------------------------------------
// Mentorship
// -----------------------------------------------------------------------------

export const mentorshipApplySchema = z.object({
  mentor_id: z.string().min(1, 'Mentor is required').max(64),
  goals: z.string().max(5000).optional().nullable(),
}).strict();

export const mentorshipUpdateSchema = z.object({
  status: z.enum(['pending', 'active', 'completed', 'cancelled']),
}).strict();

// -----------------------------------------------------------------------------
// Referrals
// -----------------------------------------------------------------------------

export const createReferralSchema = z.object({
  recipient_id: z.string().min(1, 'Recipient is required').max(64),
  job_id: z.string().max(64).optional().nullable(),
  company_id: z.string().max(64).optional().nullable(),
  position_title: z.string().max(200).optional().nullable(),
  company_name: z.string().max(200).optional().nullable(),
  message: z.string().max(5000).optional().nullable(),
}).strict();

export const referralRespondSchema = z.object({
  status: z.enum(['accepted', 'declined', 'completed']),
}).strict();

// -----------------------------------------------------------------------------
// Admin: Jobs
// -----------------------------------------------------------------------------

const httpsUrl = z.string().url('Must be a valid URL').max(500)
  .refine((u) => /^https:\/\//i.test(u), 'URL must be an https:// URL');

export const adminCreateJobSchema = z.object({
  company_id: z.string().min(1, 'Company is required').max(64),
  position: z.string().min(1, 'Position is required').max(200),
  description: z.string().min(1, 'Description is required').max(50000),
  requirements: z.array(z.string().max(2000)).max(500).optional(),
  location: z.string().min(1, 'Location is required').max(200),
  job_type: z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship']).optional(),
  salary_range: z.string().max(50).optional().nullable(),
  application_url: httpsUrl.optional().nullable(),
  is_alumni_exclusive: z.boolean().optional(),
  expires_at: z.string().max(50).optional(),
  industry: z.string().max(100).optional().nullable(),
  required_skills: z.array(z.string().max(100)).max(500).optional(),
  experience_level: z.enum(['entry', 'junior', 'mid', 'senior', 'lead', 'executive']).optional(),
  is_remote: z.boolean().optional(),
}).strict();

// Admin update schema: all fields optional but each validated
export const adminUpdateJobSchema = z.object({
  company_id: z.string().max(64).optional(),
  position: z.string().max(200).optional(),
  description: z.string().max(50000).optional(),
  requirements: z.array(z.string().max(2000)).max(500).optional(),
  location: z.string().max(200).optional(),
  job_type: z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship']).optional(),
  salary_range: z.string().max(50).optional().nullable(),
  application_url: httpsUrl.optional().nullable(),
  is_alumni_exclusive: z.boolean().optional(),
  expires_at: z.string().max(50).optional(),
  industry: z.string().max(100).optional().nullable(),
  required_skills: z.array(z.string().max(100)).max(500).optional(),
  experience_level: z.enum(['entry', 'junior', 'mid', 'senior', 'lead', 'executive']).optional(),
  is_remote: z.boolean().optional(),
}).strict();

export const applicationStatusSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected']),
}).strict();

// -----------------------------------------------------------------------------
// Admin: Users
// -----------------------------------------------------------------------------

export const adminCreateUserSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['admin', 'staff', 'alumni']).optional(),
}).strict();

export const adminUpdateUserSchema = z.object({
  email: z.string().email('Valid email is required').max(255).optional(),
  is_active: z.boolean().optional(),
  is_archived: z.boolean().optional(),
}).strict();

export const adminRoleSchema = z.object({
  role: z.enum(['admin', 'staff', 'alumni']),
}).strict();

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(128),
}).strict();
