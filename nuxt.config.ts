import tailwindcss from '@tailwindcss/vite'

/**
 * The storefront: a STATIC site (nuxt generate). Everything that search engines read (products, categories, texts, theme) is fetched from the
 * Laravel API at BUILD time and baked into the HTML; price, stock, cart, coupons, checkout, tracking and search are fetched again in the browser.
 * No server routes, no server middleware, no host-specific features: the same .output/public runs on Cloudflare Pages, cPanel, Netlify or Vercel.
 */
const apiBase = (process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8002/api/v1/store').replace(/\/$/, '')
const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase}${path}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null   // the API is not running (for example `nuxt dev` without it): the site still starts, with defaults
  }
}

// ---- build time: what the API knows now (fonts of the theme, the pages to prerender)
const settings = await getJson<any>('/settings')
const sitemap = await getJson<{ products: any[]; categories: any[]; sub_categories: any[] }>('/sitemap')

// a static build of an EMPTY site (API down) must never be published: stop the build instead
if (process.env.npm_lifecycle_event === 'generate' && (!settings || !sitemap)) {
  throw new Error(`The API is not reachable at ${apiBase}: nuxt generate needs it (settings and sitemap are baked into the pages). Start the backend, or fix NUXT_PUBLIC_API_BASE.`)
}

const FONT_WEIGHTS = [400, 500, 600, 700]
const fontNames = [...new Set([settings?.theme?.font_heading, settings?.theme?.font_body])]
  .filter((f): f is string => !!f && f !== 'system-ui')

const dynamicRoutes = [
  ...(sitemap?.products ?? []).map((p) => `/product/${p.slug}`),
  ...(sitemap?.categories ?? []).map((c) => `/category/${c.slug}`),
  ...(sitemap?.sub_categories ?? []).map((s) => `/category/${s.category_slug}/${s.slug}`),
]
const staticRoutes = ['/', '/shop', '/about', '/wholesale', '/contact', '/shipping-policy', '/return-policy', '/terms-and-conditions', '/privacy-policy']

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ...(process.env.NUXT_BUILD_DIR ? { buildDir: process.env.NUXT_BUILD_DIR } : {}),   // only for running a second copy (tests) next to `nuxt dev`, so they do not share .nuxt
  devtools: { enabled: false },
  telemetry: false,
  ssr: true,

  modules: ['@nuxt/fonts', '@nuxtjs/sitemap', '@nuxtjs/robots'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss() as any] },

  runtimeConfig: { public: { apiBase, siteUrl } },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: settings?.theme?.primary ?? '#2563EB' },
      ],
    },
  },

  // `nuxt dev` only: no `_payload.json` per page. In dev the server renders every page on demand, so a click on a link waited seconds for that file;
  // without it the browser asks the API directly (the generated site keeps its static payloads, which are plain files and instant).
  $development: { experimental: { payloadExtraction: false } },

  // the static build: every page is prerendered, the ones that only make sense in a browser are a client-side shell
  nitro: {
    preset: 'static',
    prerender: { routes: [...staticRoutes, ...dynamicRoutes], crawlLinks: true, failOnError: false },
  },
  routeRules: {
    '/contact': { redirect: { to: '/wholesale', statusCode: 301 } },   // the old contact page is the wholesale page now
    '/cart': { ssr: false },
    '/checkout': { ssr: false },
    '/track': { ssr: false },
    '/order/**': { ssr: false },
  },

  fonts: {
    families: fontNames.map((name) => ({ name, provider: 'google' as const, weights: FONT_WEIGHTS, global: true })),
    defaults: { weights: FONT_WEIGHTS, styles: ['normal'], subsets: ['latin'] },
  },

  site: { url: siteUrl, name: settings?.store?.name ?? 'Store', defaultLocale: 'en' },
  sitemap: {
    // products, categories and sub-categories come from GET /sitemap (baked in at build time); the static pages are listed by hand
    urls: [
      ...staticRoutes.map((loc) => ({ loc })),
      ...(sitemap?.products ?? []).map((p) => ({ loc: `/product/${p.slug}`, lastmod: p.updated_at, images: p.image_url ? [{ loc: p.image_url }] : [] })),
      ...(sitemap?.categories ?? []).map((c) => ({ loc: `/category/${c.slug}`, lastmod: c.updated_at })),
      ...(sitemap?.sub_categories ?? []).map((s) => ({ loc: `/category/${s.category_slug}/${s.slug}`, lastmod: s.updated_at })),
    ],
    exclude: ['/cart', '/checkout', '/track', '/order/**'],
    autoLastmod: false,
    discoverImages: false,
  },
  robots: {
    disallow: ['/cart', '/checkout', '/track', '/order/'],
    sitemap: [`${siteUrl}/sitemap.xml`],
  },

  typescript: { strict: true, typeCheck: false },
})
