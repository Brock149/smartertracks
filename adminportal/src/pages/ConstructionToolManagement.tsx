import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'
import ContactForm from '../components/ContactForm'

const APP_SCREENSHOTS = [
  { src: '/screenshots/alltools.png', alt: 'Construction tool management showing all tools with photos and assigned crews' },
  { src: '/screenshots/tooldescriptions.png', alt: 'Tool details showing custody, job site location, and condition' },
  { src: '/screenshots/homeinfo.png', alt: 'Construction tool tracking dashboard with tool counts and transfers' },
]

const faqItems = [
  {
    question: 'What is construction tool management software?',
    answer:
      'Construction tool management software tracks every tool your company owns, assigns custody to workers or crews, and logs transfers between job sites. It replaces spreadsheets and verbal check-outs with a digital system that shows who has what at all times.',
  },
  {
    question: 'How does Smarter Tracks handle multiple job sites?',
    answer:
      'You assign tools to specific job sites, vehicles, or warehouses. When tools move between locations, the transfer is logged automatically so you always know which site has which tools.',
  },
  {
    question: 'Can foremen and superintendents use it in the field?',
    answer:
      'Yes. Smarter Tracks is mobile-first with native iOS and Android apps. Foremen can check tools in and out, run audits, and view custody history directly from their phone on the job site.',
  },
  {
    question: 'Does construction tool tracking require GPS tags?',
    answer:
      'No. Smarter Tracks uses assignment-based tracking — no GPS tags, no Bluetooth beacons, no extra hardware. Custody is recorded through the app when tools are checked in and out.',
  },
  {
    question: 'How fast can a construction team get set up?',
    answer:
      'Most construction teams are fully operational the same day. Add your tools, invite your crew, and start tracking immediately. We also offer onboarding demos to walk you through setup.',
  },
  {
    question: 'What types of construction tools can I track?',
    answer:
      'Any tool your crew uses — power tools, hand tools, lasers, generators, compressors, saws, drills, and specialty equipment. Every tool gets a profile with photos, serial numbers, cost, and full custody history.',
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

export default function ConstructionToolManagement() {
  const [currentScreenshot, setCurrentScreenshot] = useState(0)

  useEffect(() => {
    setPageMeta({
      title: 'Construction Tool Management Software | Smarter Tracks',
      description:
        'Construction tool management software that tracks every tool across job sites and crews. Assign custody, log checkouts, run audits, and stop losing tools. Book a free demo.',
      canonicalPath: '/construction-tool-management',
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
                Construction Tool Management
              </h1>
              <h1 className="text-5xl font-extrabold text-blue-600 sm:text-6xl lg:text-7xl tracking-tight leading-tight">
                Across Every Jobsite and Crew.
              </h1>
              <p className="mt-6 text-2xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Tools walk off job sites. Crews share gear with no clear owner. Foremen waste hours
                tracking down missing equipment. Smarter Tracks gives every tool an owner and every
                checkout a record.
              </p>
              <p className="mt-5 text-base font-bold text-gray-600 uppercase tracking-widest">
                Built for Contractors, by Tradesmen
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href="#book-demo"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-lg text-xl font-semibold transition-colors shadow-lg text-center"
                >
                  Book a Free Demo
                </a>
                <a
                  href="#benefits"
                  className="text-gray-600 hover:text-gray-900 px-7 py-5 rounded-lg text-xl font-medium transition-colors text-center"
                >
                  Learn More &darr;
                </a>
              </div>
            </div>

            {/* App screenshots carousel */}
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
      <section id="benefits" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              What Construction Tool Management Actually Fixes
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              The real problems contractors deal with every week — and how Smarter Tracks solves them.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Stop Losing Tools Between Job Sites</h3>
              <p className="mt-3 text-gray-600">
                Construction crews move between sites daily. Tools ride in trucks, get left behind, and
                end up on the wrong job. Smarter Tracks assigns every tool to a location and logs every
                transfer — so nothing falls through the cracks when crews mobilize.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Get Clear Custody Without Slowing Crews Down</h3>
              <p className="mt-3 text-gray-600">
                No more "who took the rotary hammer?" texts. When a tool changes hands, the transfer
                is logged with a timestamp and the person responsible. Foremen see who has what without
                calling around or checking clipboards.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Run Jobsite Audits Before Tools Disappear</h3>
              <p className="mt-3 text-gray-600">
                Waiting until a tool is gone to look for it is too late. With Smarter Tracks, foremen
                run quick audits from any phone — verify what's on site, flag what's missing, and
                resolve discrepancies before they become expensive losses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              The ROI of Construction Tool Management
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
              Construction teams using Smarter Tracks see measurable results within the first 90 days.
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
              <p className="mt-2 text-gray-700 font-medium">Setup time for most construction teams</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              How Construction Tool Tracking Works
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              Get your crew tracking tools in three steps. Most teams are fully operational the same day they sign up.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                1
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Load Your Tool Inventory</h3>
              <p className="mt-2 text-gray-600">
                Enter your tools with photos, serial numbers, and replacement costs. Assign each tool to
                a crew member, job site, truck, or warehouse.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                2
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Track Every Checkout and Transfer</h3>
              <p className="mt-2 text-gray-600">
                When a tool changes hands or moves between job sites, the transfer is logged automatically
                with a timestamp and the responsible person. No clipboards needed.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Audit From Any Phone on Any Job Site</h3>
              <p className="mt-2 text-gray-600">
                Foremen run tool audits in minutes from any phone. See what's on site, who had each tool
                last, and resolve discrepancies fast — before tools walk off.
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

      {/* Calendly */}
      <section id="book-demo" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              See Construction Tool Management In Action
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Pick a time that works for you. We'll walk through exactly how Smarter Tracks handles
              your tools, your job sites, and your crew. 30 minutes, no pressure.
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

      {/* SEO: What Is Construction Tool Management Software? */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            What Is Construction Tool Management Software?
          </h2>
          <div className="mt-8 prose prose-lg max-w-none text-gray-600">
            <p>
              <strong>Construction tool management software</strong> is a digital system purpose-built
              for the way construction crews actually work. Unlike generic asset trackers designed for
              warehouses or IT departments, construction tool management addresses the unique challenges
              contractors face: tools spread across multiple active job sites, shared equipment with no
              clear owner, high-value items that vanish between shifts, and foremen who spend hours on
              the phone trying to locate a single saw or laser.
            </p>
            <p>
              The core problem is accountability. On a construction site, tools change hands constantly.
              A crew borrows a rotary hammer from another team, a generator gets loaded onto the wrong
              truck, or a set of impact wrenches gets left at yesterday's job. Without a system that
              tracks custody in real time, there's no way to know who had what or when it moved. That
              lack of visibility leads to duplicate purchases, project delays, and thousands of dollars
              in annual losses that most contractors accept as "the cost of doing business."
            </p>
            <p>
              Smarter Tracks is{' '}
              <Link to="/tool-tracking-software" className="text-blue-600 hover:text-blue-700 font-semibold">
                tool tracking software
              </Link>{' '}
              built specifically for this environment. Every tool gets a digital profile with photos,
              serial numbers, cost, and a full custody trail. Transfers are logged with a timestamp and
              the responsible worker. Foremen run audits from their phone in minutes. The result is
              fewer lost tools, less time wasted searching, and clear accountability from the shop to
              every active site.
            </p>
          </div>
        </div>
      </section>

      {/* SEO: Construction-specific feature grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Construction Tool Management vs. Generic Tracking
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600 text-center">
            Most asset tracking tools are built for warehouses or IT. Here's why construction teams
            need a purpose-built solution.
          </p>
          <div className="mt-10 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">Challenge</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">Generic Asset Trackers</th>
                  <th className="px-6 py-4 text-sm font-semibold text-blue-600">Smarter Tracks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-600">
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Multi-site tool movement</td>
                  <td className="px-6 py-3">Single-location focus, no transfer logs</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Every transfer logged with site and user</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Crew-level accountability</td>
                  <td className="px-6 py-3">Assigned to departments, not workers</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Custody assigned to individual crew members</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Field-ready audits</td>
                  <td className="px-6 py-3">Desktop-first, hard to use on site</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Mobile audits from any phone on any job site</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Setup and onboarding</td>
                  <td className="px-6 py-3">Weeks of configuration, IT required</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Same-day setup, no IT needed</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Tool photos and condition</td>
                  <td className="px-6 py-3">Rarely supported</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Photos, serial numbers, damage reporting</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Pricing</td>
                  <td className="px-6 py-3">Per-user enterprise pricing</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Flat-rate plans built for trades teams</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Internal links */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900">Explore Tool Tracking by Trade</h3>
            <p className="mt-3 text-gray-600">
              Looking for a page tailored to your team or workflow? Start here.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                to="/tool-tracking-software"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Tool Tracking Software
              </Link>
              <Link
                to="/hvac-tool-tracking"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                HVAC Tool Tracking
              </Link>
              <Link
                to="/tool-inventory-software"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Tool Inventory Software
              </Link>
              <Link
                to="/tool-checkout-system"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Tool Checkout System
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Construction Tool Management FAQ
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
            Ready to Get Your Construction Tools Under Control?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Book a free 30-minute demo. We'll walk through how Smarter Tracks handles your tools,
            your job sites, and your crew — no pressure.
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
              Have questions about construction tool management, pricing, or how Smarter Tracks works for your crew?<br />
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
