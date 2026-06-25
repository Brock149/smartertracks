-- Test ingestion table for Digital Matter (Location Engine) GPS tracker data.
-- Goal for now is simply to capture whatever the Forwarder POSTs so we can
-- inspect it. We keep the full raw payload (jsonb) plus a handful of best-effort
-- parsed fields. No company / tool mapping yet -- that gets layered on later.

create table if not exists public.tracker_locations (
  id            bigint generated always as identity primary key,
  -- Device identity as sent by Digital Matter (serial number / device id).
  serial        text,
  -- Best-effort parsed position. Nullable because a payload may be a test
  -- ping, a non-position message, or an unexpected shape.
  latitude      double precision,
  longitude     double precision,
  -- Optional extras when present in the payload.
  altitude      double precision,
  speed         double precision,
  heading       double precision,
  accuracy      double precision,
  battery       double precision,
  fix_type      text,
  -- Timestamp the device/LE recorded the fix (parsed from payload if found).
  recorded_at   timestamptz,
  -- When our endpoint received it.
  received_at   timestamptz not null default now(),
  -- The complete original record exactly as received, for debugging/replay.
  raw           jsonb not null
);

create index if not exists tracker_locations_serial_idx
  on public.tracker_locations (serial);

create index if not exists tracker_locations_received_at_idx
  on public.tracker_locations (received_at desc);

-- Lock the table down: only the service role (used by the edge function and
-- backend tooling) can touch it. No anon/auth access until we wire it into the
-- app properly.
alter table public.tracker_locations enable row level security;
