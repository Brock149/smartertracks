# Search Standardization — Ops / Deploy

## 1. Paste SQL (required first)

Review and run in Supabase SQL Editor:

[`migrations/20260811000000_search_standardization.sql`](./migrations/20260811000000_search_standardization.sql)

Notes: [`migrations/SEARCH_STANDARDIZATION_REVIEW.md`](./migrations/SEARCH_STANDARDIZATION_REVIEW.md)

## 2. Secrets

In Supabase Dashboard → Edge Functions → Secrets (or CLI):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Billing: console.anthropic.com pay-as-you-go. Haiku ~$1/M input, $5/M output.  
~1,000 tools one-time backfill ≈ **$1–5**. Set a monthly spend cap.

`SERVICE_KEY` / service role is already used by other functions.

## 3. Deploy edge functions

```bash
supabase functions deploy search-tools
supabase functions deploy generate-tool-aliases
supabase functions deploy backfill-tool-aliases
supabase functions deploy create-tool
supabase functions deploy create-group-tool
supabase functions deploy edit-tool
```

## 4. Backfill AI aliases (after SQL + deploy)

**Easiest:** Super Admin portal → companies dashboard → **Generate search aliases (all companies)**.  
It loops every company in batches (skips tools that already have AI aliases).

Requires `ANTHROPIC_API_KEY` set as an Edge Function secret.

Manual curl (optional):

```bash
curl -X POST "$SUPABASE_URL/functions/v1/backfill-tool-aliases" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit":25,"offset":0,"only_missing":true,"company_id":"<uuid>"}'
```

## 5. Verify

| Check | Expected |
|---|---|
| Search “Pro Press” / “propress” | Same tool (via `search_norm`) |
| Mild typo of a brand | Hit via trigram similarity |
| Alias e.g. after Haiku / manual “sawzall” | Recip saw tool appears |
| Group tool with global search off | Hidden from mobile All Tools / Transfer (`scope=global`); visible in admin Tools (`scope=company`) and inside the group |
| Transfer / MultiTransfer | No full-catalog download; results within ~100ms–1s |
| New tool create | Saves immediately; aliases appear shortly after (or on regenerate) |

## 6. Scopes cheat sheet

| UI | scope |
|---|---|
| Mobile All Tools, Transfer, MultiTransfer | `global` |
| Mobile My Tools | `mine` |
| Mobile Group Detail | `group` + `group_id` |
| Admin Tools / Transactions / ToolCosts / Trackers / add-to-group | `company` |
| Admin group members | `group` + `group_id` |
