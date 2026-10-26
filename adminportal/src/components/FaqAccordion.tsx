type FaqItem = {
  question: string
  answer: string
}

type FaqAccordionProps = {
  items: FaqItem[]
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
      {items.map((item) => (
        <details key={item.question} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <span aria-hidden="true" className="text-2xl leading-none text-gray-400 group-open:rotate-45 transition-transform">
              +
            </span>
          </summary>
          <p className="mt-3 text-gray-600">{item.answer}</p>
        </details>
      ))}
    </div>
  )
}
