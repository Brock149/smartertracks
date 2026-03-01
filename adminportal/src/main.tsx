import './index.css'
import { StrictMode } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import App from './App.tsx'

const PRERENDERED_ROUTES = new Set([
  '/',
  '/tool-tracking-software',
  '/hvac-tool-tracking',
  '/construction-tool-management',
  '/tool-inventory-software',
  '/tool-checkout-system',
  '/privacy-policy',
  '/terms-and-conditions',
])

const rootEl = document.getElementById('root')!
const currentPath = window.location.pathname
const hasPrerenderedContent = rootEl.innerHTML.trim() !== ''
const routeWasPrerendered = PRERENDERED_ROUTES.has(currentPath)

if (hasPrerenderedContent && routeWasPrerendered) {
  // Hydrate the pre-rendered HTML — React "takes over" the existing DOM
  hydrateRoot(
    rootEl,
    <StrictMode>
      <App />
    </StrictMode>
  )
} else {
  // No matching pre-render — clear the fallback HTML and do a fresh render
  rootEl.innerHTML = ''
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
