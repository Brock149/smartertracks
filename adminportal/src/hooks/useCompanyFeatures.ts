import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface CompanyFeatures {
  personalToolsEnabled: boolean
  trackersEnabled: boolean
  toolCostingEnabled: boolean
}

// Reads the per-company feature flags for the signed-in user's company so the
// admin portal can hide whole feature areas the company isn't using. While the
// flags load we default everything to false to avoid flashing UI that may be
// disabled, then reveal it once the real values arrive.
export function useCompanyFeatures() {
  const [features, setFeatures] = useState<CompanyFeatures>({
    personalToolsEnabled: false,
    trackersEnabled: false,
    toolCostingEnabled: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (isMounted) setLoading(false)
          return
        }

        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single()

        if (userError) throw userError
        if (!userRecord?.company_id) {
          if (isMounted) setLoading(false)
          return
        }

        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('personal_tools_enabled, trackers_enabled, tool_costing_enabled')
          .eq('id', userRecord.company_id)
          .single()

        if (companyError) throw companyError

        if (isMounted) {
          setFeatures({
            personalToolsEnabled: company?.personal_tools_enabled ?? false,
            trackersEnabled: company?.trackers_enabled ?? false,
            toolCostingEnabled: company?.tool_costing_enabled ?? false,
          })
        }
      } catch (error) {
        console.error('Error fetching company features:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  return { features, loading }
}
