import { Link } from 'react-router-dom'

type PricingSectionProps = {
  billingCycle: 'monthly' | 'annual'
  onBillingCycleChange: (cycle: 'monthly' | 'annual') => void
}

export default function PricingSection({ billingCycle, onBillingCycleChange }: PricingSectionProps) {
  const priceLabel = 'per month'
  const starterAnnualMonthly = 185
  const proAnnualMonthly = 315
  const starterSavings = 'save 7.5%'
  const proSavings = 'save 10%'

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h3 className="text-4xl font-extrabold text-gray-900">Choose the plan that is right for you</h3>
          <p className="mt-4 text-lg text-gray-600">Start free, then upgrade when your team grows.</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => onBillingCycleChange('monthly')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                billingCycle === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onBillingCycleChange('annual')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                billingCycle === 'annual' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Annual
            </button>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Save with annual
            </span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h4 className="mt-2 text-2xl font-semibold text-gray-900">Free Trial</h4>
            <p className="mt-2 text-gray-600">For teams who want to try it out</p>
            <div className="mt-6 text-4xl font-extrabold text-gray-900">$0</div>
            <p className="text-gray-500">Get started instantly</p>
            <Link
              to="/get-started?plan=trial"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
            >
              Get started
            </Link>
            <ul className="mt-6 space-y-2 text-sm text-gray-600">
              <li>✓ 3 users</li>
              <li>✓ 5 tools</li>
              <li>✓ Full tool tracking</li>
              <li>✓ Transfers & history</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h4 className="mt-2 text-2xl font-semibold text-gray-900">Starter</h4>
            <p className="mt-2 text-gray-600">For small teams getting organized</p>
            <div className="mt-6 text-4xl font-extrabold text-gray-900">
              ${billingCycle === 'annual' ? starterAnnualMonthly : '200'}
              <span className="text-base font-semibold text-gray-500">/{priceLabel}</span>
            </div>
            <p className="text-gray-500">
              {billingCycle === 'annual'
                ? '$2,220 billed yearly'
                : '15 users • 150 tools'}
            </p>
            {billingCycle === 'annual' && (
              <p className="text-sm text-green-700 font-semibold">{starterSavings}</p>
            )}
            <Link
              to={`/get-started?plan=tier2&billing=${billingCycle}`}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
            >
              Buy now
            </Link>
            <ul className="mt-6 space-y-2 text-sm text-gray-600">
              <li>✓ 15 users</li>
              <li>✓ 150 tools</li>
              <li>✓ Tool transfer history</li>
              <li>✓ Photos on tools</li>
              <li>✓ Damaged tool reporting</li>
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-blue-600 bg-white p-8 shadow-lg">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
              <span className="rounded-full border border-blue-200 px-2 py-0.5 text-xs">
                Best value
              </span>
              <span className="rounded-full border border-blue-200 px-2 py-0.5 text-xs">
                Most popular
              </span>
            </div>
            <h4 className="mt-2 text-2xl font-semibold text-gray-900">Pro</h4>
            <p className="mt-2 text-gray-600">For growing teams with more tools</p>
            <div className="mt-6 text-4xl font-extrabold text-gray-900">
              ${billingCycle === 'annual' ? proAnnualMonthly : '350'}
              <span className="text-base font-semibold text-gray-500">/{priceLabel}</span>
            </div>
            <p className="text-gray-500">
              {billingCycle === 'annual'
                ? '$3,780 billed yearly'
                : '75 users • 750 tools'}
            </p>
            {billingCycle === 'annual' && (
              <p className="text-sm text-green-700 font-semibold">{proSavings}</p>
            )}
            <Link
              to={`/get-started?plan=tier3&billing=${billingCycle}`}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
            >
              Buy now
            </Link>
            <ul className="mt-6 space-y-2 text-sm text-gray-600">
              <li>✓ 75 users</li>
              <li>✓ 750 tools</li>
              <li>✓ Tool transfer history</li>
              <li>✓ Photos on tools</li>
              <li>✓ Damaged tool reporting</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h4 className="mt-2 text-2xl font-semibold text-gray-900">Custom</h4>
            <p className="mt-2 text-gray-600">For large teams and custom needs</p>
            <div className="mt-6 text-4xl font-extrabold text-gray-900">Let’s talk</div>
            <p className="text-gray-500">Custom limits and billing</p>
            <a
              href="mailto:brockcoburn@smartertracks.com"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
            >
              Schedule a demo
            </a>
            <ul className="mt-6 space-y-2 text-sm text-gray-600">
              <li>✓ Custom limits & onboarding</li>
              <li>✓ Dedicated support</li>
              <li>✓ Custom integrations</li>
              <li>✓ Annual invoicing</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
