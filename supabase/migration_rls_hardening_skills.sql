-- Security Hardening (part 2): SKILLS RLS policies
--
-- public.skills has RLS enabled (schema.sql) but, unlike education/employment,
-- it shipped without any policies. Once RLS is enforced by the user-scoped
-- client, that left skills unreadable/unwritable for every authenticated user,
-- breaking the profile/directory skills features.
--
-- These policies mirror the education/employment pattern:
--   - SELECT: any authenticated user (directory visibility)
--   - INSERT/UPDATE/DELETE: the owner of the parent profile

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Skills are viewable by authenticated users" ON public.skills;
DROP POLICY IF EXISTS "Users can insert own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can update own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can delete own skills" ON public.skills;

CREATE POLICY "Skills are viewable by authenticated users"
  ON public.skills FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own skills"
  ON public.skills FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own skills"
  ON public.skills FOR UPDATE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own skills"
  ON public.skills FOR DELETE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
