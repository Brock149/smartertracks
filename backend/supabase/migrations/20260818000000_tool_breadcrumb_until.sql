-- Allow trip-history breadcrumbs to be bounded on both sides
-- (e.g. Aug 17 through Aug 21), not only "since X until now".

DROP FUNCTION IF EXISTS public.tool_breadcrumb(uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.tool_breadcrumb(uuid, timestamp with time zone, timestamp with time zone);

CREATE FUNCTION public.tool_breadcrumb(
  p_tool_id uuid,
  p_since timestamp with time zone DEFAULT NULL,
  p_until timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  serial text,
  latitude double precision,
  longitude double precision,
  recorded_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select tl.serial, tl.latitude, tl.longitude,
         coalesce(tl.recorded_at, tl.received_at) as recorded_at
  from public.tracker_tool_assignments tta
  join public.tracker_locations tl
    on tl.serial = tta.serial
   and tl.latitude is not null
   and tl.longitude is not null
   and coalesce(tl.recorded_at, tl.received_at) >= tta.attached_at
   and (tta.detached_at is null
        or coalesce(tl.recorded_at, tl.received_at) <= tta.detached_at)
  where tta.tool_id = p_tool_id
    and (
      tta.company_id = public.get_user_company_id(auth.uid())
      or public.is_superadmin(auth.uid())
    )
    and (p_since is null or coalesce(tl.recorded_at, tl.received_at) >= p_since)
    and (p_until is null or coalesce(tl.recorded_at, tl.received_at) <= p_until)
  order by recorded_at asc;
$$;

GRANT ALL ON FUNCTION public.tool_breadcrumb(uuid, timestamp with time zone, timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.tool_breadcrumb(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.tool_breadcrumb(uuid, timestamp with time zone, timestamp with time zone) TO service_role;
