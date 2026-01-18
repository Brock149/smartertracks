-- Allow cleanup while suspended and auto-reactivate when within limits

create or replace function public.recompute_company_active_on_delete()
returns trigger
language plpgsql
security definer
as $$
declare
  v_user_limit integer;
  v_tool_limit integer;
  v_user_count integer;
  v_tool_count integer;
  v_over boolean := false;
begin
  if old.company_id is null then
    return old;
  end if;

  select user_limit, tool_limit
    into v_user_limit, v_tool_limit
  from public.companies
  where id = old.company_id;

  select count(*)::int into v_user_count
  from public.users
  where company_id = old.company_id;

  select count(*)::int into v_tool_count
  from public.tools
  where company_id = old.company_id;

  if v_user_limit is not null and v_user_count > v_user_limit then
    v_over := true;
  end if;
  if v_tool_limit is not null and v_tool_count > v_tool_limit then
    v_over := true;
  end if;

  if not v_over then
    update public.companies
    set is_active = true,
        suspended_at = null
    where id = old.company_id
      and is_active = false;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_recompute_company_active_on_tool_delete on public.tools;
create trigger trg_recompute_company_active_on_tool_delete
after delete on public.tools
for each row execute function public.recompute_company_active_on_delete();

drop trigger if exists trg_recompute_company_active_on_user_delete on public.users;
create trigger trg_recompute_company_active_on_user_delete
after delete on public.users
for each row execute function public.recompute_company_active_on_delete();

create policy "Admins can delete tools even if suspended"
on public.tools for delete
to authenticated
using (public.is_admin(auth.uid()) and company_id = public.get_user_company_id(auth.uid()));

create policy "Admins can delete users even if suspended"
on public.users for delete
to authenticated
using (public.is_admin(auth.uid()) and company_id = public.get_user_company_id(auth.uid()));

create policy "Admins can delete tool checklists even if suspended"
on public.tool_checklists for delete
to authenticated
using (public.is_admin(auth.uid()) and company_id = public.get_user_company_id(auth.uid()));

create policy "Admins can delete checklist reports even if suspended"
on public.checklist_reports for delete
to authenticated
using (public.is_admin(auth.uid()) and company_id = public.get_user_company_id(auth.uid()));
