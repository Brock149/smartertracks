-- =============================================================================
-- One-off cleanup of leftover synthetic / test rows in tracker_locations.
--
-- Run this manually (e.g. in the Supabase SQL editor) AFTER reviewing the
-- "preview" selects below. It is intentionally NOT a migration so the deletes
-- never run unattended.
--
-- Synthetic rows are identifiable by:
--   * serial IS NULL                         (early schema-test inserts)
--   * placeholder serials 1111111 / 2222222  (hand-typed test pings)
--   * obviously impossible global coordinates that don't match a real device
--
-- The live device serial is '1813939' (per the spec) -- never delete it.
-- =============================================================================

-- 1. PREVIEW: what would be removed. Inspect this first.
select id, serial, latitude, longitude, recorded_at, received_at
from public.tracker_locations
where serial is null
   or serial in ('1111111', '2222222', '0000000')
order by received_at desc;

-- 2. Flag any matching placeholder serials in the registry as synthetic so they
--    are excluded from the global pool even if some rows survive.
insert into public.trackers (serial, is_synthetic)
values ('1111111', true), ('2222222', true), ('0000000', true)
on conflict (serial) do update set is_synthetic = true;

-- 3. DELETE the synthetic rows. Uncomment to execute once the preview looks
--    right.
-- delete from public.tracker_locations
-- where serial is null
--    or serial in ('1111111', '2222222', '0000000');

-- 4. OPTIONAL: catch impossible coordinate jumps (a ping that teleports
--    thousands of km between consecutive fixes for the same serial). Review
--    before deleting -- legitimate WiFi/cell fixes can be coarse.
-- with ordered as (
--   select id, serial, latitude, longitude, recorded_at,
--          lag(latitude)  over (partition by serial order by recorded_at)  as prev_lat,
--          lag(longitude) over (partition by serial order by recorded_at)  as prev_lng
--   from public.tracker_locations
--   where latitude is not null and longitude is not null
-- )
-- select * from ordered
-- where prev_lat is not null
--   and (abs(latitude - prev_lat) > 5 or abs(longitude - prev_lng) > 5);
