-- Mentorship Discovery Migration
-- Add available_for_mentoring column to profiles

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS available_for_mentoring BOOLEAN DEFAULT FALSE;

-- Create index for fast mentor discovery
CREATE INDEX IF NOT EXISTS idx_profiles_available_for_mentoring 
ON public.profiles(available_for_mentoring) 
WHERE available_for_mentoring = TRUE;

-- Update RLS policies to allow viewing available mentors
-- Profiles already have: "Profiles are viewable by authenticated users" SELECT policy
-- This allows authenticated users to see profiles where available_for_mentoring = true