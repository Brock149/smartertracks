# Guide: Setting Up Supabase RLS for Admin User Display

This guide documents the exact steps and SQL commands used to enable secure admin access to all users in the Supabase dashboard, using JWT custom claims and Row Level Security (RLS).

---

## 1. Create a Trigger Function to Sync Role to JWT

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  update auth.users
  set raw_user_meta_data = jsonb_set(
    coalesce(raw_user_meta_data, '{}'),
    '{role}',
    to_jsonb((select role from public.users where id = new.id))
  )
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;
```

---

## 2. Add Triggers for Insert and Update

```sql
drop trigger if exists on_user_created on public.users;
create trigger on_user_created
  after insert on public.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists on_user_updated on public.users;
create trigger on_user_updated
  after update on public.users
  for each row execute procedure public.handle_new_user();
```

---

## 3. Backfill Existing Users' Metadata

```sql
update auth.users
set raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'),
  '{role}',
  to_jsonb((select role from public.users where public.users.id = auth.users.id))
)
where id in (select id from public.users);
```

---

## 4. Update the RLS Policy to Use the Correct JWT Path

```sql
drop policy if exists "Admins can view all users" on users;
create policy "Admins can view all users"
  on users
  for select
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
```

---

## 5. Log Out and Log Back In

- Log out of your app and log back in as your admin user to refresh the JWT with the new claim.

---

## 6. Test

- As an admin, you should now be able to see all users in your dashboard.
- If you want to test in SQL:

```sql
set request.jwt.claim.role = 'admin';
set request.jwt.claim.sub = '<your-admin-user-id>';
select * from users;
```

---

**This setup ensures only users with `user_metadata.role = 'admin'` in their JWT can view all users, using secure RLS policies.** 