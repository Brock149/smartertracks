-- One-shot: un-hide existing groups + recompute tools
-- Paste into Supabase SQL Editor if groups were created/backfilled with the old OFF default.

ALTER TABLE public.tool_groups
  ALTER COLUMN default_include_in_global_search SET DEFAULT true;

UPDATE public.tool_groups
SET default_include_in_global_search = true
WHERE default_include_in_global_search IS DISTINCT FROM true;

-- Recompute every tool that is in any group (uses multi-group visibility rules)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT m.tool_id
    FROM public.tool_group_members m
  LOOP
    PERFORM public.recompute_tool_include_in_global_search(r.tool_id);
  END LOOP;
END;
$$;
