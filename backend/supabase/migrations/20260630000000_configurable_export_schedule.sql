-- Make the weekly inventory-export schedule configurable from the superadmin
-- portal, and make it DST-proof by evaluating in America/New_York directly
-- instead of converting to a fixed UTC cron expression (which previously had
-- to be hand-edited every time the clocks changed).

-- 1) Singleton settings row: when (Eastern weekday/hour/minute) the weekly
--    reports should be queued, plus a guard against double-queuing same day.
create table if not exists "public"."export_schedule_settings" (
  "id" boolean primary key default true,
  "weekday" smallint not null default 1, -- 0=Sunday … 6=Saturday (default Monday)
  "hour" smallint not null default 8,    -- 0-23, Eastern local time
  "minute" smallint not null default 30, -- 0-59, Eastern local time
  "last_queued_date" date,
  "updated_by" "uuid",
  "updated_at" timestamp with time zone default now() not null,
  constraint "export_schedule_settings_singleton" check ("id"),
  constraint "export_schedule_settings_weekday_check" check ("weekday" between 0 and 6),
  constraint "export_schedule_settings_hour_check" check ("hour" between 0 and 23),
  constraint "export_schedule_settings_minute_check" check ("minute" between 0 and 59)
);

alter table "public"."export_schedule_settings" owner to "postgres";

insert into "public"."export_schedule_settings" ("id", "weekday", "hour", "minute")
values (true, 2, 8, 0) -- Tuesday, 8:00 AM Eastern, matching the current schedule
on conflict ("id") do nothing;

alter table "public"."export_schedule_settings" enable row level security;

create policy "Superadmins can view export schedule"
  on "public"."export_schedule_settings" for select
  to "authenticated"
  using (public.is_superadmin(auth.uid()));

create policy "Service role can do everything on export_schedule_settings"
  on "public"."export_schedule_settings" to "service_role"
  using (true) with check (true);

grant select on table "public"."export_schedule_settings" to "authenticated";
grant all on table "public"."export_schedule_settings" to "service_role";

-- 2) RPC the superadmin portal calls to change the schedule. SECURITY DEFINER
--    so it can update the row despite RLS only granting SELECT to authenticated;
--    it re-checks is_superadmin() itself before writing anything.
create or replace function "public"."update_export_schedule"(
  "p_weekday" smallint,
  "p_hour" smallint,
  "p_minute" smallint
) returns "public"."export_schedule_settings"
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.export_schedule_settings;
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'Only a superadmin can change the export schedule';
  end if;
  if p_weekday not between 0 and 6 then
    raise exception 'weekday must be between 0 (Sunday) and 6 (Saturday)';
  end if;
  if p_hour not between 0 and 23 then
    raise exception 'hour must be between 0 and 23';
  end if;
  if p_minute not between 0 and 59 then
    raise exception 'minute must be between 0 and 59';
  end if;

  update public.export_schedule_settings
     set weekday = p_weekday,
         hour = p_hour,
         minute = p_minute,
         updated_by = auth.uid(),
         updated_at = now()
   where id = true
  returning * into v_row;

  return v_row;
end;
$$;

alter function "public"."update_export_schedule"(smallint, smallint, smallint) owner to "postgres";
grant execute on function "public"."update_export_schedule"(smallint, smallint, smallint) to "authenticated";

-- 3) DST-proof checker: runs every 5 minutes, compares against Eastern wall-clock
--    time, and queues each due company exactly once per local calendar day.
create or replace function "public"."maybe_queue_weekly_export_runs"() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.export_schedule_settings;
  v_now_et timestamp;
  v_today date;
  v_weekday smallint;
  v_minutes_of_day int;
  v_target_minutes_of_day int;
begin
  select * into v_settings from public.export_schedule_settings where id = true;
  if v_settings is null then
    return;
  end if;

  v_now_et := now() at time zone 'America/New_York';
  v_today := v_now_et::date;
  v_weekday := extract(dow from v_now_et);
  v_minutes_of_day := extract(hour from v_now_et) * 60 + extract(minute from v_now_et);
  v_target_minutes_of_day := v_settings.hour * 60 + v_settings.minute;

  -- Due if it's the right weekday, we're within 5 minutes after the target
  -- time (this function runs every 5 min via cron), and we haven't already
  -- queued today.
  if v_weekday <> v_settings.weekday then
    return;
  end if;
  if v_minutes_of_day < v_target_minutes_of_day or v_minutes_of_day >= v_target_minutes_of_day + 5 then
    return;
  end if;
  if v_settings.last_queued_date = v_today then
    return;
  end if;

  insert into public.scheduled_export_runs (company_id, export_type, run_at, status)
  select company_id, 'personal', now(), 'pending'
    from public.company_settings
   where coalesce(array_length(auto_export_recipients, 1), 0) > 0
  union all
  select company_id, 'company', now(), 'pending'
    from public.company_settings
   where coalesce(array_length(company_export_recipients, 1), 0) > 0;

  update public.export_schedule_settings
     set last_queued_date = v_today
   where id = true;
end;
$$;

alter function "public"."maybe_queue_weekly_export_runs"() owner to "postgres";

-- 4) Replace the old fixed-UTC-time weekly cron job with the every-5-minute
--    DST-proof checker. The minutely processor job (created earlier, named
--    'minutely-process-scheduled-exports') is untouched — it just keeps
--    sending whatever is pending.
do $$
declare
  job record;
begin
  for job in
    select jobid
    from cron.job
    where jobname = 'weekly-inventory-export'
       or command ilike '%scheduled-inventory-export%'
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end $$;

select cron.schedule(
  'export-schedule-check',
  '*/5 * * * *',
  $job$ select public.maybe_queue_weekly_export_runs(); $job$
);
