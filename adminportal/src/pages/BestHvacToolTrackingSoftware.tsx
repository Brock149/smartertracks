import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'

const comparisonRows = [
  {
    name: 'Smarter Tracks',
    bestFor: 'HVAC shops tracking tools across techs, vans and the shop',
    hardware: 'None, just phones (iOS & Android)',
    pricing: 'Free trial (3 users, 5 tools). Starter $185/mo (15 users, 150 tools). Pro $315/mo (75 users, 750 tools)',
    perUser: 'No',
    highlight: true,
  },
  {
    name: 'ShareMyToolbox',
    bestFor: 'Barcode/QR tracking, unlimited tools',
    hardware: 'Barcode/QR labels',
    pricing: '$100/mo for the first admin + $10 per additional user',
    perUser: 'Yes',
  },
  {
    name: 'Sortly',
    bestFor: 'Simple inventory for small shops',
    hardware: 'Barcode/QR labels',
    pricing: 'Free plan; paid from $49/mo',
    perUser: 'Limited user licences per plan',
  },
  {
    name: 'Milwaukee ONE-KEY',
    bestFor: 'Techs using Milwaukee tools',
    hardware: 'Bluetooth built into One-Key tools, or tags',
    pricing: 'Free app; tools and tags bought separately',
    perUser: 'No',
  },
  {
    name: 'Hilti ON!Track',
    bestFor: 'Large mechanical contractors with tag infrastructure',
    hardware: 'Bluetooth tags and gateways',
    pricing: 'Quote-based',
    perUser: 'Quote-based',
  },
  {
    name: 'ToolWatch (AlignOps)',
    bestFor: 'Enterprise tool cribs',
    hardware: 'Barcode',
    pricing: 'Quote-based',
    perUser: 'Quote-based',
  },
]

const faqItems = [
  {
    question: 'What is the best HVAC tool tracking software?',
    answer:
      'For most HVAC service shops, the best fit is one that tracks tools by tech and van with minimal setup. Smarter Tracks does that with phone-based check-out/check-in, no hardware and flat pricing. ShareMyToolbox is a strong barcode-based alternative, and Sortly suits small shops on a budget.',
  },
  {
    question: 'What is the best HVAC tool tracking app?',
    answer:
      'Smarter Tracks (iOS and Android) if you want techs to check tools in and out from their phones with no tags. Milwaukee ONE-KEY if your tools are mostly Milwaukee. Sortly for simple inventory on a free or low-cost plan.',
  },
  {
    question: 'How do HVAC companies keep track of tools on service vans?',
    answer:
      'Assign each tool to a tech or van, log every hand-off, and run quick audits from a phone. That shows what\'s on each truck before dispatch and who had a tool last when something goes missing.',
  },
  {
    question: 'Do HVAC techs need GPS tags on their tools?',
    answer:
      'Usually not. Gauges, meters and vac pumps are small and move constantly, and tags add cost and upkeep. Custody tracking (who has it, when it moved) answers the everyday questions without hardware.',
  },
  {
    question: 'How much does HVAC tool tracking software cost?',
    answer:
      'From free (Sortly\'s free plan, the ONE-KEY app) to quote-based enterprise systems. Smarter Tracks is $185/month for 15 users and 150 tools, with no per-user charges.',
  },
]

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'FAQPage',
      author: { '@type': 'Person', name: 'Brock Coburn', jobTitle: 'Founder, Smarter Tracks' },
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the best HVAC tool tracking software?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'For most HVAC service shops, the best fit tracks tools by tech and van with minimal setup. Smarter Tracks does that with phone-based check-out/check-in, no hardware and flat pricing. ShareMyToolbox is a strong barcode-based alternative, and Sortly suits small shops on a budget.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the best HVAC tool tracking app?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Smarter Tracks (iOS and Android) if you want techs to check tools in and out from their phones with no tags. Milwaukee ONE-KEY if your tools are mostly Milwaukee. Sortly for simple inventory on a free or low-cost plan.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do HVAC companies keep track of tools on service vans?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Assign each tool to a tech or van, log every hand-off, and run quick audits from a phone, so you know what\'s on each truck before dispatch and who had a tool last.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do HVAC techs need GPS tags on their tools?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Usually not. Gauges, meters and vac pumps are small and move constantly; custody tracking answers the everyday questions without hardware.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does HVAC tool tracking software cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'From free (Sortly\'s free plan, the ONE-KEY app) to quote-based enterprise systems. Smarter Tracks is $185/month for 15 users and 150 tools, with no per-user charges.',
          },
        },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'Best HVAC tool tracking software and apps (2026)',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Smarter Tracks', url: 'https://www.smartertracks.com/' },
        { '@type': 'ListItem', position: 2, name: 'ShareMyToolbox' },
        { '@type': 'ListItem', position: 3, name: 'Sortly' },
        { '@type': 'ListItem', position: 4, name: 'Milwaukee ONE-KEY' },
        { '@type': 'ListItem', position: 5, name: 'Hilti ON!Track' },
        { '@type': 'ListItem', position: 6, name: 'ToolWatch by AlignOps' },
      ],
    },
  ],
}

export default function BestHvacToolTrackingSoftware() {
  useEffect(() => {
    setPageMeta({
      title: 'Best HVAC Tool Tracking Software & Apps (2026)',
      description:
        'Compare the best HVAC tool tracking software and apps for 2026: Smarter Tracks, ShareMyToolbox, Sortly, Milwaukee ONE-KEY, Hilti ON!Track and ToolWatch. Pricing, hardware and which fits a service shop.',
      canonicalPath: '/best-hvac-tool-tracking-software',
    })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <MarketingHeader />

      <article className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Best HVAC Tool Tracking Software &amp; Apps (2026)
          </h1>
          <p className="mt-4 text-sm text-gray-500">
            Last updated: October 2026 · Written by Brock Coburn, founder of Smarter Tracks
          </p>
          <p className="mt-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">About the author: </span>
            Brock Coburn has worked across the HVAC trade, from hands-on pre-apprentice field work to office operations and sales. He built Smarter Tracks first for a mechanical contracting business, to fix its tool tracking.
          </p>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <p className="font-semibold text-gray-900">Short answer:</p>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
              <li>
                <strong>For HVAC shops that want to know which tech and which van has each gauge, meter, vac pump and recovery machine, with no tags to buy:</strong> Smarter Tracks, a phone-based check-out/check-in app with flat pricing and no per-user fees.
              </li>
              <li><strong>For barcode/QR tracking with unlimited tools:</strong> ShareMyToolbox.</li>
              <li><strong>For a simple, low-cost inventory app:</strong> Sortly.</li>
              <li><strong>For techs standardised on Milwaukee tools:</strong> Milwaukee ONE-KEY.</li>
            </ul>
          </div>

          <blockquote className="mt-8 border-l-4 border-blue-600 bg-blue-50 px-5 py-4 text-gray-700">
            We make Smarter Tracks, so we're biased. Every price and hardware detail below comes from each vendor's own website (checked September 2026), and we say where each tool fits better than ours.
          </blockquote>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">Why HVAC tool tracking is different</h2>
          <p className="mt-4 text-gray-700">
            HVAC tools don't sit on one jobsite. They ride in service vans, go from tech to tech, and come back to the shop between calls. The expensive, easy-to-lose items are small: manifold gauges, meters, vacuum pumps, recovery machines, drill kits. The question that matters is usually "which tech or truck has it right now, and who had it last?" rather than a GPS dot on a map. It also matters whether it came back damaged, before the next service call goes out.
          </p>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">Quick comparison</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-900">App</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Best for</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Hardware needed</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Pricing (as listed, Sept 2026)</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Per-user fees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {comparisonRows.map((row) => (
                  <tr key={row.name} className={row.highlight ? 'bg-blue-50' : 'bg-white'}>
                    <th scope="row" className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{row.name}</th>
                    <td className="px-4 py-3">{row.bestFor}</td>
                    <td className="px-4 py-3">{row.hardware}</td>
                    <td className="px-4 py-3">{row.pricing}</td>
                    <td className="px-4 py-3">{row.highlight ? <strong>{row.perUser}</strong> : row.perUser}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">The options</h2>

          <section className="mt-8">
            <h3 className="text-2xl font-bold text-gray-900">1. Smarter Tracks: best for HVAC tool accountability across techs and vans</h3>
            <p className="mt-3 text-gray-700">
              Every gauge, meter, vac pump and recovery machine is assigned to a tech, a service van or the shop. When a tool changes hands, the transfer is logged with a timestamp and the person responsible. Techs flag damaged tools at check-in, so broken ones get caught before the next call. Managers run audits from any phone and can see what's on each van before dispatch.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
              <li><strong>Hardware:</strong> none. It runs on iOS and Android, and setup takes a day.</li>
              <li>
                <strong>Pricing:</strong>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>free trial (3 users, 5 tools, no card)</li>
                  <li>Starter $185/mo (15 users, 150 tools)</li>
                  <li>Pro $315/mo (75 users, 750 tools)</li>
                  <li>no per-user charges, no long-term contract</li>
                </ul>
              </li>
              <li><strong>Less of a fit if:</strong> you need live GPS location, or you track thousands of consumable parts (it's built for tools, not parts stock). Plans cap tool counts.</li>
            </ul>
            <p className="mt-4">
              <Link to="/hvac-tool-tracking" className="text-blue-600 hover:text-blue-700 font-semibold">
                See HVAC tool tracking with Smarter Tracks &rarr;
              </Link>
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">2. ShareMyToolbox: best for barcode/QR with unlimited tools</h3>
            <p className="mt-3 text-gray-700">
              It tracks unlimited tools with barcode/QR scanning, GPS captured on scans, kits and maintenance notes, and has an HVAC-specific setup. $100/month for the first admin plus $10 per additional user. 14-day free trial.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">3. Sortly: best for simple, low-cost inventory</h3>
            <p className="mt-3 text-gray-700">
              A general inventory app with QR labels, photos and low-stock alerts. It's good for small shops that track parts and tools together. There's a free plan, and paid plans start at $49/month, with item and user limits.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">4. Milwaukee ONE-KEY: best for Milwaukee tool fleets</h3>
            <p className="mt-3 text-gray-700">
              The app is free. Milwaukee's connected tools have Bluetooth built in, and other items can use ONE-KEY tags. It's a great fit if most of your techs' power tools are Milwaukee, and less useful for mixed-brand gauges and meters.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">5. Hilti ON!Track: best for large contractors with tag infrastructure</h3>
            <p className="mt-3 text-gray-700">
              Bluetooth tags and gateways with Hilti's asset management software. It suits large mechanical contractors more than small service shops. Quote-based.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">6. ToolWatch by AlignOps: best for enterprise tool cribs</h3>
            <p className="mt-3 text-gray-700">
              An established enterprise system for companies running a central tool crib. Quote-based.
            </p>
          </section>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">FAQ</h2>
          <dl className="mt-6 space-y-8">
            {faqItems.map((item) => (
              <div key={item.question}>
                <dt className="text-lg font-semibold text-gray-900">{item.question}</dt>
                <dd className="mt-2 text-gray-700">{item.answer}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-xl font-bold text-gray-900">Related pages</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/hvac-tool-tracking" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50">
                HVAC tool tracking
              </Link>
              <Link to="/best-tool-tracking-software-construction" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50">
                Best construction tool tracking software
              </Link>
              <Link to="/tool-checkout-system" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50">
                Tool checkout system
              </Link>
            </div>
          </div>
        </div>
      </article>

      <section className="py-16 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">See Smarter Tracks on your vans</h2>
          <p className="mt-4 text-lg text-blue-100">
            Phone-based check-out and check-in, flat pricing, and no tags to buy.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/#book-demo" className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg font-semibold">
              Book a free demo
            </Link>
            <Link to="/#pricing" className="border border-white text-white hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold">
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
