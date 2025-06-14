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
}

export interface CompanyAccessCode {
  id: string
  company_id: string
  code: string
  role: 'admin' | 'tech'
  created_at: string
  is_active: boolean
} 