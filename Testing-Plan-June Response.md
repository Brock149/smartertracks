# SmarterTracks — June Update Testing Plan

This is the full QA checklist for everything we changed across this update (Phases 1–3 + follow-ups). Work top to bottom. Each case has **Steps** and **Expected**. Tick the box when it passes.

**Legend**
- 📱 = SmarterTracks mobile app (tech)
- 🖥️ = Admin web portal
- 👑 = Super Admin web portal
- 🗄️ = Database / Supabase
- ✉️ = Email

**Test accounts you'll want ready**
- Admin A (admin of Company 1)
- Tech T1, Tech T2 (members of Company 1)
- A second company (Company 2) with its own admin, for "join a company" testing
- Super Admin login

---

## 0. Pre-test setup (do these first)

Confirm all the backend pieces are live before functional testing.

- [ ] 🗄️ **SQL — Account survives firing** block has been run (remove_user_from_company, store_deleted_user_name trigger, search_tools update)
- [ ] 🗄️ **SQL — Personal tool DELETE policies** block has been run (owners can delete their own personal tools/images/transactions)
- [ ] 🗄️ **SQL — Automated personal export** block has been run (auto_export_* columns + upsert_company_export_settings + get_my_company_settings)
- [ ] 🗄️ **SQL — Automated company export** block has been run (company_export_* columns + upsert_company_tools_export_settings)
- [ ] 🗄️ Resend account created, domain `smartertracks.com` verified (SPF/DKIM), Gmail still works
- [ ] 🗄️ Secrets set in Supabase: `RESEND_API_KEY`, `CRON_SECRET`, `EXPORT_FROM_EMAIL` (`SmarterTracks Reports <reports@smartertracks.com>`)
- [ ] 🗄️ Edge functions deployed: `scheduled-inventory-export`, `purge-deleted-personal-tools`, `generate-personal-thumbnail`, `remove-user-from-company`, `join-company-with-code`
- [ ] 🗄️ Daily cron schedule created (pg_cron + pg_net → `scheduled-inventory-export`)
- [ ] 📱 Latest app build installed on a real phone (camera/photo features need a device)

---

## 1. Tech tool claims & transfers (the core flows)

These are the flows we touched for attribution + responsibility acknowledgment. For each, after the action, open the tool's history (📱 Tool Detail → Latest Transaction Notes, and 🖥️ Transactions) to verify the **attribution line**.

### 1.1 Single tool claim — self (📱 Tool Detail)
- [ ] **Steps:** As T1, open a tool not owned by you → fill Location + Stored At → check the responsibility box → Claim.
- [ ] **Expected:** Claim succeeds; tool now owned by T1; attribution reads **"Tool claimed by {T1 name} ({email}) — responsibility acknowledged"**.

### 1.2 Single tool claim — acknowledgment required
- [ ] **Steps:** As T1, open an unclaimed tool, fill Location + Stored At, but do **not** check the box → try to Claim.
- [ ] **Expected:** Claim button disabled / blocked with message "Please check the responsibility acknowledgment to continue." No transaction created.

### 1.3 Single claim — name missing fallback
- [ ] **Steps:** Use a tech whose profile name is blank; claim a tool.
- [ ] **Expected:** Attribution falls back to **"Tool claimed by {email} — responsibility acknowledged"** (email only, not duplicated).

### 1.4 Multi-tool claim — self (📱 Multi-transfer)
- [ ] **Steps:** As T1, select multiple tools → claim them to yourself → check acknowledgment → submit.
- [ ] **Expected:** All selected tools owned by T1; each transaction attribution reads **"Tool claimed by {T1 label} — responsibility acknowledged"**; all share one batch.

### 1.5 Multi-tool transfer — tech to tech
- [ ] **Steps:** As T1, select multiple tools you own → transfer to T2 → submit.
- [ ] **Expected:** Tools now owned by T2; attribution reads **"Transferred by {T1 label} to {T2 name}"**. (T2 did not have to acknowledge.)

### 1.6 Admin override transfer (🖥️/📱 admin assigns)
- [ ] **Steps:** As Admin A, transfer one or more tools to T2 (multi-transfer/assign).
- [ ] **Expected:** Tools owned by T2; attribution reads **"Admin override: {Admin A label} assigned tools to {T2 name}"**.

### 1.7 Group transfer — from a tool group (📱 Group Detail)
- [ ] **Steps:** As T1, open a Group → "Transfer Group" → choose recipient (self or T2) → submit.
- [ ] **Expected:** Routes through the multi-transfer flow; every tool in the group transfers; attribution matches the actor/role (self-claim, transfer, or admin override per cases 1.4–1.6).

### 1.8 Admin transfer through a group claim
- [ ] **Steps:** As Admin A, open a Group → Transfer Group → assign to T2 → submit.
- [ ] **Expected:** All group tools assigned to T2; attribution reads **"Admin override: {Admin A label} assigned tools to {T2 name}"** on each.

### 1.9 Legacy single transfer screen (if still reachable)
- [ ] **Steps:** Reach the older single Transfer screen and transfer a tool.
- [ ] **Expected:** Attribution + (if applicable) damage auto-fill behave consistently with the new flows; no crash.

### 1.10 Default location/owner applied on claim
- [ ] **Steps:** With company defaults enabled (🖥️ Settings), create/claim so defaults apply.
- [ ] **Expected:** Default location/owner applied as configured; a transaction reflecting the default appears.

### 1.11 Location alias normalization on claim
- [ ] **Steps:** Set up a location alias (🖥️ Settings, e.g. "shop" → "Warehouse"); claim a tool typing the alias as the location.
- [ ] **Expected:** Stored location is the normalized value ("Warehouse").

### 1.12 Claim a tool that has open issues (warning modal)
- [ ] **Steps:** Claim a tool that has an unresolved damage/checklist report.
- [ ] **Expected:** Warning modal lists the issues; proceeding records the claim and shows the "you accept responsibility" note.

---

## 2. Damage / checklist reports

### 2.1 Self-report damage on owned tool
- [ ] **Steps:** As T1 on a tool you own, mark a checklist item Damaged/Needs Replacement, add a comment → submit report.
- [ ] **Expected:** Report saved; attribution reads **"Checklist report submitted by {T1 name} ({email})"**; issue count confirmed.

### 2.2 Damage comment auto-fill fallback
- [ ] **Steps:** Flag an item as damaged but leave its per-item comment blank while putting text in the overall notes.
- [ ] **Expected:** The report's comment falls back to the overall notes (not blank).

### 2.3 All-OK report
- [ ] **Steps:** Submit a checklist with everything marked OK.
- [ ] **Expected:** "No Issues Found — no report needed"; no report row created.

---

## 3. Attribution & transaction log display

### 3.1 App history shows attribution
- [ ] **Steps:** 📱 Open any tool's detail; view Latest Transaction Notes.
- [ ] **Expected:** Attribution line shown above free-text notes (greyed style), notes shown separately.

### 3.2 Admin Transactions shows attribution
- [ ] **Steps:** 🖥️ Transactions page; inspect recent transactions from Section 1.
- [ ] **Expected:** Attribution displayed for each; free-text notes separate.

### 3.3 "New tool from X" banner removed
- [ ] **Steps:** 📱 Browse tools/notifications where the old "New tool from X" banner used to appear.
- [ ] **Expected:** Banner no longer shown anywhere.

---

## 4. Removed / deleted names everywhere

After a tech is removed (see Section 10), names must read **"{Name} (removed)"** — never "Unknown"/"Unassigned"/blank.

- [ ] 4.1 📱 Tool Detail history — former from/to user shows "{Name} (removed)"
- [ ] 4.2 📱 All Tools — owner of a tool held by a removed tech shows "{Name} (removed)"
- [ ] 4.3 📱 My Tools — any removed participant shows "{Name} (removed)"
- [ ] 4.4 🖥️ Tools page — Current Owner shows "{Name} (removed)" (and it's searchable)
- [ ] 4.5 🖥️ Transactions page — from/to of a removed user shows "{Name} (removed)"
- [ ] 4.6 Wording is consistently "(removed)" (no leftover "(deleted)")

---

## 5. Personal tools — create & photos (📱)

### 5.1 Create a personal tool
- [ ] **Steps:** My Tools → Add Personal Tool → enter a name → save.
- [ ] **Expected:** Tool created with auto-assigned per-tech number; appears under Personal Tools.

### 5.2 Add photo via camera
- [ ] **Steps:** Add a photo using the camera.
- [ ] **Expected:** Permission prompt once; photo uploads; thumbnail generates and displays.

### 5.3 Add photo via library + multiple photos
- [ ] **Steps:** Add photos from library, up to the max (4).
- [ ] **Expected:** Multiple photos saved; can't exceed the cap; primary photo shows as the tool's main image.

### 5.4 Full-screen photo viewer
- [ ] **Steps:** Tap a photo in Personal Tool Detail.
- [ ] **Expected:** Opens full-screen viewer; swipe between photos.

### 5.5 Delete one photo (primary handling)
- [ ] **Steps:** Delete the primary photo while others remain.
- [ ] **Expected:** Another photo becomes primary; tool's main image updates (no broken image). Delete the last photo → tool shows no-photo state.

### 5.6 Edit personal tool name
- [ ] **Steps:** Rename a personal tool.
- [ ] **Expected:** Name updates everywhere.

---

## 6. Personal tools — lend / return + history (📱)

### 6.1 Lend to a free-text name
- [ ] **Steps:** Lend a personal tool, typing a name that isn't a company user.
- [ ] **Expected:** Tool marked "Lent out" to that name; history logs a "lent" entry.

### 6.2 Lend to a company user (search)
- [ ] **Steps:** Start typing a company user's name in the lend box.
- [ ] **Expected:** Search suggestions appear (like admin transfer search); selecting one attaches that user; free-text still allowed if not selected.

### 6.3 Borrower does NOT see the lend
- [ ] **Steps:** Log in as the company user you "lent" to.
- [ ] **Expected:** They see nothing about the lent personal tool (it's only the owner's private record).

### 6.4 Return a lent tool
- [ ] **Steps:** Return the lent tool.
- [ ] **Expected:** Status back to "In your possession"; history logs a "returned" entry.

### 6.5 History log completeness
- [ ] **Steps:** Open the tool's history.
- [ ] **Expected:** Shows created → lent → returned entries in order.

---

## 7. Personal tools — delete (permanent) + purge

### 7.1 Delete a personal tool (📱)
- [ ] **Steps:** Personal Tool Detail → Delete → confirm.
- [ ] **Expected:** Confirmation says it's permanent/can't be undone; tool disappears from app.

### 7.2 Verify it's truly gone (🗄️)
- [ ] **Steps:** Check `personal_tools`, `personal_tool_images`, `personal_tool_transactions`, and the `personal-tool-images` storage bucket for that tool.
- [ ] **Expected:** Rows gone; photo files removed from storage (no orphans).

### 7.3 Super Admin purge button (👑)
- [ ] **Steps:** Super Admin dashboard → "🧹 Purge Deleted Personal Tools" → confirm.
- [ ] **Expected:** Returns a count like "Purged N tools and removed M photo files"; any previously soft-deleted leftovers are cleaned. Running again says "Nothing to purge."

---

## 8. My Tools screen redesign (📱)

- [ ] 8.1 Page opens with **both** sections (Company Tools, Personal Tools) **collapsed**
- [ ] 8.2 Expanding one section does not force-collapse the other
- [ ] 8.3 Spacing/padding looks right (space between dropdown header and the list/button below; not too much padding around company tools)
- [ ] 8.4 "Add Personal Tool" button has spacing from the Personal Tools dropdown
- [ ] 8.5 Company tools list still shows correct owner/status; no hooks/render crash

---

## 9. Manual personal export (PDF from app) (📱)

### 9.1 Export inventory PDF
- [ ] **Steps:** My Tools → export your personal inventory.
- [ ] **Expected:** A PDF generates and the share sheet opens; PDF lists your tools with thumbnails + status.

### 9.2 Last-exported indicator
- [ ] **Steps:** After exporting, look at the My Tools export area.
- [ ] **Expected:** "Last exported" timestamp updates.

---

## 10. Account survives firing (📱 + 🖥️)

### 10.1 Remove a tech from a company (🖥️)
- [ ] **Steps:** As Admin A, Users page → on T2, click **Remove from company** (amber) → confirm.
- [ ] **Expected:** T2 detached from Company 1; their account still exists; the permanent "Delete" button is **gone** (only Remove from company exists).

### 10.2 Removed tech's tools keep their name
- [ ] **Steps:** Check tools previously owned by T2 (📱 All Tools + 🖥️ Tools).
- [ ] **Expected:** Owner shows **"{T2 name} (removed)"**, not Unassigned/Unknown.

### 10.3 Can't remove the last admin
- [ ] **Steps:** Try to remove the only admin of a company.
- [ ] **Expected:** Blocked with a clear error.

### 10.4 Removed tech can still log in
- [ ] **Steps:** Log in as T2 after removal.
- [ ] **Expected:** Account works; they're shown as not in a company; their **personal tools still exist**.

### 10.5 Join a company with a code (📱)
- [ ] **Steps:** As detached T2, in Account, enter Company 2's access code → join.
- [ ] **Expected:** T2 becomes a member of Company 2; sees Company 2 tools; personal tools carried over.

### 10.6 Self-serve account delete with password (📱)
- [ ] **Steps:** As a tech, Account → Delete account → enter password.
- [ ] **Expected:** Wrong password blocks; correct password deletes the account.

---

## 11. Admin portal — Personal Tools view-only (🖥️)

- [ ] 11.1 "Personal Tools" link visible only to **admins** (not regular techs)
- [ ] 11.2 Employee list shows techs; selecting one shows their personal tools grid
- [ ] 11.3 Tool detail modal shows photos/status; everything is **read-only** (no edit/delete)
- [ ] 11.4 Search filters by employee name, email, or tool name

---

## 12. Automated personal report (✉️)

### 12.1 Configure
- [ ] **Steps:** 🖥️ Settings → "Automated Inventory Reports" → add recipient(s), pick frequency, toggle on, Save.
- [ ] **Expected:** Saves; "Last sent" shows "Not sent yet".

### 12.2 Send test now
- [ ] **Steps:** Click "Send test now".
- [ ] **Expected:** Success message; email arrives at recipients (check spam) from `reports@smartertracks.com`; reply-to is your Gmail.

### 12.3 Attachment contents
- [ ] **Expected:** `.xlsx` attached listing all employees' personal tools (Employee, Email, Tool #, Name, Status, Lent To, Location, Date Added, Photo columns).

### 12.4 Enable validation
- [ ] **Steps:** Toggle on with zero recipients → Save.
- [ ] **Expected:** Blocked with "add at least one recipient" message.

### 12.5 Scheduled run (optional / time-based)
- [ ] **Steps:** Leave enabled; verify on the next Monday (weekly) or 1st (monthly).
- [ ] **Expected:** Report auto-sends; "Last sent" updates; not re-sent twice same day.

---

## 13. Automated company tool report (✉️)

### 13.1 Configure
- [ ] **Steps:** 🖥️ Settings → "Automated Company Tool Reports" → recipients, frequency, toggle on, Save.
- [ ] **Expected:** Saves independently of the personal report settings.

### 13.2 Send test now
- [ ] **Steps:** Click "Send test now" on the company card.
- [ ] **Expected:** Email arrives with the company tool `.xlsx`.

### 13.3 Sorted by location
- [ ] **Expected:** Rows sorted by Location; tools with no location sink to the bottom as "No Location".

### 13.4 Columns correct
- [ ] **Expected:** Location, Stored At, Tool #, Name, Description, Current Owner, Est. Cost, Date Added, Photo columns. Owner shows "{Name} (removed)" where applicable.

### 13.5 Summary line
- [ ] **Expected:** Email body shows tool count, # locations, est. total value, # unassigned.

### 13.6 Independent schedules
- [ ] **Steps:** Set personal = weekly, company = monthly (or vice-versa).
- [ ] **Expected:** Each fires on its own cadence; each has its own "Last sent".

---

## 14. XLSX format checks (open the attachments)

- [ ] 14.1 File opens in Excel/Google Sheets as a real spreadsheet (not raw text)
- [ ] 14.2 Every column header has the **filter/sort dropdown** (AutoFilter on)
- [ ] 14.3 Multiple photos appear in **separate columns** (Photo 1, Photo 2, Photo 3 …)
- [ ] 14.4 Photo cells are **clickable links** that open the full image
- [ ] 14.5 Est. Cost (company report) shows as currency and sorts numerically
- [ ] 14.6 Accented/special characters in names render correctly
- [ ] 14.7 Deleted-tool photo links: a link in an older email may be dead after the tool is deleted (expected — see note)

---

## 15. Regression / don't-break checks

- [ ] 15.1 🖥️ Tools CRUD (create, edit, delete, checklist, images, estimated cost) still works
- [ ] 15.2 🖥️ Users add/edit still works
- [ ] 15.3 🖥️ Settings: defaults + location aliases still save
- [ ] 15.4 📱 Login, signup-with-code, forgot password still work
- [ ] 15.5 📱 Home / All Tools / search still work
- [ ] 15.6 🖥️ Transactions list + filters still work
- [ ] 15.7 👑 Super Admin: companies, access codes, app versions still work
- [ ] 15.8 Billing/Stripe untouched and still functioning

---

### Notes
- **Deleted personal-tool photo links** in already-sent emails will break once the tool is hard-deleted (the file is removed from storage to save space). This is expected and acceptable — only the tool owner can delete, and there's no real-world case where a legitimate record-keeping need is undermined by the owner deleting their own tool.
- **Email sender:** before the Resend domain is verified, "Send test now" can only deliver to your own Resend-account email. Add that address as a recipient to test early.
- **Cron timing:** the daily job runs ~13:00 UTC (≈8–9am ET). Weekly = Mondays, monthly = the 1st.
