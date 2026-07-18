ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10);
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS target_type VARCHAR(20) DEFAULT 'all' CHECK (target_type IN ('all', 'course', 'batch'));
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS target_value VARCHAR(200);
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed'));
