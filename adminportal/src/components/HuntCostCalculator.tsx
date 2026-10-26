import { useRef, useState } from 'react'
import { trackEvent } from '../lib/analytics'
import { formatDollars, MARKETING_PLANS } from '../lib/marketingPlans'

const STARTER_MONTHLY = MARKETING_PLANS.starter.annualMonthly

const DEFAULTS = {
  people: 3,
  hourlyCost: 30,
}

export default function HuntCostCalculator() {
  const [people, setPeople] = useState(DEFAULTS.people)
  const [hourlyCost, setHourlyCost] = useState(DEFAULTS.hourlyCost)
  const used = useRef(false)

  function markUsed() {
    if (used.current) return
    used.current = true
    try {
      if (sessionStorage.getItem('st_calculator_used') === '1') return
      sessionStorage.setItem('st_calculator_used', '1')
    } catch {
      /* storage unavailable */
    }
    trackEvent('calculator_used', {
      page: window.location.pathname,
      section: 'calculator',
    })
  }

  const perHour = Math.round(people * hourlyCost)
  const monthly = perHour * 4
  const greatFit = Number.isFinite(monthly) && monthly >= STARTER_MONTHLY

  return (
    <section id="calculator" className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">What Does a Waiting Crew Cost?</h2>
          <p className="mt-3 text-lg text-gray-600 max-w-3xl mx-auto">
            Three people at $30 an hour is $90 an hour standing around. The guys in the field, the warehouse, a driver, a project manager. Same hour.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-8 space-y-8">
            <SliderField
              id="hunt-people"
              label="People waiting on the tool"
              min={1}
              max={20}
              step={1}
              value={people}
              display={String(people)}
              onChange={(value) => {
                markUsed()
                setPeople(value)
              }}
            />
            <SliderField
              id="hunt-hourly"
              label="What one hour of their time costs you"
              min={15}
              max={150}
              step={5}
              value={hourlyCost}
              display={formatDollars(hourlyCost)}
              onChange={(value) => {
                markUsed()
                setHourlyCost(value)
              }}
            />
            <p className="text-sm text-gray-500">
              One hour, once a week. Wages only. This leaves out the tool you buy again, the drive back to the shop, and the job that slips.
            </p>
          </div>

          <div
            className={`rounded-2xl border p-6 sm:p-8 text-center flex flex-col items-center justify-center ${
              greatFit ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
            }`}
          >
            <p className={`text-5xl font-extrabold ${greatFit ? 'text-green-800' : 'text-gray-900'}`}>
              {formatDollars(perHour)}
            </p>
            <p className={`mt-2 text-lg font-medium ${greatFit ? 'text-green-900' : 'text-gray-700'}`}>an hour while they wait</p>
            <p className={`mt-6 text-xl ${greatFit ? 'text-green-900' : 'text-gray-800'}`}>
              Once a week, that's about {formatDollars(monthly)} a month.
            </p>
            {greatFit ? (
              <>
                <p className="mt-6 text-3xl font-extrabold text-green-800">This should be a great fit.</p>
                <p className="mt-2 text-2xl leading-none text-green-700" aria-label="5 stars">
                  ★★★★★
                </p>
                <p className="mt-4 text-base text-green-900">
                  Smarter Tracks Starter is {formatDollars(STARTER_MONTHLY)} a month.
                </p>
              </>
            ) : null}
            <p className="mt-4 text-sm text-gray-600">If it doesn't pay for itself, you have 90 days to get every dollar back.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function SliderField({
  id,
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
}: {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  display: string
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-base font-medium text-gray-900">
          {label}
        </label>
        <output htmlFor={id} className="shrink-0 text-xl font-semibold text-gray-900">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-blue-600"
      />
    </div>
  )
}
