import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'

const comparisonRows = [
  {
    name: 'Smarter Tracks',
    bestFor: 'Tool check-out and crew accountability without hardware',
    hardware: 'None, just phones (iOS & Android)',
    pricing: 'Free trial (3 users, 5 tools). Starter $185/mo (15 users, 150 tools). Pro $315/mo (75 users, 750 tools)',
    perUser: 'No',
    highlight: true,
  },
  {
    name: 'ShareMyToolbox',
    bestFor: 'Barcode/QR tool tracking, unlimited tools',
    hardware: 'Barcode/QR labels',
    pricing: '$100/mo for the first admin + $10 per additional user',
    perUser: 'Yes',
  },
  {
    name: 'Hilti ON!Track',
    bestFor: 'Large contractors wanting tags, gateways and Hilti integration',
    hardware: 'Bluetooth tags and gateways; optional GPS trackers',
    pricing: 'Quote-based',
    perUser: 'Quote-based',
  },
  {
    name: 'GoCodes',
    bestFor: 'QR tag tracking with GPS location on scan',
    hardware: 'QR tags (included on Premium plans and up)',
    pricing: 'From $500/yr (200 assets, 3 users)',
    perUser: 'Extra users $400/yr per 5',
  },
  {
    name: 'Tenna',
    bestFor: 'Heavy equipment and fleet tracking',
    hardware: 'GPS telematics and BLE trackers',
    pricing: 'Custom quote',
    perUser: 'Custom quote',
  },
  {
    name: 'Milwaukee ONE-KEY',
    bestFor: 'Crews standardised on Milwaukee tools',
    hardware: 'Bluetooth built into One-Key tools, or tags',
    pricing: 'Free app; tools and tags bought separately',
    perUser: 'No',
  },
  {
    name: 'Sortly',
    bestFor: 'General inventory and small shops',
    hardware: 'Barcode/QR labels',
    pricing: 'Free plan; paid from $49/mo',
    perUser: 'Limited user licences per plan',
  },
  {
    name: 'ToolWatch (AlignOps)',
    bestFor: 'Enterprise tool cribs and warehouses',
    hardware: 'Barcode',
    pricing: 'Quote-based',
    perUser: 'Quote-based',
  },
]

const faqItems = [
  {
    question: 'What is the best tool tracking software for construction?',
    answer:
      'It depends on what you track. For hand and power tools moving between crews, Smarter Tracks gives check-out/check-in accountability with no hardware and flat pricing. For tag-and-gateway tracking at large contractors, Hilti ON!Track is the established choice. For heavy equipment with GPS, Tenna.',
  },
  {
    question: 'What is the best tool tracking app for construction?',
    answer:
      'If you want crews to check tools in and out from their phones with no tags to buy, Smarter Tracks (iOS and Android). If your tools are mostly Milwaukee, the free ONE-KEY app. For barcode scanning with unlimited tools, ShareMyToolbox.',
  },
  {
    question: 'Do I need GPS or Bluetooth tags to track construction tools?',
    answer:
      'Not for most hand and power tools. Tags show location but add hardware cost and upkeep (batteries, lost or broken tags). A custody-based system records who has each tool and when it moved, which answers "who had it last?" without any hardware. GPS makes most sense for heavy equipment and vehicles.',
  },
  {
    question: 'How much does construction tool tracking software cost?',
    answer:
      'From free (Sortly\'s free plan, the ONE-KEY app) to quote-based enterprise systems (Hilti ON!Track, Tenna, ToolWatch). Watch for per-user fees. Smarter Tracks is $185/month for 15 users and 150 tools with no per-user charges. ShareMyToolbox starts at $100/month plus $10 per additional user.',
  },
  {
    question: 'What\'s the best tool checkout system for contractors?',
    answer:
      'A good checkout system logs every hand-off with a timestamp and a responsible person, and lets you audit from a phone. Smarter Tracks is built around exactly that, with no tags or scanners required.',
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
          name: 'What is the best tool tracking software for construction?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'It depends on what you track. For hand and power tools moving between crews, Smarter Tracks gives check-out/check-in accountability with no hardware and flat pricing. For tag-and-gateway tracking at large contractors, Hilti ON!Track is the established choice. For heavy equipment with GPS, Tenna.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the best tool tracking app for construction?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'If you want crews to check tools in and out from their phones with no tags to buy, Smarter Tracks (iOS and Android). If your tools are mostly Milwaukee, the free ONE-KEY app. For barcode scanning with unlimited tools, ShareMyToolbox.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need GPS or Bluetooth tags to track construction tools?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Not for most hand and power tools. A custody-based system records who has each tool and when it moved, without any hardware. GPS makes most sense for heavy equipment and vehicles.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does construction tool tracking software cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'From free (Sortly\'s free plan, the ONE-KEY app) to quote-based enterprise systems (Hilti ON!Track, Tenna, ToolWatch). Smarter Tracks is $185/month for 15 users and 150 tools with no per-user charges.',
          },
        },
        {
          '@type': 'Question',
          name: 'What\'s the best tool checkout system for contractors?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A good checkout system logs every hand-off with a timestamp and a responsible person, and lets you audit from a phone. Smarter Tracks is built around exactly that, with no tags or scanners required.',
          },
        },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'Best tool tracking software for construction (2026)',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Smarter Tracks', url: 'https://www.smartertracks.com/' },
        { '@type': 'ListItem', position: 2, name: 'Hilti ON!Track' },
        { '@type': 'ListItem', position: 3, name: 'ShareMyToolbox' },
        { '@type': 'ListItem', position: 4, name: 'GoCodes' },
        { '@type': 'ListItem', position: 5, name: 'Tenna' },
        { '@type': 'ListItem', position: 6, name: 'Milwaukee ONE-KEY' },
        { '@type': 'ListItem', position: 7, name: 'Sortly' },
        { '@type': 'ListItem', position: 8, name: 'ToolWatch by AlignOps' },
      ],
    },
  ],
}

export default function BestToolTrackingSoftwareConstruction() {
  useEffect(() => {
    setPageMeta({
      title: 'Best Tool Tracking Software for Construction (2026)',
      description:
        'Compare the best construction tool tracking software and apps for 2026: Smarter Tracks, ShareMyToolbox, Hilti ON!Track, GoCodes, Tenna, Milwaukee ONE-KEY, Sortly and ToolWatch. Pricing, hardware and who each is best for.',
      canonicalPath: '/best-tool-tracking-software-construction',
    })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <MarketingHeader />

      <article className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Best Tool Tracking Software for Construction (2026)
          </h1>
          <p className="mt-4 text-sm text-gray-500">
            Last updated: October 2026 · Written by Brock Coburn, founder of Smarter Tracks
          </p>
          <p className="mt-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">About the author: </span>
            Brock Coburn has worked across the HVAC trade, from hands-on pre-apprentice field work to office operations and sales. He built Smarter Tracks first for a mechanical contracting business, to fix its tool tracking.
          </p>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <p className="font-semibold text-gray-900">
              Short answer: the best construction tool tracking software depends on what you're trying to track.
            </p>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
              <li>
                <strong>For hand and power tools moving between crews and jobsites, with no tags to buy:</strong> Smarter Tracks. It's a phone-based check-out/check-in app with flat pricing and no per-user fees.
              </li>
              <li>
                <strong>For large contractors who want Bluetooth tags and gateways, especially fleets already on Hilti tools:</strong> Hilti ON!Track.
              </li>
              <li>
                <strong>For barcode/QR tracking with unlimited tools:</strong> ShareMyToolbox or GoCodes.
              </li>
              <li>
                <strong>For heavy equipment and vehicles with GPS telematics:</strong> Tenna.
              </li>
              <li>
                <strong>For crews already invested in Milwaukee tools:</strong> Milwaukee ONE-KEY.
              </li>
            </ul>
          </div>

          <blockquote className="mt-8 border-l-4 border-blue-600 bg-blue-50 px-5 py-4 text-gray-700">
            <strong>A note on fairness:</strong> we make Smarter Tracks, so we're biased. We've tried to keep this useful anyway. Every price and hardware detail below comes from each vendor's own website (checked September 2026), and we say where each tool is a better fit than ours.
          </blockquote>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">Quick comparison</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-900">Software</th>
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

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">How to choose: 3 questions</h2>
          <div className="mt-6 space-y-6 text-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">1. Do you need to know where a tool <em>physically</em> is, or <em>who</em> is responsible for it?</h3>
              <p className="mt-2">
                GPS and Bluetooth systems (Hilti ON!Track, Tenna, ONE-KEY) show a location, but you have to buy tags or trackers and keep them charged and attached. For most hand and power tools, the question a foreman actually asks is "who had it last?" A custody-based check-out system answers that with no hardware at all.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">2. How many people will use it?</h3>
              <p className="mt-2">
                Per-user pricing adds up fast on construction crews. Flat-priced plans (Smarter Tracks) or plans with unlimited view-only users (ShareMyToolbox) cost less as the crew grows.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">3. Tools, or equipment and fleet?</h3>
              <p className="mt-2">
                Excavators, trailers and trucks need telematics (Tenna, Hilti's GPS trackers). Drills, lasers, saws and meters don't, and that's where most losses happen.
              </p>
            </div>
          </div>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">The options in more detail</h2>

          <section className="mt-8">
            <h3 className="text-2xl font-bold text-gray-900">1. Smarter Tracks: best for tool check-out and accountability without hardware</h3>
            <p className="mt-3 text-gray-700">
              Smarter Tracks is tool tracking software built for construction and trades teams. Every tool is assigned to a person, vehicle or location. When it changes hands, the transfer is logged with a timestamp and the person responsible, so there's always a clear record of who has it. Crews run audits from their phones, attach photos and report damaged tools.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
              <li><strong>Hardware:</strong> none. It runs on the crew's iOS and Android phones, and setup takes a day.</li>
              <li>
                <strong>Pricing:</strong>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>free trial (3 users, 5 tools, no card)</li>
                  <li>Starter $185/mo (15 users, 150 tools)</li>
                  <li>Pro $315/mo (75 users, 750 tools)</li>
                  <li>custom plans for larger teams</li>
                  <li>no per-user charges and no long-term contract</li>
                </ul>
              </li>
              <li><strong>Good fit if:</strong> tools walk between crews and jobsites, and you want accountability without buying and maintaining tags.</li>
              <li><strong>Less of a fit if:</strong> you need live GPS location of heavy equipment. Smarter Tracks records custody (who has a tool, and where it's stored or assigned), not live position. Plans also cap tool counts (150 on Starter, 750 on Pro). It's also a newer product (founded 2025), with 600+ tools tracked so far.</li>
            </ul>
            <p className="mt-4">
              <Link to="/construction-tool-management" className="text-blue-600 hover:text-blue-700 font-semibold">
                See construction tool tracking with Smarter Tracks &rarr;
              </Link>
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">2. Hilti ON!Track: best for large contractors wanting tags and gateways</h3>
            <p className="mt-3 text-gray-700">
              ON!Track combines asset tracking software with durable Bluetooth tags and inventory gateways, so equipment can be checked remotely. GPS trackers are also available for heavy equipment and vehicles. It's a strong fit for larger contractors, especially those already using Hilti tools and services. Pricing is by quote.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">3. ShareMyToolbox: best for barcode/QR tracking with unlimited tools</h3>
            <p className="mt-3 text-gray-700">
              ShareMyToolbox tracks unlimited tools with barcode and QR scanning, captures GPS location on each scan, and includes kits, consumables and reporting. The Business plan is $100/month for the first admin plus $10 per additional employee or admin, with unlimited view-only users. There's a 14-day free trial.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">4. GoCodes: best for QR tags with GPS location on scan</h3>
            <p className="mt-3 text-gray-700">
              GoCodes uses QR tags (custom tags are included from the Premium plan) and records GPS location when a tag is scanned. It's priced per asset: from $500/year for 200 assets and 3 users, up to $2,500/year for 2,000 assets and 20 users.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">5. Tenna: best for heavy equipment and fleet</h3>
            <p className="mt-3 text-gray-700">
              Tenna is built for construction fleet and equipment management: GPS telematics, BLE trackers, maintenance, and safety and compliance. It's the stronger choice when the priority is machines and vehicles rather than hand tools. Pricing is custom.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">6. Milwaukee ONE-KEY: best for crews on Milwaukee tools</h3>
            <p className="mt-3 text-gray-700">
              The ONE-KEY app is free. Connected Milwaukee tools have Bluetooth built in, and other items can be tracked with ONE-KEY tags through a crowdsourced Bluetooth network. It's ideal if your tool fleet is mostly Milwaukee.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">7. Sortly: best for general inventory</h3>
            <p className="mt-3 text-gray-700">
              Sortly is a general-purpose inventory app with barcode/QR labels and a free plan. It's good for small shops tracking stock and supplies. Paid plans start at $49/month, with limits on items and user licences.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">8. ToolWatch by AlignOps: best for enterprise tool cribs</h3>
            <p className="mt-3 text-gray-700">
              ToolWatch is an established enterprise system for large contractors that run tool cribs and warehouses. Pricing is by quote.
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
              <Link to="/construction-tool-management" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50">
                Construction tool tracking
              </Link>
              <Link to="/tool-checkout-system" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50">
                Tool checkout system
              </Link>
              <Link to="/best-hvac-tool-tracking-software" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50">
                Best HVAC tool tracking software
              </Link>
            </div>
          </div>
        </div>
      </article>

      <section className="py-16 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">See Smarter Tracks on your tools</h2>
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
