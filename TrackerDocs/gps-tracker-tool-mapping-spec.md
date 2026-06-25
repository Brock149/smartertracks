# GPS Tracker → Tool/Company Mapping: Problem Brief

## Context

Smarter Tracks is adding GPS tracking via Digital Matter Yabby Edge Cellular
trackers. Raw location data now successfully flows end-to-end:

**Tracker → Digital Matter Device Manager → Location Engine Connector →
Custom Forwarder → our webhook → `tracker_locations` table in Supabase**

This pipeline is confirmed working as of today. Real pings from a live
device (serial `1813939`) are landing in `tracker_locations` with accurate
coordinates, on a recurring interval, matching the device's real-world
location.

## Current state of `tracker_locations`

This table is a flat, append-only log of raw pings. Relevant columns:
`id`, `serial`, `latitude`, `longitude`, `altitude`, `speed`, `heading`,
`accuracy`, `battery`, `fix_type`, `recorded_at`, `received_at`.

Important characteristics to design around:

- It is keyed only by `serial` (the physical tracker's hardware ID). It has
  **no concept of tools or companies** — that mapping doesn't exist yet
  anywhere in the schema.
- Pings can have `latitude`/`longitude` as `NULL` when the device fails to
  get a GNSS/WiFi/cell fix on a given scan cycle. The device still checks in
  and logs a row, just without a resolved position. Downstream logic needs
  to treat "no fix" as "still alive, last known position unchanged" — not as
  a value to display or to overwrite a tool's last known location with.
- Most enrichment fields (`accuracy`, `heading`, `speed`, `altitude`) are
  frequently `NULL` even on valid-position rows, since this depends on
  which lookup method (GNSS vs WiFi vs cell) resolved the fix. Don't assume
  these are reliably populated.
- This table will grow fast and indefinitely — roughly 20 trackers today,
  reporting on some regular interval, with that number expected to grow as
  more units are purchased. It is a high-volume, append-only time-series
  table. It should stay "dumb" (raw ingestion only) and not be made
  responsible for knowing about tools, companies, or current assignments.
- The table currently contains some leftover synthetic/test rows (random
  global coordinates, `serial = NULL`, placeholder serials like `1111111`)
  from early schema testing. These should be identified and cleaned out as
  part of this work, or at minimum excluded from any view/query logic so
  they never surface in the app.

## Existing schema relevant to this work

- `tools` table already exists and already has a `company_id` column
  (multi-tenant boundary already established elsewhere in the schema).
- The broader app already has multi-tenant patterns in place (RLS policies,
  JWT claims, or whatever mechanism is already used elsewhere for company
  isolation) — this should be followed for consistency rather than
  introducing a new isolation pattern.

## The core problem to solve

We need to go from "a stream of anonymous GPS pings by hardware serial" to
"where is this specific tool, right now, for this specific company" —
safely, and with history.

This is not a single assignment step — it's two distinct ownership
transitions that happen at different times, by different people, in
different parts of the app:

1. **SuperAdmin → Company.** Brock (platform owner) provisions trackers
   with Digital Matter, then sells/ships physical units to a specific
   paying company. This assignment happens in a SuperAdmin-only part of the
   app, before the hardware ever reaches the customer.
2. **Company → Tool.** Once a company has trackers assigned to their
   account, *their own users* (not Brock) decide which of their tools each
   tracker gets attached to, and can reassign as hardware moves between
   tools over time.

Both transitions need their own "currently unassigned" pool:

- **Global unassigned pool** — trackers Brock owns that haven't been sold/
  shipped to any company yet. Visible only in the SuperAdmin portal, never
  visible to any company.
- **Company-level unassigned pool** — trackers a specific company owns that
  haven't been attached to one of that company's tools yet. Visible only to
  that company (and to SuperAdmin), never visible to other companies.

A tracker only "graduates" from the global pool to a company's pool once
Brock explicitly assigns it in the SuperAdmin portal. A tracker only starts
resolving to a tool's location once that company explicitly attaches it to
a tool. In between those two steps, the tracker may already be reporting
GPS pings (it could be powered on and sitting on a shelf) — those pings
still land in `tracker_locations` as normal, they just don't resolve to any
tool or get shown to anyone yet.

### Requirement 1: Tracker-to-company assignment (SuperAdmin)

Brock needs a SuperAdmin-portal page/workflow to:

- See all trackers currently in the global unassigned pool (provisioned in
  Digital Matter, working, not yet sold to anyone).
- Assign one or more of those trackers to a specific company — this is the
  "I'm shipping these serials to this customer" action.
- See, per company, which trackers have been assigned to them (regardless
  of whether that company has gone on to attach them to tools yet).
- Reassign or reclaim a tracker back to the global pool if needed (e.g., a
  company churns, hardware gets returned, a mistake was made).
- This needs its own history too — same reasoning as tool reassignment
  below: which trackers have ever belonged to which companies, and when.

### Requirement 2: Tracker-to-tool assignment, with reassignment support (Company-level)

A physical tracker is **not permanently bolted** to one tool. Over time:

- A tracker may be attached to Tool A, then later detached and reattached
  to Tool B (hardware gets moved, tools get retired, trackers get repaired
  and redeployed, etc) — **within the same company**. A company should
  only ever be able to attach a tracker to a tool if that tracker has
  already been assigned to that company by SuperAdmin (Requirement 1).
- We need **full history** of which tracker was on which tool, during which
  time window — not just "current assignment." This is important both for
  auditing ("where was this tool last Tuesday") and for correctness (so
  that a tracker's ping history from its *previous* tool assignment never
  gets attributed to its *current* tool).
- At any given moment, a single tracker serial must resolve to **at most
  one active tool assignment** — it should not be possible (by accident or
  race condition) for the same physical tracker to appear assigned to two
  tools simultaneously.
- The system needs a clear way for a company user to "assign tracker X to
  tool Y" and "unassign tracker X from tool Y" as discrete actions, each
  producing a clean historical record. This is a separate action, by a
  separate type of user, from the SuperAdmin company-assignment step above.

### Requirement 3: Resolving current location per tool, scoped to assignment windows

Given a tool, we need to efficiently find its current GPS position. This
needs to:

- Only consider pings from the tracker that is **currently** assigned to
  that tool (not a tracker that was previously assigned and has since moved
  on to a different tool).
- Only consider pings that fall **within the time window of that specific
  assignment** (i.e., a ping recorded before the tracker was assigned to
  this tool, or after it was unassigned, should not be attributed to this
  tool's location history).
- Skip/ignore no-fix pings (null lat/lng) when determining "current
  location" — fall back to the most recent ping that actually has a
  resolved position.
- Be performant against a `tracker_locations` table that will contain
  potentially millions of rows over time, for an app feature (likely a live
  map view) that needs reasonably fast reads. Whether this is solved via an
  indexed view, a materialized/denormalized "current location" field
  maintained on `tools` itself, or some other approach is open — but the
  raw `tracker_locations` ingestion table should not need to change shape
  to support this, and a brute-force full-table scan per tool per page load
  is not acceptable at scale.

### Requirement 4: Company-level data isolation

Two separate isolation boundaries need enforcing:

- **SuperAdmin visibility**: Brock should be able to see all trackers across
  the global pool and every company's assignments. This is the only role
  that should see the global unassigned pool.
- **Company visibility**: A company should only ever see trackers currently
  or historically assigned to *them* (Requirement 1) and, within that, only
  ever see tool-level assignment data for *their own* tools (Requirement
  2). A company should never see another company's trackers, assignments,
  or location data, and should never see Brock's global unassigned pool.

Both the company-assignment table and the tool-assignment table should
carry an explicit `company_id` (not just inferred via a join through
`tools`), so this is enforced consistently and matches existing RLS /
tenant-isolation patterns already used elsewhere in this codebase.

### Requirement 5: Unassigned/available tracker visibility, at both tiers

We own a pool of physical trackers (currently ~20 units, growing). At any
given time, each tracker sits in one of three states:

1. Unassigned globally (Brock owns it, not yet sold to any company)
2. Assigned to a company, but not yet attached to any of that company's
   tools
3. Assigned to a company AND attached to a specific tool

We need to be able to answer "which trackers are in state 1" (for Brock,
when fulfilling a new order) and "which trackers are in state 2" (for a
company's own admin, when deciding what to attach to a new tool). Both of
these are real UI surfaces that need to exist — this is not just a
data-layer nicety:

- **SuperAdmin portal**: a page/workflow for Brock to view the global
  unassigned pool, assign trackers to a company, view per-company
  assignment history, and reclaim/reassign trackers back to the global
  pool.
- **Company-facing app**: a page/workflow for a company's own users to view
  their company's unassigned tracker pool and attach/detach trackers to
  their own tools (this likely already fits naturally alongside wherever
  tools are currently managed in the company-facing app).

### Requirement 7: Attachment type — temporary vs. permanent mount

Customer feedback (a real prospect conversation) surfaced two genuinely
different physical relationships between a tracker and a tool, and the
day-to-day UX needs to be different for each — not just a config toggle
buried in settings, but a difference in what buttons/steps a field worker
even sees:

- **Temporary / loose mount.** The tracker is a separate physical object
  that rides along with the tool only while it's signed out — e.g. grabbed
  from a drawer/cabinet of pooled trackers and tossed in the tool's case at
  checkout, then returned to the pool when the tool comes back. This is
  the model one prospect described explicitly: workers scan a tracker with
  their employee ID and toss it in the case alongside a Pro Press kit,
  core drill, ladder, etc. For this mode, "attach tracker" naturally
  belongs alongside the existing tool sign-out flow, and "detach tracker"
  belongs alongside check-in. The tracker is not really "this tool's
  tracker" so much as a pooled resource that's temporarily riding with it.
- **Permanent / fixed mount.** The tracker is physically affixed to the
  tool indefinitely (superglued, zip-tied inside a housing, etc.) and will
  never be removed during normal use. For this mode, there should be **no
  attach/detach UI at all** in the day-to-day sign-out flow — showing a
  "detach tracker" button for a tracker that physically cannot be detached
  is friction/confusion, not a safety net. The only time this assignment
  should ever change is if the physical tracker fails and gets swapped out
  by whoever manages the company's tools — which is a separate
  administrative action, not something a field worker does at checkout.

This needs to be a property of the tracker-to-tool assignment itself
(Requirement 2) — e.g. some kind of mount-type flag set when the
assignment is created — rather than a separate feature, since it changes
how that same assignment behaves and renders, not what data it stores.

### Requirement 8: "Should have a tracker" enforcement (temporary-mount only)

Separate problem: companies want a way to flag specific tools as "this
should always have a tracker attached when signed out" (e.g. the $100+
Pro Press kit, not the $40 hand tool), and have the app help prevent
someone from signing the tool out without grabbing a tracker. Important
nuances:

- This setting only makes sense for **temporary/loose-mount** tools.
  Permanent-mount tools can't ever be signed out "without" their tracker —
  it's physically attached — so this flag is meaningless for them and
  shouldn't even be exposed as an option on a permanently-mounted tool.
- This needs to be **configurable per tool**, not a global setting — some
  tools warrant enforcement, most won't.
- For companies using the loose/pooled-tracker model (e.g. a drawer of 15
  trackers shared across 60 tools), "should have a tracker" doesn't mean
  "should have *this specific* tracker" — it means "should have *some*
  tracker attached," since which physical tracker ends up with which tool
  varies sign-out to sign-out. The data model and any sign-out validation
  logic should reflect that this is a boolean condition (tracker attached:
  yes/no), not a specific serial requirement, for this mount type.
- How strict enforcement should be at the moment of sign-out (e.g. hard
  block vs. soft warning vs. something in between) is still an open
  product decision — worth designing the data model so it can support
  either without rework, but the enforcement behavior itself doesn't need
  to be finalized in this pass.

### Requirement 9: Ingestion logic stays dumb

The webhook handler that receives data from the Digital Matter Forwarder and
writes to `tracker_locations` should remain unaware of companies, tools, or
either layer of assignment entirely. It should only ever write raw ping
data keyed by `serial`. All company/tool resolution logic should happen at
query time (or via a separate sync/update process), not at ingestion time.
This keeps the ingestion path fast and resilient, and means reassigning a
tracker — at either the SuperAdmin→company layer or the company→tool layer
— never requires touching historical ping rows.

## What's explicitly out of scope for this pass

- Historical route/breadcrumb playback (e.g. drawing a tool's movement path
  over time on a map). This is a real planned feature for later, but for
  now we only need "current location," not trip history/playback. Worth
  keeping the data model loosely compatible with adding this later, but
  don't build it now.
- Geofencing or alerting logic
- Billing/lookup-cost tracking on our side (Digital Matter handles their
  own LE-Device/LE-Forwarder/lookup billing on their end)

Note: unlike a typical first pass, the **UI for assignment is in scope**
here, not deferred — see Requirement 5. Both the SuperAdmin tracker→company
assignment page and the company-facing tracker→tool assignment flow are
part of what needs to be built, since "who can attach what to what" is
core to how this feature actually gets used in practice, not an
afterthought on top of a data model. The mount-type distinction
(Requirement 7) is also a UI/UX concern as much as a data concern — it
determines which buttons/steps a field worker even sees during normal
tool sign-out/check-in, not just how the data is stored.

## What to design

Given the actual current schema (which you have full visibility into),
design and implement:

1. The structure needed to track tracker-to-company assignment history,
   satisfying Requirement 1, plus a SuperAdmin-portal page/workflow for
   Brock to manage this (view global pool, assign to company, view
   per-company history, reclaim to global pool).
2. The structure needed to track tracker-to-tool assignment history within
   a company, satisfying Requirement 2.
3. An efficient way to resolve "current location" per tool per Requirement
   3, choosing whatever approach (view, denormalized column + trigger,
   etc.) best fits the existing schema and access patterns already in use
   elsewhere in this codebase.
4. Company-scoped isolation per Requirement 4, consistent with existing
   multi-tenant patterns already in this codebase, distinguishing
   SuperAdmin-level visibility from company-level visibility.
5. A way to query both unassigned pools (global and per-company) per
   Requirement 5, plus the company-facing UI/workflow for attaching a
   tracker from that company's pool to one of their tools.
6. A cleanup pass to remove or flag the known synthetic/test rows currently
   sitting in `tracker_locations` (synthetic rows are identifiable by
   `serial IS NULL`, placeholder serials such as `1111111`/`2222222`, or
   clearly impossible coordinate jumps between consecutive timestamps).
7. A mount-type property on the tracker-to-tool assignment (Requirement 7),
   plus the corresponding UI changes: permanent-mount tools should show no
   attach/detach controls at all in the normal sign-out/check-in flow,
   while temporary-mount tools should surface attach/detach naturally
   alongside that same flow.
8. A per-tool "tracker required" setting (Requirement 8), exposed only for
   temporary-mount tools, with the data model treating it as a boolean
   condition ("some tracker attached, yes/no") rather than a specific
   serial requirement — and structured so a future decision about
   enforcement strictness (hard block vs. soft warning) doesn't require
   reworking the underlying model.
9. Confirmation that ingestion (Requirement 9) remains untouched by all of
   the above — the webhook/raw ping table should not need to change shape
   to support any of this.
