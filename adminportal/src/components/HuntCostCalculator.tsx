import { useRef, useState } from 'react'
import { trackEvent } from '../lib/analytics'
import {
  formatDollars,
  huntCost,
  monthlyPrice,
  planForCrewSize,
  type BillingCycle,
} from '../lib/marketingPlans'

type HuntCostCalculatorProps = {
  billingCycle: BillingCycle
}

const DEFAULTS = {
  techs: 5,
  minutesPerDay: 15,
  hourlyCost: 45,
  rebuys: 3,
  avgToolCost: 150,
}

export default function HuntCostCalculator({ billingCycle }: HuntCostCalculatorProps) {
  const [techs, setTechs] = useState(DEFAULTS.techs)
  const [minutesPerDay, setMinutesPerDay] = useState(DEFAULTS.minutesPerDay)
  const [hourlyCost, setHourlyCost] = useState(DEFAULTS.hourlyCost)
  const [rebuys, setRebuys] = useState(DEFAULTS.rebuys)
  const [avgToolCost, setAvgToolCost] = useState(DEFAULTS.avgToolCost)
  const [avgInput, setAvgInput] = useState(String(DEFAULTS.avgToolCost))
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

  const result = huntCost({ techs, minutesPerDay, hourlyCost, rebuys, avgToolCost })
  const plan = planForCrewSize(techs)
  const comparison =
    plan === 'custom'
      ? 'Talk to us about a Custom plan.'
      : `Smarter Tracks ${plan === 'starter' ? 'Starter' : 'Pro'} is ${formatDollars(monthlyPrice(plan, billingCycle))} a month.`

  return (
    <section id="calculator" className="py-12 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">What Is the Hunt Costing You?</h2>
          <p className="mt-4 text-lg text-gray-600">
            Use your own numbers. Nothing here is our estimate. The starting numbers are placeholders, so move the sliders to match your crew.
          </p>
        </div>

        <div className="mt-10 space-y-6 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-8">
          <SliderField
            id="hunt-techs"
            label="How many techs or crew members use tools?"
            min={1}
            max={75}
            step={1}
            value={techs}
            display={String(techs)}
            onChange={(value) => {
              markUsed()
              setTechs(value)
            }}
          />
          <SliderField
            id="hunt-minutes"
            label="Minutes a day each one loses hunting for a tool or waiting on one"
            min={0}
            max={90}
            step={5}
            value={minutesPerDay}
            display={String(minutesPerDay)}
            onChange={(value) => {
              markUsed()
              setMinutesPerDay(value)
            }}
          />
          <SliderField
            id="hunt-hourly"
            label="What an hour of their time costs you (wages plus truck and overhead)"
            min={20}
            max={150}
            step={5}
            value={hourlyCost}
            display={formatDollars(hourlyCost)}
            onChange={(value) => {
              markUsed()
              setHourlyCost(value)
            }}
          />
          <SliderField
            id="hunt-rebuys"
            label="Tools you re-buy in a year because you couldn't find the first one"
            min={0}
            max={50}
            step={1}
            value={rebuys}
            display={String(rebuys)}
            onChange={(value) => {
              markUsed()
              setRebuys(value)
            }}
          />

          <div>
            <label htmlFor="hunt-tool-cost" className="block text-sm font-medium text-gray-900">
              Average cost of those tools
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900" aria-hidden="true">$</span>
              <input
                id="hunt-tool-cost"
                type="number"
                inputMode="numeric"
                min={25}
                max={2000}
                step={1}
                value={avgInput}
                onChange={(event) => {
                  markUsed()
                  const raw = event.target.value
                  setAvgInput(raw)
                  const parsed = Number(raw)
                  if (Number.isFinite(parsed)) {
                    setAvgToolCost(Math.min(2000, Math.max(25, parsed)))
                  }
                }}
                onBlur={() => {
                  const parsed = Number(avgInput)
                  const next = Number.isFinite(parsed) ? Math.min(2000, Math.max(25, parsed)) : DEFAULTS.avgToolCost
                  setAvgToolCost(next)
                  setAvgInput(String(next))
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-lg font-semibold text-gray-900"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xl text-gray-900">
            Lost crew time: <span className="font-extrabold">{formatDollars(result.crewTimeMonthly)} a month</span>
          </p>
          <p className="mt-2 text-xl text-gray-900">
            Tools bought twice: <span className="font-extrabold">{formatDollars(result.toolsYearly)} a year</span>
          </p>
          <p className="mt-4 text-3xl font-extrabold text-gray-900">
            Total: {formatDollars(result.totalMonthly)} a month
          </p>
          <p className="mt-4 text-lg text-gray-700">{comparison}</p>
          <p className="mt-3 text-base font-medium text-gray-900">
            If it doesn't pay for itself, you have 90 days to get every dollar back.
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Estimate based on the numbers you entered. Actual results depend on your crew.
        </p>
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
        <label htmlFor={id} className="text-sm font-medium text-gray-900">
          {label}
        </label>
        <output htmlFor={id} className="shrink-0 text-lg font-semibold text-gray-900">
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
