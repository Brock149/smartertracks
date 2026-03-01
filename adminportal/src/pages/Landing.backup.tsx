import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'

export default function Landing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const priceLabel = 'per month'
  const starterAnnualMonthly = 185
  const proAnnualMonthly = 315
  const starterSavings = 'save 7.5%'
  const proSavings = 'save 10%'

  useEffect(() => {
    setPageMeta({
      title: 'Smarter Tracks | Tool Tracking Software for HVAC & Construction',
      description:
        'Smarter Tracks is tool tracking software for HVAC, construction, and trades teams. Track tools across jobsites, assign custody, run audits, and prevent tool loss.',
      canonicalPath: '/',
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Smarter Tracks Tool Tracking Software
              <span className="block text-blue-600">Track Tools Across Jobsites and Crews</span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              <strong>Tool tracking software</strong> built for HVAC, construction, and trades teams.
              Track equipment, manage inventory, assign tool custody, and keep crews accountable with
              fast audits and clear transfer history.
            </p>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
              Smarter Tracks is the <strong>tool tracking app</strong> that replaces clipboards,
              spreadsheets, and verbal checkouts with a real system your whole team can use from their phone.
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

      {/* Why tool tracking matters */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Why Tool Tracking Software Matters
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
              Contractors, HVAC companies, and field service teams lose thousands of dollars each year
              to <strong>missing tools</strong>, duplicate purchases, and time spent searching.
              Without a <strong>tool tracking system</strong>, there is no clear record of who has
              what or where tools moved last.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-extrabold text-red-600">$400B+</div>
              <p className="mt-2 text-gray-600">
                Annual construction tool and equipment theft costs in the U.S. alone.
                <strong> Tool tracking software</strong> helps reduce that exposure.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold text-red-600">1 in 5</div>
              <p className="mt-2 text-gray-600">
                Contractors say they rebuy tools they already own because nobody knows who has them.
                A <strong>tool tracking app</strong> eliminates that guesswork.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold text-red-600">20+ hrs</div>
              <p className="mt-2 text-gray-600">
                Hours lost per month by field crews searching for tools. <strong>Tool tracking
                </strong> puts that time back into billable work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Everything You Need to Track and Manage Your Tools
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Comprehensive <strong>tool management</strong> and <strong>tool tracking</strong> for your entire team
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Tool Inventory Management</h3>
              <p className="mt-2 text-gray-600">
                Complete <strong>tool inventory</strong> management with photos, descriptions, and
                location tracking for every piece of equipment your company owns.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Secure Tool Tracking</h3>
              <p className="mt-2 text-gray-600">
                Know exactly where your tools are with <strong>secure tool tracking</strong> and a
                full transaction history. Every transfer is logged automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Team and Crew Management</h3>
              <p className="mt-2 text-gray-600">
                Manage your technicians, assign tools to crews, and <strong>track tool
                accountability</strong> across your entire organization.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Tool Checklists and Audits</h3>
              <p className="mt-2 text-gray-600">
                Run fast <strong>tool audits</strong> from your phone. Create maintenance checklists
                and verify what is on-site before the job starts.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Tool History and Analytics</h3>
              <p className="mt-2 text-gray-600">
                See the full <strong>tool tracking history</strong> for every item. Know who had it,
                where it went, and when it changed hands.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Mobile Tool Tracking App</h3>
              <p className="mt-2 text-gray-600">
                Access your <strong>tool tracking app</strong> from any phone. Scan barcodes, transfer
                tools, and run audits right from the field.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              How Smarter Tracks Tool Tracking Works
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              Get your team up and running with <strong>tool tracking</strong> in three simple steps. Most
              teams are fully operational the same day they start.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white text-xl font-bold">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Add Your Tools</h3>
              <p className="mt-2 text-gray-600">
                Enter your <strong>tool inventory</strong> into Smarter Tracks. Add photos, serial
                numbers, costs, and assign each tool to a location, vehicle, or warehouse.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white text-xl font-bold">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Assign and Transfer</h3>
              <p className="mt-2 text-gray-600">
                Assign tools to technicians or crews. Every <strong>tool checkout</strong> and return
                is logged with a timestamp and user so custody is always clear.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white text-xl font-bold">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Audit and Track</h3>
              <p className="mt-2 text-gray-600">
                Run <strong>tool audits</strong> from your phone in minutes. See what is missing,
                who has it, and resolve discrepancies before they become losses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video */}
      <section id="demo" className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            See Smarter Tracks Tool Tracking in Action
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Watch a quick demo to learn how teams use our <strong>tool tracking software</strong> to
            track, transfer, and audit their tools from any device.
          </p>
          <div className="mt-10">
            <div className="relative pt-[56.25%] rounded-xl overflow-hidden shadow-xl">
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/86ttYD5idoc?si=8DU3W38G8DEytzAd"
                title="Smarter Tracks tool tracking software demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* Who uses Smarter Tracks */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Tool Tracking Software Built for Trades Teams
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
              Smarter Tracks is purpose-built <strong>tool tracking software</strong> for the teams
              that need it most. Whether you run an HVAC company, a construction crew, or any
              field-based operation, our <strong>tool tracking app</strong> fits your workflow.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">HVAC Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                HVAC companies lose gauges, meters, vac pumps, and recovery machines constantly.
                <strong> Track HVAC tools</strong> across service vans, warehouses, and job sites.
                Know which tech has what before the truck leaves.
              </p>
              <Link to="/hvac-tool-tracking" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about HVAC tool tracking &rarr;
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">Construction Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                Construction contractors manage tools across multiple jobsites and crews.
                <strong> Track construction tools</strong> by location, assign custody to workers,
                and run fast audits so tools stop walking off the job.
              </p>
              <Link to="/construction-tool-management" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about construction tool tracking &rarr;
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">Field Service Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                Plumbing, electrical, mechanical, and general trades teams all deal with the same
                problem: tools disappear without a trace. Smarter Tracks gives every field team a
                simple <strong>tool tracking system</strong> that works from day one.
              </p>
              <Link to="/tool-tracking-software" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about tool tracking software &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ROI section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              The ROI of Tool Tracking Software
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
              <strong>Tool tracking</strong> is not just about organization. It directly impacts
              your bottom line by reducing replacement costs, eliminating downtime, and improving
              crew accountability.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
              <div className="text-3xl font-extrabold text-green-600">35%</div>
              <p className="mt-2 text-gray-700"><strong>Fewer lost tools</strong> in the first 90 days of using tool tracking software</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
              <div className="text-3xl font-extrabold text-green-600">$8,000+</div>
              <p className="mt-2 text-gray-700"><strong>Saved annually</strong> by eliminating duplicate tool purchases through better tool inventory management</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
              <div className="text-3xl font-extrabold text-green-600">15 hrs</div>
              <p className="mt-2 text-gray-700"><strong>Reclaimed monthly</strong> that crews used to waste searching for tools on jobsites</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
              <div className="text-3xl font-extrabold text-green-600">Same day</div>
              <p className="mt-2 text-gray-700"><strong>Setup and onboarding</strong> for most teams. Start tool tracking today with zero learning curve.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900">
              Tool Tracking Software Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Start free, then upgrade when your team grows. Every plan includes full
              <strong> tool tracking</strong>, transfers, and audit features.
            </p>
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
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">Free Trial</h3>
              <p className="mt-2 text-gray-600">Try <strong>tool tracking</strong> with your team</p>
              <div className="mt-6 text-4xl font-extrabold text-gray-900">$0</div>
              <p className="text-gray-500">Get started instantly</p>
              <Link
                to="/get-started?plan=trial"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Start free trial
              </Link>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                <li>✓ 3 users</li>
                <li>✓ 5 tools</li>
                <li>✓ Full tool tracking</li>
                <li>✓ Tool transfers and history</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">Starter</h3>
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
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">Pro</h3>
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
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">Custom</h3>
              <p className="mt-2 text-gray-600">For large teams and custom needs</p>
              <div className="mt-6 text-4xl font-extrabold text-gray-900">Let's talk</div>
              <p className="text-gray-500">Custom tool tracking limits and billing</p>
              <a
                href="mailto:brockcoburn@smartertracks.com"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
              >
                Schedule a demo
              </a>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                <li>✓ Custom limits and onboarding</li>
                <li>✓ Dedicated support</li>
                <li>✓ Custom integrations</li>
                <li>✓ Annual invoicing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What is tool tracking */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            What Is Tool Tracking Software?
          </h2>
          <div className="mt-8 prose prose-lg max-w-none text-gray-600">
            <p>
              <strong>Tool tracking software</strong> is a digital system that records which tools
              your company owns, who has them, and where they are right now. Instead of relying on
              spreadsheets, whiteboards, or memory, a <strong>tool tracking app</strong> like
              Smarter Tracks gives every team member a shared, up-to-date view of your entire
              tool inventory.
            </p>
            <p>
              With Smarter Tracks, every tool gets a profile with photos, serial numbers, cost,
              and custody history. When a technician checks a tool out, the system logs the transfer
              automatically. When a foreman runs an audit, they can verify tool locations from their
              phone in minutes instead of hours. This is <strong>tool tracking</strong> built for
              real-world field operations.
            </p>
            <p>
              Unlike enterprise asset management platforms that cost thousands and take months to
              deploy, Smarter Tracks is affordable <strong>tool tracking software</strong> designed
              for small and mid-size trades teams. You can label tools, add your crew, and start
              tracking the same day you sign up.
            </p>
          </div>
        </div>
      </section>

      {/* Tool tracking vs spreadsheets */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Tool Tracking Software vs. Spreadsheets
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600 text-center">
            Many teams start with Excel or Google Sheets to manage their tools. Here is why
            dedicated <strong>tool tracking software</strong> outperforms spreadsheets at every level.
          </p>
          <div className="mt-10 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">Feature</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">Spreadsheets</th>
                  <th className="px-6 py-4 text-sm font-semibold text-blue-600">Smarter Tracks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-600">
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Real-time tool tracking</td>
                  <td className="px-6 py-3">Manual updates, always stale</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Automatic, always current</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Tool checkout logging</td>
                  <td className="px-6 py-3">Honor system</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Every transfer logged with user and time</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Audit speed</td>
                  <td className="px-6 py-3">Hours with printed lists</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Minutes from any phone</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Mobile access</td>
                  <td className="px-6 py-3">Clunky on phones</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Native iOS app, Android coming soon</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Tool photos</td>
                  <td className="px-6 py-3">Not practical</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Built-in photo management</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium text-gray-900">Accountability</td>
                  <td className="px-6 py-3">No enforcement</td>
                  <td className="px-6 py-3 text-green-700 font-medium">Full custody trail per tool</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mobile App */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Take Your Tool Tracking Mobile
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Download the Smarter Tracks <strong>mobile tool tracking app</strong> for iOS and Android.
              Field technicians can access your tool inventory, transfer tools, and run audits right
              from the job site.
            </p>

            <div className="mt-8 flex justify-center space-x-6">
              <a
                href="https://apps.apple.com/in/app/smarter-tracks/id6748660773"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Download on the</div>
                  <div className="text-xl font-semibold">App Store</div>
                </div>
              </a>

              <a
                href="https://play.google.com/store/apps/details?id=com.bactech.smartertracks"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Get it on</div>
                  <div className="text-xl font-semibold">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Tool Tracking Software FAQ
          </h2>
          <dl className="mt-10 space-y-8">
            <div>
              <dt className="text-lg font-semibold text-gray-900">What is tool tracking software?</dt>
              <dd className="mt-2 text-gray-600">
                <strong>Tool tracking software</strong> is an app that records your tool inventory,
                assigns custody to team members, and logs every transfer. It replaces spreadsheets
                and verbal checkouts with a digital system that keeps your whole team accountable.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">How does Smarter Tracks tool tracking work?</dt>
              <dd className="mt-2 text-gray-600">
                You add your tools to the app, assign them to technicians or locations, and the system
                tracks every checkout, return, and transfer. Admins can run audits from their phone,
                view full tool history, and see who has what at any moment.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">Does tool tracking require GPS or Bluetooth hardware?</dt>
              <dd className="mt-2 text-gray-600">
                No. Smarter Tracks uses assignment-based <strong>tool tracking</strong> — no GPS tags,
                no Bluetooth beacons, no extra hardware. Custody is recorded through the app when
                tools are checked in and out.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">Can I track tools across multiple jobsites?</dt>
              <dd className="mt-2 text-gray-600">
                Yes. Smarter Tracks lets you assign tools to specific locations, vehicles, or
                warehouses. When tools move between jobsites, the transfer is logged so you always
                know where everything is.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">How fast can my team get started with tool tracking?</dt>
              <dd className="mt-2 text-gray-600">
                Most teams are up and running the same day. Add your tools, invite your crew, and
                start <strong>tracking tools</strong> immediately. There is no complex setup or
                training required.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">Is there a mobile app for tool tracking?</dt>
              <dd className="mt-2 text-gray-600">
                Yes. Smarter Tracks has native <strong>tool tracking apps</strong> for iOS and Android.
                Download from the App Store or Google Play so field techs can scan tools, transfer
                custody, and run audits directly from their phones.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">What types of teams use tool tracking software?</dt>
              <dd className="mt-2 text-gray-600">
                HVAC companies, construction contractors, plumbers, electricians, mechanical
                contractors, and any field service team that manages shared tools. If your crew
                shares tools, <strong>tool tracking software</strong> will save you time and money.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to Start Tracking Your Tools?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Join trades teams already using Smarter Tracks <strong>tool tracking software</strong> to
            stop losing tools, save money, and keep crews accountable.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <a
              href="#pricing"
              className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg"
            >
              View Plans
            </a>
            <a
              href="#contact"
              className="border-2 border-white text-white hover:bg-blue-700 px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Email for Demo
            </a>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Want to Sign Your Company Up for Tool Tracking?
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Email to discuss enterprise tool tracking features, company setup with access codes, or
            to schedule a live demo of Smarter Tracks.
          </p>
          <div className="mt-8">
            <a
              href="mailto:brockcoburn@smartertracks.com"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
