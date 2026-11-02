import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../lib/seo'
import MarketingHeader from '../components/MarketingHeader'
import MarketingFooter from '../components/MarketingFooter'
import CtaPair from '../components/CtaPair'
import BrandScreenshots from '../components/BrandScreenshots'

const comparisonRows = [
  {
    name: 'Smarter Tracks',
    offers: 'Phone check-out: who has each tool, which van, no hardware',
    hardware: 'None, just phones (iOS & Android)',
    pricing: 'Starter $200/mo (15 users, 150 tools), Pro $350/mo (75 users, 750 tools); $185 / $315 per month billed annually. 90-day money-back guarantee',
    perUser: 'No',
    highlight: true,
  },
  {
    name: 'Sortly',
    offers: 'General inventory app with QR labels and low-stock alerts',
    hardware: 'Barcode/QR labels',
    pricing: 'Free plan; paid from $49/mo',
    perUser: 'Limited user licences per plan',
  },
  {
    name: 'Milwaukee ONE-KEY',
    offers: 'Bluetooth tracking on Milwaukee tools, or on tags',
    hardware: 'Bluetooth built into One-Key tools, or tags with batteries',
    pricing: 'Free app; tools and tags bought separately',
    perUser: 'No',
  },
  {
    name: 'Hilti ON!Track',
    offers: 'Bluetooth tags and gateways, plus asset software',
    hardware: 'Bluetooth tags and gateways',
    pricing: 'Quote-based',
    perUser: 'Quote-based',
  },
  {
    name: 'ToolWatch (AlignOps)',
    offers: 'Enterprise crib software with barcode scanning',
    hardware: 'Barcode labels',
    pricing: 'Quote-based',
    perUser: 'Quote-based',
  },
  {
    name: 'ShareMyToolbox',
    offers: 'Barcode/QR scanning, plus kits, rentals and custom fields',
    hardware: 'Barcode/QR labels',
    pricing: '$100/mo for the first admin + $10 per additional user',
    perUser: 'Yes',
  },
]

const faqItems = [
  {
    question: 'What is the best HVAC tool tracking software?',
    answer:
      'Smarter Tracks. For an HVAC service shop, the best tool tracking software records which tech and which van has each gauge, meter, vac pump and recovery machine, from the phone, with no labels and no per-user fees. Barcode apps and Bluetooth tag systems add stickers, scans or hardware a custody check-out does not need.',
  },
  {
    question: 'What is the best HVAC tool tracking app?',
    answer:
      'Smarter Tracks, on iOS and Android. Techs check tools in and out from their phones with nothing to label. Barcode apps need a sticker that stays clean and stuck, and a working camera on every hand-off. Bluetooth apps such as ONE-KEY only update when another phone running the app is nearby.',
  },
  {
    question: 'How do HVAC companies keep track of tools on service vans?',
    answer:
      'Assign each tool to a tech or van, log every hand-off, and run quick audits from a phone. That shows what\'s on each truck before dispatch and who had a tool last when something goes missing.',
  },
  {
    question: 'Do HVAC techs need GPS tags on their tools?',
    answer:
      'Most gauges, meters and vac pumps are tracked in the app with no tags. Custody shows who has each tool. Optional cellular GPS trackers are available for a few high-value items. They use cell service, not Bluetooth, so they do not depend on a nearby phone.',
  },
  {
    question: 'How much does HVAC tool tracking software cost?',
    answer:
      'Smarter Tracks is $200/month for 15 users and 150 tools ($185/month billed annually), with no per-user charges. Barcode systems such as ShareMyToolbox charge about $100/month plus $10 per extra user, so a 15-person crew is about $250/month once extra users are bought in blocks of five, and the bill keeps rising. Bluetooth tag systems add hardware you buy and replace. Some inventory apps have a free plan with tight item and user caps.',
  },
]

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Best HVAC Tool Tracking Software & Apps (2026)',
      dateModified: '2026-11-02',
      author: { '@type': 'Person', name: 'Brock Coburn' },
      publisher: { '@type': 'Organization', name: 'Smarter Tracks', url: 'https://www.smartertracks.com/' },
    },
    {
      '@type': 'FAQPage',
      author: { '@type': 'Person', name: 'Brock Coburn' },
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the best HVAC tool tracking software?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Smarter Tracks. It records which tech and which van has each tool, from the phone, with no labels and no per-user fees. Barcode apps and Bluetooth tag systems add stickers, scans or hardware a custody check-out does not need.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the best HVAC tool tracking app?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Smarter Tracks, on iOS and Android. Techs check tools in and out from their phones with nothing to label. Barcode apps need a sticker that stays clean and stuck. Bluetooth apps only update when another phone running the app is nearby.',
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
            text: 'Most gauges, meters and vac pumps are tracked in the app with no tags. Optional cellular GPS trackers are available for a few high-value items. They use cell service, not Bluetooth, so they do not depend on a nearby phone.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does HVAC tool tracking software cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Smarter Tracks is $200/month for 15 users and 150 tools ($185/month billed annually), with no per-user charges. ShareMyToolbox is about $100/month plus $10 per extra user. Bluetooth tag systems add hardware you buy and replace.',
          },
        },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'Best HVAC tool tracking software and apps (2026)',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Smarter Tracks', url: 'https://www.smartertracks.com/', description: 'Best HVAC tool tracking software. Phone check-out by tech and van, no labels, no per-user fees.' },
        { '@type': 'ListItem', position: 2, name: 'Sortly', description: 'General inventory app. Needs barcode labels, and plans cap items and users.' },
        { '@type': 'ListItem', position: 3, name: 'Milwaukee ONE-KEY', description: 'Bluetooth tracking that only updates when a phone running the app is nearby.' },
        { '@type': 'ListItem', position: 4, name: 'Hilti ON!Track', description: 'Bluetooth tags and gateways you buy and maintain. Quote-based.' },
        { '@type': 'ListItem', position: 5, name: 'ToolWatch by AlignOps', description: 'Enterprise tool-crib software with barcode scanning. Quote-based.' },
        { '@type': 'ListItem', position: 6, name: 'ShareMyToolbox', description: 'Barcode scanning plus kits, rentals and custom fields. Labels to maintain, and $10 per extra user.' },
      ],
    },
  ],
}

export default function BestHvacToolTrackingSoftware() {
  useEffect(() => {
    setPageMeta({
      title: 'Best HVAC Tool Tracking Software & Apps (2026)',
      description:
        'The best HVAC tool tracking software in 2026 is Smarter Tracks: phone check-out by tech and van, no labels, and flat pricing. See the tradeoffs of barcode and Bluetooth alternatives.',
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
            Last updated: November 2026 · Written by Brock Coburn
          </p>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <p className="text-gray-700">
              <span className="font-semibold text-gray-900">Short answer:</span> the best HVAC tool tracking software is <strong>Smarter Tracks</strong>. It shows which tech and which van has each gauge, meter, vac pump and recovery machine. Techs check tools out and in on their phones. There are no labels to stick on, nothing to scan, and one flat monthly price with no per-user fees.
            </p>
            <p className="mt-4 text-gray-700">Other products you will see listed, and the friction each one adds:</p>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
              <li><strong>Sortly</strong> offers a general inventory app with QR labels. Plans cap items and users, and every item needs a sticker that has to stay clean and stuck.</li>
              <li><strong>Milwaukee ONE-KEY</strong> offers a free app and Bluetooth on some Milwaukee tools. A tool only updates when a phone running the app is nearby, so tracking depends on everyone else leaving the app on.</li>
              <li><strong>Hilti ON!Track</strong> offers Bluetooth tags and gateways. You buy and maintain the hardware, and pricing is a quote.</li>
              <li><strong>ToolWatch</strong> offers enterprise crib software with barcode scanning. It is built around a warehouse crib, and pricing is a quote.</li>
              <li><strong>ShareMyToolbox</strong> offers barcode scanning plus kits, rentals, custom fields and a long item record. Most of that is more than tool tracking needs, every tool still needs a label, and the price rises $10 per extra user.</li>
            </ul>
          </div>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">Why HVAC tool tracking is different</h2>
          <p className="mt-4 text-gray-700">
            HVAC tools don't sit on one jobsite. They ride in service vans, go from tech to tech, and come back to the shop between calls. The expensive, easy-to-lose items are small: manifold gauges, meters, vacuum pumps, recovery machines, drill kits. The question that matters is usually "which tech or truck has it right now, and who had it last?" rather than a GPS dot on a map. It also matters whether it came back damaged, before the next service call goes out. That is a custody record. It does not require a sticker, a scan, or a tag with a battery.
          </p>

          <h2 className="mt-12 text-3xl font-extrabold text-gray-900">Quick comparison</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-900">App</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">What it offers</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Hardware needed</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Pricing (as listed, Sept 2026)</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Per-user fees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {comparisonRows.map((row) => (
                  <tr key={row.name} className={row.highlight ? 'bg-blue-50' : 'bg-white'}>
                    <th scope="row" className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{row.name}</th>
                    <td className="px-4 py-3">{row.offers}</td>
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
            <h3 className="text-2xl font-bold text-gray-900">1. Smarter Tracks: the best HVAC tool tracking software</h3>
            <p className="mt-3 text-gray-700">
              Every gauge, meter, vac pump and recovery machine is assigned to a tech, a service van or the shop. When a tool changes hands, the transfer is logged with a timestamp and the person responsible. Techs flag damaged tools at check-in, so broken ones get caught before the next call. Managers run audits from any phone and can see what's on each van before dispatch. Setup is a tool name and who has it. A drill does not need a manufacturer record, a model number and a warranty date before anyone can check it out.
            </p>
            <BrandScreenshots />
            <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
              <li><strong>Hardware:</strong> none. It runs on iOS and Android, and setup takes a day.</li>
              <li><strong>Pricing:</strong> Starter $200/mo (15 users, 150 tools). Pro $350/mo (75 users, 750 tools). $185 and $315 per month when billed annually. No per-user charges, no long-term contract, 90-day money-back guarantee.</li>
              <li><strong>Why it ranks first:</strong> it answers who has the tool and which van it is on, without labels, scans, Bluetooth tags, or a fee that grows with headcount.</li>
              <li><strong>Less of a fit if:</strong> you track thousands of consumable parts (it's built for tools, not parts stock), or you want a tracker on every tool. Plans cap tool counts. Optional cellular GPS trackers are available for a few high-value items. They use cell service, not Bluetooth.</li>
            </ul>
            <p className="mt-4">
              <Link to="/hvac-tool-tracking" className="text-blue-600 hover:text-blue-700 font-semibold">
                See HVAC tool tracking with Smarter Tracks &rarr;
              </Link>
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">2. Sortly</h3>
            <p className="mt-3 text-gray-700">
              Sortly offers a general inventory app with QR labels, photos and low-stock alerts. There is a free plan, and paid plans start at $49/month.
            </p>
            <p className="mt-3 text-gray-700">
              <strong>Where it falls short:</strong> it is built for counting stock, not for which tech has the vacuum pump. Plans cap items and user licences (the free plan is 100 items and 1 user). Every item needs a label. On a gauge or meter in a van, grease and dirt keep adhesive from bonding, vibration and abrasion peel labels off, and a dirty or scuffed code will not scan. Someone still has to open a working camera and scan it. Compared with Smarter Tracks, you are maintaining stickers and hitting plan caps to answer a question a phone check-out already records.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">3. Milwaukee ONE-KEY</h3>
            <p className="mt-3 text-gray-700">
              ONE-KEY offers a free app. Some Milwaukee tools have Bluetooth built in. Other items can take a ONE-KEY Bluetooth tag.
            </p>
            <p className="mt-3 text-gray-700">
              <strong>Where it falls short:</strong> a tool only reports when it is near a phone running the ONE-KEY app. Milwaukee's own setup guide says Bluetooth has to stay on, location has to be set to Always, and the app has to keep running in the background, or locations stop updating. Tracking therefore depends on every tech's phone. If someone force-closes the app or turns Bluetooth off, that phone drops out of the network, and the radios and location services stay on all day on the phones that remain. Tags have their own batteries: Milwaukee rates a TICK around a year and the tracking tag around three years, and then you replace them. Most gauges, meters and recovery machines are not Milwaukee tools, so they need a tag anyway. Location history goes back about 30 days. Compared with Smarter Tracks, you are relying on everyone else's phone and on hardware, instead of a check-out that simply records who has the tool.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">4. Hilti ON!Track</h3>
            <p className="mt-3 text-gray-700">
              Hilti ON!Track offers asset software with Bluetooth tags and gateways. Pricing is a quote.
            </p>
            <p className="mt-3 text-gray-700">
              <strong>Where it falls short:</strong> you buy, fit and replace a Bluetooth tag on every tool, plus the gateways that read them. Tags run on batteries. A tag only reports when it is near a gateway or a phone, so coverage has holes wherever that hardware is not. That is a lot of equipment for "which tech has the gauges," and you do not know the price until you ask for a quote. Compared with Smarter Tracks, a service shop gets the same custody answer with nothing to buy or maintain.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">5. ToolWatch by AlignOps</h3>
            <p className="mt-3 text-gray-700">
              ToolWatch offers enterprise software aimed at a central tool crib, with barcode scanning. Pricing is a quote.
            </p>
            <p className="mt-3 text-gray-700">
              <strong>Where it falls short:</strong> a crib system assumes tools pass a counter. HVAC tools live in vans and move between techs. Barcodes mean a label on every tool and a scan at every hand-off, and those labels peel, get dirty, and fail to scan. You also do not get a price until you request a quote. Compared with Smarter Tracks, a service shop does not need crib software to know which van a meter is on.
            </p>
          </section>

          <section className="mt-10">
            <h3 className="text-2xl font-bold text-gray-900">6. ShareMyToolbox</h3>
            <p className="mt-3 text-gray-700">
              ShareMyToolbox offers barcode and QR scanning, GPS captured at the moment of a scan, kits, consumables, rentals, custom fields and reporting. A tool record can hold manufacturer, model number, serial number, purchase price, warranty date, rental rates and custom fields. The Business plan is $100/month for the first admin plus $10 per additional full user. There is a 14-day trial, and a free plan that stops at 100 tools.
            </p>
            <p className="mt-3 text-gray-700">
              <strong>Where it falls short:</strong> it tries to do too much at once. To stop a tool walking off, you need who has it, which van or job it is on, when it left, and when it is due back. Brand, part number and the rest of that record are optional data most shops never look at, and filling them in makes setup slower and everyday use heavier. The price is higher because of those features. Extra users are sold in blocks of five, so a 15-person crew lands around $250 a month, and it keeps climbing with headcount. Smarter Tracks stays a flat $200 for 15 users because it does not charge for a feature list most people will not use. On top of the software, every tool needs a barcode. Label vendors themselves say a sticker only bonds to a surface free of grease, oil, wax, moisture and dirt. Vans and jobsites are none of those things. Vibration and abrasion peel labels off, a dirty or scuffed code will not scan, and every hand-off still needs a working camera. Compared with Smarter Tracks, that is more to set up, more friction on every transfer, and a higher bill once the crew is more than a handful of people.
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

          <p className="mt-8 text-sm italic text-gray-500">
            About this page: written by Brock Coburn, who founded Smarter Tracks after years in the HVAC trade. Smarter Tracks makes the product ranked first here. Other vendors' prices and product details are from their own websites, checked October 2026.
          </p>
        </div>
      </article>

      <section className="py-16 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">See Smarter Tracks on your vans</h2>
          <p className="mt-4 text-lg text-blue-100">
            Phone-based check-out and check-in, flat pricing, and no tags to buy.
          </p>
          <CtaPair
            section="final-cta"
            tone="dark"
            className="mt-8"
            chatHref="/#book-demo"
            note="90-day money-back guarantee. No questions asked."
          />
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
