import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'

const faqItems = [
  {
    question: 'What is tool tracking software?',
    answer:
      'Tool tracking software assigns tools to people or locations and records transfers so you always know who has what.',
  },
  {
    question: 'Does tool tracking work without GPS?',
    answer:
      'Yes. Smarter Tracks uses assignments and scans to show custody and location without GPS hardware.',
  },
  {
    question: 'Can crews check tools in and out from a phone?',
    answer:
      'Yes. Techs can scan barcodes or QR codes to record checkouts and returns from any phone.',
  },
  {
    question: 'How fast can we get started?',
    answer:
      'Most teams can label tools and start tracking the same day.',
  },
  {
    question: 'Is there a built-in tool checkout system?',
    answer:
      'Yes. Every checkout is logged with a time and user so accountability is clear.',
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
  useEffect(() => {
    setPageMeta({
      title: 'Tool Tracking Software for HVAC & Contractors | Smarter Tracks',
      description:
        'Simple mobile tool tracking app for HVAC, construction, and trades. Assign tools, prevent losses, run audits, and keep teams accountable.',
      canonicalPath: '/tool-tracking-software',
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <MarketingHeader />

      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Tool tracking software for HVAC, construction, and trades
            </p>
            <h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Tool Tracking Software That Stops Lost Tools.
            </h2>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Trades teams lose real money to misplaced tools and verbal checkouts. Smarter Tracks is a
              simple, mobile-first tool tracking app that shows who has what, where it is, and when it
              is due back.
            </p>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
              No more lost tools. No more finger-pointing. Just real accountability.
            </p>
            <div className="mt-10 flex justify-center space-x-6">
              <Link
                to="/#pricing"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg"
              >
                Start a free trial
              </Link>
              <Link
                to="/#contact"
                className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-lg text-lg font-semibold border border-gray-300 transition-colors shadow-lg"
              >
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">
              Why tool tracking matters
            </h3>
            <p className="mt-4 text-lg text-gray-600">
              Lost tools add up quickly when crews move between jobsites and trucks.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">For HVAC teams</h4>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>✓ Gauges, drills, vac pumps, and meters left behind</li>
                <li>✓ Tools lost between jobsites and trucks</li>
                <li>✓ Replacements purchased 3 to 5 times too often</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">For construction crews</h4>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>✓ Shared tools move job to job with no owner</li>
                <li>✓ High-value items vanish without notice</li>
                <li>✓ Foremen lose time tracking down missing gear</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 rounded-2xl bg-blue-50 p-8 text-center">
            <p className="text-lg font-semibold text-blue-700">
              A tool tracking system fixes this in one workflow: assign, track, audit, and hold teams
              accountable.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">What is a tool tracking app?</h3>
            <p className="mt-4 text-lg text-gray-600">
              A tool tracking app helps you assign tools, scan them in and out, and see tool
              locations across jobsites in real time.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Assign and scan tools</h4>
              <p className="mt-3 text-gray-600">
                Check tools out to techs, crews, vehicles, or jobsites with barcodes or QR codes.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Track history</h4>
              <p className="mt-3 text-gray-600">
                See who had each tool, when it moved, and its last known jobsite or condition.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Audit fast</h4>
              <p className="mt-3 text-gray-600">
                Run quick audits from a phone and flag missing items before they disappear.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">
              Smarter Tracks is built for trades teams
            </h3>
            <p className="mt-4 text-lg text-gray-600">
              It is not a bloated enterprise asset manager. It is the clean, fast workflow crews
              actually use.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Key features</h4>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li>✓ Instant tool assignments to techs, crews, vans, or jobsites</li>
                <li>✓ Barcode and QR code scanning with any phone</li>
                <li>✓ Tool history with notes, conditions, and photos</li>
                <li>✓ Overdue and missing tool alerts</li>
                <li>✓ Inventory by job, technician, or vehicle</li>
                <li>✓ Simple, mobile-friendly design</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Who uses Smarter Tracks</h4>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li>✓ Commercial and residential HVAC companies</li>
                <li>✓ General contractors and construction teams</li>
                <li>✓ Electrical, plumbing, and mechanical crews</li>
                <li>✓ Warehouse and operations managers</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">Real ROI from tool tracking</h3>
            <p className="mt-4 text-lg text-gray-600">
              Most teams break even quickly by reducing tool loss and duplicate purchases.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Small shops
              </p>
              <p className="mt-3 text-3xl font-extrabold text-gray-900">$5,000–$20,000</p>
              <p className="mt-2 text-gray-600">Typical annual savings</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Medium shops
              </p>
              <p className="mt-3 text-3xl font-extrabold text-gray-900">$20,000–$75,000</p>
              <p className="mt-2 text-gray-600">Typical annual savings</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Large teams
              </p>
              <p className="mt-3 text-3xl font-extrabold text-gray-900">$100,000+</p>
              <p className="mt-2 text-gray-600">Typical annual savings</p>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-600">
            Fewer lost tools, fewer duplicate purchases, and fewer delays add up fast.
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">FAQ</h3>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.question} className="rounded-2xl bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900">{item.question}</h4>
                <p className="mt-3 text-gray-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900">Explore tool tracking by trade</h3>
            <p className="mt-3 text-gray-600">
              Looking for a page tailored to your team? Start here.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
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

      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-extrabold text-white">
            Ready to stop losing tools?
          </h3>
          <p className="mt-4 text-xl text-blue-100">
            Track tools in under an hour and keep every crew accountable.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/#pricing"
              className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg inline-flex items-center justify-center"
            >
              Start your free trial
            </Link>
            <Link
              to="/#contact"
              className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg inline-flex items-center justify-center"
            >
              Schedule a demo
            </Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  )
}
