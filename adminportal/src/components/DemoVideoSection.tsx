type DemoVideoSectionProps = {
  title?: string
  subtitle?: string
}

export default function DemoVideoSection({
  title = 'See Smarter Tracks in Action',
  subtitle = 'Watch a quick demo to learn how teams track, transfer, and audit their tools.',
}: DemoVideoSectionProps) {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h3 className="text-3xl font-extrabold text-gray-900">{title}</h3>
        <p className="mt-4 text-xl text-gray-600">{subtitle}</p>
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
  )
}
