# Smarter Tracks: site fix list (ready to paste). DRAFT v1, 30 Sep 2026
For Brock. Stack observed: Vite single-page app on Vercel. Each item is standalone; do them in any order. Estimated total: about 1–2 hours.

Files to upload are in `site/files/` (llms.txt, and the IndexNow key file).

---

## 1. Make missing pages return a real 404 (important, ~15 min)
**The issue:** every URL returns your homepage with status 200, including ones that don't exist (`/does-not-exist`, `/llms.txt`, `/favicon.ico`, `/BingSiteAuth.xml`). Search engines see this as a "soft 404", and it means no verification or key file can work until it's fixed.
**Cause:** almost certainly a catch-all rewrite in `vercel.json`, like `{ "source": "/(.*)", "destination": "/index.html" }`.
**Fix:**
- Limit that rewrite to the app's client-side routes only, for example:
```json
{
  "rewrites": [
    { "source": "/login", "destination": "/index.html" },
    { "source": "/app/:path*", "destination": "/index.html" },
    { "source": "/superadminportal/:path*", "destination": "/index.html" }
  ]
}
```
  (Replace these with your real app routes. The marketing pages are already pre-rendered, so they don't need the rewrite.)
- Add a `public/404.html` ("Page not found" plus a link home). Vercel serves it with a 404 status automatically.
- **Check:** `curl -I https://www.smartertracks.com/does-not-exist` should return `404`.

## 2. Upload two static files to `public/` (~2 min, after #1)
- **`llms.txt`**: a plain-English summary for AI assistants. Serve it at `https://www.smartertracks.com/llms.txt` as `text/plain`. It only uses the facts you've confirmed.
- **IndexNow key file**: `b1c53c5cdc68846815998b184d138659.txt`, containing just that key. Serve it at `https://www.smartertracks.com/b1c53c5cdc68846815998b184d138659.txt`.
  - This lets us notify Bing instantly whenever a page is published or changed. **We'll do the notifying ourselves; nothing else is needed from you.**
- Also add a real `favicon.ico`. It currently returns the homepage HTML.

## 3. Better structured data (~15 min)
Your pages already have `SoftwareApplication` markup, but it says `"price": "0"` only. Replace the homepage block with this. It uses real plans, adds the organisation, and links your app store listings so AI tools can connect them to you.
```html
<script type="application/ld+json">
{
 "@context":"https://schema.org",
 "@graph":[
  {"@type":"Organization","@id":"https://www.smartertracks.com/#org","name":"Smarter Tracks","url":"https://www.smartertracks.com/",
   "foundingDate":"2025","founder":{"@type":"Person","name":"Brock Coburn"},
   "email":"brockcoburn@smartertracks.com",
   "sameAs":["https://apps.apple.com/us/app/smarter-tracks/id6748660773",
             "https://play.google.com/store/apps/details?id=com.bactech.smartertracks",
             "https://www.g2.com/products/smarter-tracks/reviews"]},
  {"@type":"SoftwareApplication","name":"Smarter Tracks","url":"https://www.smartertracks.com/",
   "publisher":{"@id":"https://www.smartertracks.com/#org"},
   "applicationCategory":"BusinessApplication","operatingSystem":"iOS, Android, Web",
   "description":"Tool tracking software for construction, HVAC and trades teams. Crews check tools in and out from their phones; every hand-off is logged with a timestamp and the person responsible. No GPS tags or hardware required. Flat pricing, no per-user fees.",
   "offers":[
    {"@type":"Offer","name":"Free Trial","price":"0","priceCurrency":"USD","description":"3 users, 5 tools, no credit card"},
    {"@type":"Offer","name":"Starter","price":"185","priceCurrency":"USD","description":"15 users, 150 tools, per month"},
    {"@type":"Offer","name":"Pro","price":"315","priceCurrency":"USD","description":"75 users, 750 tools, per month"}
   ]}
 ]
}
</script>
```
(Add your LinkedIn or Capterra profile URLs to `sameAs` if you have them. Don't add review or rating markup until you have real reviews.)
**Check:** paste the page URL into https://validator.schema.org and it should show no errors.

## 4. Page titles: match how people ask ChatGPT (~5 min)
ChatGPT's searches for your 10 questions use words like "best", "app", "for contractors" and "2026". Suggested title tags (the headings on the page can stay as they are):

| Page | Current title | Suggested title |
|---|---|---|
| /construction-tool-management | Construction Tool Tracking Software \| Smarter Tracks | Construction Tool Tracking Software & App for Contractors \| Smarter Tracks |
| /hvac-tool-tracking | HVAC Tool Tracking App \| Smarter Tracks | HVAC Tool Tracking Software & App \| Smarter Tracks |
| /tool-checkout-system | Tool Checkout System for Field Teams \| Smarter Tracks | Tool Checkout System for Contractors \| Smarter Tracks |
| /tool-inventory-software | Tool Inventory Software for Field Teams \| Smarter Tracks | Tool Inventory Software for Contractors \| Smarter Tracks |
| /tool-tracking-software | Tool Tracking Software for HVAC & Contractors \| Smarter Tracks | (keep as is) |

## 5. Sitemap (~5 min)
- Add `<lastmod>` to every URL (the date the page last changed), and update it whenever a page is edited.
- Add each new page when it's published, starting with `/best-tool-tracking-software-construction`.
- Optional: remove `/account-deletion` from the sitemap. It's fine to keep live, it just doesn't need indexing.

## 6. New page: construction comparison
The copy is in `page_construction_best_tool_tracking_2026.md`:
- URL: `/best-tool-tracking-software-construction`
- Pre-render it like your other marketing pages
- Link to it from the homepage "Construction Tool Tracking" block and from /construction-tool-management

## 7. New page: HVAC comparison
The copy is in `page_hvac_best_tool_tracking_2026.md`. URL: `/best-hvac-tool-tracking-software`. Link to it from /hvac-tool-tracking and from the homepage HVAC block.

---

## After you publish
Tell Ansh when it's live. We'll check everything from outside (404 status, files, structured data) and ping Bing through IndexNow the same day.
