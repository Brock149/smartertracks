-- Reschedule the automated tool-inventory report — every Tuesday at 8:00 AM Eastern.
--
-- Previously the weekly job tried to call the `scheduled-inventory-export` edge
-- function directly over HTTP and relied on the function's isDue() weekday gate.
-- That was fragile for two reasons:
--   1) The HTTP call needs the cron secret from Vault; if that secret is missing
--      or named differently, the function returns 401 and nothing sends.
--   2) isDue() gated on the weekday/"already sent today", which had UTC-vs-Eastern
--      off-by-a-day bugs.
--
-- This version clones the proven super-admin "test scheduler" path instead:
-- it simply INSERTS a pending row into scheduled_export_runs for each enabled
-- company/report type. The already-working minutely `process-scheduled-export-runs`
-- job then force-sends each row (one_off mode, which bypasses isDue and needs no
-- secret in the DB). Reliable and uses only paths already known to work.
--
-- DST note: pg_cron runs in UTC and can't express a wall-clock local time.
--   * EDT (mid-Mar … early-Nov): 8:00 AM Eastern = 12:00 UTC -> '0 12 * * 2'
--   * EST (early-Nov … mid-Mar): 8:00 AM Eastern = 13:00 UTC -> '0 13 * * 2'
-- Set for EDT (correct right now); change to '0 13 * * 2' in winter.

-- 1) Remove any prior cron job(s) for the inventory export, by name or command.
do $$
declare
  job record;
begin
  for job in
    select jobid
    from cron.job
    where jobname in ('weekly-inventory-export')
       or command ilike '%scheduled-inventory-export%'
       or command ilike '%scheduled_export_runs%'
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end $$;

-- 2) Every Tuesday at 12:00 UTC (8:00 AM EDT), queue a run for every enabled
--    company. The minutely processor picks these up within ~1 minute and sends.
select cron.schedule(
  'weekly-inventory-export',
  '0 12 * * 2',
  $job$
  insert into public.scheduled_export_runs (company_id, export_type, run_at, status)
  select company_id, 'personal', now(), 'pending'
    from public.company_settings
   where auto_export_enabled = true
  union all
  select company_id, 'company', now(), 'pending'
    from public.company_settings
   where company_export_enabled = true;
  $job$
);
