import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import type { BillingCycle } from '../lib/marketingPlans'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'
import ContactForm from '../components/ContactForm'
import CtaPair from '../components/CtaPair'
import StoreBadges from '../components/StoreBadges'
import HuntCostCalculator from '../components/HuntCostCalculator'
import PricingSection from '../components/PricingSection'
import CalendlySection from '../components/CalendlySection'
import FaqAccordion from '../components/FaqAccordion'

const APP_SCREENSHOTS = [
  { src: '/screenshots/smarter-tracks-hvac-tool-tracking-app-tool-list.png', alt: 'Smarter Tracks HVAC tool tracking app: tool list showing who has each tool' },
  { src: '/screenshots/smarter-tracks-tool-details-custody.png', alt: 'Smarter Tracks tool tracking app: tool details with custody and location' },
  { src: '/screenshots/smarter-tracks-tool-checkout-app.png', alt: 'Smarter Tracks tool checkout app: recent checkouts and transfers' },
]

const OBJECTION_FAQ = [
  {
    question: 'Do I have to talk to anyone before I start?',
    answer: "Yes. Pick a time on the calendar at the top of the page. It's 15 minutes, and the open slots are right there.",
  },
  {
    question: "What if it doesn't work for my team?",
    answer: "You have 90 days. Email us and we'll refund every dollar. No questions asked.",
  },
  {
    question: 'Do I need GPS tags or any hardware?',
    answer:
      'Everyday tools are tracked in the app with no tags. Custody is recorded when tools are checked in and out. Optional cellular GPS trackers are available for a few high-value items. They use cell service, like a phone, not Bluetooth, so they do not depend on other people\'s phones.',
  },
  {
    question: 'How fast can we get started?',
    answer:
      'Add your tools, invite your crew, and start tracking the same day. Book a 15-minute chat if you want help getting set up.',
  },
]

const FULL_FAQ = [
  {
    question: 'What is tool tracking software?',
    answer:
      'Tool tracking software is an app that records your tool inventory, assigns custody to team members, and logs every transfer. It replaces spreadsheets and verbal checkouts with a digital system that keeps your whole team accountable.',
  },
  {
    question: 'How does Smarter Tracks work?',
    answer:
      'You add your tools to the app, assign them to technicians or locations, and the system tracks every checkout, return, and transfer. Admins can run audits from their phone, view full tool history, and see who has what at any moment.',
  },
  {
    question: 'Can I track tools across multiple jobsites?',
    answer:
      'Yes. Assign tools to specific locations, vehicles, or warehouses. When tools move between jobsites, the transfer is logged so you always know where everything is.',
  },
  {
    question: 'Is there a mobile app?',
    answer:
      'Yes. Smarter Tracks has native apps for iOS and Android. Field techs can scan tools, transfer custody, and run audits directly from their phones.',
  },
  {
    question: 'What types of teams use Smarter Tracks?',
    answer:
      'HVAC companies, construction contractors, plumbers, electricians, mechanical contractors, and any field service team that manages shared tools.',
  },
]

export default function Landing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual')
  const [currentScreenshot, setCurrentScreenshot] = useState(0)

  useEffect(() => {
    setPageMeta({
      title: 'Tool Tracking Software for HVAC & Construction | Smarter Tracks',
      description:
        'Know which job site every tool is on and whose hands it is in. Tool tracking software for HVAC, construction, and trades teams. 90-day money-back guarantee.',
      canonicalPath: '/',
    })
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScreenshot((prev) => (prev + 1) % APP_SCREENSHOTS.length)
    }, 5500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <section className="relative bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="lg:grid lg:grid-cols-[1.5fr,1fr] lg:gap-16 lg:items-center">
            <div className="text-center lg:text-left">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Tool tracking software for HVAC, construction & trades teams
              </p>
              {/* Alternate H1 for later A/B testing:
                  Stop Losing Track of Your $100K+ Tool Inventory. */}
              <h1 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl tracking-tight leading-tight">
                Finally Know Exactly Where Your $100K+ Tool Inventory Is.
              </h1>
              <p className="mt-5 text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Know which job site every tool is on and whose hands it's in. No more calling around. No more crews waiting on a tool that isn't where it's supposed to be.
              </p>
              <p className="mt-4 text-base font-bold text-gray-600 uppercase tracking-widest">
                Built for Trades, by Tradesmen
              </p>
              <CtaPair
                section="hero"
                align="start"
                className="mt-6"
                note="90-day money-back guarantee. No questions asked."
              />
              <p className="mt-4 text-base text-gray-500 text-center lg:text-left">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Login
                </Link>
              </p>
            </div>

            <div className="mt-8 lg:mt-0 relative">
              <div className="relative max-w-md mx-auto px-10">
                <button
                  type="button"
                  onClick={() => setCurrentScreenshot((prev) => (prev - 1 + APP_SCREENSHOTS.length) % APP_SCREENSHOTS.length)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-blue-600 transition-colors p-2"
                  aria-label="Previous screenshot"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  <div className="bg-white rounded-[2.5rem] overflow-hidden relative" style={{ aspectRatio: '9/19.5' }}>
                    <div className="relative w-full h-full">
                      {APP_SCREENSHOTS.map((screenshot, index) => (
                        <img
                          key={screenshot.src}
                          src={screenshot.src}
                          alt={screenshot.alt}
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                            index === currentScreenshot ? 'opacity-100' : 'opacity-0'
                          }`}
                          loading={index === 0 ? 'eager' : 'lazy'}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-7 bg-gray-900 rounded-full" />
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentScreenshot((prev) => (prev + 1) % APP_SCREENSHOTS.length)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-blue-600 transition-colors p-2"
                  aria-label="Next screenshot"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="flex justify-center gap-2 mt-5">
                  {APP_SCREENSHOTS.map((screenshot, index) => (
                    <button
                      key={screenshot.src}
                      type="button"
                      onClick={() => setCurrentScreenshot(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentScreenshot ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to screenshot ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CalendlySection
        className="py-8 bg-white"
        heading="Pick a Time"
        body="15 minutes. Tell me how your crew tracks tools today and I'll tell you honestly if Smarter Tracks fits. No slideshow."
      />

      <section className="py-4 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 font-medium">
            No hardware required · iOS & Android apps · 90-day money-back guarantee
          </p>
        </div>
      </section>

      <section className="py-10 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Sound Familiar?</h2>
          <div className="mt-8 space-y-3 text-xl text-gray-700">
            <p>You plan the day around a tool being at the shop.</p>
            <p>You get there. It isn't.</p>
            <p>The crew is standing around. You're calling everyone you know.</p>
            <p>Next week you buy another one, and find the first one in a van.</p>
          </div>
          <p className="mt-8 text-xl sm:text-2xl font-semibold text-gray-900">
            It's not theft. It's not laziness. Nobody knows where anything is. That's what Smarter Tracks fixes.
          </p>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              What Changes When Every Tool Has an Owner
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              The difference between knowing where your tools are and guessing.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Stop Planning Your Day Around a Tool That Isn't There</h3>
              <p className="mt-3 text-gray-600">
                Check where a tool is and who has it before you send anyone. No calling around. No wasted trips.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Stop Replacing Tools You Already Own</h3>
              <p className="mt-3 text-gray-600">
                When nobody tracks who has what, you end up buying the same tools twice. Smarter Tracks
                gives every tool a digital paper trail — so nothing slips through the cracks.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Get Crews Accountable Without the Awkward Conversations</h3>
              <p className="mt-3 text-gray-600">
                No more "Hey, who took the..." texts. With custody tracking and automatic transfer logs,
                everyone knows who's responsible for what — no finger-pointing needed.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">Run Audits in Minutes, Not Hours</h3>
              <p className="mt-3 text-gray-600">
                Forget printed checklists and warehouse walk-throughs. Open the app, verify what's on
                site, flag what's missing — done. From any phone, anywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      <HuntCostCalculator billingCycle={billingCycle} />

      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">How It Works</h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              Add your tools, invite your crew, and start tracking the same day.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">1</div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Add Your Tools</h3>
              <p className="mt-2 text-gray-600">
                Enter your tool inventory with photos, serial numbers, and costs.
                Assign each tool to a person, vehicle, or location.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">2</div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Track Every Checkout</h3>
              <p className="mt-2 text-gray-600">
                When a tool changes hands, the transfer is logged automatically with a timestamp
                and the person responsible. No clipboards.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">3</div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Audit From Your Phone</h3>
              <p className="mt-2 text-gray-600">
                Run tool audits in minutes from any phone. See what's missing,
                who had it last, and resolve discrepancies fast.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PricingSection billingCycle={billingCycle} onBillingCycleChange={setBillingCycle} />

      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">Questions Before You Start</h2>
          <FaqAccordion items={OBJECTION_FAQ} />
        </div>
      </section>

      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">Stop Losing Tools. Start Today.</h2>
          <p className="mt-4 text-xl text-blue-100">
            Every tool gets an owner. Every handoff gets a record. Backed by a 90-day money-back guarantee.
          </p>
          <CtaPair section="final-cta" tone="dark" className="mt-8" />
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Tool Tracking Software Built for Trades Teams
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
              Smarter Tracks is purpose-built <strong>tool tracking software</strong> for the teams
              that need it most.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">HVAC Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                HVAC companies lose gauges, meters, vac pumps, and recovery machines constantly.
                <strong> Track HVAC tools</strong> across service vans, warehouses, and job sites.
              </p>
              <div className="mt-4 space-y-2">
                <Link to="/hvac-tool-tracking" className="block text-blue-600 hover:text-blue-700 font-semibold">
                  Learn about HVAC tool tracking &rarr;
                </Link>
                <Link to="/best-hvac-tool-tracking-software" className="block text-blue-600 hover:text-blue-700 font-semibold">
                  Compare the best HVAC tool tracking software &rarr;
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Construction Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                Construction contractors manage tools across multiple jobsites and crews.
                <strong> Track construction tools</strong> by location and assign custody to workers.
              </p>
              <div className="mt-4 space-y-2">
                <Link to="/construction-tool-management" className="block text-blue-600 hover:text-blue-700 font-semibold">
                  Learn about construction tool tracking &rarr;
                </Link>
                <Link to="/best-tool-tracking-software-construction" className="block text-blue-600 hover:text-blue-700 font-semibold">
                  Compare the best construction tool tracking software &rarr;
                </Link>
                <Link to="/best-tool-checkout-system-contractors" className="block text-blue-600 hover:text-blue-700 font-semibold">
                  Compare the best tool checkout systems for contractors &rarr;
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Field Service Tool Tracking</h3>
              <p className="mt-3 text-gray-600">
                Plumbing, electrical, mechanical, and general trades teams all deal with the same
                problem. Smarter Tracks gives every field team a simple{' '}
                <Link to="/tool-tracking-software" className="text-blue-600 hover:text-blue-700 font-semibold">tool tracking software</Link> system.
              </p>
              <Link to="/tool-tracking-software" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold">
                Learn about tool tracking software &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Why Tool Tracking Software Matters</h2>
            <p className="mt-4 text-lg text-gray-600">
              Missing tools, duplicate purchases, and time spent searching add up fast. Without a tool tracking system, there is no clear record of who has what or where a tool moved last.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">What Is Tool Tracking Software?</h2>
          <div className="mt-8 prose prose-lg max-w-none text-gray-600">
            <p>
              <strong>Tool tracking software</strong> is a digital system that records which tools
              your company owns, who has them, and where they are right now. Instead of relying on
              spreadsheets, whiteboards, or memory, a tool tracking app like
              Smarter Tracks gives every team member a shared, up-to-date view of your entire
              tool inventory.
            </p>
            <p>
              With Smarter Tracks, every tool gets a profile with photos, serial numbers, cost,
              and custody history. When a technician checks a tool out, the system logs the transfer
              automatically. When a foreman runs an audit, they can verify tool locations from their
              phone in minutes instead of hours. This is tool tracking built for
              real-world field operations.
            </p>
            <p>
              Unlike enterprise asset management platforms built for large organizations, Smarter Tracks is affordable <Link to="/tool-tracking-software" className="text-blue-600 hover:text-blue-700 font-semibold">tool tracking software</Link> designed
              for small and mid-size trades teams. You can add your tools, invite your crew, and start
              tracking the same day you sign up.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Tool Tracking Software vs. Spreadsheets
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600 text-center">
            Many teams start with Excel or Google Sheets. Here's why dedicated
            <strong> tool tracking software</strong> outperforms spreadsheets at every level.
          </p>
          <div className="mt-10 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left min-w-[36rem]">
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
                  <td className="px-6 py-3 text-green-700 font-medium">Native iOS and Android apps</td>
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

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Take Your Tool Tracking Mobile</h2>
            <p className="mt-4 text-xl text-gray-600">
              Download the Smarter Tracks mobile app for iOS and Android.
              Field technicians can access your tool inventory, transfer tools, and run audits right
              from the job site.
            </p>
            <StoreBadges className="mt-8" />
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">Tool Tracking Software FAQ</h2>
          <dl className="mt-10 space-y-8">
            {FULL_FAQ.map((item) => (
              <div key={item.question}>
                <dt className="text-lg font-semibold text-gray-900">{item.question}</dt>
                <dd className="mt-2 text-gray-600">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="contact" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">Get in Touch</h2>
            <p className="mt-4 text-xl text-gray-600">
              Have questions about tool tracking, pricing, or how Smarter Tracks works for your team?<br />
              Fill out the form below and we'll get back to you within 24 hours.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
