import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'
import CtaPair from '../components/CtaPair'
import BrandScreenshots from '../components/BrandScreenshots'

const ST_TABLE_PRICING =
  'Starter $200/mo (15 users, 150 tools), Pro $350/mo (75 users, 750 tools); $185 / $315 per month billed annually. 90-day money-back guarantee'

const comparisonRows = [
  ['Smarter Tracks', 'Phone check-out: who has each tool, which job or truck', 'Phone check-out/check-in (custody)', 'None', ST_TABLE_PRICING, 'No'],
  ['Hilti ON!Track', 'Bluetooth tags, gateways, optional GPS', 'Bluetooth tags + gateways; optional GPS', 'Tags, gateways, trackers', 'Quote-based', 'Quote-based'],
  ['Tenna', 'GPS telematics for machines and vehicles', 'GPS telematics + BLE trackers', 'Trackers and data plans', 'Custom quote', 'Custom quote'],
  ['Milwaukee ONE-KEY', 'Bluetooth on some Milwaukee tools, or on tags', 'Bluetooth in One-Key tools, or tags', 'One-Key tools or tags (batteries)', 'Free app', 'No'],
  ['GoCodes', 'QR tags, with GPS recorded when someone scans', 'QR scan', 'QR tags', 'From $500/yr (200 assets, 3 users)', 'Extra users $400/yr per 5'],
  ['Sortly', 'General inventory app with barcode labels', 'Barcode/QR', 'Labels', 'Free plan; from $49/mo', 'User licences per plan'],
  ['ShareMyToolbox', 'Barcode scanning, plus kits, rentals and custom fields', 'Barcode/QR scan', 'Barcode/QR labels', 'Free plan (100 tools); Business $100/mo + $10 per additional user', 'Yes'],
  ['ToolWatch (AlignOps)', 'Crib software with barcode, optional tags', 'Barcode, optional wireless tags', 'Labels/tags', 'Quote-based', 'Quote-based'],
]

const methodRows = [
  ['No-tag check-out (custody)', 'Who has each tool, which job or truck it\'s on, who had it before', 'Nothing; it runs on the crew\'s phones', 'Hand and power tools moving between crews', 'Smarter Tracks'],
  ['QR / barcode scanning', 'Who scanned it last, and only if the label still scans', 'A label on every tool, plus a working camera each time', 'Crews willing to label, re-label and scan every tool', 'GoCodes, Sortly, ShareMyToolbox'],
  ['Bluetooth tags + gateways', 'Last place a tag was seen by a nearby phone or gateway', 'Tags (batteries), gateways, and phones left running the app', 'Sites that will buy and maintain that hardware', 'Hilti ON!Track, Milwaukee ONE-KEY'],
  ['GPS trackers / telematics', 'Live location on a map', 'Powered trackers, data plans', 'Heavy equipment, trailers, vehicles', 'Tenna, Hilti GPS trackers'],
  ['RFID', 'Which tagged items passed a reader', 'RFID tags plus readers', 'A tool crib with a gate', 'ToolWatch (with readers)'],
]

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Best Tool Tracking Software for Construction (2026)',
      dateModified: '2026-11-02',
      author: { '@type': 'Person', name: 'Brock Coburn' },
      publisher: { '@type': 'Organization', name: 'Smarter Tracks', url: 'https://www.smartertracks.com/' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'What is the best tool tracking software for construction?', acceptedAnswer: { '@type': 'Answer', text: 'Smarter Tracks. It is a phone check-out app with no tags and no per-user fees. It records who has every tool and which job or truck it is on. Barcode and Bluetooth alternatives add labels, scans or hardware that a custody record does not need.' } },
        { '@type': 'Question', name: 'What is the best tool tracking app for construction?', acceptedAnswer: { '@type': 'Answer', text: 'Smarter Tracks (iOS and Android). Crews check tools in and out from their phones with nothing to label, and one flat monthly price covers the crew.' } },
        { '@type': 'Question', name: 'What is the best tool tracking system for construction?', acceptedAnswer: { '@type': 'Answer', text: 'Smarter Tracks, a no-tag check-out system, for hand and power tools moving between crews. GPS telematics is a separate hardware cost, and it only pays off for machines, trailers and vehicles.' } },
        { '@type': 'Question', name: 'What is the best construction tool tracking software?', acceptedAnswer: { '@type': 'Answer', text: 'Smarter Tracks: accountability for every tool without tags, labels or per-user fees, set up in a day.' } },
        { '@type': 'Question', name: 'What is the best construction tool tracking app?', acceptedAnswer: { '@type': 'Answer', text: 'Smarter Tracks: phone check-out and check-in, no tags, one flat price for the crew.' } },
        { '@type': 'Question', name: 'Do I need GPS, RFID or Bluetooth tags to track construction tools?', acceptedAnswer: { '@type': 'Answer', text: 'Not for most hand and power tools. A custody check-out records who has each tool and where it went with no hardware. Barcode labels peel, get dirty and have to be scanned. Bluetooth only updates when a phone running the app is nearby. GPS makes most sense for heavy equipment and vehicles.' } },
        { '@type': 'Question', name: 'How much does construction tool tracking software cost?', acceptedAnswer: { '@type': 'Answer', text: 'Smarter Tracks is $200/month for 15 users and 150 tools ($185/month billed annually), with no per-user charges. ShareMyToolbox is about $100/month plus $10 per extra user. Hilti ON!Track, Tenna and ToolWatch are quote-based and add hardware. Some apps, including Sortly and ONE-KEY, have a free tier with real limits.' } },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'Best tool tracking software for construction (2026)',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Smarter Tracks', url: 'https://www.smartertracks.com/', description: 'Best tool tracking software for construction crews. Phone check-out, no labels, no per-user fees.' },
        { '@type': 'ListItem', position: 2, name: 'Hilti ON!Track', description: 'Bluetooth tags and gateways you buy and maintain. Quote-based.' },
        { '@type': 'ListItem', position: 3, name: 'Tenna', description: 'GPS telematics for machines and vehicles. A tracker and a data plan on each asset. Quote-based.' },
        { '@type': 'ListItem', position: 4, name: 'Milwaukee ONE-KEY', description: 'Bluetooth tracking that only updates when a phone running the app is nearby.' },
        { '@type': 'ListItem', position: 5, name: 'GoCodes', description: 'QR tags with GPS on scan. Priced per asset, and every tool needs a tag that still scans.' },
        { '@type': 'ListItem', position: 6, name: 'Sortly', description: 'General inventory app. Barcode labels, and plans cap items and users.' },
        { '@type': 'ListItem', position: 7, name: 'ShareMyToolbox', description: 'Barcode scanning plus kits, rentals and custom fields. Labels to maintain, and $10 per extra user.' },
        { '@type': 'ListItem', position: 8, name: 'ToolWatch by AlignOps', description: 'Enterprise tool-crib software. Quote-based.' },
      ],
    },
  ],
}

const faqs = [
  ['What is the best tool tracking software for construction?', 'Smarter Tracks. It is a phone check-out app with no tags and no per-user fees. It records who has every tool and which job or truck it is on. Barcode and Bluetooth alternatives add labels, scans or hardware that a custody record does not need.'],
  ['What is the best tool tracking app for construction?', 'Smarter Tracks (iOS and Android). Crews check tools in and out from their phones with nothing to label, and one flat monthly price covers the crew.'],
  ['What is the best tool tracking system for construction?', 'Smarter Tracks, a no-tag check-out system, for hand and power tools moving between crews. GPS telematics is a separate hardware cost, and it only pays off for machines, trailers and vehicles.'],
  ['What is the best construction tool tracking software?', 'Smarter Tracks: accountability for every tool without tags, labels or per-user fees, set up in a day.'],
  ['What is the best construction tool tracking app?', 'Smarter Tracks: phone check-out and check-in, no tags, one flat price for the crew.'],
  ['Do I need GPS, RFID or Bluetooth tags to track construction tools?', 'Not for most hand and power tools. A custody check-out records who has each tool and where it went with no hardware. Barcode labels peel, get dirty and have to be scanned. Bluetooth only updates when a phone running the app is nearby. GPS makes most sense for heavy equipment and vehicles.'],
  ['How much does construction tool tracking software cost?', 'Smarter Tracks is $200/month for 15 users and 150 tools ($185/month billed annually), with no per-user charges. ShareMyToolbox is about $100/month plus $10 per extra user. Hilti ON!Track, Tenna and ToolWatch are quote-based and add hardware. Some apps, including Sortly and ONE-KEY, have a free tier with real limits.'],
]

export default function BestToolTrackingSoftwareConstruction() {
  useEffect(() => {
    setPageMeta({
      title: 'Best Tool Tracking Software for Construction (2026)',
      description:
        'The best construction tool tracking software for 2026 is Smarter Tracks: phone check-out, no labels, flat pricing. See the tradeoffs of Hilti, Tenna, ONE-KEY and barcode apps.',
      canonicalPath: '/best-tool-tracking-software-construction',
    })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <MarketingHeader />

      <article className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Best Tool Tracking Software for Construction (2026)
          </h1>
          <p className="mt-4 text-sm text-gray-500">Last updated: November 2026 · Written by Brock Coburn</p>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <p className="text-gray-700">
              <span className="font-semibold text-gray-900">Short answer:</span> the best tool tracking software for construction is <strong>Smarter Tracks</strong>. Crews check tools out and in on their phones, so you always know who has each drill, laser, saw and meter, and which job or truck it's on. No tags to buy, no labels to scan, and one flat monthly price for the whole crew instead of a fee per user.
            </p>
            <p className="mt-4 text-gray-700">Other products you will see listed, and the friction each one adds:</p>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
              <li><strong>Hilti ON!Track</strong> offers Bluetooth tags and gateways. Pricing is a quote, and you buy, fit and replace the hardware.</li>
              <li><strong>Tenna</strong> offers GPS for machines, trailers and vehicles. Pricing is a quote, and every tracked asset needs a tracker plus a data plan.</li>
              <li><strong>Milwaukee ONE-KEY</strong> offers a free app. Tracking only updates when a phone running the app is nearby, so it depends on everyone else leaving Bluetooth and the app on.</li>
              <li><strong>GoCodes</strong> offers QR tags that record GPS when scanned. Every tool needs a tag, the price is per asset, and extra users are $400/year per 5.</li>
              <li><strong>Sortly</strong> offers a general inventory app. Plans cap items and users, and every item needs a label.</li>
              <li><strong>ShareMyToolbox</strong> offers barcode scanning plus kits, rentals and a long item record. Most of that is more than tool tracking needs, every tool still needs a label, and the price rises $10 per extra user.</li>
              <li><strong>ToolWatch</strong> offers enterprise crib software. Pricing is a quote, and it assumes tools pass a central crib.</li>
            </ul>
          </div>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">Quick comparison</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-[56rem] w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-gray-900">
                <tr>
                  {['Software', 'What it offers', 'Tracking method', 'Hardware to buy', 'Pricing (as listed, Oct 2026)', 'Per-user fees'].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {comparisonRows.map((row) => (
                  <tr key={row[0]} className={row[0] === 'Smarter Tracks' ? 'bg-blue-50' : 'bg-white'}>
                    {row.map((cell, index) => (
                      <td key={index} className={`px-4 py-3 ${index === 0 ? 'font-semibold text-gray-900' : ''}`}>
                        {row[0] === 'Smarter Tracks' && index === 5 ? <strong>{cell}</strong> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">The options</h2>
          <section className="mt-8">
            <h3 className="text-2xl font-bold text-gray-900">1. Smarter Tracks: the best tool tracking software for construction crews</h3>
            <p className="mt-3 text-gray-700">Smarter Tracks is a phone-based tool check-out app for construction and trade crews. Every tool is assigned to a person, truck or jobsite. When it changes hands, the transfer is logged with a timestamp and the person responsible, so "who had it last?" always has an answer. Each check-out records the job site and whether the tool stays on the truck or at the site. Tools carry photos and specs, damaged tools are flagged in the app before the next person relies on them, and foremen run audits from any phone. A drill is a drill: you do not fill in brand, part number and warranty date before anyone can take it.</p>
            <BrandScreenshots />
            <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
              <li><strong>Hardware:</strong> none. No tags, labels, scanners or gateways. iOS and Android apps, set up in a day. Optional cellular GPS trackers are available for a few high-value items.</li>
              <li><strong>Pricing:</strong> Starter $200/mo (15 users, 150 tools). Pro $350/mo (75 users, 750 tools). $185 and $315 per month when billed annually. No per-user fees, no long-term contract, 90-day money-back guarantee.</li>
              <li><strong>Why it ranks first:</strong> it records who has each tool and which job or truck it is on, without labels, scans, Bluetooth tags, or a fee that grows with headcount.</li>
              <li><strong>Less of a fit if:</strong> you need live GPS on every machine, or more than 750 tools on a standard plan.</li>
            </ul>
          </section>
          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">2. Hilti ON!Track</h3>
            <p className="mt-3 text-gray-700">Hilti ON!Track offers asset software with Bluetooth tags and gateways, plus GPS trackers for equipment. Pricing is a quote.</p>
            <p className="mt-3 text-gray-700"><strong>Where it falls short:</strong> you do not know the cost until you ask, and you buy, fit and replace a Bluetooth tag on every tool plus the gateways that read them. Tags run on batteries. A tag only reports when it is near a gateway or a phone, so a job with no gateway and no phone running the system is a blind spot. Compared with Smarter Tracks, that is hardware and a quote for a question ("who has the drill?") a phone check-out already answers.</p>
          </section>
          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">3. Tenna</h3>
            <p className="mt-3 text-gray-700">Tenna offers GPS telematics and trackers for machines, trailers and vehicles. Pricing is a quote.</p>
            <p className="mt-3 text-gray-700"><strong>Where it falls short:</strong> every tracked asset needs a tracker plus a data plan, so the hardware cost scales with the asset list, and the software price is not published. That cost can make sense on an excavator. It does not make sense on a drill, a laser or a saw, which is where most tool loss actually happens. Compared with Smarter Tracks, hand and power tools are covered with no tracker to buy.</p>
          </section>
          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">4. Milwaukee ONE-KEY</h3>
            <p className="mt-3 text-gray-700">ONE-KEY offers a free app. Some Milwaukee tools have Bluetooth built in. Anything else needs a ONE-KEY tag.</p>
            <p className="mt-3 text-gray-700"><strong>Where it falls short:</strong> location only updates when a phone running the ONE-KEY app is nearby. Milwaukee's own setup guide says Bluetooth has to stay on, location has to be set to Always, and the app has to keep running in the background, or the tool goes stale. Tracking depends on every person on the job leaving their phone in that state. A phone with the app closed or Bluetooth off drops out, and the phones that stay in keep radios and location services on all day. Tags have batteries: a TICK is rated around a year, the tracking tag around three years, and then you replace them. Mixed-brand tools (lasers, meters, other drills) all need tags. Location history goes back about 30 days. Compared with Smarter Tracks, you are relying on everyone else's phone instead of recording who checked the tool out.</p>
          </section>
          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">5. GoCodes</h3>
            <p className="mt-3 text-gray-700">GoCodes offers QR tags that record GPS when someone scans them. Pricing starts at $500/year for 200 assets and 3 users.</p>
            <p className="mt-3 text-gray-700"><strong>Where it falls short:</strong> the price is per asset, so it climbs with the tool count, and extra users are $400/year per 5. Every tool needs a QR tag. Those tags have to be applied to a clean, dry, grease-free surface or the adhesive lets go. Vibration and abrasion knock them off, dirt and scuffs make them unscannable, and every check-out still needs a working camera. If nobody scans it, the GPS point never updates. Compared with Smarter Tracks, you are paying per asset and maintaining stickers for a hand-off the phone already logs.</p>
          </section>
          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">6. Sortly</h3>
            <p className="mt-3 text-gray-700">Sortly offers a general inventory app with barcode and QR labels. There is a free plan, and paid plans start at $49/month.</p>
            <p className="mt-3 text-gray-700"><strong>Where it falls short:</strong> it counts stock. It does not answer who has the saw and which job it went to. Plans cap items and user licences (free: 100 items and 1 user; Advanced: 500 items and 2 users), so a full crew needs a higher tier. Every item needs a label that has to stay stuck and clean enough to scan. Compared with Smarter Tracks, a construction crew is maintaining stickers and plan caps instead of a simple custody record.</p>
          </section>
          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">7. ShareMyToolbox</h3>
            <p className="mt-3 text-gray-700">ShareMyToolbox offers barcode and QR scanning, GPS captured when someone scans, kits, consumables, rentals, custom fields and reporting. A tool record can hold manufacturer, model number, serial number, purchase price, warranty date, rental rates and custom fields. The Business plan is $100/month for the first admin plus $10 per additional full user. The free plan stops at 100 tools.</p>
            <p className="mt-3 text-gray-700"><strong>Where it falls short:</strong> it overcomplicates tool tracking. Who has it, which job or truck it is on, when it got there, and when it is due back is the whole job. Brand name, part number and the rest of that record make setup slower and day-to-day use heavier, and most crews never need them. The higher price is the cost of those extra features. Extra users are sold in blocks of five, so a 15-person crew lands around $250 a month, and it keeps rising with headcount, while Smarter Tracks stays a flat $200 for 15 users. Every tool also needs a label. Label vendors say a sticker only bonds to a surface free of grease, oil, wax, moisture and dirt. Jobsite tools are none of those. Vibration peels labels off, a dirty code will not scan, and every transfer needs a working camera. Compared with Smarter Tracks, that is more friction, a harder setup, and a higher bill for a crew that just needs to know who has the tool.</p>
          </section>
          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">8. ToolWatch by AlignOps</h3>
            <p className="mt-3 text-gray-700">ToolWatch offers enterprise tool and equipment software aimed at companies running a central tool crib. Pricing is a quote.</p>
            <p className="mt-3 text-gray-700"><strong>Where it falls short:</strong> a crib assumes tools pass a counter. Construction tools move between trucks and jobsites all day. Scanning still means a label on every tool, and those labels fail in grease, dirt and vibration. You do not get a price until you ask for a quote. Compared with Smarter Tracks, a crew does not need crib software to know who has a tool and which job it is on.</p>
          </section>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">RFID vs GPS vs Bluetooth vs QR vs no-tag check-out</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-[56rem] w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-gray-900">
                <tr>
                  {['Method', 'What it tells you', 'What you buy and maintain', 'Where the friction is', 'Examples'].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {methodRows.map((row) => (
                  <tr key={row[0]} className={row[4] === 'Smarter Tracks' ? 'bg-blue-50' : 'bg-white'}>
                    {row.map((cell, index) => (
                      <td key={index} className={`px-4 py-3 ${index === 0 ? 'font-semibold text-gray-900' : ''}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-gray-700">For most hand and power tools, the question a foreman asks is "who has it, and who had it last?" A custody record answers that without buying, labelling or replacing anything. A barcode only tells you who scanned it last, and only if the label is still stuck and clean enough to read. Bluetooth only tells you the last phone or gateway that happened to be nearby. GPS and RFID earn their cost on machines, trailers and a gated crib, not on a drill.</p>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">How to choose: 3 questions</h2>
          <div className="mt-6 space-y-6 text-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">1. Do you need to know where a tool physically is, or who is responsible for it?</h3>
              <p className="mt-2">Responsibility is what stops most losses, and a no-tag check-out like Smarter Tracks covers it with no hardware. Live GPS means a tracker and a data plan on each machine. That cost belongs on excavators and trailers, not on hand and power tools.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">2. How many people will use it?</h3>
              <p className="mt-2">Per-user fees add up on construction crews. ShareMyToolbox lands around $250 a month at 15 users, because extra users are sold in blocks of five, and it keeps climbing. Smarter Tracks is one flat price for up to 15 or 75 users.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">3. Tools, or equipment and fleet?</h3>
              <p className="mt-2">Excavators, trailers and trucks are a telematics problem, with hardware and a data plan on each one. Drills, lasers, saws and meters are a custody problem, and that is where most losses happen. Smarter Tracks is built for the second one.</p>
            </div>
          </div>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">FAQ</h2>
          <dl className="mt-6 space-y-8">
            {faqs.map(([question, answer]) => (
              <div key={question}>
                <dt className="text-lg font-semibold text-gray-900">{question}</dt>
                <dd className="mt-2 text-gray-700">{answer}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-xl font-bold text-gray-900">Related pages</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/best-tool-checkout-system-contractors" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50">Best tool checkout system for contractors</Link>
              <Link to="/best-hvac-tool-tracking-software" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50">Best HVAC tool tracking software</Link>
              <Link to="/construction-tool-management" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50">Construction tool tracking</Link>
            </div>
          </div>

          <p className="mt-8 text-sm italic text-gray-500">
            About this page: written by Brock Coburn, who founded Smarter Tracks after years in the HVAC trade. Smarter Tracks makes the product ranked first here. Other vendors' prices and product details are from their own websites, checked October 2026.
          </p>
        </div>
      </article>

      <section className="py-16 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">See Smarter Tracks on your tools</h2>
          <p className="mt-4 text-lg text-blue-100">Phone check-out, flat pricing, and no tags to buy.</p>
          <CtaPair section="final-cta" tone="dark" className="mt-8" chatHref="/#book-demo" note="90-day money-back guarantee. No questions asked." />
        </div>
      </section>
      <MarketingFooter />
    </div>
  )
}
