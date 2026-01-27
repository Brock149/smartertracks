import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'

const faqItems = [
  {
    question: 'What is tool inventory software?',
    answer:
      'Tool inventory software tracks tools, locations, and assigned users in one system. It replaces spreadsheets with live custody, history, and audits.',
  },
  {
    question: 'How does tool inventory software reduce loss?',
    answer:
      'It assigns tools to techs or crews, records transfers, and highlights missing items early so tools do not disappear between jobsites.',
  },
  {
    question: 'Can crews use it from the field?',
    answer:
      'Yes. Smarter Tracks is mobile-first, so techs can scan tools, check them in or out, and complete audits from a phone.',
  },
  {
    question: 'Does it work for HVAC and construction teams?',
    answer:
      'Yes. Smarter Tracks supports HVAC, construction, electrical, and plumbing workflows with jobsite and vehicle assignments.',
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
  useEffect(() => {
    setPageMeta({
      title: 'Tool Inventory Software for Field Teams | Smarter Tracks',
      description:
        'Tool inventory software for HVAC, construction, and trades. Track tools, assign custody, run audits, and keep inventory accurate.',
      canonicalPath: '/tool-inventory-software',
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
              Tool inventory software
            </p>
            <h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Know exactly what tools you own and where they are.
            </h2>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Smarter Tracks is tool inventory software for field teams. Assign tools to techs,
              track custody, and run fast audits so you stop rebuying the same gear.
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Live inventory by location</h3>
              <p className="mt-3 text-gray-600">
                Track tools by jobsite, vehicle, or warehouse so you know what is on hand before the
                day starts.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Custody and history</h3>
              <p className="mt-3 text-gray-600">
                Every transfer creates a record so you can see who had each tool and when it moved.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Fast audits</h3>
              <p className="mt-3 text-gray-600">
                Audit inventory in minutes from a phone and catch missing items early.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
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
            <h3 className="text-2xl font-bold text-gray-900">Related tool tracking pages</h3>
            <p className="mt-3 text-gray-600">
              Explore pages tailored to your trade or workflow.
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
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-extrabold text-white">
            Tool inventory software your crews will actually use.
          </h3>
          <p className="mt-4 text-xl text-blue-100">
            Start tracking today and stop losing tools to guesswork.
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
