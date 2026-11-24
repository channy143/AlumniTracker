-- ============================================================================
-- Migration: Add New Institutional Roles & Permissions for Bulk Eligible Registry
-- Roles added: 'alumni_officer' (Alumni Affairs Coordinator), 'registrar' (Registrar Staff)
-- ============================================================================

-- 1. Update check constraint on users table to support new roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'staff', 'alumni', 'alumni_officer', 'registrar'));

-- 2. Update RLS policy on alumni_eligible to grant access to admin, alumni_officer, staff, and registrar
DROP POLICY IF EXISTS "alumni_eligible_admin_all" ON public.alumni_eligible;

CREATE POLICY "alumni_eligible_admin_all" ON public.alumni_eligible
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'alumni_officer', 'staff', 'registrar')
    )
  );

-- 3. Ensure index for fast deduplication and lookup during bulk import
CREATE INDEX IF NOT EXISTS idx_alumni_eligible_names_batch
  ON public.alumni_eligible(last_name, first_name, year_graduated);

CREATE INDEX IF NOT EXISTS idx_alumni_eligible_unclaimed
  ON public.alumni_eligible(user_id) WHERE user_id IS NULL;
