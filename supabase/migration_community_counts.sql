-- Community Group Counts Migration
-- Add post_count column and update triggers for member_count and post_count

-- Add post_count column to community_groups
ALTER TABLE public.community_groups
ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0;

-- Create index
CREATE INDEX IF NOT EXISTS idx_forum_posts_group_id ON public.forum_posts(group_id);

-- Trigger function to update member_count
CREATE OR REPLACE FUNCTION update_community_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_groups
    SET member_count = member_count + 1
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_groups
    SET member_count = member_count - 1
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for group_members
DROP TRIGGER IF EXISTS trigger_update_member_count ON public.group_members;
CREATE TRIGGER trigger_update_member_count
AFTER INSERT OR DELETE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION update_community_group_member_count();

-- Trigger function to update post_count
CREATE OR REPLACE FUNCTION update_community_group_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_groups
    SET post_count = post_count + 1
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_groups
    SET post_count = post_count - 1
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for forum_posts
DROP TRIGGER IF EXISTS trigger_update_post_count ON public.forum_posts;
CREATE TRIGGER trigger_update_post_count
AFTER INSERT OR DELETE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION update_community_group_post_count();

-- Backfill existing counts
UPDATE public.community_groups cg
SET member_count = (
  SELECT COUNT(*) FROM public.group_members gm WHERE gm.group_id = cg.id
),
post_count = (
  SELECT COUNT(*) FROM public.forum_posts fp WHERE fp.group_id = cg.id
);