CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(500),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS linked_survey_id UUID REFERENCES public.surveys(id) ON DELETE SET NULL;
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS linked_survey_id UUID REFERENCES public.surveys(id) ON DELETE SET NULL;
