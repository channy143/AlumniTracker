export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  avatar_url?: string;
  headline?: string;
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  privacy_settings: PrivacySettings;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  show_email: boolean;
  show_phone: boolean;
  show_address: boolean;
  show_employment: boolean;
}

export interface Education {
  id: string;
  profile_id: string;
  program: string;
  major?: string;
  year_started: number;
  year_graduated: number;
  campus: string;
  honors?: string;
  created_at: string;
}

export interface Employment {
  id: string;
  profile_id: string;
  company_name: string;
  company_industry?: string;
  position: string;
  employment_status: EmploymentStatus;
  job_type: JobType;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  salary_range?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type EmploymentStatus =
  | 'employed'
  | 'self-employed'
  | 'unemployed'
  | 'seeking'
  | 'entrepreneur'
  | 'retired';

export type JobType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';

export interface Skill {
  id: string;
  profile_id: string;
  name: string;
  category: string;
  proficiency_level: number;
  is_verified: boolean;
  created_at: string;
}

export interface Certification {
  id: string;
  profile_id: string;
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date?: string;
  credential_url?: string;
  created_at: string;
}

export interface Mentorship {
  id: string;
  mentor_id: string;
  mentee_id: string;
  program_id?: string;
  status: MentorshipStatus;
  goals?: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export type MentorshipStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  category: GroupCategory;
  member_count: number;
  created_by: string;
  created_at: string;
}

export type GroupCategory = 'tech' | 'business' | 'education' | 'entrepreneurship' | 'general';

export interface ForumPost {
  id: string;
  group_id: string;
  author_id: string;
  title: string;
  content: string;
  tags: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  company_name: string;
  company_logo?: string;
  position: string;
  description: string;
  requirements: string[];
  location: string;
  job_type: JobType;
  salary_range?: string;
  application_url?: string;
  posted_by: string;
  is_alumni_exclusive: boolean;
  expires_at: string;
  created_at: string;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  target_groups: string[];
  is_active: boolean;
  starts_at: string;
  expires_at: string;
  created_at: string;
}

export interface SurveyQuestion {
  id: string;
  type: 'mcq' | 'rating' | 'text' | 'scale';
  question: string;
  options?: string[];
  required: boolean;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;
  modality: 'online' | 'in-person' | 'hybrid';
  location?: string;
  meeting_url?: string;
  starts_at: string;
  ends_at: string;
  max_participants?: number;
  created_by: string;
  created_at: string;
}

export type EventType = 'reunion' | 'webinar' | 'networking' | 'workshop' | 'other';

export interface Analytics {
  total_alumni: number;
  employed_percentage: number;
  average_salary?: number;
  top_industries: { name: string; count: number }[];
  programs: { name: string; count: number }[];
  yearly_graduates: { year: number; count: number }[];
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'staff' | 'alumni';
  is_verified: boolean;
  created_at: string;
  first_name?: string;
  last_name?: string;
}
