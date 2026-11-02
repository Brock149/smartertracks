# Smarter Tracks: Website Conversion Rewrite (Brief for Cursor)

## 0. How to work

1. Before editing, inspect the repo: framework, routing, where the homepage and sub-pages live, the pricing component, the existing scheduler/booking embed, the signup/checkout route, and any analytics. Write a short plan, then implement.
2. Do not touch billing, auth, Supabase, or mobile app code. Website only.
3. When finished, report: files changed, anything you could not do, and the flags in section 9.

---

## 1. Goal and context

Smarter Tracks is tool tracking software for HVAC, construction, and trades teams. Most traffic will come from outbound outreach that points to the homepage. Visitors are not converting into signups or booked meetings.

Diagnosis:

- Copy leads with the category and features. The real pain (wasted mornings, paying for tools twice) is buried in the subhead.
- The stats on the page are unsupported estimates. They hurt trust.
- The only call to action is a 30-minute demo, and the "free trial" is gated behind it. Too much effort, too little risk reversal.
- SEO-style explainer sections sit in the prime real estate, ahead of the offer.

What we are changing:

1. Lead with the pain and the outcome, in the buyer's words.
2. Replace fake stats with a self-serve calculator (the visitor's own numbers) plus a 90-day money-back guarantee.
3. Kill the free trial and the free tier. Kill "demo." Primary CTA = a self-scheduled 15-minute chat (visitor picks a time on the calendar). Secondary CTA = Start Risk-Free (self-serve signup, covered by the 90-day money-back guarantee).
4. Move SEO content below the offer.

---

## 2. Hard rules (apply everywhere on the site)

- **No statistics, percentages, dollar-savings claims, or "X% of contractors" claims** unless Brock supplies one with a source. Remove all existing ones (listed in section 3).
- **No customer quotes, customer names, tool counts, or customer counts.**
- **Never mention how the product was built, or any family or personal connection of the founder.** Keep the existing badge "Built for Trades, by Tradesmen." Nothing more about the origin story.
- **No visible text anywhere (all pages, meta tags, JSON-LD, alt text, FAQ) saying "free trial," "no credit card required," or "demo."** The anchor id `book-demo` may stay as an id only.
- **No "most teams" or "teams using Smarter Tracks see..." language.** State what the product does, not what customers achieved.
- **Voice:** plain, short sentences, the buyer's words (job site, van, gang box, shop, tech, crew). Avoid: streamline, centralized, solution, leverage, robust, platform, seamless, game-changer, cutting-edge.
- Keep all SEO page URLs, canonical tags, titles, and schema, except where they mention trial/demo.
- **CTA hierarchy (site-wide):** wherever the CTA pair appears (hero, calculator, how it works, final CTA, sub-pages), `Book a 15-Minute Chat` is the filled primary button and `Start Risk-Free` is the outline secondary button. Order in the markup: chat first, then Start Risk-Free. The one exception is the pricing cards: Starter and Pro keep `Start Risk-Free` as their filled button, because that is where someone buys. Custom uses `Book a 15-Minute Chat`.
- **No free tier anywhere on the site.** No "$0" plan, no "3 users / 5 tools" limits, no wording that implies a free plan. The only thing that makes it risk-free is the 90-day money-back guarantee.

---

## 3. Global find-and-replace

| Find (case-insensitive) | Replace with |
|---|---|
| "Book a Free Demo", "Book a Demo", "Book a free 30-minute demo" (secondary or link CTAs) | "Book a 15-Minute Chat" |
| "Free trial available", "Free trial included" | "90-day money-back guarantee" |
| "No credit card required" | remove |
| "Free Trial" pricing card ("Try tool tracking with your team", $0, 3 users, 5 tools) | delete the card |
| "Most teams are fully operational the same day" / "Most teams are up and running the same day" | "Add your tools, invite your crew, and start tracking the same day." |
| "We also offer onboarding demos / free onboarding demos" | "Book a 15-minute chat and we'll help you get started." |
| "30 minutes, no pressure" | delete |

Stats and claims to delete wherever they appear (homepage and sub-pages):

- 35% fewer lost tools in the first 90 days
- $8,000+ saved annually
- 15 hrs reclaimed monthly
- $400B+ annual construction tool and equipment theft
- 1 in 5 contractors rebuy tools
- 20+ hrs lost per month by field crews
- "Teams using Smarter Tracks see measurable results within the first 90 days."

Keep `#book-demo` as the anchor id and keep the scheduler embed working. Only the visible labels change.

---

## 4. New homepage order

1. Hero
2. Pain scene ("Sound Familiar?")
3. Benefits
4. Calculator ("What Is the Hunt Costing You?")
5. How it works
6. Pricing + Guarantee
7. Chat section (the scheduler embed, anchor `#book-demo`, moved down from just under the hero)
8. Short objection FAQ (4 items)
9. Final CTA
10. SEO block: Built for trades cards, Why tool tracking matters, What is tool tracking software, vs Spreadsheets table, Mobile apps, full FAQ
11. Contact form
12. Footer (unchanged)

Navigation: keep as is. Rename the nav "Book a Demo" button to "Book a 15-Minute Chat."

Contact form: keep it, keep it working, and keep it at the bottom as a secondary path (Brock uses it to capture contacts). Do not promote it near the top. Leave its fields and submission handling unchanged.

---

## 5. Section copy (use exactly)

### 5.1 Hero

- Eyebrow (small text above H1): `Tool tracking software for HVAC, construction & trades teams`
- **H1:** `You Already Paid for That Tool. Stop Paying for It Twice.`
- Subhead: `Know which job site every tool is on and whose hands it's in. No more calling around. No more crews waiting on a tool that isn't where it's supposed to be.`
- Badge line (keep): `Built for Trades, by Tradesmen`
- Primary button (filled): `Book a 15-Minute Chat` → `#book-demo` (the self-scheduled calendar).
- Secondary button (outline style): `Start Risk-Free`. Link to the existing signup/checkout entry point if there is a single one; otherwise scroll to `#pricing`.
- Text under the button pair: `Pick a time that works for you. 90-day money-back guarantee, no questions asked.`
- Keep: "Already have an account? Login"
- Trust row: `No hardware required · Same-day setup · iOS & Android apps · 90-day money-back guarantee`
- Keep the three screenshots. Place the App Store and Google Play badges directly under the trust row (keep the lower copy too).
- Replace the current H1 ("Ditch the Clipboard.") and the "Always Know Who Has What Tool." line.

Alternate H1s for later A/B testing. Do not implement now; leave as a code comment:
- `Stop Buying Tools You Already Own.`
- `Know Where Every Tool Is Before You Send the Crew.`

### 5.2 Pain scene (new section)

- Heading: `Sound Familiar?`
- Body, four short lines, each on its own line:
  - `You plan the day around a tool being at the shop.`
  - `You get there. It isn't.`
  - `The crew is standing around. You're calling everyone you know.`
  - `Next week you buy another one, and find the first one in a van.`
- Closing line (slightly larger or bold): `It's not theft. It's not laziness. Nobody knows where anything is. That's what Smarter Tracks fixes.`

### 5.3 Benefits

- Heading: `What Changes When Every Tool Has an Owner`
- Subhead: `The difference between knowing where your tools are and guessing.`
- Four cards:
  1. **Stop Planning Your Day Around a Tool That Isn't There**: `Check where a tool is and who has it before you send anyone. No calling around. No wasted trips.`
  2. **Stop Replacing Tools You Already Own**: keep the existing body text.
  3. **Get Crews Accountable Without the Awkward Conversations**: keep the existing body text.
  4. **Run Audits in Minutes, Not Hours**: keep the existing body text.
- **Delete** the entire "The ROI of Getting Serious About Tool Tracking" stats section.

### 5.4 Calculator (new interactive section)

- Heading: `What Is the Hunt Costing You?`
- Subhead: `Use your own numbers. Nothing here is our estimate. The starting numbers are placeholders, so move the sliders to match your crew.`

Inputs (sliders with a live numeric readout; the money input can be a number field):

| Label | Control | Range | Default |
|---|---|---|---|
| How many techs or crew members use tools? | slider | 1 to 75 | 5 |
| Minutes a day each one loses hunting for a tool or waiting on one | slider, step 5 | 0 to 90 | 15 |
| What an hour of their time costs you (wages plus truck and overhead) | slider or number, step 5 | $20 to $150 | $45 |
| Tools you re-buy in a year because you couldn't find the first one | slider | 0 to 50 | 3 |
| Average cost of those tools | number | $25 to $2,000 | $150 |

Formulas:

- `crewTimeMonthly = techs * (minutesPerDay / 60) * hourlyCost * 21`
- `toolsYearly = rebuys * avgToolCost`
- `totalMonthly = crewTimeMonthly + toolsYearly / 12`

Outputs (large, updates live):

- `Lost crew time: $X a month`
- `Tools bought twice: $Y a year`
- `Total: $Z a month`
- Comparison line: `Smarter Tracks {plan} is ${price} a month.` Plan logic: Starter if techs <= 15, Pro if techs <= 75, otherwise show `Talk to us about a Custom plan.` Pull prices from the same data/config the pricing section uses. Do not hardcode.
- Line under the outputs: `If it doesn't pay for itself, you have 90 days to get every dollar back.`
- Buttons under the calculator: `Start Risk-Free` and `Book a 15-Minute Chat`
- Small print: `Estimate based on the numbers you entered. Actual results depend on your crew.`

Rules:

- Client-side only. No network calls. Store nothing.
- Do not state or imply that Smarter Tracks saves any specific percentage or amount. The calculator only shows what the problem costs today.
- Accessible: real `<label>`s, keyboard operable, readable contrast, works at 375px width.
- Format currency with `Intl.NumberFormat`, whole dollars. Clamp inputs. Never show NaN.
- Test case with defaults: crew time about $1,181 a month, tools about $38 a month, total about $1,219 a month.

### 5.5 How it works

- Keep heading "How It Works."
- Replace the subline with: `Add your tools, invite your crew, and start tracking the same day.`
- Keep the 3 steps and their text.
- Replace the section-end button with the CTA pair: `Start Risk-Free` + `Book a 15-Minute Chat`.

### 5.6 Pricing and guarantee

- Heading: `Simple Pricing. Zero Risk.`
- Subhead: `Flat monthly price for your whole team. No per-user charges. Use it for 90 days. If it's not worth it, get every dollar back.`
- Delete the Free Trial card. The grid becomes 3 cards: Starter, Pro (keep the "Most Popular" tag), Custom. Fix the grid and responsive layout for 3 cards.
- Keep prices, user and tool limits, feature lists, and the Monthly/Annual toggle.
- Starter and Pro buttons: `Start Risk-Free`, linking to the existing signup/checkout for that plan. Small text under each button: `90-day money-back guarantee`.
- Custom button: `Book a 15-Minute Chat` → `#book-demo`.
- Replace "Not sure which plan fits? Book a demo..." with: `Not sure which plan fits? Book a 15-minute chat and we'll figure it out together.`
- Replace the five-item trust list under the cards with: `90-day money-back guarantee · Cancel anytime · No long-term contracts · Same-day setup`

**Guarantee block**, directly below the pricing cards, as a bordered callout with a shield or check icon:

- Title: `The 90-Day Money-Back Guarantee`
- Body: `Use Smarter Tracks with your whole crew for 90 days. If it's not worth it for any reason, email brockcoburn@smartertracks.com and we'll refund every dollar. No questions asked.`

### 5.7 Chat section (replaces the old "See It In Action: Book a Free Demo")

- Keep `id="book-demo"` and the scheduler embed.
- Heading: `Rather Talk First?`
- Body: `Book 15 minutes. Tell me how your crew tracks tools today and I'll tell you honestly if Smarter Tracks fits. No slideshow.`
- The calendar is the main conversion point of the page. Show the open time slots right in the section if the scheduler provider supports an inline embed, so the visitor picks a time without extra clicks. Do not hide it behind a button or modal if inline works.
- Keep: `Prefer email? brockcoburn@smartertracks.com`

### 5.8 Short objection FAQ (before the final CTA)

Use the existing accordion style. Four items:

1. **Do I have to talk to anyone before I start?** `No. Pick a plan and start whenever you're ready. If you'd rather talk first, book a 15-minute chat.`
2. **What if it doesn't work for my team?** `You have 90 days. Email us and we'll refund every dollar. No questions asked.`
3. **Do I need GPS tags or any hardware?** `No. Smarter Tracks uses assignment-based tool tracking. No GPS tags, no Bluetooth beacons, no extra hardware. Custody is recorded through the app when tools are checked in and out.`
4. **How fast can we get started?** `Add your tools, invite your crew, and start tracking the same day. Book a 15-minute chat if you want help getting set up.`

Remove duplicates from the full FAQ lower on the page.

### 5.9 Final CTA

- Heading: `Stop Losing Tools. Start Today.`
- Subhead: `Every tool gets an owner. Every handoff gets a record. Backed by a 90-day money-back guarantee.`
- Buttons: `Start Risk-Free` + `Book a 15-Minute Chat`

---

## 6. SEO block (moved down, light edits only)

Order: Built for trades cards (HVAC, Construction, Field Service) → Why Tool Tracking Software Matters → What Is Tool Tracking Software? → Tool Tracking Software vs. Spreadsheets table → Mobile app section → full FAQ.

Edits:

- Keep headings, internal links, and keyword-rich text.
- "Why Tool Tracking Software Matters": delete the three stat tiles. Replace the first paragraph with: `Missing tools, duplicate purchases, and time spent searching add up fast. Without a tool tracking system, there is no clear record of who has what or where a tool moved last.`
- "What Is Tool Tracking Software?": change "Unlike enterprise asset management platforms that cost thousands and take months to deploy" to "Unlike enterprise asset management platforms built for large organizations."
- Use the same CTA pair under this block.

---

## 7. Sub-pages

Pages: `/tool-tracking-software`, `/hvac-tool-tracking`, `/construction-tool-management`, `/tool-inventory-software`, `/tool-checkout-system`, `/best-tool-tracking-software-construction`, `/best-hvac-tool-tracking-software`.

On each page:

- Apply the global replacements in section 3 (CTA labels, trust row, trial and credit-card mentions, "most teams" lines).
- Delete any stat blocks.
- Add `90-day money-back guarantee. No questions asked.` under the primary CTA.
- Use the CTA pair: `Start Risk-Free` + `Book a 15-Minute Chat`, linking to the homepage `#pricing` and `#book-demo` (or the equivalents already in use).
- Do not rewrite their H1s or body SEO copy.

---

## 8. Analytics

Check what exists. If there is no analytics, add a lightweight privacy-friendly one and tell Brock which you chose. Track these events, tagged with page and section location where relevant:

- `cta_start_click`
- `cta_chat_click`
- `scheduler_opened` and `scheduler_booked` (if the embed allows it)
- `calculator_used` (first interaction per session)
- `pricing_plan_click` (plan name)
- `signup_started` (if detectable)

Brock does not currently know his monthly visitor count. This is how he gets real conversion numbers.

---

## 9. Flags: report to Brock, do not change

1. **Terms & Conditions** need a refund clause matching the guarantee. Do not edit legal text. Brock should have it reviewed.
2. **No free tier (decided by Brock):** the website changes are in scope (section 2). The app and billing are not. Grep the site, app, and billing config for "trial", "free", and the 3-user/5-tool plan. Report exactly where new signups are still granted a free plan and what it would take to remove it. Do NOT change app or billing code without Brock's confirmation. Existing accounts must be grandfathered so nobody currently using the app gets locked out. App Store and Google Play listing text is outside this repo.
3. **Plan buttons:** confirm each one deep-links to signup/checkout for the right plan. Report any that can't.
4. **"Cancel anytime / No long-term contracts"** is kept in the trust line. Brock should confirm it is still accurate for annual billing, and confirm how refunds are handled in the billing provider.
5. **Optional, do NOT implement unless Brock says so:** a "done-for-you tool loading" bonus (`Send us your tool list and we'll load it for you`). Only if he commits to doing it.

---

## 10. Acceptance checklist

- [ ] Homepage matches the order in section 4 and the copy in section 5.
- [ ] Zero visible occurrences (case-insensitive, including meta, JSON-LD, alt text) of: "free trial", "credit card", "demo", "35%", "$8,000", "15 hrs", "$400B", "1 in 5", "20+ hrs", "most teams", "teams using Smarter Tracks".
- [ ] Single H1 per page. Heading order is sensible.
- [ ] Calculator matches the test case in 5.4 and never shows NaN.
- [ ] 375px mobile: hero and CTAs stack cleanly, 3 pricing cards stack, calculator is usable.
- [ ] `#book-demo` anchor and scheduler embed still work. All internal links and anchors work.
- [ ] CTA hierarchy holds everywhere: chat is the filled primary, Start Risk-Free is the outline secondary (pricing cards excepted).
- [ ] No free plan, "$0", or "3 users / 5 tools" wording remains on the site.
- [ ] Contact form is still at the bottom and still submits.
- [ ] Build passes. No console errors. No layout shift from the new sections.
- [ ] Final report lists files changed and the section 9 flags.
