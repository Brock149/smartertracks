# Secret Audit for SmarterTracks (July 2025)

This document lists every location in the codebase that references deployment secrets (API keys, URLs, webhooks). Use it as a checklist when **rotating** or **removing** credentials.

---

## 1  Supabase URL (`https://trcackummmixzocenxvm.supabase.co`)

| Context | File / Env | Notes |
|---------|------------|-------|
| Mobile app (Expo) | `app/.env` → `EXPO_PUBLIC_SUPABASE_URL` | Loaded via `process.env` in `app/supabase/client.ts` |
| Mobile EAS Build  | `app/eas.json` → env block (production profile) | Should be injected via EAS **secret** |
| Admin portal (Vite) | `adminportal/.env.local` → `VITE_SUPABASE_URL` | Referenced in `adminportal/src/lib/supabaseClient.ts` |
| Edge functions (Deno) | **Environment variable** `SUPABASE_URL` (defined in Supabase project) | All backend functions rely on this |

## 2  Supabase Anon Key  
(the **public** key)

| Context | File / Env | Notes |
|---------|------------|-------|
| Mobile app | `app/.env` → `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Used by `createClient` in `app/supabase/client.ts` |
| Mobile EAS Build | `app/eas.json` env block | Should be stored as EAS secret |
| Admin portal | `adminportal/.env.local` → `VITE_SUPABASE_ANON_KEY` | Used in `src/lib/supabaseClient.ts` |

## 3  Supabase Service-Role Key  
(**DO NOT expose in client code**)

| Context | File / Env | Notes |
|---------|------------|-------|
| Mobile app | **`app/.env` (currently) — MUST be removed** | Causes crash & security leak |
| Edge functions | Environment variable `SUPABASE_SERVICE_ROLE_KEY` in Supabase project | Referenced in ~20 Deno functions under `backend/supabase/functions/**/index.ts` |

## 4  Stripe Keys

| Key | Where Referenced | Notes |
|-----|------------------|-------|
| `STRIPE_SECRET_KEY` | `backend/supabase/functions/stripe-webhook/index.ts`  
`backend/supabase/functions/create-checkout-session/index.ts`  
`backend/supabase/functions/create-billing-portal-session/index.ts` | Stored only as env var in Supabase project |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook/index.ts` | Env var in Supabase project |
| `STRIPE_PUBLISHABLE_KEY` | **Not present in repo yet** | Will be needed by mobile / web when adding Stripe SDK |

## 5  Other Keys / Secrets

| Secret | Where | Notes |
|--------|-------|-------|
| None detected | – | Run `git secret-scanner` periodically |

---

# External Systems to Update When Rotating Keys

1. **Supabase Project (Dashboard → Settings → API)**
   • Generate **new service-role key**  
   • (Optionally) generate new **anon key**  
   • Update Edge-Function environment variables (`SUPABASE_SERVICE_ROLE_KEY`, etc.) in Supabase **Function Settings**.

2. **Supabase Edge Functions**  
   After updating env vars, **re-deploy** each function (or run `supabase functions deploy all`).

3. **EAS Secrets (Expo)**  
   • `eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value <NEW_URL>`  
   • `eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <NEW_ANON_KEY>`

4. **Admin Portal Hosting (Vercel / Netlify)**  
   • Update environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting dashboard.  
   • Trigger a new deploy.

5. **Stripe Dashboard**  
   • Rotate **Secret key** and **Webhook signing secret** for your connected account.  
   • Update env vars `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` inside Supabase function settings.  
   • Re-deploy `stripe-webhook`, `create-checkout-session`, etc.

6. **GitHub Repository**  
   • Remove leaked keys from history (`git filter-repo …`) and force-push.  
   • Add `.env` to `.gitignore` (if missing).

7. **CI/CD pipelines (if any)**  
   • Update stored secrets (GitHub Actions, Vercel, etc.).

8. **Local development**  
   • Replace keys in your local `.env`, `.env.local` files.

# Follow-Up Tasks Checklist

- [ ] Delete service role key from `app/.env` and mobile client code
- [ ] Remove `supabaseAdmin` client from `app/supabase/client.ts`
- [ ] Move anon key & URL to EAS secrets, purge from `eas.json`
- [ ] Bump versionCode & rebuild Android app
- [ ] Rotate keys in Supabase dashboard, update Edge Function env vars, re-deploy
- [ ] Rotate Stripe keys & webhook secret, update env vars, re-deploy functions
- [ ] Re-deploy admin portal with updated env vars
- [ ] Clean git history and enable secret-scanning alerts again

---

**Important:** Never commit `service-role` keys or Stripe secret keys to the repository or to `eas.json`. Use dedicated secret-management features (EAS secrets, Vercel env vars, GitHub Actions secrets) instead. 