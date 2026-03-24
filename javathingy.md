Now im trying to setup google ads, go through my conversation with claude and help me set this up .

if i have my calednly link embeded in my landing page, and am about to run google ads, i want to put the goal of teh campaign to book appointments obviously, but im not sure how to do that on the google ads thing. it says to put in the link users go to after booking, but since its embeded the link doesnt change. is this posisble with google ads, specifically the search ads?

7:16 PM

This is a common challenge with embedded scheduling tools. Here's what's actually happening and your options:

**The Problem** Google Ads conversion tracking typically works by detecting a "thank you" page URL — but since Calendly is embedded, the page URL never changes after booking, so the standard method won't work.

**The Solutions**

**1\. Calendly's Event Tracking (Best Option)** Calendly has built-in support for this exact scenario. When a booking is completed inside an embed, Calendly fires a JavaScript event (`calendly.event_scheduled`). You can use this to trigger a Google Ads conversion:

* In Google Ads, create a conversion action using **"Manual event tag"** or **"Google Tag"**  
* Then add a small snippet to your landing page that listens for Calendly's event and fires the Google Ads conversion tag when it triggers

It looks roughly like this:

javascript  
window.addEventListener('message', function(e) {  
  if (e.data.event \=== 'calendly.event\_scheduled') {  
    // Fire your Google Ads conversion tag here  
    gtag('event', 'conversion', {'send\_to': 'AW-XXXXXXXX/XXXXXX'});  
  }  
});

**2\. Use Google Tag Manager (GTM)** If you use GTM, this gets even easier — you can set up a **Custom Event trigger** that listens for `calendly.event_scheduled` and fires your conversion tag automatically, no hard-coding needed.

**3\. Redirect to a Thank You Page Instead** The simplest fallback — instead of embedding Calendly, use a **Calendly button/popup** or just link directly to your Calendly page, then set a redirect URL in Calendly settings (*after scheduling → redirect to your thank you page*). That thank you page URL is what you'd put in Google Ads as the conversion URL.

---

**What I'd Recommend** If you're comfortable with a little code or have GTM already set up, **Option 1 or 2** is cleaner since the booking stays on your landing page. If you want zero technical hassle, **Option 3** (redirect to a thank you page) is the most straightforward and is exactly what Google Ads expects.

Do you have Google Tag Manager set up on your site already?

no ive never done google ads this is my first one.

7:19 PM

No worries, let's keep it simple then. For a first campaign, I'd honestly recommend **Option 3** — redirect to a thank you page. Here's why and how:

**Why This Is Easiest** It requires zero code, works exactly how Google Ads expects, and is totally reliable for tracking. It's what most people use.

**The Steps**

1. **Create a simple "Thank You" page on your website** — something like `yoursite.com/thank-you` — it can just say "Thanks for booking\! We'll see you soon." Nothing fancy needed.  
2. **In Calendly**, go to your event settings → scroll to find **"Redirects"** or **"After event"** settings → turn on the redirect and paste in your thank you page URL.  
3. **In Google Ads**, when it asks for the URL users go to after booking, put in `yoursite.com/thank-you`. That's your conversion action.

That's it. Every time someone books, Calendly sends them to that page, Google Ads sees it, and counts it as a conversion.

**One Thing to Note** You'll want to switch from the **embedded Calendly** to either a **button that opens Calendly as a popup**, or just a plain link to your Calendly page — since the redirect only works when Calendly is not embedded. The popup option still keeps the experience on your site if that matters to you.

What platform is your landing page built on (Wix, Squarespace, Wordpress, etc.)? That'll help nail down exactly how to set up the thank you page.

what if i want to keep it embedded

7:20 PM

Then you'll need to go with the JavaScript approach — but it's not as scary as it sounds. Here's the most beginner-friendly way to do it:

**The Plan** Google Ads gives you a small snippet of code (called a **conversion tag**) when you set up a conversion action. You just need to add that tag to your page, plus about 5 lines of extra code that tells it "fire when Calendly booking is complete."

**How to Set It Up**

1. In Google Ads, create your conversion action and select **"Website"** as the type  
2. Choose **"Install the tag yourself"** — it'll give you a `gtag` code snippet  
3. Paste that snippet into your landing page's `<head>` section  
4. Then also add this listener code to your page:

javascript  
window.addEventListener('message', function(e) {  
  if (e.data.event \=== 'calendly.event\_scheduled') {  
    gtag('event', 'conversion', {'send\_to': 'AW-XXXXXXXX/XXXXXX'});  
  }  
});

*(Google Ads will give you the actual `AW-XXXXXXXX/XXXXXX` value for your account)*

**The Only Variable** How you add code to your page depends on your website platform. What are you building your landing page on?

