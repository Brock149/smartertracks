import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'
import ContactForm from '../components/ContactForm'

const APP_SCREENSHOTS = [
  { src: '/screenshots/alltools.png', alt: 'Tool checkout system showing all tools with current owners and checkout status' },
  { src: '/screenshots/tooldescriptions.png', alt: 'Tool checkout details showing custody history and current location' },
  { src: '/screenshots/homeinfo.png', alt: 'Tool checkout dashboard showing recent checkouts and tool counts' },
]

const faqItems = [
  {
    question: 'How does a tool checkout system work?',
    answer:
      'A tool checkout system logs every time a tool changes hands. When a tech checks out a tool, the system records who took it, when, and from where. When it comes back, the return is logged the same way — creating a complete custody trail.',
  },
  {
    question: 'Can techs check tools in and out by scanning?',
    answer:
      'Yes. Smarter Tracks supports barcode and QR code scanning from any phone. Techs scan a tool to check it out or return it in seconds, with no paperwork.',
  },
  {
    question: 'How does a tool checkout system improve accountability?',
    answer:
      'Every checkout is tied to a specific person with a timestamp. If a tool goes missing, you can see exactly who had it last and when — no guessing, no finger-pointing.',
  },
  {
    question: 'Can I manage checkouts across multiple job sites?',
    answer:
      'Yes. Smarter Tracks lets you assign tools to specific locations, vehicles, or warehouses. When tools move between sites, each transfer is logged so you always know where everything is.',
  },
  {
    question: 'How long does it take to set up a tool checkout system?',
    answer:
      'Most teams are fully operational the same day. Add your tools, invite your crew, and start tracking checkouts immediately. No special hardware or lengthy onboarding required.',
  },
  {
    question: 'Does a tool checkout system replace paper sign-out sheets?',
    answer:
      'Absolutely. Paper sheets get lost, ignored, or filled out incorrectly. A digital tool checkout system captures every handoff automatically and keeps a permanent, searchable record.',
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

export default function ToolCheckoutSystem() {
  const [currentScreenshot, setCurrentScreenshot] = useState(0)

  useEffect(() => {
    setPageMeta({
      title: 'Tool Checkout System for Field Teams | Smarter Tracks',
      description:
        'Replace paper sign-out sheets with a digital tool checkout system. Log every handoff, track custody, and hold crews accountable — from any phone.',
      canonicalPath: '/tool-checkout-system',
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
                Tool Checkout System
              </h1>
              <h1 className="text-5xl font-extrabold text-blue-600 sm:text-6xl lg:text-7xl tracking-tight leading-tight">
                With Accountability Built In.
              </h1>
              <p className="mt-6 text-2xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Paper sign-out sheets get ignored. Verbal checkouts get forgotten. Smarter Tracks is a
                tool checkout system that logs every handoff automatically — so when a tool goes missing,
                you know exactly who had it last.
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
              What a Tool Checkout System Actually Solves
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              Most teams know they have a checkout problem. Here's how a digital system fixes it.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">End the Honor System</h3>
              <p className="mt-3 text-gray-600">
                Paper sign-out sheets rely on people remembering to write things down. They don't.
                A digital tool checkout system logs every handoff automatically — no more "I thought someone
                else had it."
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Know Who Had It Last</h3>
              <p className="mt-3 text-gray-600">
                Every checkout creates a custody trail — who took the tool, when, and from where. When
                something goes missing, you don't have to ask around. The answer is already in the system.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Catch Missing Tools Before They're Gone</h3>
              <p className="mt-3 text-gray-600">
                Run audits from your phone in minutes. Compare what should be on site against what actually
                is, flag discrepancies, and resolve them before a $500 tool disappears for good.
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
              The ROI of a Tool Checkout System
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
              Get your team running a digital tool checkout system in three steps. Most teams are fully operational the same day.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                1
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Set Up Your Tools</h3>
              <p className="mt-2 text-gray-600">
                Add your tool inventory with photos, serial numbers, and values.
                Assign each tool to a person, vehicle, or jobsite location.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                2
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Check In and Out</h3>
              <p className="mt-2 text-gray-600">
                When a tool changes hands, the checkout is logged automatically with a timestamp
                and the person responsible. Scan a barcode or tap a button — done.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Review and Audit</h3>
              <p className="mt-2 text-gray-600">
                Run tool audits from any phone. See what's checked out, who has it,
                and flag anything that's overdue or unaccounted for.
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
              See the Tool Checkout System In Action
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Pick a time that works for you. We'll walk through exactly how Smarter Tracks handles
              checkouts, custody tracking, and audits for your team. 30 minutes, no pressure.
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
      <section className="py-12 bg-white border-y border-gray-200">
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

      {/* SEO: What Is a Tool Checkout System? */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            What Is a Tool Checkout System?
          </h2>
          <div className="mt-8 prose prose-lg max-w-none text-gray-600">
            <p>
              A <strong>tool checkout system</strong> is a digital process for recording who takes a tool,
              when they take it, and when it comes back. It replaces the paper sign-out sheets, verbal
              agreements, and group texts that most trades teams rely on today. The problem with those
              methods is simple: they depend on people remembering. And in the field, people forget. Tools
              get left on job sites, passed between trucks, and borrowed without anyone logging it. By the
              time someone notices a tool is missing, nobody can say who had it last.
            </p>
            <p>
              A digital tool checkout system like Smarter Tracks solves this by creating an automatic
              record every time a tool changes hands. Techs check tools in and out from their phone using
              barcode or QR code scanning. Every checkout is timestamped and tied to a specific user. Admins
              can see the full custody history for any tool — who had it, where it was assigned, and when it
              moved. This makes audits faster, disputes easier to resolve, and tool loss significantly harder
              to ignore.
            </p>
            <p>
              Unlike enterprise asset management platforms that require months of setup and six-figure
              budgets, Smarter Tracks is built for small and mid-size trades teams. It's affordable,
              mobile-first, and designed to fit the way field crews actually work. If you're currently
              using a clipboard or a spreadsheet to manage tool checkouts, a dedicated{' '}
              <Link to="/tool-tracking-software" className="text-blue-600 hover:text-blue-700 font-semibold">
                tool tracking software
              </Link>{' '}
              solution will pay for itself within months.
            </p>
          </div>
        </div>
      </section>

      {/* SEO: Paper vs Digital Checkout comparison */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Paper Sign-Out Sheets vs. Digital Tool Checkout
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600 text-center">
            Here's why trades teams are replacing clipboards with a digital tool checkout system.
          </p>
          <div className="mt-10 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">Capability</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">Paper Sign-Out</th>
                  <th className="px-6 py-4 text-sm font-semibold text-blue-600">Smarter Tracks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-600">
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Checkout logging</td>
                  <td className="px-6 py-3">Relies on people writing it down</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Automatic with timestamp and user</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Custody history</td>
                  <td className="px-6 py-3">None — paper gets lost or tossed</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Full digital trail for every tool</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Audit speed</td>
                  <td className="px-6 py-3">Hours with printed lists</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Minutes from any phone</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Multi-site visibility</td>
                  <td className="px-6 py-3">Each site has its own sheet</td>
                  <td className="px-6 py-3 text-green-700 font-medium">All sites in one system</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Overdue returns</td>
                  <td className="px-6 py-3">No way to track</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Flagged automatically</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Accountability</td>
                  <td className="px-6 py-3">Easy to skip or falsify</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Every action tied to a user</td>
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
            <h3 className="text-2xl font-bold text-gray-900">Explore More Tool Tracking Solutions</h3>
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
                to="/construction-tool-management"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Construction Tool Management
              </Link>
              <Link
                to="/tool-inventory-software"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Tool Inventory Software
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Tool Checkout System FAQ
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
            Ready to Replace Your Paper Sign-Out Sheet?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Book a free 30-minute demo. We'll walk through how Smarter Tracks handles tool checkouts,
            custody tracking, and audits for your team.
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
              Have questions about tool checkout workflows, pricing, or how Smarter Tracks works for your team?<br />
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
