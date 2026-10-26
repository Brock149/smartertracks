import { useState } from 'react'
import { trackEvent } from '../lib/analytics'
import {
  MARKETING_PLANS,
  monthlyPrice,
  type BillingCycle,
} from '../lib/marketingPlans'

type PricingSectionProps = {
  billingCycle?: BillingCycle
  onBillingCycleChange?: (cycle: BillingCycle) => void
}

export default function PricingSection({ billingCycle: billingCycleProp, onBillingCycleChange }: PricingSectionProps) {
  const [internalCycle, setInternalCycle] = useState<BillingCycle>('annual')
  const billingCycle = billingCycleProp ?? internalCycle

  function setBillingCycle(cycle: BillingCycle) {
    if (billingCycleProp === undefined) setInternalCycle(cycle)
    onBillingCycleChange?.(cycle)
  }

  return (
    <section id="pricing" className="py-12 bg-gradient-to-br from-gray-50 to-blue-50 scroll-mt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900">Simple Pricing. Zero Risk.</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Flat monthly price for your whole team. No per-user charges. Use it for 90 days. If it's not worth it, get every dollar back.
          </p>
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white p-1 shadow-md">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                billingCycle === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-gray-500'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                billingCycle === 'annual' ? 'bg-blue-600 text-white shadow' : 'text-gray-500'
              }`}
            >
              Annual
            </button>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Save up to 10%
            </span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <PlanCard
            name="Starter"
            description="For small teams getting organized"
            price={monthlyPrice('starter', billingCycle)}
            detail={
              billingCycle === 'annual'
                ? `$${MARKETING_PLANS.starter.annualTotal.toLocaleString('en-US')} billed yearly`
                : `${MARKETING_PLANS.starter.users} users • ${MARKETING_PLANS.starter.tools} tools`
            }
            savings={billingCycle === 'annual' ? MARKETING_PLANS.starter.savings : undefined}
            features={[
              `${MARKETING_PLANS.starter.users} users`,
              `${MARKETING_PLANS.starter.tools} tools`,
              'Tool transfer history',
              'Photos on tools',
              'Damaged tool reporting',
            ]}
          />
          <PlanCard
            name="Pro"
            description="For growing teams with more tools"
            price={monthlyPrice('pro', billingCycle)}
            detail={
              billingCycle === 'annual'
                ? `$${MARKETING_PLANS.pro.annualTotal.toLocaleString('en-US')} billed yearly`
                : `${MARKETING_PLANS.pro.users} users • ${MARKETING_PLANS.pro.tools} tools`
            }
            savings={billingCycle === 'annual' ? MARKETING_PLANS.pro.savings : undefined}
            popular
            features={[
              `${MARKETING_PLANS.pro.users} users`,
              `${MARKETING_PLANS.pro.tools} tools`,
              'Tool transfer history',
              'Photos on tools',
              'Damaged tool reporting',
            ]}
          />
          <PlanCard
            name="Custom"
            description="For large teams and custom needs"
            customLabel="Let's talk"
            detail="Custom limits and billing"
            features={[
              'Custom limits and onboarding',
              'Dedicated support',
              'Custom integrations',
              'Annual invoicing',
            ]}
          />
        </div>

        <div className="mt-10 rounded-2xl border border-blue-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <svg className="h-10 w-10 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">The 90-Day Money-Back Guarantee</h3>
              <p className="mt-2 text-gray-700">
                Use Smarter Tracks with your whole crew for 90 days. If it's not worth it for any reason, email{' '}
                <a href="mailto:brockcoburn@smartertracks.com" className="text-blue-600 hover:text-blue-700 font-semibold">
                  brockcoburn@smartertracks.com
                </a>{' '}
                and we'll refund every dollar. No questions asked.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-lg text-gray-600">
          Not sure which plan fits?{' '}
          <a
            href="#book-demo"
            className="text-blue-600 hover:text-blue-700 font-semibold"
            onClick={() => trackEvent('cta_chat_click', { page: window.location.pathname, section: 'pricing' })}
          >
            Book a 15-minute chat
          </a>{' '}
          and we'll figure it out together.
        </p>
        <p className="mt-4 text-center text-sm font-medium text-gray-600">
          90-day money-back guarantee · Cancel anytime · No long-term contracts
        </p>
      </div>
    </section>
  )
}

function PlanCard({
  name,
  description,
  price,
  customLabel,
  detail,
  savings,
  popular,
  features,
}: {
  name: string
  description: string
  price?: number
  customLabel?: string
  detail: string
  savings?: string
  popular?: boolean
  features: string[]
}) {
  return (
    <div className={`rounded-2xl bg-white p-8 shadow-sm ${popular ? 'border-4 border-blue-600 shadow-xl relative' : 'border border-gray-200'}`}>
      {popular ? (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
          Most Popular
        </div>
      ) : null}
      <h3 className="mt-2 text-2xl font-semibold text-gray-900">{name}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
      <div className="mt-6 text-4xl font-extrabold text-gray-900">
        {customLabel ?? (
          <>
            ${price}
            <span className="text-base font-semibold text-gray-500">/month</span>
          </>
        )}
      </div>
      <p className="text-gray-500">{detail}</p>
      {savings ? <p className="text-sm text-green-700 font-semibold">{savings}</p> : null}
      <ul className="mt-6 space-y-2 text-sm text-gray-600">
        {features.map((feature) => (
          <li key={feature}>&#10003; {feature}</li>
        ))}
      </ul>
    </div>
  )
}
