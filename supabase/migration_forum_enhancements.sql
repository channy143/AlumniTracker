-- Migration: Enhance Alumni Forum (forum_posts & community_groups) for networking and opportunity sharing
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS liked_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Seed default CTU-Naga Alumni Forum channels if none exist yet
INSERT INTO public.community_groups (name, description, category, member_count, post_count)
SELECT * FROM (
  VALUES
    ('Career & Job Opportunities', 'Share job openings, referrals, hiring leads, and freelance opportunities for CTU-Naga alumni.', 'general', 1, 0),
    ('Tech & Engineering Network', 'Connect with fellow IT, Computer, and Engineering alumni on software, hardware, and tech trends.', 'tech', 1, 0),
    ('Business & Entrepreneurship', 'Showcase alumni businesses, startups, partnerships, and management insights.', 'entrepreneurship', 1, 0),
    ('Education & Research Hub', 'Discuss teaching opportunities, graduate studies, licensure exams, and academic collaborations.', 'education', 1, 0),
    ('General Alumni Lounge', 'Batch reunions, campus updates, mentorship questions, and casual networking.', 'business', 1, 0)
) AS defaults(name, description, category, member_count, post_count)
WHERE NOT EXISTS (SELECT 1 FROM public.community_groups LIMIT 1);

