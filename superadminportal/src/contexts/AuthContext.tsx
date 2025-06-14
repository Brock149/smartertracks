import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  const ensureSuperadmin = async (sessionUser: SupabaseUser) => {
    // First check metadata
    const metaRole = (sessionUser.user_metadata as any)?.role
    if (metaRole === 'superadmin') return 'superadmin'

    // Fallback: query users table
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', sessionUser.id)
      .single()
    if (!error && data?.role === 'superadmin') return 'superadmin'

    return metaRole || data?.role || 'unknown'
  }

  useEffect(() => {
    const setUserFromSession = async (session: any) => {
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }
      const role = await ensureSuperadmin(session.user)
      if (role !== 'superadmin') {
        await supabase.auth.signOut()
        setUser(null)
        setLoading(false)
        return
      }
      setUser({
        id: session.user.id,
        name: session.user.email?.split('@')[0] ?? 'User',
        email: session.user.email ?? '',
        role,
        created_at: session.user.created_at ?? new Date().toISOString(),
        company_id: null,
      })
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null)
      setUserFromSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSupabaseUser(session?.user ?? null)
      setUserFromSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('signIn called', email)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    console.log('signIn response', { data, error })
    if (error) throw error

    // Extra gate: if returned user is not superadmin, sign out and throw
    const metaRole = (data?.user?.user_metadata as any)?.role
    if (metaRole !== 'superadmin') {
      await supabase.auth.signOut()
      throw new Error('Access denied. Superadmin role required.')
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    supabaseUser,
    loading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 