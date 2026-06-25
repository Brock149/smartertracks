-- Store the recipient's email when a personal tool is lent out, so the owner
-- can still contact them (e.g. if the owner leaves the company while a tool is
-- still on loan). Purely additive; existing rows get NULL.

alter table public.personal_tools
  add column if not exists lent_to_email text;

alter table public.personal_tool_transactions
  add column if not exists to_email text;
