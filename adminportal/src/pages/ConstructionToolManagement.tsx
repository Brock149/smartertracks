import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'

export default function ConstructionToolManagement() {
  useEffect(() => {
    setPageMeta({
      title: 'Construction Tool Management Software | Smarter Tracks',
      description:
        'Construction tool management software for contractors and field crews. Track tools across jobsites, reduce loss, and keep maintenance organized.',
      canonicalPath: '/construction-tool-management',
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Smarter Tracks</h1>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Construction tool management
            </p>
            <h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Keep tools in the right place on every jobsite.
            </h2>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Smarter Tracks helps construction teams manage tools across jobsites, trucks, and
              warehouses. Stay accountable, reduce loss, and keep projects on schedule.
            </p>
            <div className="mt-10 flex justify-center space-x-6">
              <Link
                to="/get-started?plan=trial"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg"
              >
                Try it for free
              </Link>
              <a
                href="mailto:brockcoburn@smartertracks.com"
                className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-lg text-lg font-semibold border border-gray-300 transition-colors shadow-lg"
              >
                Talk to sales
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Jobsite visibility</h3>
              <p className="mt-3 text-gray-600">
                See which tools are assigned to each crew, jobsite, or truck. Know what is on hand
                before the day starts.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Accountability built-in</h3>
              <p className="mt-3 text-gray-600">
                Assign custody to a person or crew, create transfer records, and reduce the time
                spent tracking down missing tools.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Maintenance ready</h3>
              <p className="mt-3 text-gray-600">
                Create inspection checklists and log damaged tools so maintenance gets handled before
                it slows down the job.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Made for contractors</h4>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li>✓ Track tools across multiple job sites</li>
                <li>✓ Support for photos, serials, and asset tags</li>
                <li>✓ Fast audits and exportable reports</li>
                <li>✓ Mobile-friendly for field teams</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Simple for crews</h4>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li>✓ Clear tool ownership and transfers</li>
                <li>✓ Instant access with company codes</li>
                <li>✓ Streamlined onboarding and permissions</li>
                <li>✓ Scales with any company size</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-extrabold text-white">
            Construction tool management that keeps crews productive.
          </h3>
          <p className="mt-4 text-xl text-blue-100">
            Track tools, reduce losses, and keep projects moving with Smarter Tracks.
          </p>
          <div className="mt-8">
            <Link
              to="/signup"
              className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg inline-flex items-center justify-center"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
