-- Group activity log (create/delete history)

create table if not exists public.group_activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  group_id uuid,
  group_name text,
  action text not null check (action in ('created', 'deleted')),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);

alter table public.group_activity_log enable row level security;

create policy "Admins can view group activity in their company"
on public.group_activity_log for select
to authenticated
using (
  public.is_admin(auth.uid())
  and company_id = public.get_user_company_id(auth.uid())
);

create policy "Service role can do everything on group activity"
on public.group_activity_log
to service_role
using (true)
with check (true);

create or replace function public.log_group_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_name text;
  v_action text;
  v_group_id uuid;
  v_group_name text;
  v_company_id uuid;
begin
  v_actor_id := auth.uid();

  if (tg_op = 'INSERT') then
    v_action := 'created';
    v_group_id := new.id;
    v_group_name := new.name;
    v_company_id := new.company_id;
    if v_actor_id is null then
      v_actor_id := new.created_by;
    end if;
  elsif (tg_op = 'DELETE') then
    v_action := 'deleted';
    v_group_id := old.id;
    v_group_name := old.name;
    v_company_id := old.company_id;
    if v_actor_id is null then
      v_actor_id := old.created_by;
    end if;
  else
    return coalesce(new, old);
  end if;

  select name into v_actor_name from public.users where id = v_actor_id;

  insert into public.group_activity_log (
    company_id,
    group_id,
    group_name,
    action,
    actor_user_id,
    actor_name
  ) values (
    v_company_id,
    v_group_id,
    v_group_name,
    v_action,
    v_actor_id,
    v_actor_name
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_tool_groups_log_create on public.tool_groups;
create trigger trg_tool_groups_log_create
after insert on public.tool_groups
for each row execute function public.log_group_activity();

drop trigger if exists trg_tool_groups_log_delete on public.tool_groups;
create trigger trg_tool_groups_log_delete
after delete on public.tool_groups
for each row execute function public.log_group_activity();
