import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'
import ContactForm from '../components/ContactForm'

const APP_SCREENSHOTS = [
  { src: '/screenshots/alltools.png', alt: 'Tool tracking software showing all tools with photos, owners, and locations' },
  { src: '/screenshots/tooldescriptions.png', alt: 'Tool details screen showing custody status and job site location' },
  { src: '/screenshots/homeinfo.png', alt: 'Tool tracking dashboard showing tool counts, transfers, and recent activity' },
]

const faqItems = [
  {
    question: 'What is tool tracking software?',
    answer:
      'Tool tracking software is a digital system that records which tools your company owns, who currently has custody of each one, and where they are located. It replaces spreadsheets and verbal check-outs with a shared, always-current view of your entire tool inventory so nothing falls through the cracks.',
  },
  {
    question: 'How does Smarter Tracks work?',
    answer:
      'You add your tools to the app with photos, serial numbers, and costs, then assign each tool to a person, vehicle, or job site. Every time a tool changes hands the transfer is logged automatically with a timestamp and the responsible party. Admins can run audits, view full history, and see who has what at any moment.',
  },
  {
    question: 'Does it require GPS or hardware?',
    answer:
      'No. Smarter Tracks uses assignment-based tracking — no GPS tags, no Bluetooth beacons, and no extra hardware to buy or maintain. Custody is recorded through the app whenever tools are checked in or out, keeping things simple and affordable.',
  },
  {
    question: 'Can I track tools across multiple jobsites?',
    answer:
      'Absolutely. You can assign tools to specific job sites, warehouses, or service vehicles. When a tool moves between locations the transfer is logged so you always have a clear picture of where every piece of equipment is, even across dozens of active sites.',
  },
  {
    question: 'How fast can my team get started?',
    answer:
      'Most teams are fully operational the same day they sign up. Add your tools, invite your crew, and start tracking immediately. We also offer free onboarding demos to walk you through best practices for your specific workflow.',
  },
  {
    question: 'Is there a mobile app?',
    answer:
      'Yes. Smarter Tracks has native apps for both iOS and Android. Field technicians can transfer tools, run audits, and check custody status right from their phones — no laptop required.',
  },
  {
    question: 'What types of teams use tool tracking software?',
    answer:
      'HVAC companies, general contractors, electricians, plumbers, mechanical contractors, and any field service team that shares tools across multiple people or locations. If your crew moves tools between trucks, job sites, and warehouses, tool tracking software will save you time and money.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
}

export default function ToolTrackingSoftware() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [currentScreenshot, setCurrentScreenshot] = useState(0)
  const priceLabel = 'per month'
  const starterAnnualMonthly = 185
  const proAnnualMonthly = 315
  const starterSavings = 'save 7.5%'
  const proSavings = 'save 10%'

  useEffect(() => {
    setPageMeta({
      title: 'Tool Tracking Software for Trades Teams | Smarter Tracks',
      description:
        'Tool tracking software built for HVAC, construction, and field service teams. Know who has every tool, log every checkout, and run audits from your phone. Book a free demo with Smarter Tracks.',
      canonicalPath: '/tool-tracking-software',
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

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <MarketingHeader />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="lg:grid lg:grid-cols-[1.5fr,1fr] lg:gap-20 lg:items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl lg:text-7xl tracking-tight leading-tight">
                Tool Tracking Software
              </h1>
              <h1 className="text-5xl font-extrabold text-blue-600 sm:text-6xl lg:text-7xl tracking-tight leading-tight">
                That Stops the Guesswork.
              </h1>
              <p className="mt-6 text-2xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Every trades team knows the pain: a $400 tool goes missing, nobody remembers who had it,
                and you end up buying it again. Smarter Tracks is tool tracking software that gives you
                instant visibility into who has every tool, where it is, and when it last changed hands —
                so you stop losing money and start holding people accountable.
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

            <div className="mt-10 lg:mt-0 relative">
              <div className="relative max-w-md mx-auto px-10">
                <button
                  onClick={() => setCurrentScreenshot((prev) => (prev - 1 + APP_SCREENSHOTS.length) % APP_SCREENSHOTS.length)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-blue-600 transition-colors p-2"
                  aria-label="Previous screenshot"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  <div className="bg-white rounded-[2.5rem] overflow-hidden relative" style={{ aspectRatio: '9/19.5' }}>
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
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-7 bg-gray-900 rounded-full" />
                </div>

                <button
                  onClick={() => setCurrentScreenshot((prev) => (prev + 1) % APP_SCREENSHOTS.length)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-blue-600 transition-colors p-2"
                  aria-label="Next screenshot"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

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

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              What Tool Tracking Software Actually Solves
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              It is not about features on a spec sheet — it is about the problems that cost you real money every week.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">End the "Who Has It?" Phone Calls</h3>
              <p className="mt-3 text-gray-600">
                Every time a tool goes missing, somebody has to call around the crew to figure out who
                took it. With custody tracking and automatic transfer logs, the answer is always one tap
                away — no phone calls, no finger-pointing.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Stop Buying Tools You Already Own</h3>
              <p className="mt-3 text-gray-600">
                When nobody tracks who has what, you end up purchasing the same drill kit or meter twice.
                Smarter Tracks gives every tool a digital paper trail so nothing slips through the cracks
                and your purchasing team stops wasting budget on duplicates.
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
                Forget printed checklists and warehouse walk-throughs. Open the app on your phone,
                verify what is on site, flag what is missing, and resolve discrepancies before they
                become expensive losses — all from the field.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI stats */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              The ROI of Tool Tracking Software
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
                and the person responsible. No clipboards needed.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Audit From Your Phone</h3>
              <p className="mt-2 text-gray-600">
                Run tool audits in minutes from any phone. See what is missing,
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

      {/* Calendly embed */}
      <section id="book-demo" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              See Tool Tracking Software In Action
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

      {/* SEO: What Is Tool Tracking Software? */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            What Is Tool Tracking Software?
          </h2>
          <div className="mt-8 prose prose-lg max-w-none text-gray-600">
            <p>
              <strong>Tool tracking software</strong> is a digital system that records which tools
              your company owns, who has custody of each one, and where they are located right now.
              Instead of relying on spreadsheets, whiteboards, or someone's memory, a tool tracking
              app like Smarter Tracks gives every team member a shared, always-current view of your
              entire tool inventory. When a tool changes hands the system logs the transfer
              automatically — no clipboards, no guesswork.
            </p>
            <p>
              With Smarter Tracks, every tool gets a profile that includes photos, serial numbers,
              replacement cost, and a full custody history. When a technician checks a tool out, the
              transfer is recorded with a timestamp and the responsible party. When a foreman needs
              to run an audit, they can verify tool locations from their phone in minutes instead of
              hours. This is{' '}
              <Link to="/tool-tracking-software" className="text-blue-600 hover:text-blue-700 font-semibold">
                tool tracking software
              </Link>{' '}
              built for real-world field operations — not a bloated enterprise platform that takes
              months to deploy.
            </p>
            <p>
              Unlike heavy asset management suites that cost thousands per year and require dedicated
              IT support, Smarter Tracks is designed for small and mid-size trades teams who need a
              fast, affordable way to stop losing tools. You can add your inventory, invite your
              crew, and start tracking the same day you sign up. Whether you run an HVAC shop, a
              construction company, or a multi-trade field service operation, tool tracking software
              pays for itself by eliminating duplicate purchases, reducing theft exposure, and
              reclaiming the hours your team currently spends searching for equipment.
            </p>
          </div>
        </div>
      </section>

      {/* SEO: Industry cards */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Tool Tracking Software Built for Every Trade
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
              Smarter Tracks works for any team that shares tools across people, vehicles, and job sites.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">HVAC Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                Track gauges, meters, vac pumps, and recovery machines across service vans and job sites.
              </p>
              <Link to="/hvac-tool-tracking" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about HVAC tool tracking &rarr;
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Construction Tool Management</h3>
              <p className="mt-3 text-gray-600">
                Manage tools across multiple crews and job sites with full custody trails and mobile audits.
              </p>
              <Link to="/construction-tool-management" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about construction tool management &rarr;
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Tool Inventory Software</h3>
              <p className="mt-3 text-gray-600">
                Maintain a complete digital inventory with photos, serial numbers, costs, and location data.
              </p>
              <Link to="/tool-inventory-software" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about tool inventory software &rarr;
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Tool Checkout System</h3>
              <p className="mt-3 text-gray-600">
                Log every checkout and return with timestamps and user accountability — no paper required.
              </p>
              <Link to="/tool-checkout-system" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about tool checkout systems &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Tool Tracking Software FAQ
          </h2>
          <dl className="mt-10 space-y-8">
            {faqItems.map((item) => (
              <div key={item.question}>
                <dt className="text-lg font-semibold text-gray-900">{item.question}</dt>
                <dd className="mt-2 text-gray-600">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to See Tool Tracking Software In Action?
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
