-- Migration: Track survey compliance reminders sent by administrators
-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.survey_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'both',
  tone VARCHAR(20) NOT NULL DEFAULT 'standard',
  subject TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_reminders_survey_user_sent
  ON public.survey_reminders (survey_id, user_id, sent_at DESC);

ALTER TABLE public.survey_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage survey reminders" ON public.survey_reminders;
CREATE POLICY "Admins manage survey reminders"
  ON public.survey_reminders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );
