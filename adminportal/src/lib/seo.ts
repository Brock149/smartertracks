export type PageMeta = {
  title: string
  description: string
  canonicalPath?: string
}

export function setPageMeta({ title, description, canonicalPath }: PageMeta) {
  if (typeof document === 'undefined') {
    return
  }

  document.title = title

  const descriptionTag =
    document.head.querySelector('meta[name="description"]') || document.createElement('meta')
  descriptionTag.setAttribute('name', 'description')
  descriptionTag.setAttribute('content', description)
  if (!descriptionTag.parentNode) {
    document.head.appendChild(descriptionTag)
  }

  const canonicalTag =
    document.head.querySelector('link[rel="canonical"]') || document.createElement('link')
  canonicalTag.setAttribute('rel', 'canonical')
  const path = canonicalPath || window.location.pathname
  canonicalTag.setAttribute('href', `${window.location.origin}${path}`)
  if (!canonicalTag.parentNode) {
    document.head.appendChild(canonicalTag)
  }
}
