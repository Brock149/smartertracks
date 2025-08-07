import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const navigate = useNavigate()

  // Verify the recovery token and create a session
  useEffect(() => {
    async function verifyToken() {
      try {
        // Supabase JS automatically parses the URL fragment and sets the session
        // when detectSessionInUrl is enabled (default). We just check if a session
        // exists and the link type is recovery.
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
        if (hashParams.get('error')) {
          throw new Error(hashParams.get('error_description') || 'Invalid link')
        }
        const type = hashParams.get('type')
        if (type !== 'recovery') {
          throw new Error('Invalid recovery link')
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // As a fallback, try to recover the session manually
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')
          if (!access_token || !refresh_token) {
            throw new Error('Missing session information in link')
          }
          const { error: setError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          if (setError) throw setError
        }
        setVerified(true)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'This link is invalid or has expired.'
        )
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      navigate('/login', {
        state: { successMessage: 'Password updated! Please sign in.' },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back Arrow */}
        <div className="flex justify-start">
          <Link
            to="/login"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <svg
              className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Login
          </Link>
        </div>

        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
        </div>

        {loading && <div>Loading...</div>}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-lg text-lg">
            {error}
          </div>
        )}

        {!loading && verified && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="password" className="sr-only">
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="New password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
