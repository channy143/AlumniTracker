-- =============================================
-- FEED SYSTEM: Run this in Supabase SQL Editor
-- Creates tables + seeds welcome posts
-- =============================================

-- 1. Create tables
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

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feed posts" ON public.feed_posts FOR SELECT USING (true);
CREATE POLICY "Anyone can read comments" ON public.feed_post_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can read likes" ON public.feed_post_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can read activity log" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.feed_post_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can like" ON public.feed_post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can unlike" ON public.feed_post_likes FOR DELETE USING (true);
CREATE POLICY "Authenticated users can insert activity" ON public.activity_log FOR INSERT WITH CHECK (true);

-- 2. Seed welcome posts (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.feed_posts LIMIT 1) THEN
    INSERT INTO public.feed_posts (type, title, content, author, author_avatar, tag, tag_color, is_official, image_url, like_count, comment_count, created_at) VALUES
    ('announcement', 'Welcome to CTU-Naga Extension Campus Alumni Network', 'We are thrilled to welcome you to the official alumni network of CTU-Naga Extension Campus! This platform is designed to help you connect with fellow alumni, discover career opportunities, find mentors, and stay updated with campus events. Please take a moment to complete your profile and make the most of your alumni experience.', 'CTU-Naga Alumni Office', 'C', 'Official Announcement', 'bg-blue-50 text-blue-700', TRUE, '/image/ChatGPT Image May 27, 2026, 04_38_30 AM.png', 156, 0, NOW() - INTERVAL '2 days'),
    ('guide', 'How to Complete Your Alumni Profile', 'Your alumni profile is your digital identity in this community. A complete profile helps you get discovered by employers, mentors, and fellow alumni. Here is how to get started: (1) Click your avatar in the top-right corner, (2) Select "My Profile", (3) Add your photo, education details, and employment information, (4) Write a brief bio about your career journey.', 'CTU-Naga Alumni Office', 'C', 'Guide', 'bg-green-50 text-green-700', TRUE, NULL, 89, 0, NOW() - INTERVAL '3 days'),
    ('job', 'Senior Software Engineer', 'Accenture is looking for a Senior Software Engineer with 3+ years of experience in full-stack development. Proficiency in React, Node.js, and cloud services (AWS/Azure) is required.', 'Career Services', 'CS', 'Job Opportunity', 'bg-purple-50 text-purple-700', TRUE, NULL, 45, 0, NOW() - INTERVAL '5 hours'),
    ('guide', 'How to Update Your Employment Information', 'Keeping your employment information up to date is crucial for career networking. Visit your Profile page and navigate to the Employment Information section to add your current job and update your employment history.', 'CTU-Naga Alumni Office', 'C', 'Guide', 'bg-green-50 text-green-700', TRUE, NULL, 67, 0, NOW() - INTERVAL '4 days'),
    ('discussion', 'Career Growth in Tech: Tips from CTU-Naga Alumni', 'I wanted to start a discussion thread where we can share career growth tips. As a 2019 BSIT graduate working in the tech industry, I have found that continuous learning and networking are key.', 'Christian M.', 'CM', 'Discussion', 'bg-yellow-50 text-yellow-700', FALSE, NULL, 34, 0, NOW() - INTERVAL '1 day'),
    ('event', 'Upcoming Alumni Homecoming 2026', 'Mark your calendars! The annual CTU-Naga Extension Campus Alumni Homecoming is scheduled for December 15, 2026. This year\u2019s theme is \u201cBridging Education to Eternity\u201d. We will have networking sessions, career panels, and a grand alumni dinner.', 'CTU-Naga Alumni Office', 'C', 'Event', 'bg-pink-50 text-pink-700', TRUE, NULL, 112, 0, NOW() - INTERVAL '6 days'),
    ('guide', 'How to Find a Mentor', 'The Mentorship platform connects CTU-Naga alumni with experienced professionals in their field. To find a mentor, go to the Mentorship page, browse available mentors by industry, and send a mentorship request.', 'CTU-Naga Alumni Office', 'C', 'Guide', 'bg-green-50 text-green-700', TRUE, NULL, 78, 0, NOW() - INTERVAL '5 days'),
    ('job', 'Junior Web Developer', 'A local tech company is hiring a Junior Web Developer for their growing team. Ideal candidates are recent CTU-Naga graduates with knowledge of HTML, CSS, JavaScript, and basic PHP.', 'Career Services', 'CS', 'Job Opportunity', 'bg-purple-50 text-purple-700', TRUE, NULL, 52, 0, NOW() - INTERVAL '2 days'),
    ('announcement', 'CTU-Naga Extension Campus Recent Achievements', 'We are proud to announce that CTU-Naga Extension Campus has been recognized as one of the top-performing institutions in the region for graduate employment.', 'CTU-Naga Alumni Office', 'C', 'Announcement', 'bg-blue-50 text-blue-700', TRUE, NULL, 201, 0, NOW() - INTERVAL '7 days'),
    ('discussion', 'How Did CTU-Naga Prepare You for the Workforce?', 'I would love to hear from fellow alumni about how our time at CTU-Naga Extension Campus prepared us for our careers. For me, the hands-on projects and industry partnerships made a huge difference.', 'Maria L.', 'ML', 'Discussion', 'bg-yellow-50 text-yellow-700', FALSE, NULL, 41, 0, NOW() - INTERVAL '3 days');

    -- Insert welcome comments for the first post
    INSERT INTO public.feed_post_comments (post_id, author, author_avatar, content, like_count)
    SELECT id, 'Ana R.', 'AR', 'Welcome! So glad to be part of this community!', 12
    FROM public.feed_posts WHERE title LIKE 'Welcome to CTU%'
    UNION ALL
    SELECT id, 'Mark D.', 'MD', 'This is exactly what we needed. Looking forward to connecting!', 8
    FROM public.feed_posts WHERE title LIKE 'Welcome to CTU%'
    UNION ALL
    SELECT id, 'Catherine L.', 'CL', 'Great initiative from the alumni office!', 5
    FROM public.feed_posts WHERE title LIKE 'Welcome to CTU%';

    -- Update comment count on welcome post
    UPDATE public.feed_posts SET comment_count = 3 WHERE title LIKE 'Welcome to CTU%';
  END IF;
END $$;
