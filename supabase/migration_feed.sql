-- Feed System for Alumni Dashboard
-- Enables Reddit-style feed posts, comments, and likes

CREATE TABLE IF NOT EXISTS public.feed_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'job', 'announcement', 'event', 'discussion', 'guide')),
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(200) NOT NULL,
  author_avatar VARCHAR(10) NOT NULL DEFAULT 'C',
  image_url TEXT,
  company VARCHAR(200),
  job_url VARCHAR(500),
  tag VARCHAR(100),
  tag_color VARCHAR(100) DEFAULT 'bg-blue-50 text-blue-700',
  is_official BOOLEAN DEFAULT FALSE,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feed_post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
  author VARCHAR(200) NOT NULL,
  author_avatar VARCHAR(10) NOT NULL DEFAULT '?',
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feed_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(post_id, user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_name VARCHAR(200) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policies: anyone authenticated can read
CREATE POLICY "Anyone can read feed posts" ON public.feed_posts FOR SELECT USING (true);
CREATE POLICY "Anyone can read comments" ON public.feed_post_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can read likes" ON public.feed_post_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can read activity log" ON public.activity_log FOR SELECT USING (true);

-- Only authenticated users can insert comments/likes
CREATE POLICY "Authenticated users can comment" ON public.feed_post_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can like" ON public.feed_post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can unlike" ON public.feed_post_likes FOR DELETE USING (true);
CREATE POLICY "Authenticated users can insert activity" ON public.activity_log FOR INSERT WITH CHECK (true);
