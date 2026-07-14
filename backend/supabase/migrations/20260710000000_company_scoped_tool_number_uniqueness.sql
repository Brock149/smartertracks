-- Bug fix: tool numbers were required to be unique across the ENTIRE database
-- (all companies combined) instead of just within a single company. This meant
-- that once any company used, say, tool number "160", no other company could
-- ever use "160" again. Tool numbers only need to be unique per-company.
--
-- The "public"."tools" table had two redundant, database-wide unique
-- constraints on "number":
--   - tools_number_key
--   - tools_number_unique
-- Both are dropped and replaced with a single partial unique index scoped to
-- (company_id, number), ignoring soft-deleted tools so a deleted tool's
-- number can be reused within the same company.

alter table "public"."tools" drop constraint if exists "tools_number_key";
alter table "public"."tools" drop constraint if exists "tools_number_unique";

create unique index if not exists "tools_company_id_number_active_idx"
  on "public"."tools" ("company_id", "number")
  where ("is_deleted" is not true);
