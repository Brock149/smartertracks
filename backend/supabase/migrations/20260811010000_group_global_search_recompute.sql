-- =============================================================================
-- Group global-search: apply to ALL current members + recompute on membership
-- REVIEW, then paste into Supabase SQL Editor (additive; safe after search v1).
--
-- Rule for tools.include_in_global_search (when confused → visible / true):
--   • Tool in no active groups                         → true
--   • Tool in ANY active group with flag = true        → true
--   • Tool ONLY in active groups with flag = false     → false
-- Soft-deleted groups are ignored (treated as not a membership for this purpose).
-- Default for NEW groups: tools appear in global search (ON).
-- =============================================================================

ALTER TABLE public.tool_groups
  ALTER COLUMN default_include_in_global_search SET DEFAULT true;

-- Backfill: turn ON for existing groups created while the old default was false
UPDATE public.tool_groups
SET default_include_in_global_search = true
WHERE default_include_in_global_search IS DISTINCT FROM true;

COMMENT ON COLUMN public.tool_groups.default_include_in_global_search IS
  'When true (default), tools that are members of this (active) group are eligible for global search. A tool in multiple groups is visible if ANY of those groups has this set true. Tools in no active groups default to visible.';

-- ---------------------------------------------------------------------------
-- Recompute one tool from its active group memberships
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_tool_include_in_global_search(p_tool_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_include boolean;
BEGIN
  -- Visible if: no active group memberships OR any active group opts into global search.
  -- Default / ambiguous → true.
  SELECT COALESCE(
    (
      -- No active memberships → visible
      NOT EXISTS (
        SELECT 1
        FROM tool_group_members m
        JOIN tool_groups g ON g.id = m.group_id
        WHERE m.tool_id = p_tool_id
          AND g.is_deleted IS NOT TRUE
      )
    )
    OR
    (
      -- Any active group that includes members in global search → visible
      EXISTS (
        SELECT 1
        FROM tool_group_members m
        JOIN tool_groups g ON g.id = m.group_id
        WHERE m.tool_id = p_tool_id
          AND g.is_deleted IS NOT TRUE
          AND g.default_include_in_global_search = true
      )
    ),
    true
  )
  INTO v_include;

  UPDATE tools
  SET include_in_global_search = v_include
  WHERE id = p_tool_id
    AND include_in_global_search IS DISTINCT FROM v_include;

  RETURN v_include;
END;
$$;

-- ---------------------------------------------------------------------------
-- Recompute every member of a group (e.g. after toggling the group flag)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_group_members_global_search(p_group_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tool_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_tool_id IN
    SELECT m.tool_id
    FROM tool_group_members m
    WHERE m.group_id = p_group_id
  LOOP
    PERFORM public.recompute_tool_include_in_global_search(v_tool_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Admin-callable wrapper (optional RPC from UI after save)
CREATE OR REPLACE FUNCTION public.set_group_include_members_in_global_search(
  p_group_id uuid,
  p_include boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_count integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) AND NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can update this setting';
  END IF;

  SELECT company_id INTO v_company_id
  FROM tool_groups
  WHERE id = p_group_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF NOT public.is_superadmin(auth.uid())
     AND v_company_id IS DISTINCT FROM public.get_user_company_id(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE tool_groups
  SET default_include_in_global_search = coalesce(p_include, true)
  WHERE id = p_group_id;

  -- Trigger also fires on UPDATE; call explicitly so callers get a count even if
  -- the value was unchanged (IS DISTINCT FROM won't fire trigger).
  v_count := public.recompute_group_members_global_search(p_group_id);

  RETURN json_build_object(
    'success', true,
    'include', coalesce(p_include, true),
    'members_recomputed', v_count
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Triggers: membership changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_tool_group_members_recompute_global_search()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_tool_include_in_global_search(NEW.tool_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_tool_include_in_global_search(OLD.tool_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.tool_id IS DISTINCT FROM OLD.tool_id THEN
      PERFORM public.recompute_tool_include_in_global_search(OLD.tool_id);
      PERFORM public.recompute_tool_include_in_global_search(NEW.tool_id);
    ELSE
      PERFORM public.recompute_tool_include_in_global_search(NEW.tool_id);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tool_group_members_recompute_global_search ON public.tool_group_members;
CREATE TRIGGER trg_tool_group_members_recompute_global_search
  AFTER INSERT OR UPDATE OR DELETE ON public.tool_group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tool_group_members_recompute_global_search();

-- ---------------------------------------------------------------------------
-- Triggers: group flag or soft-delete changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_tool_groups_recompute_global_search()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.default_include_in_global_search IS DISTINCT FROM OLD.default_include_in_global_search
       OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
      PERFORM public.recompute_group_members_global_search(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tool_groups_recompute_global_search ON public.tool_groups;
CREATE TRIGGER trg_tool_groups_recompute_global_search
  AFTER UPDATE OF default_include_in_global_search, is_deleted ON public.tool_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tool_groups_recompute_global_search();

-- ---------------------------------------------------------------------------
-- One-time backfill: align every tool that is (or was) in a group
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT m.tool_id
    FROM tool_group_members m
  LOOP
    PERFORM public.recompute_tool_include_in_global_search(r.tool_id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_tool_include_in_global_search(uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recompute_group_members_global_search(uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_group_include_members_in_global_search(uuid, boolean)
  TO authenticated, service_role;
