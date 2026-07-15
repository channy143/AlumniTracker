-- Add id_number column to profiles table if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_number VARCHAR(50) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_id_number ON public.profiles(id_number);
