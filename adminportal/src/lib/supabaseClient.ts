import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 

// Helper function to get the current user's role and company
export const getUserInfo = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data, error } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
    
  if (error) throw error
  return data
}

// Helper function to get the current user's role
export const getUserRole = async () => {
  const userInfo = await getUserInfo()
  return userInfo?.role || null
}

// Helper function to get the current user's company_id
export const getUserCompanyId = async () => {
  const userInfo = await getUserInfo()
  return userInfo?.company_id || null
}

// Helper function to check if user is admin
export const isAdmin = async () => {
  const role = await getUserRole()
  return role === 'admin'
} 