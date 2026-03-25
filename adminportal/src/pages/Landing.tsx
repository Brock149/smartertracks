import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'
import ContactForm from '../components/ContactForm'

const APP_SCREENSHOTS = [
  { src: '/screenshots/alltools.png', alt: 'All Tools screen showing tool inventory with photos and current owners' },
  { src: '/screenshots/tooldescriptions.png', alt: 'Tool Details screen showing custody, location, and stored at information' },
  { src: '/screenshots/homeinfo.png', alt: 'Home dashboard showing tool counts, transfers, and recent receipts' },
]

export default function Landing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [currentScreenshot, setCurrentScreenshot] = useState(0)
  const priceLabel = 'per month'
  const starterAnnualMonthly = 185
  const proAnnualMonthly = 315
  const starterSavings = 'save 7.5%'
  const proSavings = 'save 10%'

  useEffect(() => {
    setPageMeta({
      title: 'Tool Tracking Software for HVAC & Construction | Smarter Tracks',
      description:
        'Tool tracking software built for trades teams. Track every tool, log every checkout, run audits from your phone. Book a free demo with Smarter Tracks.',
      canonicalPath: '/',
    })
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScreenshot((prev) => (prev + 1) % APP_SCREENSHOTS.length)
    }, 5500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.head.appendChild(script)
    return () => {
      try {
        document.head.removeChild(script)
      } catch { /* script already removed */ }
    }
  }, [])

  // Google Ads conversion tracking for embedded Calendly bookings.
  // When a visitor books, Calendly fires a postMessage event that we
  // forward to Google Ads as a conversion.
  useEffect(() => {
    function handleCalendlyMessage(e: MessageEvent) {
      console.log('Calendly message received:', e.data)
      if (e.data?.event === 'calendly.event_scheduled') {
        console.log('Booking detected! Firing Google Ads conversion...')
        
        // Wait a bit to ensure gtag is fully loaded
        setTimeout(() => {
          const gtagFn = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag
          if (typeof gtagFn === 'function') {
            gtagFn('event', 'conversion', { 
              send_to: 'AW-17910572468/RJljCMvzgY8cELTLttxC',
              value: 1.0,
              currency: 'USD',
              event_callback: () => {
                console.log('Google Ads conversion callback executed')
              }
            })
            console.log('Google Ads conversion fired successfully')
          } else {
            console.error('gtag function not found')
          }
        }, 100)
      }
    }
    window.addEventListener('message', handleCalendlyMessage)
    return () => window.removeEventListener('message', handleCalendlyMessage)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      {/* ===================== CRO SECTION (conversion-focused) ===================== */}

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="lg:grid lg:grid-cols-[1.5fr,1fr] lg:gap-20 lg:items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl lg:text-7xl tracking-tight leading-tight">
                Ditch the Clipboard.
              </h1>
              <h1 className="text-5xl font-extrabold text-blue-600 sm:text-6xl lg:text-7xl tracking-tight leading-tight">
                Always Know Who Has What Tool.
              </h1>
              <p className="mt-6 text-2xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Know which job site it's on and whose hands it's in — without calling around,
                checking spreadsheets, or hoping someone wrote it down. Stop buying tools you
                already own. Stop losing billable hours hunting for equipment.
              </p>
              <p className="mt-5 text-base font-bold text-gray-600 uppercase tracking-widest">
                Built for Trades, by Tradesmen
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href="#book-demo"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-lg text-xl font-semibold transition-colors shadow-lg text-center"
                >
                  Book a Free Demo
                </a>
                <a
                  href="#pricing"
                  className="text-gray-600 hover:text-gray-900 px-7 py-5 rounded-lg text-xl font-medium transition-colors text-center"
                >
                  See Pricing &darr;
                </a>
              </div>
              <p className="mt-6 text-base text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Login
                </Link>
              </p>
            </div>

            {/* App screenshots carousel */}
            <div className="mt-10 lg:mt-0 relative">
              <div className="relative max-w-md mx-auto px-10">
                {/* Previous button */}
                <button
                  onClick={() => setCurrentScreenshot((prev) => (prev - 1 + APP_SCREENSHOTS.length) % APP_SCREENSHOTS.length)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-blue-600 transition-colors p-2"
                  aria-label="Previous screenshot"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Phone frame */}
                <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  <div className="bg-white rounded-[2.5rem] overflow-hidden relative" style={{ aspectRatio: '9/19.5' }}>
                    {/* Screenshot carousel */}
                    <div className="relative w-full h-full">
                      {APP_SCREENSHOTS.map((screenshot, index) => (
                        <img
                          key={index}
                          src={screenshot.src}
                          alt={screenshot.alt}
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                            index === currentScreenshot ? 'opacity-100' : 'opacity-0'
                          }`}
                          loading={index === 0 ? 'eager' : 'lazy'}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Notch */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-7 bg-gray-900 rounded-full" />
                </div>

                {/* Next button */}
                <button
                  onClick={() => setCurrentScreenshot((prev) => (prev + 1) % APP_SCREENSHOTS.length)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-blue-600 transition-colors p-2"
                  aria-label="Next screenshot"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Carousel indicators */}
                <div className="flex justify-center gap-2 mt-5">
                  {APP_SCREENSHOTS.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentScreenshot(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentScreenshot ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to screenshot ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="py-6 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-gray-500 font-medium">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              No hardware required
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Same-day setup
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              iOS &amp; Android apps
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Free trial available
            </span>
          </div>
        </div>
      </section>

      {/* Benefits (outcomes, not features) */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              What Changes When You Start Tracking Tools
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              The difference between knowing where your tools are and guessing.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Stop Replacing Tools You Already Own</h3>
              <p className="mt-3 text-gray-600">
                When nobody tracks who has what, you end up buying the same tools twice. Smarter Tracks
                gives every tool a digital paper trail — so nothing slips through the cracks.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Get Crews Accountable Without the Awkward Conversations</h3>
              <p className="mt-3 text-gray-600">
                No more "Hey, who took the..." texts. With custody tracking and automatic transfer logs,
                everyone knows who's responsible for what — no finger-pointing needed.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Run Audits in Minutes, Not Hours</h3>
              <p className="mt-3 text-gray-600">
                Forget printed checklists and warehouse walk-throughs. Open the app, verify what's on
                site, flag what's missing — done. From any phone, anywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI / Social Proof */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              The ROI of Getting Serious About Tool Tracking
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
              Teams using Smarter Tracks see measurable results within the first 90 days.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
              <div className="text-4xl font-extrabold text-green-700">35%</div>
              <p className="mt-2 text-gray-700 font-medium">Fewer lost tools in the first 90 days</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
              <div className="text-4xl font-extrabold text-green-700">$8,000+</div>
              <p className="mt-2 text-gray-700 font-medium">Saved annually eliminating duplicate purchases</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
              <div className="text-4xl font-extrabold text-green-700">15 hrs</div>
              <p className="mt-2 text-gray-700 font-medium">Reclaimed monthly from tool searches</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
              <div className="text-4xl font-extrabold text-green-700">Same day</div>
              <p className="mt-2 text-gray-700 font-medium">Setup time for most teams</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              How It Works
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              Get your team tracking tools in three steps. Most teams are fully operational the same day.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                1
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Add Your Tools</h3>
              <p className="mt-2 text-gray-600">
                Enter your tool inventory with photos, serial numbers, and costs.
                Assign each tool to a person, vehicle, or location.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                2
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Track Every Checkout</h3>
              <p className="mt-2 text-gray-600">
                When a tool changes hands, the transfer is logged automatically with a timestamp
                and the person responsible. No clipboards.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Audit From Your Phone</h3>
              <p className="mt-2 text-gray-600">
                Run tool audits in minutes from any phone. See what's missing,
                who had it last, and resolve discrepancies fast.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <a
              href="#book-demo"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg"
            >
              Book a Free Demo
            </a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              No hidden fees. No per-user charges. Pick a plan and get your whole team on it.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white p-1 shadow-md">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  billingCycle === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-gray-500'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  billingCycle === 'annual' ? 'bg-blue-600 text-white shadow' : 'text-gray-500'
                }`}
              >
                Annual
              </button>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Save up to 10%
              </span>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">Free Trial</h3>
              <p className="mt-2 text-gray-600">Try tool tracking with your team</p>
              <div className="mt-6 text-4xl font-extrabold text-gray-900">$0</div>
              <p className="text-gray-500">No credit card required</p>
              <a
                href="#book-demo"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Book a Demo
              </a>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                <li>&#10003; 3 users</li>
                <li>&#10003; 5 tools</li>
                <li>&#10003; Full tool tracking</li>
                <li>&#10003; Tool transfers and history</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">Starter</h3>
              <p className="mt-2 text-gray-600">For small teams getting organized</p>
              <div className="mt-6 text-4xl font-extrabold text-gray-900">
                ${billingCycle === 'annual' ? starterAnnualMonthly : '200'}
                <span className="text-base font-semibold text-gray-500">/{priceLabel}</span>
              </div>
              <p className="text-gray-500">
                {billingCycle === 'annual'
                  ? '$2,220 billed yearly'
                  : '15 users \u2022 150 tools'}
              </p>
              {billingCycle === 'annual' && (
                <p className="text-sm text-green-700 font-semibold">{starterSavings}</p>
              )}
              <a
                href="#book-demo"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg border-2 border-blue-600 bg-white px-4 py-3 text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
              >
                Book a Demo
              </a>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                <li>&#10003; 15 users</li>
                <li>&#10003; 150 tools</li>
                <li>&#10003; Tool transfer history</li>
                <li>&#10003; Photos on tools</li>
                <li>&#10003; Damaged tool reporting</li>
              </ul>
            </div>

            <div className="rounded-2xl border-4 border-blue-600 bg-white p-8 shadow-xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">Pro</h3>
              <p className="mt-2 text-gray-600">For growing teams with more tools</p>
              <div className="mt-6 text-4xl font-extrabold text-gray-900">
                ${billingCycle === 'annual' ? proAnnualMonthly : '350'}
                <span className="text-base font-semibold text-gray-500">/{priceLabel}</span>
              </div>
              <p className="text-gray-500">
                {billingCycle === 'annual'
                  ? '$3,780 billed yearly'
                  : '75 users \u2022 750 tools'}
              </p>
              {billingCycle === 'annual' && (
                <p className="text-sm text-green-700 font-semibold">{proSavings}</p>
              )}
              <a
                href="#book-demo"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 transition-colors shadow-md"
              >
                Book a Demo
              </a>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                <li>&#10003; 75 users</li>
                <li>&#10003; 750 tools</li>
                <li>&#10003; Tool transfer history</li>
                <li>&#10003; Photos on tools</li>
                <li>&#10003; Damaged tool reporting</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">Custom</h3>
              <p className="mt-2 text-gray-600">For large teams and custom needs</p>
              <div className="mt-6 text-4xl font-extrabold text-gray-900">Let's talk</div>
              <p className="text-gray-500">Custom limits and billing</p>
              <a
                href="#book-demo"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
              >
                Book a Demo
              </a>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                <li>&#10003; Custom limits and onboarding</li>
                <li>&#10003; Dedicated support</li>
                <li>&#10003; Custom integrations</li>
                <li>&#10003; Annual invoicing</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 text-lg">
              Not sure which plan fits?{' '}
              <a href="#book-demo" className="text-blue-600 hover:text-blue-700 font-semibold">
                Book a demo
              </a>{' '}
              and we'll help you figure it out.
            </p>
          </div>
        </div>
      </section>

      {/* Book a Demo — Calendly Embed */}
      <section id="book-demo" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              See It In Action — Book a Free Demo
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Pick a time that works for you. We'll walk through exactly how Smarter Tracks works
              for your team — your tools, your crew, your workflow. 30 minutes, no pressure.
            </p>
          </div>
          <div
            className="calendly-inline-widget"
            data-url="https://calendly.com/brockcoburn-smartertracks/30min?hide_gdpr_banner=1"
            style={{ minWidth: '320px', height: '700px' }}
          />
          <p className="mt-4 text-center text-sm text-gray-400">
            Prefer email?{' '}
            <a href="mailto:brockcoburn@smartertracks.com" className="text-blue-600 hover:text-blue-700 font-medium">
              brockcoburn@smartertracks.com
            </a>
          </p>
        </div>
      </section>

      {/* Risk reduction */}
      <section className="py-12 bg-gray-50 border-y border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">Free trial included</div>
              <p className="text-sm text-gray-500">No credit card required</p>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Cancel anytime</div>
              <p className="text-sm text-gray-500">No long-term contracts</p>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Same-day onboarding</div>
              <p className="text-sm text-gray-500">We help you get set up</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SEO CONTENT (for Google, below the fold) ===================== */}

      {/* Industry-specific pages with internal links */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Tool Tracking Software Built for Trades Teams
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
              Smarter Tracks is purpose-built <strong>tool tracking software</strong> for the teams
              that need it most.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">HVAC Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                HVAC companies lose gauges, meters, vac pumps, and recovery machines constantly.
                <strong> Track HVAC tools</strong> across service vans, warehouses, and job sites.
              </p>
              <Link to="/hvac-tool-tracking" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about HVAC tool tracking &rarr;
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Construction Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                Construction contractors manage tools across multiple jobsites and crews.
                <strong> Track construction tools</strong> by location and assign custody to workers.
              </p>
              <Link to="/construction-tool-management" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about construction tool tracking &rarr;
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Field Service Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                Plumbing, electrical, mechanical, and general trades teams all deal with the same
                problem. Smarter Tracks gives every field team a simple{' '}
                <Link to="/tool-tracking-software" className="text-blue-600 hover:text-blue-700 font-semibold">tool tracking software</Link> system.
              </p>
              <Link to="/tool-tracking-software" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about tool tracking software &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why tool tracking matters */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Why Tool Tracking Software Matters
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
              Contractors, HVAC companies, and field service teams lose thousands of dollars each year
              to missing tools, duplicate purchases, and time spent searching.
              Without a <strong>tool tracking system</strong>, there is no clear record of who has
              what or where tools moved last.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-extrabold text-red-600">$400B+</div>
              <p className="mt-2 text-gray-600">
                Annual construction tool and equipment theft costs in the U.S. alone.
                <strong> Tool tracking software</strong> helps reduce that exposure.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold text-red-600">1 in 5</div>
              <p className="mt-2 text-gray-600">
                Contractors say they rebuy tools they already own because nobody knows who has them.
                A <Link to="/tool-tracking-software" className="text-blue-600 hover:text-blue-700 font-semibold">tool tracking app</Link> eliminates that guesswork.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold text-red-600">20+ hrs</div>
              <p className="mt-2 text-gray-600">
                Hours lost per month by field crews searching for tools. <strong>Tool tracking
                </strong> puts that time back into billable work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What is tool tracking */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            What Is Tool Tracking Software?
          </h2>
          <div className="mt-8 prose prose-lg max-w-none text-gray-600">
            <p>
              <strong>Tool tracking software</strong> is a digital system that records which tools
              your company owns, who has them, and where they are right now. Instead of relying on
              spreadsheets, whiteboards, or memory, a tool tracking app like
              Smarter Tracks gives every team member a shared, up-to-date view of your entire
              tool inventory.
            </p>
            <p>
              With Smarter Tracks, every tool gets a profile with photos, serial numbers, cost,
              and custody history. When a technician checks a tool out, the system logs the transfer
              automatically. When a foreman runs an audit, they can verify tool locations from their
              phone in minutes instead of hours. This is tool tracking built for
              real-world field operations.
            </p>
            <p>
              Unlike enterprise asset management platforms that cost thousands and take months to
              deploy, Smarter Tracks is affordable <Link to="/tool-tracking-software" className="text-blue-600 hover:text-blue-700 font-semibold">tool tracking software</Link> designed
              for small and mid-size trades teams. You can add your tools, invite your crew, and start
              tracking the same day you sign up.
            </p>
          </div>
        </div>
      </section>

      {/* Tool tracking vs spreadsheets */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Tool Tracking Software vs. Spreadsheets
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600 text-center">
            Many teams start with Excel or Google Sheets. Here's why dedicated
            <strong> tool tracking software</strong> outperforms spreadsheets at every level.
          </p>
          <div className="mt-10 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">Feature</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">Spreadsheets</th>
                  <th className="px-6 py-4 text-sm font-semibold text-blue-600">Smarter Tracks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-600">
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Real-time tool tracking</td>
                  <td className="px-6 py-3">Manual updates, always stale</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Automatic, always current</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Tool checkout logging</td>
                  <td className="px-6 py-3">Honor system</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Every transfer logged with user and time</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Audit speed</td>
                  <td className="px-6 py-3">Hours with printed lists</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Minutes from any phone</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Mobile access</td>
                  <td className="px-6 py-3">Clunky on phones</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Native iOS and Android apps</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Tool photos</td>
                  <td className="px-6 py-3">Not practical</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Built-in photo management</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Accountability</td>
                  <td className="px-6 py-3">No enforcement</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Full custody trail per tool</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Take Your Tool Tracking Mobile
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Download the Smarter Tracks mobile app for iOS and Android.
              Field technicians can access your tool inventory, transfer tools, and run audits right
              from the job site.
            </p>

            <div className="mt-8 flex justify-center space-x-6">
              <a
                href="https://apps.apple.com/in/app/smarter-tracks/id6748660773"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Download on the</div>
                  <div className="text-xl font-semibold">App Store</div>
                </div>
              </a>

              <a
                href="https://play.google.com/store/apps/details?id=com.bactech.smartertracks"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Get it on</div>
                  <div className="text-xl font-semibold">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Tool Tracking Software FAQ
          </h2>
          <dl className="mt-10 space-y-8">
            <div>
              <dt className="text-lg font-semibold text-gray-900">What is tool tracking software?</dt>
              <dd className="mt-2 text-gray-600">
                <strong>Tool tracking software</strong> is an app that records your tool inventory,
                assigns custody to team members, and logs every transfer. It replaces spreadsheets
                and verbal checkouts with a digital system that keeps your whole team accountable.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">How does Smarter Tracks work?</dt>
              <dd className="mt-2 text-gray-600">
                You add your tools to the app, assign them to technicians or locations, and the system
                tracks every checkout, return, and transfer. Admins can run audits from their phone,
                view full tool history, and see who has what at any moment.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">Does it require GPS or Bluetooth hardware?</dt>
              <dd className="mt-2 text-gray-600">
                No. Smarter Tracks uses assignment-based tool tracking — no GPS tags,
                no Bluetooth beacons, no extra hardware. Custody is recorded through the app when
                tools are checked in and out.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">Can I track tools across multiple jobsites?</dt>
              <dd className="mt-2 text-gray-600">
                Yes. Assign tools to specific locations, vehicles, or warehouses. When tools move
                between jobsites, the transfer is logged so you always know where everything is.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">How fast can my team get started?</dt>
              <dd className="mt-2 text-gray-600">
                Most teams are up and running the same day. Add your tools, invite your crew, and
                start tracking immediately. We also offer onboarding demos to get you set up.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">Is there a mobile app?</dt>
              <dd className="mt-2 text-gray-600">
                Yes. Smarter Tracks has native apps for iOS and Android. Field techs can scan tools,
                transfer custody, and run audits directly from their phones.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">What types of teams use Smarter Tracks?</dt>
              <dd className="mt-2 text-gray-600">
                HVAC companies, construction contractors, plumbers, electricians, mechanical
                contractors, and any field service team that manages shared tools.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to See How It Works for Your Team?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Book a free 30-minute demo. We'll walk through how Smarter Tracks handles your tools,
            your crew, and your workflow.
          </p>
          <div className="mt-8">
            <a
              href="#book-demo"
              className="bg-white hover:bg-gray-100 text-blue-600 px-10 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg inline-block"
            >
              Book a Free Demo
            </a>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Get in Touch
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Have questions about tool tracking, pricing, or how Smarter Tracks works for your team?<br />
              Fill out the form below and we'll get back to you within 24 hours.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
