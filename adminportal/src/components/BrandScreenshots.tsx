const SHOTS = [
  {
    src: '/screenshots/smarter-tracks-hvac-tool-tracking-app-tool-list.png',
    alt: 'Smarter Tracks HVAC tool tracking app: tool list showing who has each tool',
    caption: 'Smarter Tracks app: the tool list, with who has each tool',
  },
  {
    src: '/screenshots/smarter-tracks-tool-checkout-app.png',
    alt: 'Smarter Tracks tool checkout app: recent checkouts and transfers',
    caption: 'Smarter Tracks app: checkouts and transfers',
  },
  {
    src: '/screenshots/smarter-tracks-tool-details-custody.png',
    alt: 'Smarter Tracks tool tracking app: tool details with custody and location',
    caption: 'Smarter Tracks app: tool details, custody and location',
  },
]

export default function BrandScreenshots() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
      {SHOTS.map((shot) => (
        <figure key={shot.src}>
          <img src={shot.src} alt={shot.alt} className="w-full rounded-xl border border-gray-200 shadow-sm" />
          <figcaption className="mt-2 text-sm text-gray-600">{shot.caption}</figcaption>
        </figure>
      ))}
    </div>
  )
}
