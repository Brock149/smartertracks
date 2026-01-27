import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'

export default function ToolTrackingSoftware() {
  useEffect(() => {
    setPageMeta({
      title: 'Tool Tracking Software for Field Teams | Smarter Tracks',
      description:
        'Smarter Tracks is tool tracking software built for field teams. Track tool locations, transfers, maintenance, and usage history in one place.',
      canonicalPath: '/tool-tracking-software',
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
              Tool tracking software
            </p>
            <h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Keep every tool accountable, everywhere.
            </h2>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Smarter Tracks gives field teams a simple way to track tool locations, transfers, and
              maintenance history. Stop searching, reduce loss, and keep crews moving.
            </p>
            <div className="mt-10 flex justify-center space-x-6">
              <Link
                to="/get-started?plan=trial"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg"
              >
                Start a free trial
              </Link>
              <a
                href="mailto:brockcoburn@smartertracks.com"
                className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-lg text-lg font-semibold border border-gray-300 transition-colors shadow-lg"
              >
                Book a demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Real-time tool locations</h3>
              <p className="mt-3 text-gray-600">
                Track where tools are stored, who has them, and when they moved. Every transfer
                creates a clean history for fast audits.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Prevent loss and downtime</h3>
              <p className="mt-3 text-gray-600">
                Reduce tool loss by assigning responsibility and making check-in/out quick and
                consistent across the entire team.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Maintenance tracking</h3>
              <p className="mt-3 text-gray-600">
                Create maintenance checklists, document issues, and keep a record of service history
                so tools stay in the field longer.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Built for field teams</h4>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li>✓ Track tool custody across trucks, shops, and job sites</li>
                <li>✓ Add photos, descriptions, and serial numbers</li>
                <li>✓ Run audits quickly with searchable histories</li>
                <li>✓ Share access with technicians and managers</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900">Fast onboarding</h4>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li>✓ Start with a free trial</li>
                <li>✓ Import tools in minutes</li>
                <li>✓ Create access codes for teams</li>
                <li>✓ Upgrade plans as you grow</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-extrabold text-white">
            Tool tracking software that your crews will actually use.
          </h3>
          <p className="mt-4 text-xl text-blue-100">
            Run audits faster, prevent tool loss, and keep your team accountable.
          </p>
          <div className="mt-8">
            <Link
              to="/signup"
              className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg inline-flex items-center justify-center"
            >
              Create your account
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
