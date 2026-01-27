import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'

export default function Landing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const priceLabel = 'per month'
  const starterAnnualMonthly = 185
  const proAnnualMonthly = 315
  const starterSavings = 'save 7.5%'
  const proSavings = 'save 10%'

  useEffect(() => {
    setPageMeta({
      title: 'Smarter Tracks | Tool Tracking Software',
      description:
        'Smarter Tracks is tool tracking software for trades teams. Track tools, prevent losses, run audits, and keep crews accountable.',
      canonicalPath: '/',
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <MarketingHeader />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Smarter Tracks Tool Tracking Software
              <span className="block text-blue-600">Track Tools Across Jobsites and Crews</span>
            </h2>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Tool tracking software built for HVAC, construction, and trades teams. Track equipment,
              manage inventory, and keep crews accountable with fast audits and clear history.
            </p>
            <div className="mt-10 flex justify-center space-x-6">
              <a
                href="#pricing"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg"
              >
                View Plans
              </a>
              <Link
                to="/login"
                className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-lg text-lg font-semibold border border-gray-300 transition-colors shadow-lg"
              >
                Sign In
              </Link>
            </div>
            <p className="mt-4 text-gray-600">
              Have a company code?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign Up here
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-4xl font-extrabold text-gray-900">Choose the plan that's right for you</h3>
            <p className="mt-4 text-lg text-gray-600">Start free, then upgrade when your team grows.</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  billingCycle === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  billingCycle === 'annual' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                Annual
              </button>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Save with annual
              </span>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="mt-2 text-2xl font-semibold text-gray-900">Free Trial</h4>
              <p className="mt-2 text-gray-600">For teams who want to try it out</p>
              <div className="mt-6 text-4xl font-extrabold text-gray-900">$0</div>
              <p className="text-gray-500">Get started instantly</p>
              <Link
                to="/get-started?plan=trial"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Get started
              </Link>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                <li>✓ 3 users</li>
                <li>✓ 5 tools</li>
                <li>✓ Full tool tracking</li>
                <li>✓ Transfers & history</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="mt-2 text-2xl font-semibold text-gray-900">Starter</h4>
              <p className="mt-2 text-gray-600">For small teams getting organized</p>
              <div className="mt-6 text-4xl font-extrabold text-gray-900">
                ${billingCycle === 'annual' ? starterAnnualMonthly : '200'}
                <span className="text-base font-semibold text-gray-500">/{priceLabel}</span>
              </div>
              <p className="text-gray-500">
                {billingCycle === 'annual'
                  ? '$2,220 billed yearly'
                  : '15 users • 150 tools'}
              </p>
              {billingCycle === 'annual' && (
                <p className="text-sm text-green-700 font-semibold">{starterSavings}</p>
              )}
              <Link
                to={`/get-started?plan=tier2&billing=${billingCycle}`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Buy now
              </Link>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                <li>✓ 15 users</li>
                <li>✓ 150 tools</li>
                <li>✓ Tool transfer history</li>
                <li>✓ Photos on tools</li>
                <li>✓ Damaged tool reporting</li>
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-blue-600 bg-white p-8 shadow-lg">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                <span className="rounded-full border border-blue-200 px-2 py-0.5 text-xs">
                  Best value
                </span>
                <span className="rounded-full border border-blue-200 px-2 py-0.5 text-xs">
                  Most popular
                </span>
              </div>
              <h4 className="mt-2 text-2xl font-semibold text-gray-900">Pro</h4>
              <p className="mt-2 text-gray-600">For growing teams with more tools</p>
              <div className="mt-6 text-4xl font-extrabold text-gray-900">
                ${billingCycle === 'annual' ? proAnnualMonthly : '350'}
                <span className="text-base font-semibold text-gray-500">/{priceLabel}</span>
              </div>
              <p className="text-gray-500">
                {billingCycle === 'annual'
                  ? '$3,780 billed yearly'
                  : '75 users • 750 tools'}
              </p>
              {billingCycle === 'annual' && (
                <p className="text-sm text-green-700 font-semibold">{proSavings}</p>
              )}
              <Link
                to={`/get-started?plan=tier3&billing=${billingCycle}`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
              >
                Buy now
              </Link>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                <li>✓ 75 users</li>
                <li>✓ 750 tools</li>
                <li>✓ Tool transfer history</li>
                <li>✓ Photos on tools</li>
                <li>✓ Damaged tool reporting</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="mt-2 text-2xl font-semibold text-gray-900">Custom</h4>
              <p className="mt-2 text-gray-600">For large teams and custom needs</p>
              <div className="mt-6 text-4xl font-extrabold text-gray-900">Let’s talk</div>
              <p className="text-gray-500">Custom limits and billing</p>
              <a
                href="mailto:brockcoburn@smartertracks.com"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Schedule a demo
              </a>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                <li>✓ Custom limits & onboarding</li>
                <li>✓ Dedicated support</li>
                <li>✓ Custom integrations</li>
                <li>✓ Annual invoicing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">
              Everything You Need to Manage Your Tools
            </h3>
            <p className="mt-4 text-xl text-gray-600">
              Comprehensive tool management for your entire team
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="mt-4 text-lg font-semibold text-gray-900">Tool Inventory</h4>
              <p className="mt-2 text-gray-600">
                Complete inventory management with photos, descriptions, and location tracking for all your equipment.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h4 className="mt-4 text-lg font-semibold text-gray-900">Secure Tracking</h4>
              <p className="mt-2 text-gray-600">
                Know exactly where your tools are at all times with secure, real-time tracking and transaction history.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h4 className="mt-4 text-lg font-semibold text-gray-900">Team Management</h4>
              <p className="mt-2 text-gray-600">
                Manage your technicians, assign tools, and track accountability across your entire team.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h4 className="mt-4 text-lg font-semibold text-gray-900">Custom Checklists</h4>
              <p className="mt-2 text-gray-600">
                Create customizable maintenance checklists for your tools and track completion status.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 className="mt-4 text-lg font-semibold text-gray-900">Analytics & History</h4>
              <p className="mt-2 text-gray-600">
                Get insights into tool usage and track tool history and transactions to optimize your operations.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="mt-4 text-lg font-semibold text-gray-900">Mobile Access</h4>
              <p className="mt-2 text-gray-600">
                Access your tool inventory on the go with our mobile app for iOS and Android devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-extrabold text-gray-900">See Smarter Tracks in Action</h3>
          <p className="mt-4 text-xl text-gray-600">
            Watch a quick demo to learn how teams track, transfer, and audit their tools.
          </p>
          <div className="mt-10">
            <div className="relative pt-[56.25%] rounded-xl overflow-hidden shadow-xl">
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/86ttYD5idoc?si=8DU3W38G8DEytzAd"
                title="Smarter Tracks Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-extrabold text-gray-900">
              Take Your Tool Management Mobile
            </h3>
            <p className="mt-4 text-xl text-gray-600">
              Download our mobile app for field technicians to access tools, update locations, and complete checklists on the job site.
            </p>
            
            <div className="mt-8 flex justify-center space-x-6">
              {/* App Store Button */}
              <a
                href="https://apps.apple.com/in/app/smarter-tracks/id6748660773"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Download on the</div>
                  <div className="text-xl font-semibold">App Store</div>
                </div>
              </a>

              {/* Google Play Button */}
              <div
                className="inline-flex items-center bg-black text-white px-6 py-3 rounded-lg opacity-80 cursor-not-allowed"
                aria-disabled="true"
                role="button"
              >
                <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Coming soon to</div>
                  <div className="text-xl font-semibold">Google Play</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-extrabold text-white">
            Ready to Transform Your Tool Management?
          </h3>
          <p className="mt-4 text-xl text-blue-100">
            Join teams already using Smarter Tracks to streamline their operations.
          </p>
          <div className="mt-8">
            <a
              href="#contact"
              className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg inline-flex items-center justify-center"
            >
              Email for Demo / Company Setup
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-extrabold text-gray-900">
            Want to Sign Your Company Up?
          </h3>
            <p className="mt-4 text-xl text-gray-600">
              Email to discuss enterprise features, company setup with access codes, or to schedule a demo.
            </p>
          <div className="mt-8">
            <a
              href="mailto:brockcoburn@smartertracks.com"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Me: brockcoburn@smartertracks.com
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
} 