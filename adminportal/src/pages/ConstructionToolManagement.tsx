import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'

const faqItems = [
  {
    question: 'What is construction tool tracking software?',
    answer:
      'Construction tool tracking software assigns tools to crews, jobsites, or vehicles and records transfers so tools stay accountable.',
  },
  {
    question: 'How does it help with jobsite loss?',
    answer:
      'It records custody and makes audits fast, so missing tools are found before they disappear.',
  },
  {
    question: 'Can foremen use it in the field?',
    answer:
      'Yes. Crews can scan tools with a phone to check them in and out.',
  },
  {
    question: 'Does it work for multiple jobsites?',
    answer:
      'Yes. You can assign tools to jobsites and track inventory by location.',
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
  useEffect(() => {
    setPageMeta({
      title: 'Construction Tool Tracking Software | Smarter Tracks',
      description:
        'Construction tool tracking software for contractors. Track tools across jobsites, assign custody, run audits, and reduce tool loss.',
      canonicalPath: '/construction-tool-management',
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
              Construction tool tracking software
            </p>
            <h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Keep construction tools accountable on every jobsite.
            </h2>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Smarter Tracks is construction tool tracking software built for contractors and field
              crews. Track tools across jobsites, assign custody, and run fast audits without the
              spreadsheets.
            </p>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
              Less time searching. Fewer missing tools. More jobs completed on schedule.
            </p>
            <div className="mt-10 flex justify-center space-x-6">
              <Link
                to="/#pricing"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg"
              >
                Try it for free
              </Link>
              <Link
                to="/#contact"
                className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-lg text-lg font-semibold border border-gray-300 transition-colors shadow-lg"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">
              Why construction teams lose tools
            </h3>
            <p className="mt-4 text-lg text-gray-600">
              Shared tools move between crews, trucks, and jobsites without clear ownership.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Common jobsite problems</h4>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>✓ No clear assignment or custody</li>
                <li>✓ Tools left behind at multi-day sites</li>
                <li>✓ Duplicate purchases to replace missing gear</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">What fixes it</h4>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>✓ Assign tools to crews, vehicles, or jobsites</li>
                <li>✓ Scan tools in and out with phones</li>
                <li>✓ Run audits before tools disappear</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">
              Construction tool tracking built for the field
            </h3>
            <p className="mt-4 text-lg text-gray-600">
              Smarter Tracks keeps every tool accountable without slowing crews down.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Jobsite visibility</h4>
              <p className="mt-3 text-gray-600">
                Know what tools are on each site before crews roll out.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Accountability</h4>
              <p className="mt-3 text-gray-600">
                See who last had each tool and when it moved.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Maintenance tracking</h4>
              <p className="mt-3 text-gray-600">
                Log damage, schedule inspections, and keep tools in service.
              </p>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Built for contractors</h4>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li>✓ Track tools across multiple job sites</li>
                <li>✓ Photos, serials, and asset tags</li>
                <li>✓ Fast audits and exportable reports</li>
                <li>✓ Mobile-friendly for field teams</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Simple for crews</h4>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li>✓ Clear tool ownership and transfers</li>
                <li>✓ Instant access with company codes</li>
                <li>✓ Streamlined onboarding and permissions</li>
                <li>✓ Scales with any company size</li>
              </ul>
            </div>
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
            <h3 className="text-2xl font-bold text-gray-900">Related tool tracking pages</h3>
            <p className="mt-3 text-gray-600">
              Explore pages tailored to your trade.
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

      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-extrabold text-white">
            Construction tool tracking that keeps crews productive.
          </h3>
          <p className="mt-4 text-xl text-blue-100">
            Track tools, reduce losses, and keep projects moving with Smarter Tracks.
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
