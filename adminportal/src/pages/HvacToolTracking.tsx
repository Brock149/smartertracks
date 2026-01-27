import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'

const faqItems = [
  {
    question: 'What is an HVAC tool tracking app?',
    answer:
      'An HVAC tool tracking app assigns tools to techs, trucks, or jobsites and records transfers so tools do not go missing.',
  },
  {
    question: 'Can we track shared shop tools?',
    answer:
      'Yes. Smarter Tracks is built for shared shop tools like recovery machines, vac pumps, and gauges.',
  },
  {
    question: 'How do HVAC techs use it in the field?',
    answer:
      'Techs scan barcodes or QR codes from a phone to check tools in and out.',
  },
  {
    question: 'How fast can we set it up?',
    answer:
      'Most HVAC teams label tools and start tracking in an afternoon.',
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

export default function HvacToolTracking() {
  useEffect(() => {
    setPageMeta({
      title: 'HVAC Tool Tracking App | Smarter Tracks',
      description:
        'HVAC tool tracking app built for real shop and field workflows. Assign tools, track locations, run audits, and keep techs accountable.',
      canonicalPath: '/hvac-tool-tracking',
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
              HVAC tool tracking app
            </p>
            <h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Stop losing HVAC tools and keep techs accountable.
            </h2>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              HVAC teams lose thousands each year to misplaced gauges, meters, vac pumps, and shop
              tools. Smarter Tracks makes your inventory visible, assigned, and easy to audit.
            </p>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
              Simple. Fast. Built for real HVAC workflows.
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
                Book a live demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">
              The pain every HVAC manager knows
            </h3>
            <p className="mt-4 text-lg text-gray-600">
              Tools disappear when nobody is accountable. That is what Smarter Tracks fixes.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Common losses</h4>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>✓ Gauges, drills, meters, vac pumps, and torches</li>
                <li>✓ Missing between trucks, shops, and jobsites</li>
                <li>✓ Duplicate purchases because no one knows who had it</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Real accountability</h4>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>✓ Assign tools to techs, vans, or jobsites</li>
                <li>✓ See who last had each item</li>
                <li>✓ Run fast audits before tools disappear</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">
              What an HVAC tool tracking app does
            </h3>
            <p className="mt-4 text-lg text-gray-600">
              Track tools in real time without the cost of GPS.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Assign and scan</h4>
              <p className="mt-3 text-gray-600">
                Label tools with barcodes or QR codes and assign them in seconds.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Track location</h4>
              <p className="mt-3 text-gray-600">
                See where tools are across trucks, jobsites, and shop inventory.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Audit fast</h4>
              <p className="mt-3 text-gray-600">
                Identify missing items before they turn into costly replacements.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">
              Built for HVAC, not generic construction
            </h3>
            <p className="mt-4 text-lg text-gray-600">
              Smarter Tracks fits the way HVAC teams actually work.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">HVAC workflows</h4>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li>✓ Assign tools to trucks and standard kits</li>
                <li>✓ Track shared shop tools like recovery machines</li>
                <li>✓ Jobsite-based tool tracking for multi-day work</li>
                <li>✓ Photos, serial numbers, and notes for warranties</li>
                <li>✓ Usage history for each tech and tool</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Most-lost HVAC tools</h4>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li>✓ Refrigerant gauges and probe systems</li>
                <li>✓ Impact guns and drill kits</li>
                <li>✓ Vacuum pumps and recovery machines</li>
                <li>✓ Meters, analyzers, and specialty hand tools</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">
              Why HVAC teams choose Smarter Tracks
            </h3>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Purpose-built</h4>
              <p className="mt-3 text-gray-600">
                Designed for HVAC workflows, not enterprise asset management.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Mobile-first</h4>
              <p className="mt-3 text-gray-600">
                Techs learn it instantly without training.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">Fast setup</h4>
              <p className="mt-3 text-gray-600">
                Get your entire inventory in within an afternoon.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">HVAC ROI</h3>
            <p className="mt-4 text-lg text-gray-600">
              Most HVAC teams report a major drop in missing tools and wasted time.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-gray-900">70–90%</p>
              <p className="mt-2 text-gray-600">Fewer missing tools</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-gray-900">$5,000–$20,000</p>
              <p className="mt-2 text-gray-600">Saved in the first year</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-gray-900">Less downtime</p>
              <p className="mt-2 text-gray-600">Fewer emergency tool runs</p>
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

      <section className="py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900">Related tool tracking pages</h3>
            <p className="mt-3 text-gray-600">
              See the general overview or the construction-focused page.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                to="/tool-tracking-software"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Tool Tracking Software
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
            Try HVAC tool tracking that actually works.
          </h3>
          <p className="mt-4 text-xl text-blue-100">
            Stop rebuying the same drill kits and start tracking the smart way.
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
              Book a live demo
            </Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  )
}
