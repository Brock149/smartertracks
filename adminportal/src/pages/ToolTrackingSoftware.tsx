import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'
import ContactForm from '../components/ContactForm'
import CtaPair from '../components/CtaPair'
import PricingSection from '../components/PricingSection'
import { useCalendlyEmbed } from '../components/CalendlySection'

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
      'Everyday tools are tracked in the app with no tags. Custody is recorded when tools are checked in and out. Optional cellular GPS trackers are available for a few high-value items. They use cell service, like a phone, not Bluetooth, so they do not depend on other people\'s phones.',
  },
  {
    question: 'Can I track tools across multiple jobsites?',
    answer:
      'Absolutely. You can assign tools to specific job sites, warehouses, or service vehicles. When a tool moves between locations the transfer is logged so you always have a clear picture of where every piece of equipment is, even across dozens of active sites.',
  },
  {
    question: 'How fast can my team get started?',
    answer:
      "Add your tools, invite your crew, and start tracking the same day. Book a 15-minute chat and we'll help you get started.",
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
  const [currentScreenshot, setCurrentScreenshot] = useState(0)

  useEffect(() => {
    setPageMeta({
      title: 'Tool Tracking Software for HVAC & Contractors | Smarter Tracks',
      description:
        'Tool tracking software built for HVAC, construction, and field service teams. Know who has every tool, log every checkout, and run audits from your phone. 90-day money-back guarantee.',
      canonicalPath: '/tool-tracking-software',
    })
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScreenshot((prev) => (prev + 1) % APP_SCREENSHOTS.length)
    }, 5500)
    return () => clearInterval(interval)
  }, [])

  useCalendlyEmbed()

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
              <p className="text-5xl font-extrabold text-blue-600 sm:text-6xl lg:text-7xl tracking-tight leading-tight">
                That Stops the Guesswork.
              </p>
              <p className="mt-6 text-2xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Every trades team knows the pain: a $400 tool goes missing, nobody remembers who had it,
                and you end up buying it again. Smarter Tracks is tool tracking software that gives you
                instant visibility into who has every tool, where it is, and when it last changed hands —
                so you stop losing money and start holding people accountable.
              </p>
              <p className="mt-5 text-base font-bold text-gray-600 uppercase tracking-widest">
                Built for Trades, by Tradesmen
              </p>
              <CtaPair
                section="hero"
                align="start"
                className="mt-9"
                note="90-day money-back guarantee. No questions asked."
              />
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
              iOS &amp; Android apps
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              90-day money-back guarantee
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

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              How It Works
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              Add your tools, invite your crew, and start tracking the same day.
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
        </div>
      </section>

      <PricingSection />

      {/* Calendly embed */}
      <section id="book-demo" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              See Tool Tracking Software In Action
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Pick a time that works for you. We'll walk through exactly how Smarter Tracks works
              for your team — your tools, your crew, your workflow.
            </p>
          </div>
          <div
            className="calendly-inline-widget"
            data-url="https://calendly.com/brockcoburn-smartertracks/30min?hide_gdpr_banner=1&hide_event_type_details=1"
            style={{ minWidth: '320px', width: '100%', height: '750px' }}
          />
          <p className="mt-4 text-center text-sm text-gray-400">
            Prefer email?{' '}
            <a href="mailto:brockcoburn@smartertracks.com" className="text-blue-600 hover:text-blue-700 font-medium">
              brockcoburn@smartertracks.com
            </a>
          </p>
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
          <CtaPair section="final-cta" tone="dark" className="mt-8" note="90-day money-back guarantee. No questions asked." />
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
