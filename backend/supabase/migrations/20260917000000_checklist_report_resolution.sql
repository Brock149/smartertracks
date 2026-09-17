-- Damage reports keep a work-status trail instead of being deleted when
-- resolved. Staff can mark "in progress" (with comments) so others can see
-- that parts/repairs are underway, then move the report into resolved history.

ALTER TABLE public.checklist_reports
  ADD COLUMN IF NOT EXISTS resolution_status text NOT NULL DEFAULT 'no_change',
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS resolution_updated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS resolution_updated_by uuid,
  ADD COLUMN IF NOT EXISTS resolution_updated_by_name text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_by_name text;

ALTER TABLE public.checklist_reports
  DROP CONSTRAINT IF EXISTS checklist_reports_resolution_status_check;

ALTER TABLE public.checklist_reports
  ADD CONSTRAINT checklist_reports_resolution_status_check
  CHECK (resolution_status = ANY (ARRAY['no_change'::text, 'in_progress'::text, 'resolved'::text]));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checklist_reports_resolution_updated_by_fkey'
  ) THEN
    ALTER TABLE public.checklist_reports
      ADD CONSTRAINT checklist_reports_resolution_updated_by_fkey
      FOREIGN KEY (resolution_updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checklist_reports_resolved_by_fkey'
  ) THEN
    ALTER TABLE public.checklist_reports
      ADD CONSTRAINT checklist_reports_resolved_by_fkey
      FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checklist_reports_company_resolution
  ON public.checklist_reports (company_id, resolution_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_reports_transaction_open
  ON public.checklist_reports (transaction_id)
  WHERE resolution_status IS DISTINCT FROM 'resolved';

CREATE TABLE IF NOT EXISTS public.checklist_report_updates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  report_id uuid NOT NULL,
  company_id uuid NOT NULL,
  resolution_status text NOT NULL,
  notes text,
  actor_id uuid,
  actor_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT checklist_report_updates_pkey PRIMARY KEY (id),
  CONSTRAINT checklist_report_updates_resolution_status_check
    CHECK (resolution_status = ANY (ARRAY['no_change'::text, 'in_progress'::text, 'resolved'::text])),
  CONSTRAINT ck_checklist_report_updates_company_active
    CHECK (public.is_company_active(company_id))
);

ALTER TABLE public.checklist_report_updates OWNER TO postgres;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checklist_report_updates_report_id_fkey'
  ) THEN
    ALTER TABLE public.checklist_report_updates
      ADD CONSTRAINT checklist_report_updates_report_id_fkey
      FOREIGN KEY (report_id) REFERENCES public.checklist_reports(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checklist_report_updates_company_id_fkey'
  ) THEN
    ALTER TABLE public.checklist_report_updates
      ADD CONSTRAINT checklist_report_updates_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checklist_report_updates_actor_id_fkey'
  ) THEN
    ALTER TABLE public.checklist_report_updates
      ADD CONSTRAINT checklist_report_updates_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checklist_report_updates_report_created
  ON public.checklist_report_updates (report_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_report_updates_company_created
  ON public.checklist_report_updates (company_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_checklist_report_updates_active ON public.checklist_report_updates;
CREATE TRIGGER trg_checklist_report_updates_active
  BEFORE INSERT OR UPDATE ON public.checklist_report_updates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_company_active();

ALTER TABLE public.checklist_report_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view checklist report updates in their company" ON public.checklist_report_updates;
CREATE POLICY "Users can view checklist report updates in their company"
  ON public.checklist_report_updates
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage checklist report updates in their company" ON public.checklist_report_updates;
CREATE POLICY "Admins can manage checklist report updates in their company"
  ON public.checklist_report_updates
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_active(company_id)
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    AND company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_active(company_id)
  );

DROP POLICY IF EXISTS "Service role can do everything on report updates" ON public.checklist_report_updates;
CREATE POLICY "Service role can do everything on report updates"
  ON public.checklist_report_updates
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.checklist_report_updates TO anon;
GRANT ALL ON TABLE public.checklist_report_updates TO authenticated;
GRANT ALL ON TABLE public.checklist_report_updates TO service_role;
