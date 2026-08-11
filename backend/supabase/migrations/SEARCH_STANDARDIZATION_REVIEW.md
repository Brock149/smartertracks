# Search Standardization SQL — Review Notes

**File to paste:** [`backend/supabase/migrations/20260811000000_search_standardization.sql`](./20260811000000_search_standardization.sql)

Paste the full contents into the Supabase SQL Editor and run once. Do not run from CI against prod until reviewed.

## What it adds (additive)

| Change | Effect on existing data |
|---|---|
| `tools.search_norm` | Backfilled from name+description; trigger keeps it updated |
| `tools.include_in_global_search` | Defaults **true** — existing tools stay in All Tools |
| `tool_groups.default_include_in_global_search` | Defaults **false** — new group-created tools hide from global unless overridden |
| `tool_search_aliases` table + RLS | Empty until Haiku/manual aliases |
| Rewritten `search_tools` | Same name; new optional args `p_scope`, `p_group_id`, `p_owner_id`; returns `match_rank`, `include_in_global_search` |
| Alias helper RPCs | list / upsert / delete / replace AI / set global flag |
| `create_group_tool_with_checklist` | Optional `p_include_in_global_search`; old 9-arg overload dropped (9-arg calls still work via default) |

## After SQL succeeds

1. Deploy edge functions: `search-tools`, `generate-tool-aliases`, `backfill-tool-aliases`
2. Set secret `ANTHROPIC_API_KEY` on the project
3. Deploy updated `create-tool` / `create-group-tool`
4. Ship app + admin clients
5. Run backfill once (admin): call `backfill-tool-aliases`
