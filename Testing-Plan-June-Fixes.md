# June Feedback — What I Changed & What You Need To Do

This covers every item from `Testing-Plan-June Response.md`. Each item below says **what you asked**, **what I did**, and **how to test it**. At the very bottom there's a short **"Run this first"** section with the database SQL and the new functions/cron you need to deploy — do that part before testing the last few items (company activity log + scheduler test).

---

## 1. Password "eye" toggle when creating a user (admin portal)
- **You asked:** Add an eye icon to see the password being typed on the create-user screen.
- **What I did:** Added a show/hide eye button inside the password field in the admin portal's "Add User" modal.
- **Test:** Admin portal → Users → Add User → type a password → tap the eye. It should toggle between dots and plain text. Closing the modal resets it back to hidden.

## 2. Damage shows in the transaction notes
- **You asked:** When a claim/checklist reports damage, show it under the notes too, e.g. "Overall Tool Condition – Needs Repair reported."
- **What I did:** When a tool is claimed or self-reported with flagged checklist items, a summary line like `Overall Tool Condition – Needs Repair; Blade – Needs Replacement reported` is appended to the attribution/notes.
- **Test:** On the app, claim a tool and flag a checklist item as damaged/needs replacement. Check the transaction in the admin portal — the damage summary appears under the method/attribution line.

## 3. Claim button: draw attention to missing fields
- **You asked:** If they try to claim without checking responsibility (or other fields), don't do nothing — make the field glow, show red text above the button, and stack the message if they keep tapping.
- **What I did:** The claim button is always tappable now. If required fields are missing, the responsibility row glows red and a red message stacks above the button each time they tap (e.g. "must check responsibility acknowledgement" repeated).
- **Test:** On the app claim form, tap "Finish/Claim" without checking responsibility. The row glows and a red line appears; tap again and it stacks.

## 4. Stop swipe-down-to-close on the claim form
- **You asked:** Swiping to scroll the form was accidentally closing it — make Cancel the only way out.
- **What I did:** Switched the claim form to full-screen presentation so the swipe-down-to-dismiss gesture is disabled. You must press Cancel.
- **Test:** Open the claim form and swipe up/down — it scrolls and no longer closes. Only Cancel closes it.

## 5. "Failed to load tools" after an admin-override transfer
- **You asked:** After transferring tools via admin override on the portal, the app's All Tools refresh showed "failed to load tools."
- **What I did:** The All Tools screen now loads owners in a separate step instead of a join (the join was failing after override). Errors now show the real reason, and pull-to-refresh resets to the first page correctly.
- **Test:** Do an admin override transfer on the portal, then pull-to-refresh All Tools on the app — tools load normally.

## 6. Multi-transfer completion flow
- **You asked:** After finishing a multi-tool transfer, close the form, deselect everything, leave multi-select mode, and go back to All Tools (or to the group screen if it was a group transfer).
- **What I did:** On success it now navigates back to All Tools and clears the multi-select state; if it started from a group, it returns to that Group Detail screen instead.
- **Test:** Select multiple tools → transfer. You land back on All Tools with nothing selected and multi-mode off. Repeat from a group → you land on that group's detail page.

## 7. Admin override attribution: show recipient email
- **You asked:** The override message shows Tech 1's email but not Tech 2's — show both.
- **What I did:** The override attribution now includes the recipient's email, e.g. `... assigned tools to Jane (jane@co.com)`.

## 8. Admin override attribution: "responsibility NOT acknowledged"
- **You asked:** Add a note that responsibility was not acknowledged on overrides.
- **What I did:** Admin override attributions end with `— responsibility NOT acknowledged`.
- **Test (7 & 8):** Do an admin override and read the transaction's method line — it has the recipient's email and the "NOT acknowledged" note.

## 9. "Name (removed)" on the Groups page and Tool Costs page
- **You asked:** Removed users showed "Unassigned"/"Unknown" on the app Groups page and the admin Tool Costs page — show "Name (removed)" instead.
- **What I did:** Both pages now display `Name (removed)` for tools whose owner has left the company.
- **Test:** Remove a user who owns tools, then check the app's Group Detail and the admin Tool Costs page — their name shows with "(removed)".

## 10. One-step photo upload when creating a company tool (admin portal)
- **You asked:** On the app you can add photos while creating a personal tool (and they're discarded if you cancel), but the portal made you create the tool first. Can the portal do it in one step? What are the downsides?
- **Answer:** It wasn't an iPhone-vs-website thing. The portal's old uploader required the tool to already exist because each photo record is tied to a tool row (and looks up the tool's company). The app worked around this by creating the record first.
- **What I did:** The "Add Tool" modal now has a **Tool Images** section. Photos you add during creation are uploaded to storage immediately and then attached to the tool the moment you click **Create Tool**. If you **Cancel**, those photos are deleted from storage so nothing is orphaned — same behavior as the app.
- **Downsides (minor):** A photo briefly lives in storage before the tool is created; if the browser is hard-killed mid-creation (not via Cancel), that one file could linger until a cleanup. This is rare and low-impact.
- **Test:** Admin portal → Tools → Add Tool → fill number/name → add a photo or two → Create Tool. The tool appears with its photos. Repeat but hit Cancel after adding a photo — the photo is discarded (not left in storage).

## 11. Redesign the admin Personal Tools page
- **You asked:** The image preview was huge — make it table-like (like the Tools/Groups screens), pick the tech from a dropdown sorted by who has the most tools (with an A–Z option).
- **What I did:** Rebuilt the page: a **tech dropdown** (sorted by most tools, with a **Most tools / A–Z** toggle), a search box for that tech's tools, and a compact **table** (small 48px thumbnail, number, name, status, date, View). The big card grid is gone.
- **Test:** Admin portal → Personal Tools. Use the dropdown to switch techs, toggle the sort, search, and click a row/View to open details.

## 12. "View fullscreen" button on images (admin portal)
- **You asked:** Add a button that opens the image full-screen in a new tab (linked to the storage URL), on Personal Tools and the main Tools image preview.
- **What I did:** Added a **"View fullscreen (new tab)"** link in the main Tools image viewer and in the Personal Tools detail modal. It opens the full-resolution storage image in a new browser tab.
- **Test:** Open an image preview on either page → click "View fullscreen" → the photo opens in a new tab.

## 13. Personal tool lending search (app)
- **You asked:** When lending and you tap a company user, it should fill the text and stop showing suggestions; also show the tech's email in the suggestion, e.g. "Kevin S (k@example.com)". (It's just autocomplete — no company involvement.)
- **What I did:** Suggestions now show `Name (email)`, match on name **or** email, and disappear once you pick someone (they reappear only if you start editing again).
- **Test:** App → a personal tool → Lend → type part of a coworker's name. Suggestions show name + email; tap one and the list closes with the name filled in.

## 14. Confirm personal tool deletion is a true hard delete
- **You asked:** Make sure deleting a personal tool really removes everything (rows, photos, thumbnails, lending history) from the database.
- **What I did:** Deletion removes the storage photos + thumbnails, the image rows, the lending history, and the tool row. I also added a safety check that re-queries after delete and throws a clear error if anything was blocked (so it can never silently "look deleted" but still be there).
- **Test:** Delete a personal tool on the app. Confirm it's gone from the app and the admin Personal Tools page. (It's now fully removed from the database too.)

## 15. Bigger My Tools dropdowns when collapsed
- **You asked:** The two dropdowns were skinny/small; make them bigger when both are closed, and shrink them once one is open.
- **What I did:** When a section is collapsed its header is taller with larger, bolder text and bigger icons; once opened it returns to the compact size.
- **Test:** App → My Tools. With both sections closed they're large; open one and it shrinks.

## 16. Back arrow on the Account screen (app)
- **You asked:** The Account screen had no way back.
- **What I did:** Added a back arrow in the top-left that returns to the previous screen.
- **Test:** App → tap the account icon → tap the back arrow → you return to the main screen.

## 17. "Not in a company" message + Join button on every screen
- **You asked:** Techs with no company should see a message on all screens explaining they won't see company tools, with a Join button (or directions), and the personal-tools-stay-with-you copy should be expanded.
- **What I did:** Added a reusable banner shown on Home, All Tools, and Groups when the tech isn't in a company. It explains they won't see company tools until they join, that their personal tools (photos, history, everything) stay with them for a frictionless move to a new employer/union coverage, and a **Join a company** button that jumps to the Account screen. The Account screen's join card copy was expanded with the same message.
- **Test:** Use a tech that isn't in a company (or leave one — see #18). Home/All Tools/Groups show the banner with a working Join button.

## 18. Let a tech leave a company (self-serve)
- **You asked:** Techs should be able to leave a company themselves in case the employer forgets to remove them.
- **What I did:** Added a **Leave company** button on the Account screen (under Company Information). It removes them from the company (account + personal tools stay with them; any company tools they held stay logged under their name as "(removed)"). It blocks the last remaining admin from leaving so a company can't be orphaned.
- **Test:** App → Account → Leave company → confirm. You're detached and the #17 banners appear. (Requires the new `leave-company` function deployed — see bottom.)

## 19. Company activity in the transactions log
- **You asked:** User removals/leaves and tool deletions (and additions/creations) should appear in the transactions log so the company's full story is there. **Not** personal tools.
- **What I did:** Added a company activity log. The admin **Transactions** page now shows a single chronological feed mixing tool transfers **and** company events: tool created, tool deleted, user added, user removed, user left — each with who did it and when. Personal tools are intentionally excluded. Events are recorded automatically by the create-tool, create-user, remove-user, leave-company functions and by the portal's tool-delete action.
- **Test (after deploy):** Create a tool, delete a tool, add a user, remove a user, and have a tech leave — each shows up as a row in the admin Transactions feed with an icon/badge.

## 20. Superadmin: schedule a one-off report to test the scheduler
- **You asked:** On the superadmin portal, be able to schedule a one-off automated report (e.g. 5 minutes out) to confirm the scheduler works, without touching the weekly schedule.
- **What I did:** Added a **"Test report scheduler"** panel on the Super Admin dashboard: pick a company, pick personal or company report, set minutes-from-now, and click **Schedule test report**. A separate minutely job runs it when due and emails the company's configured recipients. The existing weekly/monthly scheduling is untouched.
- **Test (after deploy):** Super Admin dashboard → Test report scheduler → choose your test company, "Personal tools", 5 minutes → Schedule. Wait ~5 minutes; the report email should arrive. (Requires the new table, the two new functions, and the minutely cron — see bottom.)

---

# Run this first (deploy steps)

## A) Database — paste into the Supabase SQL editor

```sql
-- 1) Company activity log (item #19)
create table if not exists public.company_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,            -- tool_created | tool_deleted | user_added | user_removed | user_left
  actor_id uuid references public.users(id) on delete set null,
  actor_name text,
  target_type text,                    -- 'tool' | 'user'
  target_id uuid,
  target_label text,                   -- e.g. "#12 - Drill" or "Jane (jane@co.com)"
  details text,
  created_at timestamptz not null default now()
);

create index if not exists company_events_company_created_idx
  on public.company_events (company_id, created_at desc);

alter table public.company_events enable row level security;

-- Company members can read their own company's activity.
drop policy if exists company_events_select on public.company_events;
create policy company_events_select on public.company_events
  for select using (
    company_id in (select company_id from public.users where id = auth.uid())
  );

-- Admins can insert events for their own company (used by the tool-delete action).
drop policy if exists company_events_insert on public.company_events;
create policy company_events_insert on public.company_events
  for insert with check (
    company_id in (select company_id from public.users where id = auth.uid() and role = 'admin')
  );

-- 2) One-off scheduled export runs (item #20)
create table if not exists public.scheduled_export_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  export_type text not null check (export_type in ('personal','company')),
  run_at timestamptz not null,
  status text not null default 'pending',   -- pending | done | error
  result text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists scheduled_export_runs_due_idx
  on public.scheduled_export_runs (status, run_at);

alter table public.scheduled_export_runs enable row level security;
-- No client policies needed: only the service role (edge functions) touches this table.
```

**What this does, plainly:** Adds two new tables. `company_events` is the company activity log shown in the Transactions page (who created/deleted a tool, who added/removed/left). `scheduled_export_runs` is a little queue the superadmin "test the scheduler" button writes to. Neither touches existing data; they're purely additive.

## B) Deploy the new + changed edge functions

New functions:
- `leave-company` (item #18)
- `schedule-export-run` (item #20)
- `process-scheduled-export-runs` (item #20)

Changed functions (re-deploy):
- `scheduled-inventory-export` (added one-off mode)
- `create-tool`, `create-user`, `remove-user-from-company` (now log company events)

Deploy them with the Supabase CLI, e.g.:

```bash
supabase functions deploy leave-company
supabase functions deploy schedule-export-run
supabase functions deploy process-scheduled-export-runs
supabase functions deploy scheduled-inventory-export
supabase functions deploy create-tool
supabase functions deploy create-user
supabase functions deploy remove-user-from-company
```

(`process-scheduled-export-runs` is already set to not require a JWT in `config.toml`, matching the other cron functions.)

## C) Add the minutely cron for the one-off scheduler (item #20)

This is a **new, separate** schedule — it does not change your weekly report cron. Replace `<YOUR-PROJECT-REF>` and `<YOUR-CRON-SECRET>` with the same values your existing weekly job uses:

```sql
select cron.schedule(
  'process-scheduled-export-runs',
  '* * * * *',  -- every minute
  $$
    select net.http_post(
      url     := 'https://<YOUR-PROJECT-REF>.functions.supabase.co/process-scheduled-export-runs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', '<YOUR-CRON-SECRET>'
      ),
      body    := '{}'::jsonb
    );
  $$
);
```

That's everything. Once A–C are done, items **#18, #19, and #20** are fully testable; all the other items work as soon as the app build and the admin/superadmin portals are updated.
