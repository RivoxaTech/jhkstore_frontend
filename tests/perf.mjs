// How fast does the storefront feel? Headless Chrome (puppeteer-core) against the GENERATED site (npm run generate, served by scripts/serve-static.mjs)
// and the real API. Reads only: it adds a product to the cart (an anonymous server cart) and nothing else.
//
//   SITE=http://127.0.0.1:3020 API=http://127.0.0.1:8012/api/v1 node tests/perf.mjs [--json out.json]
//
// 1. Cold page loads (empty browser cache), with a phone-like CPU slowdown off: time to DOMContentLoaded / load / largest paint, requests and kilobytes
//    by kind (script, image, font, api), and the biggest image.
// 2. Click navigation inside the site (home -> shop -> a product -> cart): ms from the click until the new page is there.
// 3. Add to Cart: ms from the click until the cart drawer is open (the call to the server finishes in the background).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const SITE = (process.env.SITE || 'http://127.0.0.1:3000').replace(/\/$/, '')
const API = (process.env.API || 'http://127.0.0.1:8002/api/v1').replace(/\/$/, '')
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const MOBILE = process.argv.includes('--mobile')
const out = { loads: [], navs: [], cart: null }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })

async function load(path) {
  const page = await browser.newPage()
  await page.setViewport(MOBILE ? { width: 390, height: 800, isMobile: true, deviceScaleFactor: 2 } : { width: 1366, height: 900 })
  const cdp = await page.createCDPSession()
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  const reqs = new Map()
  cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, type: e.type, bytes: 0 }))
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength })
  await page.evaluateOnNewDocument(() => {
    window.__lcp = 0
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = Math.max(window.__lcp, e.startTime) }).observe({ type: 'largest-contentful-paint', buffered: true })
  })
  const t0 = Date.now()
  await page.goto(SITE + path, { waitUntil: 'load', timeout: 60000 })
  const loadMs = Date.now() - t0
  await sleep(1200)   // late requests (api, lazy images)
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), loaded: Math.round(n.loadEventEnd), lcp: Math.round(window.__lcp) } })
  const all = [...reqs.values()]
  const by = (f) => all.filter(f)
  const kb = (l) => Math.round(l.reduce((a, r) => a + r.bytes, 0) / 1024)
  const images = by((r) => r.type === 'Image')
  const big = images.sort((a, b) => b.bytes - a.bytes)[0]
  const row = { path, ...nav, loadMs, requests: all.length, kb: kb(all), js: kb(by((r) => r.type === 'Script')), img: kb(images), imgs: images.length, font: kb(by((r) => r.type === 'Font')), api: by((r) => r.url.startsWith(API)).length, apiKb: kb(by((r) => r.url.startsWith(API))), biggestImage: big ? `${Math.round(big.bytes / 1024)} KB ${big.url.split('/').pop()}` : '' }
  await page.close()
  return row
}

const settings = await (await fetch(`${API}/store/settings`)).json()
const cats = await (await fetch(`${API}/store/categories`)).json()
const prods = await (await fetch(`${API}/store/products?per_page=2`)).json()
const slug = prods.data[0].slug
const paths = ['/', '/shop', `/category/${cats.data[0].slug}`, `/product/${slug}`, '/cart', '/checkout', '/wholesale', '/track']
console.log(`${MOBILE ? 'PHONE' : 'DESKTOP'}  cold loads (cache disabled)`)
for (const p of paths) {
  const r = await load(p)
  out.loads.push(r)
  console.log(`${p.padEnd(26)} dcl ${String(r.dcl).padStart(5)}  load ${String(r.loaded).padStart(5)}  lcp ${String(r.lcp).padStart(5)} ms | ${String(r.requests).padStart(3)} req ${String(r.kb).padStart(5)} KB (js ${r.js}, img ${r.img}/${r.imgs}, font ${r.font}, api ${r.api}/${r.apiKb}) | biggest img ${r.biggestImage}`)
}

// --- click navigation + add to cart
const page = await browser.newPage()
await page.setViewport(MOBILE ? { width: 390, height: 800, isMobile: true, deviceScaleFactor: 2 } : { width: 1366, height: 900 })
await page.goto(SITE + '/', { waitUntil: 'networkidle0', timeout: 60000 })
async function clickNav(label, click, ready) {
  const t0 = Date.now()
  await click()
  await page.waitForFunction(ready, { timeout: 20000, polling: 'raf' }).catch(() => {})
  const ms = Date.now() - t0
  out.navs.push({ label, ms })
  console.log(`${label.padEnd(40)} ${String(ms).padStart(5)} ms`)
  await sleep(600)
}
console.log('\nclick navigation')
await clickNav('home -> shop (header link)', () => page.evaluate(() => (document.querySelector('header a[href="/shop"], nav a[href="/shop"]') || document.querySelector('a[href="/shop"]')).click()), () => location.pathname === '/shop' && document.querySelectorAll('[data-testid="product-card"]').length > 0)
await clickNav('shop -> product page', () => page.evaluate(() => document.querySelector('[data-testid="product-card"] a[href^="/product/"]').click()), () => location.pathname.startsWith('/product/') && document.querySelector('[data-testid="gallery-main"], h1'))
await clickNav('product -> back to shop', () => page.evaluate(() => history.back()), () => location.pathname === '/shop' && document.querySelectorAll('[data-testid="product-card"]').length > 0)
await clickNav('shop -> product again', () => page.evaluate(() => document.querySelector('[data-testid="product-card"] a[href^="/product/"]').click()), () => location.pathname.startsWith('/product/') && document.querySelector('[data-testid="gallery-main"], h1'))

const t0 = Date.now()
await page.evaluate(() => document.querySelector('[data-testid="add-to-cart"]').click())
await page.waitForSelector('[data-testid="cart-drawer"]', { timeout: 10000 }).catch(() => {})
out.cart = Date.now() - t0
console.log(`\nAdd to Cart -> drawer open: ${out.cart} ms`)
await browser.close()
const j = process.argv.indexOf('--json')
if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1))
