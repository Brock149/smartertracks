import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'

export default function NotFound() {
  useEffect(() => {
    setPageMeta({
      title: 'Page not found | Smarter Tracks',
      description: 'That page does not exist.',
    })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900">Page not found</h1>
        <p className="mt-4 text-lg text-gray-600">That page doesn’t exist. Head back to Smarter Tracks.</p>
        <Link
          to="/"
          className="mt-8 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Go to the homepage
        </Link>
      </main>
      <MarketingFooter />
    </div>
  )
}
