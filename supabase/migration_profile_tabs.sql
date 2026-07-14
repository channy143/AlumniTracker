-- Add user_id to feed_post_comments for per-user comment queries
ALTER TABLE public.feed_post_comments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Saved jobs table
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved jobs" ON public.saved_jobs FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);

-- Featured links for profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS featured_links JSONB DEFAULT '[]'::jsonb;

-- Resume upload
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;
