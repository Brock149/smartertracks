# Smarter Tracks — Search Standardization Spec (for Cursor)

## Goal
Search across the app is exact-match, and it's missing real tools because of typos and formatting inconsistency (e.g. a tech searching "rigid" instead of "RIDGID" gets zero results; "ProPress" vs "Pro Press" vs "Pro-Press" are treated as three unrelated strings). This likely touches multiple search boxes in the app — tool lookup, tool creation duplicate-check, job assignment, admin portal, etc.

**This should be additive, not a rework.** The goal is to build on top of what's already working, not restructure how search or the database currently function. If any part of this doesn't fit cleanly with how things are actually built, push back and say so — you can see the real code and schema, I can't. Where I've suggested a specific approach below, treat it as a starting idea, not a requirement — if there's a better or lower-risk way to get the same result, I'd rather hear that.

**On cost specifically:** give me your own honest estimate for the Haiku API piece below. Don't just confirm my $1-2 number — if it's going to be more, tell me why (catalog size, prompt size, retries, model choice, number of calls per tool, etc.).

---

## Idea 1 — Typo/format tolerance

The general idea: make search tolerant of spacing/punctuation differences ("ProPress" vs "Pro Press" vs "Pro-Press") and small typos ("rigid" vs "RIDGID"), most likely using something like Postgres's trigram similarity matching (`pg_trgm`) since that's a natural fit for Supabase and doesn't require calling any external AI. This part shouldn't need ongoing cost or an API call — it's just a better matching approach layered onto existing search.

## Idea 2 — Hidden AI-generated keyword aliases (Claude Haiku API)

For things typo-tolerance alone won't catch — real slang/nicknames (e.g. "sawzall" for reciprocating saw), abbreviations, brand nicknames — the idea is to generate a set of alternate search terms per tool using Claude's API, store them alongside the tool, and let search match against those too.

Rough shape of how this could work (adjust as needed to fit the real schema/flow):
1. Set up billing at console.anthropic.com — this is pay-as-you-go API billing, separate from any Claude.ai or Cursor subscription. Add a payment method, load prepaid credit (starts around $5), set a monthly spend cap so it can't run away unsupervised.
2. Generate an API key there.
3. Some backend process (Supabase Edge Function or similar) takes a tool's name/brand/model and calls Claude Haiku to generate a list of likely misspellings, nicknames, and alternate terms for it.
4. Store that list somewhere associated with the tool — a new column, a related table, whatever fits the existing schema best.
5. Backfill the existing ~1,000+ tool catalog with this once, as a batch process.
6. For new tools going forward, generate this at creation time — ideally without blocking the save/UI, but open to whatever approach fits how tool creation currently works.
7. This should only need to run once per tool under normal circumstances — happy to hear if there's a reason it'd need to re-run more often than that.

**Cost assumption to sanity-check:** this only runs at tool creation/backfill, never on every search. My napkin math says backfilling ~1,000 tools should land around $1-2 one-time with Haiku, and new tools after that should cost fractions of a cent each. Confirm or correct this against the real numbers.

## How search would use both together

The general idea: wherever tools are searched, match against the tool name (with typo/format tolerance) OR the hidden AI-generated aliases, with real/near-exact name matches ideally ranked above alias matches. I don't know if the app's various search boxes currently share one underlying search function or are separate implementations — that's for Cursor to assess and account for when figuring out the least disruptive way to roll this out.

**Open questions, not decisions — Cursor's take welcome on any of these:**
- Should the AI-generated keywords be visible/editable somewhere (e.g. on the tool edit screen), or fully hidden?
- Should this only look at tool name, or also brand/category/model number?
- What's the lowest-risk way to roll this out given how search is actually built today?

---

## PS — separate backlog item, not urgent

Group-created tools (tools created inside a group — e.g. auto-numbered tools added to a van's inventory vs. a warehouse's inventory) probably shouldn't be searchable from the admin portal's all-tools screen or the regular all-tools screen, similar to how personal tools ("My Tools") are already excluded from that search. Reasoning: mixing a van's tools and the warehouse's tools into one generic "hammer drill" search result would undercut the point of having them as separate sections.

Not sure whether this is a small addition to whatever search-scope logic exists today or a bigger change to how group-created tools are tagged/stored — flag which one it actually is once you've looked.
