export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'tech' | 'superadmin'
  created_at: string
  company_id: string | null
}

export interface Company {
  id: string
  name: string
  is_active: boolean
  created_at: string
  suspended_at: string | null
  notes: string | null
  user_count: number
  tool_count: number
  last_activity: string | null
  user_limit: number | null
  tool_limit: number | null
  enforcement_mode: 'off' | 'observe' | 'enforce'
  tier_name: string | null
  billing_cycle: 'monthly' | 'annual' | null
  plan_id: string | null
  trial_expires_at: string | null
}

export interface CompanyAccessCode {
  id: string
  company_id: string
  code: string
  role: 'admin' | 'tech'
  created_at: string
  is_active: boolean
} 