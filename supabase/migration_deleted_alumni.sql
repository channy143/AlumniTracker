  -- Migration: Soft-delete trash bin for deleted alumni so admins can restore them
CREATE TABLE IF NOT EXISTS public.deleted_alumni (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_user_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  id_number VARCHAR(50),
  program VARCHAR(255),
  batch_year VARCHAR(20),
  snapshot JSONB NOT NULL,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deleted_alumni_deleted_at ON public.deleted_alumni(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_alumni_original_user_id ON public.deleted_alumni(original_user_id);

ALTER TABLE public.deleted_alumni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage deleted_alumni" ON public.deleted_alumni;
CREATE POLICY "Admins can manage deleted_alumni"
  ON public.deleted_alumni FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

