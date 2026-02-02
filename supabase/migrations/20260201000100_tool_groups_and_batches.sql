-- Tool groups and transaction batches (additive)

create table if not exists public.tool_groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint ck_tool_groups_company_active check (public.is_company_active(company_id))
);

create unique index if not exists idx_tool_groups_company_name
  on public.tool_groups (company_id, lower(name));

create table if not exists public.tool_group_members (
  group_id uuid not null references public.tool_groups(id) on delete cascade,
  tool_id uuid not null references public.tools(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, tool_id)
);

create index if not exists idx_tool_group_members_tool_id
  on public.tool_group_members (tool_id);

create table if not exists public.transaction_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  notes text,
  location text,
  stored_at text,
  from_user_id uuid references public.users(id) on delete set null,
  to_user_id uuid references public.users(id) on delete set null,
  constraint ck_batches_company_active check (public.is_company_active(company_id))
);

create index if not exists idx_transaction_batches_company_id
  on public.transaction_batches (company_id);

create index if not exists idx_transaction_batches_created_at
  on public.transaction_batches (created_at desc);

alter table public.tool_transactions
  add column if not exists batch_id uuid references public.transaction_batches(id) on delete set null;

create index if not exists idx_tool_transactions_batch_id
  on public.tool_transactions (batch_id);

-- Enforce active company on new tables
drop trigger if exists trg_tool_groups_active on public.tool_groups;
create trigger trg_tool_groups_active
before insert or update on public.tool_groups
for each row execute function public.enforce_company_active();

drop trigger if exists trg_batches_active on public.transaction_batches;
create trigger trg_batches_active
before insert or update on public.transaction_batches
for each row execute function public.enforce_company_active();

alter table public.tool_groups enable row level security;
alter table public.tool_group_members enable row level security;
alter table public.transaction_batches enable row level security;

-- Tool groups policies
create policy "Users can view tool groups in their company"
on public.tool_groups for select
to authenticated
using (company_id = public.get_user_company_id(auth.uid()));

create policy "Admins can manage tool groups in their company"
on public.tool_groups
to authenticated
using (
  public.is_admin(auth.uid())
  and company_id = public.get_user_company_id(auth.uid())
  and public.is_company_active(company_id)
)
with check (
  public.is_admin(auth.uid())
  and company_id = public.get_user_company_id(auth.uid())
  and public.is_company_active(company_id)
);

-- Tool group members policies
create policy "Users can view tool group members in their company"
on public.tool_group_members for select
to authenticated
using (
  exists (
    select 1
    from public.tool_groups g
    where g.id = tool_group_members.group_id
      and g.company_id = public.get_user_company_id(auth.uid())
  )
);

create policy "Admins can manage tool group members in their company"
on public.tool_group_members
to authenticated
using (
  public.is_admin(auth.uid())
  and exists (
    select 1
    from public.tool_groups g
    where g.id = tool_group_members.group_id
      and g.company_id = public.get_user_company_id(auth.uid())
  )
)
with check (
  public.is_admin(auth.uid())
  and exists (
    select 1
    from public.tool_groups g
    where g.id = tool_group_members.group_id
      and g.company_id = public.get_user_company_id(auth.uid())
  )
);

-- Transaction batches policies
create policy "Users can view transaction batches in their company"
on public.transaction_batches for select
to authenticated
using (company_id = public.get_user_company_id(auth.uid()));

create policy "Users can create transaction batches in their company"
on public.transaction_batches for insert
to authenticated
with check (company_id = public.get_user_company_id(auth.uid()));

create policy "Admins can update transaction batches in their company"
on public.transaction_batches for update
to authenticated
using (
  public.is_admin(auth.uid())
  and company_id = public.get_user_company_id(auth.uid())
)
with check (
  public.is_admin(auth.uid())
  and company_id = public.get_user_company_id(auth.uid())
);

create policy "Admins can delete transaction batches in their company"
on public.transaction_batches for delete
to authenticated
using (
  public.is_admin(auth.uid())
  and company_id = public.get_user_company_id(auth.uid())
);
