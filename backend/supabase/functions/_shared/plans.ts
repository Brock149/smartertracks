export type PlanId = 'trial' | 'tier2' | 'tier3' | 'custom'
export type BillingCycle = 'monthly' | 'annual'
export type EnforcementMode = 'off' | 'observe' | 'enforce'

export interface PlanDefinition {
  id: PlanId
  name: string
  priceMonthly: number | null
  priceAnnual: number | null
  stripePriceMonthly: string | null
  stripePriceAnnual: string | null
  userLimit: number | null
  toolLimit: number | null
  enforcementMode: EnforcementMode
  billingCycle: BillingCycle | null
  trialLengthDays: number | null
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: 'trial',
    name: 'Trial (3 users / 5 tools)',
    priceMonthly: 0,
    priceAnnual: 0,
    stripePriceMonthly: null,
    stripePriceAnnual: null,
    userLimit: 3,
    toolLimit: 5,
    enforcementMode: 'enforce',
    billingCycle: null,
    trialLengthDays: null,
  },
  {
    id: 'tier2',
    name: 'Tier 2 (15 users / 150 tools)',
    priceMonthly: 200,
    priceAnnual: 2220,
    stripePriceMonthly: 'price_1SqlbmRvOi8RhnJA1cggjnu4',
    stripePriceAnnual: 'price_1SqljZRvOi8RhnJAmmZvY00F',
    userLimit: 15,
    toolLimit: 150,
    enforcementMode: 'observe',
    billingCycle: 'monthly',
    trialLengthDays: null,
  },
  {
    id: 'tier3',
    name: 'Tier 3 (75 users / 750 tools)',
    priceMonthly: 350,
    priceAnnual: 3780,
    stripePriceMonthly: 'price_1SqlkURvOi8RhnJAQIZj2Qki',
    stripePriceAnnual: 'price_1SqllHRvOi8RhnJA66b8M9V4',
    userLimit: 75,
    toolLimit: 750,
    enforcementMode: 'observe',
    billingCycle: 'monthly',
    trialLengthDays: null,
  },
  {
    id: 'custom',
    name: 'Custom',
    priceMonthly: null,
    priceAnnual: null,
    stripePriceMonthly: null,
    stripePriceAnnual: null,
    userLimit: null,
    toolLimit: null,
    enforcementMode: 'observe',
    billingCycle: null,
    trialLengthDays: null,
  },
]

export const getPlanById = (id: string | null | undefined) =>
  PLAN_DEFINITIONS.find((plan) => plan.id === id) ?? null

export const getPlanByStripePriceId = (priceId: string | null | undefined) => {
  if (!priceId) return null
  return PLAN_DEFINITIONS.find(
    (plan) => plan.stripePriceMonthly === priceId || plan.stripePriceAnnual === priceId
  ) ?? null
}

export const getBillingCycleForPrice = (
  plan: PlanDefinition,
  priceId: string | null | undefined
): BillingCycle | null => {
  if (!priceId) return null
  if (plan.stripePriceMonthly === priceId) return 'monthly'
  if (plan.stripePriceAnnual === priceId) return 'annual'
  return null
}
