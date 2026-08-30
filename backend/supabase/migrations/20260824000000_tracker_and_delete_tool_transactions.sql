-- Record tracker attach/detach and tool deletion as tool_transactions
-- rows (same custody history as "Initial assignment from system" on
-- tool create). Location/stored_at are copied from the latest existing
-- transaction so these audit lines do not clobber the tool's last known
-- location on screens that read the latest tx.

CREATE OR REPLACE FUNCTION public.attach_tracker_to_tool(
  p_serial text,
  p_tool_id uuid,
  p_mount_type text DEFAULT 'temporary'::text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_company_id uuid := public.get_user_company_id(auth.uid());
  v_actor_name text;
  v_tool_number text;
  v_tool_name text;
  v_tool_owner uuid;
  v_tracker_label text;
  v_location text;
  v_stored_at text;
  v_notes text;
begin
  if v_company_id is null then
    raise exception 'No company for current user';
  end if;

  if p_mount_type is null or p_mount_type not in ('temporary', 'permanent') then
    raise exception 'mount_type must be temporary or permanent';
  end if;

  if not exists (
    select 1 from public.tracker_company_assignments
    where serial = p_serial and company_id = v_company_id and released_at is null
  ) then
    raise exception 'Tracker % is not assigned to your company', p_serial;
  end if;

  if not exists (
    select 1 from public.tools where id = p_tool_id and company_id = v_company_id
  ) then
    raise exception 'Tool does not belong to your company';
  end if;

  if exists (
    select 1 from public.tracker_tool_assignments
    where serial = p_serial and detached_at is null
  ) then
    raise exception 'Tracker % is already attached to a tool', p_serial;
  end if;

  insert into public.tracker_tool_assignments
    (serial, tool_id, company_id, mount_type, attached_by)
  values (p_serial, p_tool_id, v_company_id, p_mount_type, auth.uid());

  perform public.refresh_tool_current_location(p_tool_id);

  select coalesce(u.name, 'Someone') into v_actor_name
    from public.users u where u.id = auth.uid();
  select t.number, t.name, t.current_owner
    into v_tool_number, v_tool_name, v_tool_owner
    from public.tools t where t.id = p_tool_id;
  v_tracker_label := public.tracker_display_name(p_serial, v_company_id);

  select tx.location, tx.stored_at into v_location, v_stored_at
    from public.tool_transactions tx
   where tx.tool_id = p_tool_id
   order by tx.timestamp desc
   limit 1;

  v_notes := coalesce(v_tracker_label, p_serial)
    || ' attached to #' || coalesce(v_tool_number, '?')
    || ' - ' || coalesce(v_tool_name, 'Tool')
    || ' by ' || coalesce(v_actor_name, 'Someone')
    || ' (' || p_mount_type || ')';

  insert into public.tool_transactions (
    tool_id, from_user_id, to_user_id, location, stored_at,
    notes, company_id, attribution
  ) values (
    p_tool_id,
    null,
    v_tool_owner,
    coalesce(v_location, 'Not specified'),
    coalesce(v_stored_at, 'N/A'),
    v_notes,
    v_company_id,
    'Tracker attached'
  );

  insert into public.company_events
    (company_id, event_type, actor_id, actor_name, target_type, target_id, target_label, details)
  values (
    v_company_id,
    'tracker_attached',
    auth.uid(),
    coalesce(v_actor_name, 'Someone'),
    'tool',
    p_tool_id,
    '#' || coalesce(v_tool_number, '?') || ' - ' || coalesce(v_tool_name, 'Tool'),
    v_notes
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.detach_tracker_from_tool(p_tool_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_company_id uuid := public.get_user_company_id(auth.uid());
  v_serial text;
  v_mount_type text;
  v_actor_name text;
  v_tool_number text;
  v_tool_name text;
  v_tool_owner uuid;
  v_tracker_label text;
  v_location text;
  v_stored_at text;
  v_notes text;
begin
  select tta.serial, tta.mount_type into v_serial, v_mount_type
    from public.tracker_tool_assignments tta
   where tta.tool_id = p_tool_id
     and tta.company_id = v_company_id
     and tta.detached_at is null
   limit 1;

  update public.tracker_tool_assignments
     set detached_at = now(), detached_by = auth.uid()
   where tool_id = p_tool_id
     and company_id = v_company_id
     and detached_at is null;

  update public.tools
     set last_latitude = null,
         last_longitude = null,
         last_location_recorded_at = null,
         last_location_updated_at = now(),
         last_location_serial = null
   where id = p_tool_id
     and company_id = v_company_id;

  if v_serial is null then
    return;
  end if;

  select coalesce(u.name, 'Someone') into v_actor_name
    from public.users u where u.id = auth.uid();
  select t.number, t.name, t.current_owner
    into v_tool_number, v_tool_name, v_tool_owner
    from public.tools t where t.id = p_tool_id;
  v_tracker_label := public.tracker_display_name(v_serial, v_company_id);

  select tx.location, tx.stored_at into v_location, v_stored_at
    from public.tool_transactions tx
   where tx.tool_id = p_tool_id
   order by tx.timestamp desc
   limit 1;

  v_notes := coalesce(v_tracker_label, v_serial)
    || ' detached from #' || coalesce(v_tool_number, '?')
    || ' - ' || coalesce(v_tool_name, 'Tool')
    || ' by ' || coalesce(v_actor_name, 'Someone')
    || ' (' || coalesce(v_mount_type, 'temporary') || ')';

  insert into public.tool_transactions (
    tool_id, from_user_id, to_user_id, location, stored_at,
    notes, company_id, attribution
  ) values (
    p_tool_id,
    null,
    v_tool_owner,
    coalesce(v_location, 'Not specified'),
    coalesce(v_stored_at, 'N/A'),
    v_notes,
    v_company_id,
    'Tracker detached'
  );

  insert into public.company_events
    (company_id, event_type, actor_id, actor_name, target_type, target_id, target_label, details)
  values (
    v_company_id,
    'tracker_detached',
    auth.uid(),
    coalesce(v_actor_name, 'Someone'),
    'tool',
    p_tool_id,
    '#' || coalesce(v_tool_number, '?') || ' - ' || coalesce(v_tool_name, 'Tool'),
    v_notes
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.delete_tool(p_tool_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  tool_number text;
  tool_name text;
  v_company_id uuid;
  v_owner_id uuid;
  v_actor_name text;
  v_location text;
  v_stored_at text;
  v_notes text;
begin
  select number, name, company_id, current_owner
    into tool_number, tool_name, v_company_id, v_owner_id
    from public.tools
   where id = p_tool_id;

  if tool_number is null then
    raise exception 'Tool not found';
  end if;

  select coalesce(u.name, 'Someone') into v_actor_name
    from public.users u where u.id = auth.uid();

  select tx.location, tx.stored_at into v_location, v_stored_at
    from public.tool_transactions tx
   where tx.tool_id = p_tool_id
   order by tx.timestamp desc
   limit 1;

  v_notes := '#' || tool_number || ' - ' || tool_name
    || ' deleted by ' || coalesce(v_actor_name, 'Someone');

  insert into public.tool_transactions (
    tool_id, from_user_id, to_user_id, location, stored_at,
    notes, company_id, attribution
  ) values (
    p_tool_id,
    null,
    v_owner_id,
    coalesce(v_location, 'Not specified'),
    coalesce(v_stored_at, 'N/A'),
    v_notes,
    v_company_id,
    'Tool deleted'
  );

  insert into public.company_events
    (company_id, event_type, actor_id, actor_name, target_type, target_id, target_label, details)
  values (
    v_company_id,
    'tool_deleted',
    auth.uid(),
    coalesce(v_actor_name, 'Someone'),
    'tool',
    p_tool_id,
    '#' || tool_number || ' - ' || tool_name,
    v_notes
  );

  begin
    update public.tool_transactions
       set tool_id = null,
           deleted_tool_number = tool_number,
           deleted_tool_name = tool_name
     where tool_id = p_tool_id;

    delete from public.tool_checklists
     where tool_id = p_tool_id;

    delete from public.tools
     where id = p_tool_id;
  exception
    when others then
      raise exception 'Failed to delete tool: %', SQLERRM;
  end;
end;
$$;
