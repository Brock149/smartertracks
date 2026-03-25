import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'
import ContactForm from '../components/ContactForm'

const APP_SCREENSHOTS = [
  { src: '/screenshots/alltools.png', alt: 'Tool inventory software showing complete tool list with photos and owners' },
  { src: '/screenshots/tooldescriptions.png', alt: 'Tool inventory details with custody, location, and condition tracking' },
  { src: '/screenshots/homeinfo.png', alt: 'Tool inventory dashboard showing counts, groups, and recent transfers' },
]

const faqItems = [
  {
    question: 'What is tool inventory software?',
    answer:
      'Tool inventory software is a digital system that tracks every tool your company owns, who has it, and where it is right now. It replaces spreadsheets with live custody records, transfer history, and mobile audits.',
  },
  {
    question: 'How does tool inventory software reduce tool loss?',
    answer:
      'It assigns every tool to a person, vehicle, or jobsite and records each transfer. When something goes missing, you can see who had it last and when it moved — so tools get found before they disappear for good.',
  },
  {
    question: 'Can field crews use it from their phones?',
    answer:
      'Yes. Smarter Tracks is mobile-first. Technicians can check tools in and out, transfer custody, and complete audits from any iOS or Android device without training.',
  },
  {
    question: 'Does it work for HVAC, construction, and electrical teams?',
    answer:
      'Yes. Smarter Tracks supports HVAC, construction, electrical, plumbing, and mechanical workflows with jobsite, vehicle, and warehouse assignments.',
  },
  {
    question: 'How fast can we set up our tool inventory?',
    answer:
      'Most teams add their tools, invite their crew, and start tracking the same day. No hardware, no lengthy onboarding — just add your tools and go.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes. You can start with a free trial that includes full tool tracking, transfers, and history — no credit card required.',
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

export default function ToolInventorySoftware() {
  const [currentScreenshot, setCurrentScreenshot] = useState(0)

  useEffect(() => {
    setPageMeta({
      title: 'Tool Inventory Software for Field Teams | Smarter Tracks',
      description:
        'Tool inventory software that stays accurate automatically. Track every tool, assign custody, run audits from your phone, and stop losing inventory to guesswork.',
      canonicalPath: '/tool-inventory-software',
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
                Tool Inventory Software
              </h1>
              <h1 className="text-5xl font-extrabold text-blue-600 sm:text-6xl lg:text-7xl tracking-tight leading-tight">
                That Actually Stays Up to Date.
              </h1>
              <p className="mt-6 text-2xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Spreadsheets go stale the moment someone checks out a tool. Smarter Tracks is tool
                inventory software that updates automatically every time a tool changes hands — so
                your inventory is always accurate.
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
              What Tool Inventory Software Solves
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              Most teams don't have an inventory problem — they have a visibility problem. Here's what changes when you fix it.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Know Exactly What You Own</h3>
              <p className="mt-3 text-gray-600">
                Get complete visibility into every tool across every location — warehouses, trucks,
                and jobsites. No more guessing what you have or where it is.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Track Where Every Tool Is Right Now</h3>
              <p className="mt-3 text-gray-600">
                Every checkout and transfer is logged with a timestamp and a name. You always know
                who has each tool and when custody last changed — no phone calls needed.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Audit Inventory in Minutes</h3>
              <p className="mt-3 text-gray-600">
                Forget printed checklists and warehouse walk-throughs. Open the app on your phone,
                verify what's on site, flag what's missing — done in minutes, not hours.
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
              The ROI of Tool Inventory Software
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
              Get your team tracking tool inventory in three steps. Most teams are fully operational the same day.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                1
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Build Your Tool Inventory</h3>
              <p className="mt-2 text-gray-600">
                Add tools with photos, serial numbers, and costs. Organize by category, location, or
                crew. Import existing lists or add tools one at a time.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                2
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Assign and Transfer</h3>
              <p className="mt-2 text-gray-600">
                Assign each tool to a technician, vehicle, or jobsite. When tools change hands, the
                transfer is logged automatically with a timestamp and responsible party.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Audit and Reconcile</h3>
              <p className="mt-2 text-gray-600">
                Run inventory audits from any phone. See what's accounted for, flag what's missing,
                and resolve discrepancies before small losses become big expenses.
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
      <section id="book-demo" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              See Tool Inventory Software In Action
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Pick a time that works for you. We'll walk through exactly how Smarter Tracks manages
              your tool inventory — your tools, your crew, your workflow. 30 minutes, no pressure.
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

      {/* SEO: What Is Tool Inventory Software? */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            What Is Tool Inventory Software?
          </h2>
          <div className="mt-8 prose prose-lg max-w-none text-gray-600">
            <p>
              Most trades teams start managing their tool inventory with a spreadsheet — and it works
              fine until it doesn't. The first time a tool goes missing and nobody can say who had it
              last, the spreadsheet is already out of date. <strong>Tool inventory software</strong>{' '}
              replaces that fragile system with a live, shared record that updates every time a tool
              is assigned, transferred, or returned. Instead of relying on someone to remember to
              update a row, the system handles it automatically as part of the normal workflow.
            </p>
            <p>
              With dedicated tool inventory software like Smarter Tracks, every tool gets a digital
              profile — photos, serial numbers, purchase cost, condition notes, and a full custody
              history. Technicians check tools in and out from their phones. Managers see real-time
              inventory counts by location, crew, or vehicle. Audits that used to take an entire
              afternoon now take minutes because the data is already there — you just confirm it
              matches reality.
            </p>
            <p>
              What makes Smarter Tracks different from bloated enterprise asset platforms is
              simplicity. It was built by tradesmen for trades teams, so the interface is clean, the
              mobile app is fast, and there is no expensive hardware to install. If your team can
              send a text message, they can use Smarter Tracks. Pair it with our{' '}
              <Link to="/tool-tracking-software" className="text-blue-600 hover:text-blue-700 font-semibold">
                tool tracking software
              </Link>{' '}
              features to get custody tracking, checkout logging, and audits all in one system — and
              start the same day you sign up.
            </p>
          </div>
        </div>
      </section>

      {/* SEO: Tool Inventory vs Spreadsheets */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Tool Inventory Software vs. Spreadsheets
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600 text-center">
            Many teams start with Excel or Google Sheets. Here's why dedicated{' '}
            <strong>tool inventory software</strong> outperforms spreadsheets at every level.
          </p>
          <div className="mt-10 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">Capability</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">Spreadsheets</th>
                  <th className="px-6 py-4 text-sm font-semibold text-blue-600">Smarter Tracks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-600">
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Real-time inventory counts</td>
                  <td className="px-6 py-3">Manual updates, always stale</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Automatic, always current</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Custody tracking</td>
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
                  <td className="px-6 py-3 font-medium text-gray-900">Tool photos and details</td>
                  <td className="px-6 py-3">Not practical</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Built-in photo and serial number management</td>
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

      {/* Internal links */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Tool Tracking Built for Your Trade
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
              Smarter Tracks works for any field team that manages shared tools. Explore pages
              tailored to your workflow.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Tool Tracking Software</h3>
              <p className="mt-3 text-gray-600">
                Assign tools, log every checkout, and see who has what across your entire operation.
              </p>
              <Link to="/tool-tracking-software" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Tool tracking software &rarr;
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">HVAC Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                Track gauges, meters, vac pumps, and recovery machines across service vans and shops.
              </p>
              <Link to="/hvac-tool-tracking" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                HVAC tool tracking &rarr;
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Construction Tool Management</h3>
              <p className="mt-3 text-gray-600">
                Keep tools accountable across jobsites, crews, and vehicles with real-time tracking.
              </p>
              <Link to="/construction-tool-management" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Construction tool management &rarr;
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Tool Checkout System</h3>
              <p className="mt-3 text-gray-600">
                Log every tool checkout with a timestamp and responsible party — no clipboards.
              </p>
              <Link to="/tool-checkout-system" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Tool checkout system &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Tool Inventory Software FAQ
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
            Ready to Get Your Tool Inventory Under Control?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Book a free 30-minute demo. We'll walk through how Smarter Tracks keeps your inventory
            accurate, your tools accounted for, and your team productive.
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
              Have questions about tool inventory software, pricing, or how Smarter Tracks works for your team?<br />
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
