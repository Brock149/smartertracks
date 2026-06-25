-- One-off backfill: repair "From: System" on past claim transactions.
--
-- Background: when a tech claimed a tool, the app wrote from_user_id straight
-- from a stale navigation snapshot, so rows could end up with from_user_id NULL
-- (shown as "System") even though another tech actually held the tool. The app
-- bug is fixed going forward; this script repairs the existing history.
--
-- Strategy: for each transaction whose from_user_id is NULL, look at the SAME
-- tool's immediately preceding transaction (by timestamp). If one exists, the
-- real prior holder is that previous row's to_user_id, so set from_user_id to
-- it. Rows with no preceding transaction are genuine "new tool" events and are
-- left as NULL (correctly "System").
--
-- SAFE TO RE-RUN: it only ever touches rows that are still NULL.
--
-- Run the PREVIEW first, eyeball the results, then run the UPDATE.

-- ============================================================
-- 1) PREVIEW — see exactly what would change (no writes)
-- ============================================================
with candidates as (
  select
    t.id,
    t.tool_id,
    t.timestamp,
    t.from_user_id,
    (
      select prev.to_user_id
      from public.tool_transactions prev
      where prev.tool_id = t.tool_id
        and prev.timestamp < t.timestamp
      order by prev.timestamp desc
      limit 1
    ) as inferred_from_user_id
  from public.tool_transactions t
  where t.from_user_id is null
    and t.tool_id is not null
)
select
  c.id              as transaction_id,
  c.tool_id,
  c.timestamp,
  to_from.name      as new_from_user_name
from candidates c
left join public.users to_from on to_from.id = c.inferred_from_user_id
where c.inferred_from_user_id is not null
order by c.timestamp;

-- ============================================================
-- 2) UPDATE — apply the backfill
-- ============================================================
update public.tool_transactions t
set from_user_id = sub.inferred_from_user_id
from (
  select
    x.id,
    (
      select prev.to_user_id
      from public.tool_transactions prev
      where prev.tool_id = x.tool_id
        and prev.timestamp < x.timestamp
      order by prev.timestamp desc
      limit 1
    ) as inferred_from_user_id
  from public.tool_transactions x
  where x.from_user_id is null
    and x.tool_id is not null
) sub
where t.id = sub.id
  and sub.inferred_from_user_id is not null
  and t.from_user_id is null;
