-- A tool deletion was recorded twice: a company_events row (who deleted it,
-- and when) and a tool_transactions row that looked like a transfer from
-- System to whoever currently held the tool, with attribution "Tool deleted".
-- Those describe the same action. Keep the activity event. Stop writing the
-- extra transfer, and remove the ones already stored.
--
-- Real history (claims, assignments, the initial assignment) is left alone.
-- Creation is unchanged: "Tool created" plus the initial assignment are two
-- different facts.
--
-- Paste this whole file into the Supabase SQL editor.

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
  v_actor_name text;
  v_notes text;
begin
  select number, name, company_id
    into tool_number, tool_name, v_company_id
    from public.tools
   where id = p_tool_id;

  if tool_number is null then
    raise exception 'Tool not found';
  end if;

  select coalesce(u.name, 'Someone') into v_actor_name
    from public.users u where u.id = auth.uid();

  v_notes := '#' || tool_number || ' - ' || tool_name
    || ' deleted by ' || coalesce(v_actor_name, 'Someone');

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

-- These rows are the extra "from System" deletion transfers. The matching
-- company_events row (event_type = tool_deleted) stays, so who deleted the
-- tool and when are still on the feed. checklist_reports cascade, but these
-- rows are not transfer records and do not have reports attached.
DELETE FROM public.tool_transactions
WHERE attribution = 'Tool deleted';
