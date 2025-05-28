-- Drop existing policies if they exist
drop policy if exists "Admins can do everything with tool checklists" on tool_checklists;
drop policy if exists "Users can view tool checklists" on tool_checklists;

-- Enable RLS on tool_checklists table if not already enabled
alter table tool_checklists enable row level security;

-- Policy for admins to do everything with tool checklists
create policy "Admins can do everything with tool checklists"
on tool_checklists
for all
to authenticated
using (
    exists (
        select 1 from users
        where users.id = auth.uid()
        and users.role = 'admin'
    )
);

-- Policy for users to view tool checklists
create policy "Users can view tool checklists"
on tool_checklists
for select
to authenticated
using (true); 