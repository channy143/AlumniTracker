-- =============================================================================
-- Migration: Create report_exports Table & Audit Performance Indexes
-- Governed by Rule 5 and Republic Act No. 10173 (Data Privacy Act of 2012)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.report_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  admin_email VARCHAR(255),
  report_name VARCHAR(150) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN ('csv', 'json', 'pdf', 'xlsx', 'excel')),
  record_count INTEGER DEFAULT 0,
  filters JSONB DEFAULT '{}'::jsonb,
  purpose TEXT DEFAULT 'Administrative and Institutional Analytics',
  ip_address VARCHAR(45),
  user_agent TEXT,
  dpa_compliance_notice TEXT DEFAULT 'Governed by Republic Act No. 10173 (Data Privacy Act of 2012). Strictly confidential.',
  exported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for audit trail & analytics queries
CREATE INDEX IF NOT EXISTS idx_report_exports_user_id ON public.report_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_report_type ON public.report_exports(report_type);
CREATE INDEX IF NOT EXISTS idx_report_exports_exported_at ON public.report_exports(exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_exports_admin_email ON public.report_exports(admin_email);

-- Enable RLS
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view/insert report exports via backend service role or admin
DROP POLICY IF EXISTS "Report exports viewable by authenticated users" ON public.report_exports;
CREATE POLICY "Report exports viewable by authenticated users"
  ON public.report_exports FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Report exports insertable by authenticated users" ON public.report_exports;
CREATE POLICY "Report exports insertable by authenticated users"
  ON public.report_exports FOR INSERT
  WITH CHECK (true);
