I have bought some physical trackers, they're GPS and I think WiFi slash cellular Cellular trackers. I have them physically with me, with SIM cards that are activated. I'm going through digital manner, matter. Which uses two things, device manager and location engine. I'm trying to set up connecting my tracker, which is already connected to device manager, to get it to send the GPS data to I guess an endpoint for us. I talked to Claude about it and I posted in a bunch of the support documents and help documents from it, told it to read it and give me a checklist to go through, which I've pasted in here now. So follow through these steps and let me know. Or really, I want you to do whatever we have to in designing this endpoint for us to make this receive the data from the tractors, that way we can get it as a GPS. I know there's probably gonna be a lot of formatting issues and all that stuff. I'm not trying to work it all the way into the app right now, I'm just really trying to be able to receive this information. We'll turn it into the app and put it into the website and make it all look nice and pretty later. I'm just trying to do the test version of get the data from the tracker into something that we can touch and play with and work with. So Below is the steps from Claude that it got from reading those help documents from their support site.

I've got all four (the fifth link was a duplicate of the forwarder article). Here's the full picture, in the order you actually need to do it — since the Yabby Edge Cellular is an "Edge" device, your data flow is: Device → Device Manager → Location Engine Connector → Location Engine (resolves lat/long) → Forwarder → your app's endpoint.
The order of operations
1. Get the right permissions first

Two separate permissions, often missing by default — ask Digital Matter support to enable both on your account:

Connection Manage (to create Connectors)
Forwarder Manager (to create Forwarders)

If you don't see the Connectors or Forwarders menu items in Device Manager at all, this is why.
2. Create the Forwarder first (this is the destination — your endpoint)

This is the piece that actually talks to your Smarter Tracks backend. In Device Manager:

Go to the Forwarder tab → New
Name/description, Forwarder Type = HTTP/S Forwarder
URL = your endpoint (the webhook URL on your server that will receive location data)
Batch Mode — turn this on only if your endpoint can accept an array of records in one POST. Given your webhook ingestion is custom-built, I'd design it to accept a batch array from day one since DM may send multiple messages per call.
Authentication — pick Basic, Bearer Token, or Custom. Bearer Token (Standard) is the simplest for a custom endpoint — generate a long random token, put it in your server's env vars, and check for it on incoming requests.
Click OK — DM immediately fires a test message to your URL using those credentials. Your endpoint needs to already exist and return a 200 before this will succeed, so build and deploy a basic webhook receiver before you do this step.
Critical last step: after creation, go back to the Forwarder Grid and click "Assign Partition" on your new forwarder. If you skip this, Device Manager will look like everything's working (device connects, commits data) but nothing will ever actually reach your endpoint. This is the single most common silent failure.

3. Create the Location Engine Connector (this routes device data into the LE)

Go to Connectors → New
Connector Type = Location Engine Connector
Select the Forwarder you just created from the dropdown
Lookup Settings — leave on Default [GNSS, WiFi Bundle + Cell] unless your DM rep tells you otherwise. This is the GNSS → WiFi → Cell fallback chain and is right for nearly everyone.
Set Device Group visibility, save

This is likely where your "connector not appearing in the dropdown" issue was — Location Engine Connectors only show up correctly if the Forwarder it depends on already exists and is properly partitioned. So: Forwarder must exist and be assigned a partition before the LE Connector that references it will behave correctly in the Device Manager dropdown.
4. Set the Connector on your devices

Apply this new Location Engine Connector to your 20 Yabby Edge units the normal way (per-device or bulk, via the standard "Set Connector" flow).
What your endpoint needs to do (your side, the part you're building)

Accept POST requests with JSON body (array if Batch Mode is on)
Check the Bearer token/auth header
Always return HTTP 200 — even for a device serial it doesn't recognize yet — or DM will treat it as a failure and keep retrying that record indefinitely
Parse the resolved lat/long + serial number + timestamp out of the payload and write it to your tracker-to-tool mapping table

Billing — know this before you flip it live
This matters for your 20-unit pilot:

LE-Device fee applies to any device with a Location Engine Connector set for more than 24 hours in a calendar month. Testing under 24 hours doesn't get billed — useful for your dev/QA pass.
LE-Forwarder fee is one flat fee per forwarder/endpoint, not per device — so your 20 trackers all hitting one forwarder costs the same as 1 tracker hitting it.
Lookup charges (LE-GNSS, LE-WIFICELL) are per-lookup, usage-based. Fewer position pings per day = lower cost. If you set 1 update/day per tracker, expect roughly ~30 lookups/month per device.
If you want to test without incurring charges, keep the connector set to None until you're ready, and remember the 24-hour grace window.
Ask your Digital Matter rep for the actual price list — it's gated behind sales contact, not published.

---

## What I built (the endpoint side)

A minimal test receiver so DM can POST location data and we can immediately see it land in the database. Nothing is wired into the app yet — this is just "get the data into something we can touch."

Two pieces were added:

1. **Database table** — `supabase/migrations/20260624010000_tracker_locations.sql`
   Creates `public.tracker_locations`. It stores the **full raw JSON** of every record (`raw` column) plus best-effort parsed fields (`serial`, `latitude`, `longitude`, `altitude`, `speed`, `heading`, `accuracy`, `battery`, `fix_type`, `recorded_at`, `received_at`). RLS is on with no policies, so only the service role can read/write it for now.

2. **Webhook function** — `backend/supabase/functions/tracker-webhook/index.ts`
   - Accepts `POST` with a JSON body (single object **or** a batch array — Batch Mode safe).
   - Authenticates with a bearer token (also accepts `x-tracker-token:` header or `?token=` query param for flexibility).
   - Parses lat/long etc. case-insensitively across many possible DM key names, and stores everything (raw payload always kept).
   - **Always returns HTTP 200** to DM (even on bad/unknown payloads) so DM never gets stuck retrying — anything weird is logged for inspection.

### Deploy + configure (run these)

```bash
# from the backend/supabase folder (or use --workdir)
# 1. push the new table
supabase db push

# 2. set the shared secret (pick any long random string; reuse it in the DM Forwarder)
supabase secrets set TRACKER_WEBHOOK_TOKEN="<paste-a-long-random-token-here>"

# 3. deploy the function (no JWT required, already set in config.toml)
supabase functions deploy tracker-webhook --no-verify-jwt
```

Your endpoint URL (use this as the **Forwarder URL** in step 2 of the checklist above):

```
https://<your-project-ref>.supabase.co/functions/v1/tracker-webhook
```

In the DM Forwarder: Type = HTTP/S, Authentication = **Bearer Token**, token = the same value you set for `TRACKER_WEBHOOK_TOKEN`. Turn Batch Mode on (the endpoint handles arrays). Then **Assign Partition** (the silent-failure step from the checklist).

### Test it yourself before involving DM

```bash
curl -i -X POST "https://<your-project-ref>.supabase.co/functions/v1/tracker-webhook" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '[{"serial":"TESTUNIT1","lat":40.0,"long":-74.0,"timestamp":"2026-06-24T20:00:00Z","battery":3.9}]'
```

Then look at the data:

```sql
select serial, latitude, longitude, recorded_at, received_at, raw
from public.tracker_locations
order by received_at desc
limit 50;
```

### Notes / next steps (later, not now)
- Once we see a few real DM payloads in the `raw` column, we can tighten the parser to the exact key names DM actually sends and add the tracker→tool mapping table.
- Keep the DM connector set to **None** until ready, and remember the 24-hour LE-Device billing grace window mentioned above.
