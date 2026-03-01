import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'
import DemoVideoSection from '../components/DemoVideoSection'
import PricingSection from '../components/PricingSection'

const faqItems = [
  {
    question: 'What is a tool checkout system?',
    answer:
      'A tool checkout system assigns tools to a person, crew, or vehicle and records checkouts and returns so nothing goes missing.',
  },
  {
    question: 'Can techs check tools in and out from a phone?',
    answer:
      'Yes. Smarter Tracks lets crews scan barcodes or QR codes to check tools in and out from any phone.',
  },
  {
    question: 'How does it help with accountability?',
    answer:
      'Every checkout creates a record of who had the tool and when, so teams can resolve issues quickly.',
  },
  {
    question: 'Does it work across multiple jobsites?',
    answer:
      'Yes. You can assign tools to jobsites, vehicles, and crews, then audit inventory by location.',
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  useEffect(() => {
    setPageMeta({
      title: 'Tool Checkout System for Field Teams | Smarter Tracks',
      description:
        'Tool checkout system for contractors and field crews. Assign tools, scan checkouts, and track returns across jobsites.',
      canonicalPath: '/tool-checkout-system',
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
              Tool checkout system
            </p>
            <h1 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Check tools out with accountability built in.
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Smarter Tracks is a tool checkout system that records every handoff. Assign tools to
              techs, scan checkouts, and track returns so tools stop disappearing.
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

      <DemoVideoSection />
      <PricingSection billingCycle={billingCycle} onBillingCycleChange={setBillingCycle} />

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Assign custody</h3>
              <p className="mt-3 text-gray-600">
                Check tools out to a tech, crew, or vehicle so ownership is always clear.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Scan in seconds</h3>
              <p className="mt-3 text-gray-600">
                Use barcodes or QR codes to record checkouts and returns instantly.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Audit returns</h3>
              <p className="mt-3 text-gray-600">
                See overdue items and resolve missing tools before they turn into losses.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">FAQ</h2>
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
            <h3 className="text-2xl font-bold text-gray-900">Related tool tracking pages</h3>
            <p className="mt-3 text-gray-600">
              Explore other pages in the tool tracking cluster.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                to="/tool-tracking-software"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Tool Tracking Software
              </Link>
              <Link
                to="/tool-inventory-software"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Tool Inventory Software
              </Link>
              <Link
                to="/hvac-tool-tracking"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                HVAC Tool Tracking
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            A tool checkout system that crews will actually use.
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Track checkouts, keep tools accountable, and reduce loss fast.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/#pricing"
              className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg inline-flex items-center justify-center"
            >
              Start a free trial
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
