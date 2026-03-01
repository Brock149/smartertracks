/**
 * Pre-render script: generates static HTML for each SEO route at build time.
 * This makes the content crawlable by Google without JavaScript execution.
 *
 * Run automatically after `vite build` via the build script in package.json.
 */

import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

const routesToRender = [
  {
    url: '/',
    title: 'Smarter Tracks | Tool Tracking Software for HVAC & Construction',
    description:
      'Smarter Tracks is tool tracking software for HVAC, construction, and trades teams. Track tools across jobsites, assign custody, run audits, and prevent tool loss.',
  },
  {
    url: '/tool-tracking-software',
    title: 'Tool Tracking Software for HVAC & Contractors | Smarter Tracks',
    description:
      'Simple mobile tool tracking app for HVAC, construction, and trades. Assign tools, prevent losses, run audits, and keep teams accountable.',
  },
  {
    url: '/hvac-tool-tracking',
    title: 'HVAC Tool Tracking App | Smarter Tracks',
    description:
      'HVAC tool tracking app built for real shop and field workflows. Assign tools, track locations, run audits, and keep techs accountable.',
  },
  {
    url: '/construction-tool-management',
    title: 'Construction Tool Tracking Software | Smarter Tracks',
    description:
      'Construction tool tracking software for contractors. Track tools across jobsites, assign custody, run audits, and reduce tool loss.',
  },
  {
    url: '/tool-inventory-software',
    title: 'Tool Inventory Software for Field Teams | Smarter Tracks',
    description:
      'Tool inventory software for HVAC, construction, and trades. Track tools, assign custody, run audits, and keep inventory accurate.',
  },
  {
    url: '/tool-checkout-system',
    title: 'Tool Checkout System for Field Teams | Smarter Tracks',
    description:
      'Tool checkout system for contractors and field crews. Assign tools, scan checkouts, and track returns across jobsites.',
  },
  {
    url: '/privacy-policy',
    title: 'Privacy Policy | Smarter Tracks',
    description: 'Privacy policy for Smarter Tracks tool tracking software.',
  },
  {
    url: '/terms-and-conditions',
    title: 'Terms & Conditions | Smarter Tracks',
    description: 'Terms and conditions for Smarter Tracks tool tracking software.',
  },
]

console.log('\n🔨 Building SSR bundle...')

await build({
  root: rootDir,
  plugins: [react()],
  build: {
    ssr: resolve(rootDir, 'src/entry-server.tsx'),
    outDir: resolve(rootDir, 'dist/server'),
    rollupOptions: {
      input: resolve(rootDir, 'src/entry-server.tsx'),
    },
    ssrEmitAssets: false,
  },
  ssr: {
    external: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
})

console.log('✓ SSR bundle built\n')

const serverEntryPath = pathToFileURL(resolve(rootDir, 'dist/server/entry-server.js')).href
const { render } = await import(serverEntryPath)

const template = readFileSync(resolve(rootDir, 'dist/index.html'), 'utf-8')

let successCount = 0
let failCount = 0

for (const route of routesToRender) {
  try {
    const appHtml = render(route.url)

    const canonicalUrl = `https://www.smartertracks.com${route.url === '/' ? '' : route.url}`

    const esc = (s) => s.replace(/"/g, '&quot;')

    const pageHeadTags = `    <title>${route.title}</title>
    <meta name="description" content="${esc(route.description)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${esc(route.title)}" />
    <meta property="og:description" content="${esc(route.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="Smarter Tracks" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(route.title)}" />
    <meta name="twitter:description" content="${esc(route.description)}" />`

    const html = template
      // Strip all template-level SEO tags — inject per-page ones cleanly
      .replace(/<title>[\s\S]*?<\/title>/, '')
      .replace(/<meta\s+name="description"[\s\S]*?\/>/m, '')
      .replace(/<meta\s+name="robots"[\s\S]*?\/>/m, '')
      .replace(/<link\s+rel="canonical"[\s\S]*?\/>/m, '')
      .replace(/<meta\s+property="og:[^>]*\/>/gm, '')
      .replace(/<meta\s+name="twitter:[^>]*\/>/gm, '')
      // Remove empty lines left behind
      .replace(/\n(\s*\n){2,}/g, '\n\n')
      // Inject per-page SEO head tags and rendered HTML
      .replace('<!--app-head-->', pageHeadTags)
      .replace('<!--app-html-->', appHtml)

    const outDir =
      route.url === '/'
        ? resolve(rootDir, 'dist')
        : resolve(rootDir, `dist${route.url}`)

    mkdirSync(outDir, { recursive: true })
    writeFileSync(resolve(outDir, 'index.html'), html)

    console.log(`✓ Pre-rendered: ${route.url}`)
    successCount++
  } catch (err) {
    console.error(`✗ Failed: ${route.url}`, err.message)
    failCount++
  }
}

console.log(`\n🎉 Pre-rendering complete: ${successCount} succeeded, ${failCount} failed\n`)
