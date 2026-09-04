-- Create announcements table if missing
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  document_url TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  send_to_all BOOLEAN DEFAULT FALSE,
  send_by_batch BOOLEAN DEFAULT FALSE,
  send_by_course BOOLEAN DEFAULT FALSE,
  target_batches INTEGER[] DEFAULT '{}',
  target_courses VARCHAR(100)[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
