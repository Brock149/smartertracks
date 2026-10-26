export type BillingCycle = 'monthly' | 'annual'
export type PaidPlanKey = 'starter' | 'pro'
export type CrewPlan = PaidPlanKey | 'custom'

export const MARKETING_PLANS = {
  starter: {
    id: 'tier2',
    name: 'Starter',
    monthly: 200,
    annualMonthly: 185,
    annualTotal: 2220,
    users: 15,
    tools: 150,
    savings: 'save 7.5%',
  },
  pro: {
    id: 'tier3',
    name: 'Pro',
    monthly: 350,
    annualMonthly: 315,
    annualTotal: 3780,
    users: 75,
    tools: 750,
    savings: 'save 10%',
  },
} as const

export function monthlyPrice(plan: PaidPlanKey, cycle: BillingCycle): number {
  const details = MARKETING_PLANS[plan]
  return cycle === 'annual' ? details.annualMonthly : details.monthly
}

export function signupHref(plan: PaidPlanKey, cycle: BillingCycle): string {
  return `/get-started?plan=${MARKETING_PLANS[plan].id}&billing=${cycle}`
}

export function planForCrewSize(techs: number): CrewPlan {
  if (techs <= MARKETING_PLANS.starter.users) return 'starter'
  if (techs <= MARKETING_PLANS.pro.users) return 'pro'
  return 'custom'
}

export function formatDollars(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(safe)
}

export type HuntCostInput = {
  techs: number
  minutesPerDay: number
  hourlyCost: number
  rebuys: number
  avgToolCost: number
}

export type HuntCostResult = {
  crewTimeMonthly: number
  toolsYearly: number
  totalMonthly: number
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export function huntCost(input: HuntCostInput): HuntCostResult {
  const techs = clamp(input.techs, 1, 75, 5)
  const minutesPerDay = clamp(input.minutesPerDay, 0, 90, 15)
  const hourlyCost = clamp(input.hourlyCost, 20, 150, 45)
  const rebuys = clamp(input.rebuys, 0, 50, 3)
  const avgToolCost = clamp(input.avgToolCost, 25, 2000, 150)

  const crewTimeMonthly = techs * (minutesPerDay / 60) * hourlyCost * 21
  const toolsYearly = rebuys * avgToolCost
  const totalMonthly = crewTimeMonthly + toolsYearly / 12

  return {
    crewTimeMonthly: Math.round(crewTimeMonthly),
    toolsYearly: Math.round(toolsYearly),
    totalMonthly: Math.round(totalMonthly),
  }
}
