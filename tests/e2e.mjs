// Browser tests of the GENERATED site (headless Chrome through puppeteer-core), against the real API with the demo data.
//
//   cd backend && php artisan migrate:fresh --seed && php artisan db:seed --class=DemoSeeder && php artisan serve --port=8002     (the API, the demo catalogue)
//   cd frontend && npm run generate                                                                                        (the static site)
//   npm run test:e2e                                                                                                       (serves .output/public itself on port 3000)
//
// Port 3000 is on purpose: it is one of the origins backend/.env allows (FRONTEND_URLS). Environment: API (default http://127.0.0.1:8002/api/v1), SITE, CHROME_PATH,
// DEV_USER / DEV_PASSWORD (the developer account, used to change the shop while testing: close it, create a product after the build, restore it).
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const SITE = process.env.SITE || 'http://127.0.0.1:3000'
const API = process.env.API || 'http://127.0.0.1:8002/api/v1'
const DEV = [process.env.DEV_USER || 'developer', process.env.DEV_PASSWORD || 'developer']
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p))
if (!CHROME) { console.error('Chrome not found: set CHROME_PATH'); process.exit(2) }

let failures = 0
let passes = 0
const check = (ok, label, actual) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${actual === undefined ? '' : `  -> ${typeof actual === 'string' ? actual : JSON.stringify(actual)}`}`)
  if (ok) passes++; else failures++
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------- the static site (like Cloudflare Pages: files first, the app shell for /product/*, /category/*, /order/*)
let server = null
async function up(url) { try { return (await fetch(url)).ok } catch { return false } }
if (!(await up(`${SITE}/`))) {
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'serve-static.mjs'), path.join(ROOT, '.output', 'public'), new URL(SITE).port || '3000'], { stdio: 'ignore' })
  for (let i = 0; i < 30 && !(await up(`${SITE}/`)); i++) await sleep(300)
}
if (!(await up(`${SITE}/`))) { console.error(`The site is not served at ${SITE}: run npm run generate first`); process.exit(2) }
if (!(await up(`${API}/store/settings`))) { console.error(`The API is not reachable at ${API}`); process.exit(2) }

// ---------------------------------------------------------------- helpers
async function api(method, route, { token, body, headers = {} } = {}) {
  const r = await fetch(`${API}/${route}`, { method, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined })
  const text = await r.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* not json */ }
  return { status: r.status, json, text }
}
const dev = (await api('POST', 'admin/auth/login', { body: { login: DEV[0], password: DEV[1] } })).json?.token
if (!dev) { console.error('Cannot log in as the developer'); process.exit(2) }
const putSettings = (body) => api('PUT', 'admin/settings', { token: dev, body })

// a flat PNG for the proof upload
function crc32(buf) { let c = 0xffffffff; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1 } return (c ^ 0xffffffff) >>> 0 }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]) }
function writePng(file, w, h, [r, g, b]) {
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())])
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))), chunk('IEND', Buffer.alloc(0))]))
  return file
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'storefront-e2e-'))
const proofPng = writePng(path.join(TMP, 'proof.png'), 220, 220, [20, 140, 120])

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
/** A fresh browser profile (its own localStorage and cart) at the given width. */
async function open(width = 1440, height = 900) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  page.__ctx = context
  await page.setViewport({ width, height })
  const problems = []
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|status of (4|5)\d\d|Page not found|Product not found|Category not found/.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`) })
  return { context, page, problems }
}
const go = async (page, url, wait = 'networkidle0') => { await page.goto(url.startsWith('http') ? url : SITE + url, { waitUntil: wait, timeout: 60000 }); await sleep(250) }
const text = (page, sel) => page.$eval(sel, (e) => e.innerText.replace(/\s+/g, ' ').trim())
const exists = async (page, sel) => !!(await page.$(sel))
const count = (page, sel) => page.$$eval(sel, (e) => e.length)
const click = (page, sel) => page.$eval(sel, (e) => e.click())
const fill = (page, sel, value) => page.$eval(sel, (el, v) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }))
}, String(value))
const waitFor = (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, { timeout }, arg).then(() => true).catch(() => false)
const toast = (page) => waitFor(page, () => [...document.querySelectorAll('[role="status"]')].some((e) => /added to cart/i.test(e.innerText)))

// products of the demo catalogue (read from the API)
const catalogue = (await api('GET', 'store/products?per_page=100&sort=popularity')).json.data
const single = catalogue.find((p) => p.has_single_option && p.in_stock && p.variant_id)
const multiOption = catalogue.find((p) => p.slug === 'rainbow-stacking-blocks')
const soldOut = catalogue.find((p) => p.is_sold_out)
const html = async (urlPath) => (await fetch(SITE + urlPath)).text()
// a new phone number for every run: the API limits orders per phone number (10 an hour)
const randomPhone = () => { const d = String(Math.floor(Math.random() * 1e8)).padStart(8, '0'); return `+92 3${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` }
const ADDRESS = { name: 'Test Buyer', phone: randomPhone(), line1: '12 Example Street', city: 'Springfield', postcode: '12345' }
const orderNumbers = {}

/** Puts one toy in the cart through the API (the browser keeps the token in localStorage: set it before the page loads). */
async function cartWith(page, variantId, qty) {
  const r = await api('POST', 'store/cart/items', { body: { variant_id: variantId, qty } })
  await page.evaluateOnNewDocument((t) => { try { localStorage.setItem('jhk_cart_token', t) } catch { /* */ } }, r.json.data.token)
  return r.json.data.token
}
async function fillCheckout(page, pay = 'cod') {
  await page.waitForSelector('[data-testid="f-name"]', { timeout: 20000 })
  await fill(page, '[data-testid="f-name"]', ADDRESS.name)
  await fill(page, '[data-testid="f-phone"]', ADDRESS.phone)
  await fill(page, '[data-testid="f-line1"]', ADDRESS.line1)
  await fill(page, '[data-testid="f-city"]', ADDRESS.city)
  await fill(page, '[data-testid="f-postcode"]', ADDRESS.postcode)
  await click(page, pay === 'cod' ? '[data-testid="pay-cod"]' : '[data-testid="pay-bank"]')
  // the server prices the address: wait for the delivery line to settle
  await waitFor(page, () => /Free|Rs\.\s?\d/.test(document.querySelector('[data-testid="delivery-line"]')?.innerText || ''), null, 20000)
  await waitFor(page, () => !document.querySelector('[data-testid="place-order"]')?.disabled, null, 20000)   // the server has priced the cart: the button is on
  await sleep(300)
  // abandoned carts: what the customer typed (phone) is saved on the cart a moment after typing, so a cart that is left behind can be followed up
  const cartToken = await page.evaluate(() => localStorage.getItem('jhk_cart_token'))
  await sleep(1800)
  const saved = await api('GET', 'store/cart', { headers: { 'X-Cart-Token': cartToken } })
  check(String(saved.json?.data?.contact?.phone || '').replace(/\D/g, '').endsWith(ADDRESS.phone.replace(/\D/g, '').slice(-9)), 'S5 abandoned cart: the phone typed at checkout is saved on the cart (so the shop can follow it up)', saved.json?.data?.contact)
}

try {
  // ================================================================ S1 home: all products, hero, trust bar, no stars / hearts
  {
    const { page, problems } = await open()
    await go(page, '/')
    const cards = await count(page, '[data-testid="collection"] [data-testid="product-card"]')
    check(cards === Math.min(12, catalogue.length), `S1 home: the Our Collection grid shows the first 12 of ${catalogue.length} products`, cards)
    check(await exists(page, '[data-testid="view-all"]') && catalogue.length > 12, 'S1 home: more than 12 products = a "View all products" button')
    check(/Smart Toys/.test(await text(page, 'h1')) && (await count(page, 'h1')) === 1, 'S1 home: one h1, the hero title of the home_hero banner', await text(page, 'h1'))
    check((await text(page, '[data-testid="hero"] h1')).includes('Bright Futures') && await page.$eval('[data-testid="hero"] h1 span', (e) => getComputedStyle(e).color !== getComputedStyle(e.parentElement).color), 'S1 home: *asterisk* words of the banner title are in the accent colour')
    check((await count(page, '[data-testid="trust-bar"] li')) === 4, 'S1 home: the trust bar has four items')
    check(/PLAY\s•\sLEARN\s•\sGROW/.test(await page.$eval('[data-testid="hero"]', (e) => e.innerText)), 'S1 home: the eyebrow is the store tagline with dots (PLAY • LEARN • GROW)')
    check(await exists(page, '[data-testid="featured"]') && !(await exists(page, '[data-testid="categories-row"]')) && await exists(page, '[data-testid="gift-banner"]'), 'S1 home: Featured (featured toys differ from the list) and the gift banner, and no "Shop by category" row')
    // everything the admin panel controls comes from the API, nothing is fixed in the storefront
    const pub = (await api('GET', 'store/settings')).json
    const themeNow = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return { primary: s.getPropertyValue('--c-primary').trim(), accent: s.getPropertyValue('--c-accent').trim(), bg: s.getPropertyValue('--c-bg').trim(), text: s.getPropertyValue('--c-text').trim() } })
    check(themeNow.primary.toLowerCase() === pub.theme.primary.toLowerCase() && themeNow.accent.toLowerCase() === pub.theme.accent.toLowerCase() && themeNow.bg.toLowerCase() === pub.theme.bg.toLowerCase() && themeNow.text.toLowerCase() === pub.theme.text.toLowerCase(),
      'S1 theme: the colours on the page are the ones of Settings → Theme (admin panel), not fixed colours', { page: themeNow, api: { primary: pub.theme.primary, accent: pub.theme.accent, bg: pub.theme.bg, text: pub.theme.text } })
    const eyebrowWanted = pub.store.tagline.replace(/[.,;:!?]+/g, '').split(/\s+/).join(' • ').toLowerCase()
    check(await page.$eval('[data-testid="hero"] p', (e, want) => e.innerText.replace(/\s+/g, ' ').trim().toLowerCase().startsWith(want), eyebrowWanted), 'S1 home: the hero eyebrow is the tagline of the admin panel', eyebrowWanted)
    check(await page.$eval('[data-testid="site-footer"] p', (e, t) => e.innerText.trim() === t, pub.store.tagline), 'S1 footer: the line under the logo is the tagline of the admin panel')
    const credit = await page.$eval('[data-testid="agency-credit"]', (e) => ({ href: e.getAttribute('href'), text: e.innerText.replace(/\s+/g, ' ').trim(), img: e.querySelector('img')?.getAttribute('src') ?? null, alt: e.querySelector('img')?.getAttribute('alt') ?? null })).catch(() => null)
    check(!!credit && credit.href === pub.footer.agency.url && /^Developed by/.test(credit.text) && (pub.footer.agency.logo_url ? credit.img === pub.footer.agency.logo_url && credit.alt === pub.footer.agency.name : credit.text.includes(pub.footer.agency.name)),
      'S1 footer: "Developed by [logo]" at the bottom links to the agency of Settings → Footer & Social (name, link and logo from the admin panel)', credit)
    check(pub.store.logo_url ? (await page.$eval('header img', (e) => e.getAttribute('src'))) === pub.store.logo_url : true, 'S1 header: the logo is the one uploaded in the admin panel')
    const body = await page.evaluate(() => document.body.innerText)
    const markup = await page.evaluate(() => document.body.innerHTML)
    check(!/★|☆|wishlist|reviews?\b|ratings?\b/i.test(body) && !/lucide-heart|class="[^"]*heart/i.test(markup) && !(await exists(page, '[aria-label*="avorite" i], [aria-label*="wish" i]')), 'S1 home: no star ratings, no review counts, no heart / wishlist', (body.match(/★|☆|wishlist|reviews?\b|ratings?\b/i) || [])[0] ?? '')
    check(!(await exists(page, 'a[href*="login"], a[href*="account"], [aria-label*="account" i]')), 'S1 home: no user / account icon')
    const header = await page.$eval('header', (e) => ({ top: e.getBoundingClientRect().top, position: getComputedStyle(e).position }))
    check(header.position === 'sticky' && header.top === 0, 'S1 home: the header is sticky at the top', header)
    const bodyMeasure = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, iw: window.innerWidth }))
    check(bodyMeasure.w <= bodyMeasure.iw, 'S1 home: no horizontal scroll at 1440 px', bodyMeasure)
    check(problems.length === 0, 'S1 home: no script errors', problems)
    await page.__ctx.close()
  }

  // ================================================================ S2 mobile: one product per row, the toggle for two, saved in localStorage
  {
    const { page } = await open(390, 844)
    await go(page, '/')
    const cols = () => page.$eval('[data-testid="product-grid"]', (g) => getComputedStyle(g).gridTemplateColumns.split(' ').length)
    check(await cols() === 1, 'S2 mobile: ONE product per row by default at 390 px', await cols())
    check(await exists(page, '[data-testid="grid-2"]') && await page.$eval('[data-testid="grid-2"]', (e) => e.getBoundingClientRect().width > 0), 'S2 mobile: the 1 / 2 toggle is in the grid header')
    await click(page, '[data-testid="grid-2"]'); await sleep(300)
    check(await cols() === 2, 'S2 mobile: the toggle switches to two per row', await cols())
    check(await page.evaluate(() => localStorage.getItem('jhk_grid_cols')) === '2', 'S2 mobile: the choice is saved in localStorage')
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400)
    check(await cols() === 2, 'S2 mobile: the choice survives a reload', await cols())
    await click(page, '[data-testid="grid-1"]'); await sleep(300)
    check(await cols() === 1, 'S2 mobile: back to one per row')
    const w = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, iw: window.innerWidth }))
    check(w.w <= w.iw, 'S2 mobile: no horizontal scroll at 390 px', w)
    await page.setViewport({ width: 360, height: 800 }); await sleep(300)
    const w360 = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, iw: window.innerWidth }))
    check(w360.w <= w360.iw, 'S2 mobile: no horizontal scroll at 360 px', w360)
    await page.setViewport({ width: 768, height: 1024 }); await sleep(300)
    const tablet = await cols()
    check(tablet >= 2 && tablet <= 3, 'S2 tablet: 2 to 3 columns at 768 px', tablet)
    await page.setViewport({ width: 1440, height: 900 }); await sleep(300)
    check(await cols() === 4, 'S2 desktop: 4 columns at 1440 px', await cols())
    await page.__ctx.close()
  }

  // ================================================================ S3 product page: gallery, option, quantity, bulk prices, video, delivery, sticky bar, SEO in the HTML
  {
    const page0 = await html('/product/rainbow-stacking-blocks/')
    check(page0.includes('Rainbow Stacking Blocks') && /Rs\.\s?28/.test(page0) && /<img[^>]+rainbow-stacking-blocks/.test(page0) && page0.includes('application/ld+json') && page0.includes('"@type":"Product"'), 'S3 product HTML (no JavaScript): name, price, picture tags and Product JSON-LD are already in the file')
    check(/<link rel="canonical" href="[^"]+\/product\/rainbow-stacking-blocks"/.test(page0) && page0.includes('og:image') && page0.includes('BreadcrumbList') && /<title>Rainbow Stacking Blocks[^|<]*\| /.test(page0), 'S3 product HTML: title, canonical, Open Graph image and BreadcrumbList')

    const { page, problems } = await open()
    await go(page, '/product/rainbow-stacking-blocks')
    check(await exists(page, '[data-testid="gallery-main"]') && (await count(page, '[data-testid="gallery-thumb"]')) >= 2, 'S3 product: the gallery has a main picture and thumbnails', await count(page, '[data-testid="gallery-thumb"]'))
    const before = await page.$eval('[data-testid="gallery-main"]', (e) => e.src)
    await page.$$eval('[data-testid="gallery-thumb"]', (e) => e[1].click()); await sleep(300)
    check(await page.$eval('[data-testid="gallery-main"]', (e) => e.src) !== before, 'S3 product: a thumbnail changes the main picture')
    await click(page, '[data-testid="gallery-main"]'); await sleep(300)
    check(await exists(page, '[data-testid="lightbox"]'), 'S3 product: a click opens the full-size view')
    await page.keyboard.press('Escape'); await sleep(200)
    check(!(await exists(page, '[data-testid="lightbox"]')), 'S3 product: Escape closes it')

    const price1 = await text(page, '[data-testid="price"]')
    await page.$$eval('[data-testid="variants"] input', (e) => e[1].click()); await sleep(300)
    const price2 = await text(page, '[data-testid="price"]')
    check(price1 !== price2, 'S3 product: choosing another option changes the price', { price1, price2 })
    await page.$$eval('[data-testid="variants"] input', (e) => e[0].click()); await sleep(200)
    await click(page, '[data-testid="qty-plus"]'); await click(page, '[data-testid="qty-plus"]'); await sleep(300)
    check(await page.$eval('[data-testid="qty-input"]', (e) => e.value) === '3', 'S3 product: the quantity stepper counts up')
    check(/Buy 3\+/.test(await text(page, '[data-testid="bulk-tiers"]')), 'S3 product: bulk price hints (Buy 3+ for ...)', await text(page, '[data-testid="bulk-tiers"]'))
    check(await exists(page, '[data-testid="delivery-estimate"]') && /Arrives by/.test(await text(page, '[data-testid="delivery-estimate"]')), 'S3 product: the delivery estimate (arrives by a date)')
    check(await exists(page, '[data-testid="related"]'), 'S3 product: related products')
    const wMeasure = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, iw: window.innerWidth }))
    check(wMeasure.w <= wMeasure.iw, 'S3 product: no horizontal scroll', wMeasure)

    // the video of a product that got it AFTER the build: the page reads the product again, so it appears
    const castle = catalogue.find((p) => p.slug === 'wooden-castle-builder')
    const before2 = await html('/product/wooden-castle-builder/')
    await go(page, '/product/wooden-castle-builder')
    const gotVideo = await waitFor(page, () => document.querySelectorAll('[data-testid="gallery-thumb"]').length >= 1 && [...document.querySelectorAll('[data-testid="gallery-thumb"]')].some((b) => b.getAttribute('aria-label') === 'Video'), null, 15000)
    check(gotVideo, 'S3 product: the product video (YouTube embed) is in the gallery as a thumbnail', before2.includes('youtube-nocookie') ? 'baked in' : 'added live')
    if (gotVideo) {
      await page.$$eval('[data-testid="gallery-thumb"]', (b) => b.find((x) => x.getAttribute('aria-label') === 'Video').click()); await sleep(400)
      check(await exists(page, '[data-testid="gallery-video"] iframe'), 'S3 product: the embed is loaded lazily only when opened (an iframe)', await page.$eval('[data-testid="gallery-video"] iframe', (e) => e.src))
    }
    check(castle !== undefined && problems.length === 0, 'S3 product: no script errors', problems)

    // phone: no sticky bar; the quantity, then Add to Cart and Buy Now side by side in the page itself
    await page.setViewport({ width: 390, height: 800 })
    await go(page, '/product/rainbow-stacking-blocks')
    check(!(await exists(page, '[data-testid="sticky-atc"]')), 'S3 product (phone): there is no fixed Add to Cart bar')
    const row = await page.evaluate(() => { const a = document.querySelector('[data-testid="add-to-cart"]').getBoundingClientRect(); const b = document.querySelector('[data-testid="buy-now"]').getBoundingClientRect(); const q = document.querySelector('[data-testid="qty-input"]').getBoundingClientRect(); return { sameRow: Math.abs(a.top - b.top) < 2, below: a.top > q.bottom - 1, iw: window.innerWidth, right: Math.round(b.right) } })
    check(row.sameRow && row.below && row.right <= row.iw, 'S3 product (phone): Add to Cart and Buy Now are in one row, under the quantity', row)
    await page.setViewport({ width: 1440, height: 900 })
    await go(page, '/product/rainbow-stacking-blocks')
    const rowD = await page.evaluate(() => { const a = document.querySelector('[data-testid="add-to-cart"]').getBoundingClientRect(); const b = document.querySelector('[data-testid="buy-now"]').getBoundingClientRect(); const q = document.querySelector('[data-testid="qty-input"]').getBoundingClientRect(); return { sameRow: Math.abs(a.top - b.top) < 2, below: a.top > q.bottom - 1 } })
    check(rowD.sameRow && rowD.below, 'S3 product (desktop): the same, quantity row first, then the two buttons in one row', rowD)
    await page.__ctx.close()
  }

  // ================================================================ S4 add to cart from a card: toast, the drawer, quantity, remove
  {
    const { page } = await open()
    await go(page, '/shop')
    const card = await page.$(`[data-slug="${single.slug}"] [data-testid="add-to-cart"]`)
    await card.evaluate((e) => e.click())
    check(await toast(page), 'S4 cart: "Add to Cart" on a one-option product adds it at once with a toast')
    await page.waitForSelector('[data-testid="cart-drawer"]', { timeout: 10000 })
    check(await exists(page, '[data-testid="cart-drawer"]') && (await count(page, '[data-testid="cart-lines"] li')) === 1, 'S4 cart: the cart drawer slides in with the line')
    check(await text(page, '[data-testid="cart-count"]') === '1', 'S4 cart: the header badge counts 1', await text(page, '[data-testid="cart-count"]'))
    check(await page.evaluate(() => (localStorage.getItem('jhk_cart_token') || '').length === 40), 'S4 cart: the cart token (40 characters) is kept in localStorage')
    await click(page, '[data-testid="drawer-view-cart"]')
    await page.waitForFunction(() => location.pathname === '/cart', { timeout: 10000 })
    await page.waitForSelector('[data-testid="cart-lines"]', { timeout: 15000 })
    await click(page, '[data-testid="qty-plus"]')
    await waitFor(page, () => document.querySelector('[data-testid="cart-count"]')?.innerText.trim() === '2')
    check(await text(page, '[data-testid="cart-count"]') === '2', 'S4 cart: the quantity stepper changes the server cart (badge 2)')
    check(await exists(page, '[data-testid="totals"]') && /Rs\./.test(await text(page, '[data-testid="grand-total"]')), 'S4 cart: totals come from the server', await text(page, '[data-testid="grand-total"]'))
    await click(page, '[data-testid="cart-remove"]')
    await page.waitForSelector('[data-testid="cart-empty"]', { timeout: 10000 })
    check(await exists(page, '[data-testid="cart-empty"]'), 'S4 cart: removing the last line shows the empty cart')
    // a product with several options does not add from the card: it opens its page
    await go(page, '/shop')
    const firstMulti = catalogue.slice(0, 24).find((p) => !p.has_single_option)
    await page.$eval(`[data-slug="${firstMulti.slug}"] [data-testid="add-to-cart"]`, (e) => e.click())
    await page.waitForFunction(() => location.pathname.startsWith('/product/'), { timeout: 10000 })
    check(page.url().includes(`/product/${firstMulti.slug}`), 'S4 cart: a product with several options opens its page to choose an option')
    await page.__ctx.close()
  }

  // ================================================================ S5 coupon on the cart page
  {
    const { page } = await open()
    await cartWith(page, catalogue.find((p) => p.slug === 'rainbow-stacking-blocks').variant_id, 3)
    await go(page, '/cart')
    await page.waitForSelector('[data-testid="coupon-input"]', { timeout: 15000 })
    await fill(page, '[data-testid="coupon-input"]', 'NOPE-NOT-A-CODE'); await click(page, '[data-testid="coupon-apply"]')
    check(await waitFor(page, () => !!document.querySelector('[data-testid="coupon-error"]')), 'S5 coupon: a wrong code shows the reason', await exists(page, '[data-testid="coupon-error"]') ? await text(page, '[data-testid="coupon-error"]') : '')
    await fill(page, '[data-testid="coupon-input"]', 'welcome10'); await click(page, '[data-testid="coupon-apply"]')
    const applied = await waitFor(page, () => /WELCOME10/.test(document.querySelector('[data-testid="totals"]')?.innerText || ''))
    check(applied && /−Rs\./.test(await text(page, '[data-testid="totals"]')), 'S5 coupon: WELCOME10 takes money off the total (the server calculated it)', await text(page, '[data-testid="totals"]'))
    await page.__ctx.close()
  }

  // ================================================================ S6 checkout with cash on delivery
  {
    const { page, problems } = await open()
    await cartWith(page, single.variant_id, 2)
    await go(page, '/checkout')
    check(await exists(page, '[data-testid="f-name"]') && await exists(page, '[data-testid="pay-cod"]') && await exists(page, '[data-testid="pay-bank"]'), 'S6 checkout: contact, address and the two payment methods from the settings')
    check(await page.$eval('input[name="hp_extra"]', (e) => { const r = e.getBoundingClientRect(); return r.left < -500 || r.width <= 1 }), 'S6 checkout: the honeypot field `hp_extra` exists and is out of sight')
    check(await page.evaluate(() => document.querySelector('input[name="hp_extra"]').tabIndex) === -1, 'S6 checkout: the honeypot is out of the tab order')
    await click(page, '[data-testid="place-order"]'); await sleep(400)
    check(await exists(page, '[aria-invalid="true"]') && !page.url().includes('/order/'), 'S6 checkout: an empty form is not sent; the fields say what is missing')
    await fillCheckout(page, 'cod')
    check(/Free|Rs\./.test(await text(page, '[data-testid="delivery-line"]')), 'S6 checkout: the delivery zone is quoted from the address', await text(page, '[data-testid="delivery-line"]'))
    // the order carries an Idempotency-Key, the honeypot and the total the customer saw
    let sent = null
    page.on('request', (r) => { if (r.method() === 'POST' && /\/store\/orders$/.test(r.url())) sent = { headers: r.headers(), body: JSON.parse(r.postData() || '{}') } })
    await click(page, '[data-testid="place-order"]')
    await page.waitForFunction(() => location.pathname.startsWith('/order/'), { timeout: 30000 })
    await page.waitForSelector('[data-testid="order-number"]', { timeout: 15000 })
    orderNumbers.cod = await text(page, '[data-testid="order-number"]')
    check(/^[A-Z]+-\d{4}-\d{6}$/.test(orderNumbers.cod), 'S6 checkout: the order is placed and the success page shows its number', orderNumbers.cod)
    check(!!sent && /^[0-9a-f-]{36}$/.test(sent.headers['idempotency-key'] || '') && sent.body.hp_extra === '' && typeof sent.body.expected_total === 'number' && !!sent.body.cart_token && sent.body.payment_method === 'cod', 'S6 checkout: the order request has an Idempotency-Key (UUID), the empty honeypot, expected_total and the cart token', sent && { key: sent.headers['idempotency-key'], hp_extra: sent.body.hp_extra, expected: sent.body.expected_total })
    check(/Cash on delivery/.test(await page.evaluate(() => document.body.innerText)), 'S6 checkout: cash on delivery says what to keep ready')
    check(await text(page, '[data-testid="cart-count"]') === '0', 'S6 checkout: the cart is empty after the order')
    check(await page.evaluate((n) => localStorage.getItem('jhk_last_order') === n, orderNumbers.cod), 'S6 checkout: the last order number is remembered in localStorage')
    check(!page.url().includes('token') && !page.url().includes(await page.evaluate(() => localStorage.getItem('jhk_cart_token') || 'x-none')), 'S6 checkout: no token in the address bar', page.url())
    check(problems.length === 0, 'S6 checkout: no script errors', problems)
    await page.__ctx.close()
  }

  // ================================================================ S7 bank transfer: accounts of the order, the proof upload, "we will verify"
  {
    await putSettings({ pay_bank_proof_required: false })   // the screenshot is optional at checkout here: it is added on the order page below (S7a covers the required case)
    const { page } = await open()
    await cartWith(page, single.variant_id, 1)
    await go(page, '/checkout')
    await fillCheckout(page, 'bank')
    await click(page, '[data-testid="place-order"]')
    await page.waitForFunction(() => location.pathname.startsWith('/order/'), { timeout: 30000 })
    await page.waitForSelector('[data-testid="payment-section"]', { timeout: 15000 })
    orderNumbers.bank = await text(page, '[data-testid="order-number"]')
    check(await exists(page, '[data-testid="bank-accounts"]') && /Example Bank/.test(await text(page, '[data-testid="bank-accounts"]')), 'S7 bank transfer: the accounts and instructions of the order are shown', await text(page, '[data-testid="bank-accounts"]'))
    const input = await page.$('[data-testid="proof-file"]')
    await input.uploadFile(proofPng)
    await page.waitForSelector('[data-testid="proof-preview"]', { timeout: 5000 })
    check(await exists(page, '[data-testid="proof-preview"]'), 'S7 bank transfer: the screenshot shows a preview before it is sent')
    // a file over 4 MB is refused in the browser
    const big = path.join(TMP, 'big.png'); fs.writeFileSync(big, Buffer.alloc(4.5 * 1024 * 1024, 1))
    await (await page.$('[data-testid="proof-file"]')).uploadFile(big); await sleep(300)
    check(/4 MB/.test(await text(page, '[data-testid="proof-error"]')) && await page.$eval('[data-testid="proof-submit"]', (e) => e.disabled), 'S7 bank transfer: a picture over 4 MB is refused with a message', await exists(page, '[data-testid="proof-error"]') ? await text(page, '[data-testid="proof-error"]') : '')
    await (await page.$('[data-testid="proof-file"]')).uploadFile(proofPng); await sleep(300)
    await click(page, '[data-testid="proof-submit"]')
    check(await waitFor(page, () => !!document.querySelector('[data-testid="proof-submitted"]')), 'S7 bank transfer: after the upload it says "we will verify your payment"', await exists(page, '[data-testid="proof-submitted"]') ? await text(page, '[data-testid="proof-submitted"]') : '')
    await page.__ctx.close()
  }

  // ================================================================ S7a bank transfer at checkout: details and amount shown, the screenshot REQUIRED (the admin switch)
  {
    await putSettings({ pay_bank_proof_required: true })
    const { page } = await open()
    await cartWith(page, single.variant_id, 1)
    await go(page, '/checkout')
    await fillCheckout(page, 'bank')
    check(await exists(page, '[data-testid="bank-panel"]') && /Example Bank/.test(await text(page, '[data-testid="bank-panel"]')) && await exists(page, '[data-testid="bank-amount"]') && await exists(page, '[data-testid="proof-file"]'), 'S7a checkout: choosing bank transfer shows the bank details, the amount to transfer and the screenshot upload')
    await click(page, '[data-testid="pay-cod"]')
    check(!(await exists(page, '[data-testid="bank-panel"]')), 'S7a checkout: cash on delivery hides the bank panel')
    await click(page, '[data-testid="pay-bank"]')
    await click(page, '[data-testid="place-order"]'); await sleep(800)
    check(await exists(page, '[data-testid="proof-error"]') && page.url().includes('/checkout'), 'S7a checkout: without the screenshot the order is not placed and the page says why', await text(page, '[data-testid="proof-error"]').catch(() => ''))
    await (await page.$('[data-testid="proof-file"]')).uploadFile(proofPng)
    await page.waitForSelector('[data-testid="proof-preview"]', { timeout: 5000 })
    await click(page, '[data-testid="place-order"]')
    await page.waitForFunction(() => location.pathname.startsWith('/order/'), { timeout: 30000 })
    await page.waitForSelector('[data-testid="proof-submitted"]', { timeout: 15000 })
    check(true, 'S7a checkout: with the screenshot the order is placed and already says "we will verify your payment"')
    await page.__ctx.close()
    // the server refuses a bank order without the screenshot, whatever the browser does
    const noProof = await api('POST', 'store/orders', { body: { customer: { name: 'No Proof', phone: randomPhone() }, address: { line1: '1 Road', city: 'Karachi' }, items: [{ variant_id: single.variant_id, qty: 1 }], payment_method: 'bank_transfer' } })
    check(noProof.status === 422 && !!noProof.json?.errors?.proof, 'S7a API: a bank order without the screenshot is refused (422, proof)', noProof.status)
    await putSettings({ pay_bank_proof_required: false })
  }

  // ================================================================ S8 tracking: order number + phone, a wrong phone is neutral, ?order= from an e-mail link
  {
    const { page } = await open()
    await go(page, `/track?order=${orderNumbers.cod}`)
    await page.waitForSelector('[data-testid="track-form"]', { timeout: 15000 })
    check(await page.$eval('[data-testid="track-number"]', (e) => e.value) === orderNumbers.cod, 'S8 track: ?order= from the e-mail link fills the number (the phone is still asked)')
    await fill(page, '[data-testid="track-phone"]', '+92 300 999 0000'); await click(page, '[data-testid="track-submit"]')
    await page.waitForSelector('[data-testid="track-error"]', { timeout: 10000 })
    const wrong = await text(page, '[data-testid="track-error"]')
    await fill(page, '[data-testid="track-number"]', 'ORD-2026-999999'); await click(page, '[data-testid="track-submit"]'); await sleep(900)
    const unknown = await text(page, '[data-testid="track-error"]')
    check(/could not find/i.test(wrong) && wrong === unknown, 'S8 track: a wrong phone and an unknown order give the same neutral message', { wrong, unknown })
    await fill(page, '[data-testid="track-number"]', orderNumbers.cod); await fill(page, '[data-testid="track-phone"]', ADDRESS.phone); await click(page, '[data-testid="track-submit"]')
    await page.waitForSelector('[data-testid="order-view"]', { timeout: 15000 })
    check(await text(page, '[data-testid="order-number"]') === orderNumbers.cod && await exists(page, '[data-testid="timeline"]') && await exists(page, '[data-testid="order-status"]'), 'S8 track: the right number + phone shows the status, items and the timeline', await text(page, '[data-testid="order-status"]'))
    const meta = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.content || '')
    check(/noindex/.test(meta), 'S8 track: the page is noindex', meta)
    await page.__ctx.close()
  }

  // ================================================================ S9 wholesale form on the Wholesale page (the old contact page)
  {
    const { page } = await open()
    await go(page, '/wholesale')
    check(!(await exists(page, '[data-testid="contact-details"]')) && /Bulk & wholesale enquiries/i.test(await page.evaluate(() => document.body.innerText)), 'S9 wholesale: only the enquiry form (no "Get in touch" card)')
    const formBox = await page.$eval('[data-testid="bulk-form"]', (e) => { const r = e.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(window.innerWidth - r.right) } })
    check(Math.abs(formBox.left - formBox.right) <= 2, 'S9 wholesale: the form is centred on the page', formBox)
    await click(page, '[data-testid="bulk-submit"]'); await sleep(300)
    check(await exists(page, '[aria-invalid="true"]'), 'S9 wholesale: an empty enquiry is not sent')
    await fill(page, '[data-testid="b-name"]', 'Bulk Buyer'); await fill(page, '[data-testid="b-phone"]', randomPhone())
    await click(page, '[data-testid="b-product"]'); await click(page, `[data-testid="b-product-list"] [data-value="${catalogue[0].id}"]`); await fill(page, '[data-testid="b-quantity"]', '120')
    await click(page, '[data-testid="bulk-submit"]')
    check(await waitFor(page, () => !!document.querySelector('[data-testid="bulk-success"]')) && /^WS-/.test(await text(page, '[data-testid="bulk-reference"]')), 'S9 wholesale: the enquiry is sent and the reference is shown', await exists(page, '[data-testid="bulk-reference"]') ? await text(page, '[data-testid="bulk-reference"]') : await exists(page, '[data-testid="bulk-error"]') ? await text(page, '[data-testid="bulk-error"]') : '')
    check(await page.evaluate(() => document.querySelectorAll('input[name="hp_extra"]').length) === 0, 'S9 wholesale: (the form is gone after success)')
    await page.__ctx.close()
    const r2 = await open()
    await go(r2.page, '/wholesale')
    check(await r2.page.$eval('input[name="hp_extra"]', (e) => e.tabIndex === -1 && e.value === ''), 'S9 wholesale: the honeypot field `hp_extra` is in the form, empty and out of the tab order')
    await r2.context.close()
  }

  // ================================================================ S10 the shop is closed: a banner site-wide, ordering disabled
  {
    await putSettings({ store_open: false, store_closed_message: 'We are closed until Monday.' })
    const { page } = await open()
    await cartWith(page, single.variant_id, 1)
    await go(page, '/')
    await waitFor(page, () => !!document.querySelector('[data-testid="store-closed-banner"]'), null, 10000)
    check(await exists(page, '[data-testid="store-closed-banner"]') && /closed until Monday/.test(await text(page, '[data-testid="store-closed-banner"]')), 'S10 closed: a site-wide banner with the closed message')
    await go(page, '/product/rainbow-stacking-blocks')
    await waitFor(page, () => !!document.querySelector('[data-testid="store-closed-banner"]'), null, 10000)
    check(await page.$eval('[data-testid="add-to-cart"]', (e) => e.disabled), 'S10 closed: Add to Cart is disabled on a product page')
    await go(page, '/checkout')
    await page.waitForSelector('[data-testid="closed-notice"]', { timeout: 15000 })
    check(await page.$eval('[data-testid="place-order"]', (e) => e.disabled) && /closed/i.test(await text(page, '[data-testid="place-order"]')), 'S10 closed: the checkout says it is closed and the order button is disabled')
    await putSettings({ store_open: true, store_closed_message: '' })
    await page.__ctx.close()
  }

  // ================================================================ S11 the price changed while checking out
  {
    const { page } = await open()
    await cartWith(page, single.variant_id, 1)
    await go(page, '/checkout')
    await fillCheckout(page, 'cod')
    await page.setRequestInterception(true)
    let tampered = false
    page.on('request', (r) => {
      if (!tampered && r.method() === 'POST' && /\/store\/orders$/.test(r.url())) {
        tampered = true
        const body = JSON.parse(r.postData() || '{}'); body.expected_total = Number(body.expected_total) + 7
        r.continue({ postData: JSON.stringify(body) })
      } else r.continue()
    })
    await click(page, '[data-testid="place-order"]')
    await page.waitForSelector('[data-testid="price-changed"]', { timeout: 20000 })
    check(/it is now/.test(await text(page, '[data-testid="price-changed"]')) && !page.url().includes('/order/'), 'S11 price_changed: the new total is shown and the customer is asked to confirm', await text(page, '[data-testid="price-changed"]'))
    await waitFor(page, () => !document.querySelector('[data-testid="confirm-price"]')?.disabled)   // the page re-quotes first
    await click(page, '[data-testid="confirm-price"]')
    const placed = await waitFor(page, () => location.pathname.startsWith('/order/'), null, 30000)
    check(placed, 'S11 price_changed: after the confirmation the order is placed at the new price', placed ? '' : await page.evaluate(() => ({ problem: document.querySelector('[data-testid="checkout-problem"]')?.innerText, changed: document.querySelector('[data-testid="price-changed"]')?.innerText, btn: document.querySelector('[data-testid="confirm-price"]')?.disabled })))
    await page.__ctx.close()
  }

  // ================================================================ S12 a product created AFTER the build still opens (the app shell loads it from the API); an unknown slug is a 404 page
  {
    const category = (await api('GET', 'store/categories')).json.data[0]
    const stamp = Date.now().toString(36)
    const created = await api('POST', 'admin/products', { token: dev, body: { category_id: category.id, name: `Late Arrival ${stamp}`, sku: `LATE-${stamp}`, short_description: 'Created after the last build.', status: 'active', variants: [{ name: `Late Arrival ${stamp}`, sku: `LATE-${stamp}-1`, is_default: true, mrp: 30, selling_price: 25, stock: 9 }] } })
    const slug = created.json?.data?.slug
    check(created.status === 201 && !!slug, 'S12 fallback: a new product is created in the admin API after the build', created.status)
    const { page, problems } = await open()
    const fileOnDisk = fs.existsSync(path.join(ROOT, '.output', 'public', 'product', slug, 'index.html'))
    await go(page, `/product/${slug}`)
    await page.waitForSelector('[data-testid="product-name"]', { timeout: 20000 })
    check(!fileOnDisk && (await text(page, '[data-testid="product-name"]')).includes('Late Arrival'), 'S12 fallback: it has no HTML file, yet /product/<slug> opens and shows it (loaded from the API in the browser)', await text(page, '[data-testid="product-name"]'))
    check(/\$?Rs\.\s?25/.test(await text(page, '[data-testid="price"]')), 'S12 fallback: with its live price', await text(page, '[data-testid="price"]'))
    await go(page, '/product/this-toy-does-not-exist-xyz')
    check(await waitFor(page, () => /could not find that page/i.test(document.body.innerText), null, 15000), 'S12 fallback: an unknown product slug gives the friendly 404 page')
    const before404 = problems.length
    await go(page, '/no-such-page')
    check(/could not find that page/i.test(await page.evaluate(() => document.body.innerText)), 'S12 404: an unknown page gives the friendly 404 page')
    // Nuxt 4 logs the 404 of an unknown page as a bare "[NUXT_E1005]" (error during app initialization; Nuxt 3 printed "Page not found"):
    // expected for THIS step only, any other init error still fails the run
    for (let i = problems.length - 1; i >= before404; i--) if (/NUXT_E1005/.test(problems[i])) problems.splice(i, 1)
    check(problems.length === 0, 'S12 fallback: no script errors', problems)
    await page.__ctx.close()
    await api('DELETE', `admin/products/${created.json.data.id}`, { token: dev })
  }

  // ================================================================ S13 search, filters and the static pages
  {
    const { page } = await open()
    await go(page, '/')
    await page.$eval('#site-search', (e) => e.focus())
    await fill(page, '#site-search', 'duck')
    check(await waitFor(page, () => !!document.querySelector('[data-testid="search-suggestions"] li a')), 'S13 search: debounced live suggestions appear (name, picture, price)')
    check(/duck/i.test(await text(page, '[data-testid="search-suggestions"]')) && /Rs\./.test(await text(page, '[data-testid="search-suggestions"]')), 'S13 search: the suggestions show the name and the price', (await text(page, '[data-testid="search-suggestions"]')).slice(0, 120))
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => location.pathname === '/shop' && location.search.includes('q=duck'), { timeout: 10000 })
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 })
    check(page.url().includes('/shop?q=duck') && (await count(page, '[data-testid="product-card"]')) >= 1, 'S13 search: Enter goes to /shop?q=duck with the results', await count(page, '[data-testid="product-card"]'))

    await go(page, '/shop')
    const all = await count(page, '[data-testid="product-card"]')
    check(all === 24 && await exists(page, '[data-testid="load-more"]'), 'S13 shop: 24 products and a "Load more" button', all)
    await click(page, '[data-testid="load-more"]'); await waitFor(page, () => document.querySelectorAll('[data-testid="product-card"]').length > 24)
    check((await count(page, '[data-testid="product-card"]')) === catalogue.length, 'S13 shop: Load more adds the rest', await count(page, '[data-testid="product-card"]'))
    await go(page, '/category/outdoor-play')
    const outdoor = await count(page, '[data-testid="product-card"]')
    check(outdoor > 0 && outdoor < catalogue.length && /Outdoor Play/.test(await text(page, 'h1')), 'S13 category: only the products of the category', outdoor)
    check(/Ride-ons|Sand & Water/.test(await text(page, '[data-testid="category-chips"]')), 'S13 category: its sub-categories are listed as chips')
    await go(page, '/category/arts-crafts')

    // one category without a sample discount: the list sorts by the stored price, a category with an automatic discount shows its lower price (known: the order can then look off by a hair)
    await go(page, '/shop?sort=price_asc&category=building-blocks')
    const prices = await page.$$eval('[data-testid="product-card"]', (cards) => cards.slice(0, 6).map((c) => Number((c.querySelector('[data-testid="card-price"]').innerText.match(/Rs\.\s?([\d,]+)/) || [])[1]?.replace(/,/g, '')) || 0))
    check(prices.every((p, i) => i === 0 || p >= prices[i - 1]), 'S13 shop: sort by price, low to high', prices)
    await go(page, '/shop?stock=1')
    check(!(await page.evaluate(() => /SOLD OUT/.test(document.body.innerText))) && soldOut !== undefined, 'S13 shop: the in-stock filter hides the sold-out toy')
    await go(page, '/shop?min=40&max=60')
    const range = await page.$$eval('[data-testid="product-card"]', (cards) => cards.map((c) => Number((c.querySelector('[data-testid="card-price"]').innerText.match(/Rs\.\s?([\d,]+)/) || [])[1]?.replace(/,/g, '')) || 0))
    check(range.length > 0 && range.every((p) => p >= 40 && p <= 60), 'S13 shop: the price filter', range)

    for (const [route, h1] of [['/about', /About us/], ['/shipping-policy', /Shipping policy/], ['/return-policy', /Return policy/], ['/terms-and-conditions', /Terms and conditions/], ['/privacy-policy', /Privacy policy/]]) {
      const src = await html(`${route}/`)
      await go(page, route)
      check(h1.test(await text(page, 'h1')) && /JHK Store/.test(await page.evaluate(() => document.body.innerText)) && src.includes('<h1') && src.includes('JHK Store'), `S13 static page ${route}: written content with the store name from the settings (also in the HTML file)`)
    }
    check(/hello@jhkstore.example/.test(await html('/privacy-policy/')), 'S13 static page: the e-mail of the settings is used in the text')
    await page.__ctx.close()
  }

  // ================================================================ S14 SEO files and noindex
  {
    const robots = await html('/robots.txt')
    const sitemap = await html('/sitemap.xml')
    const urls = (sitemap.match(/<loc>/g) || []).length
    check(/Disallow: \/cart/.test(robots) && /Disallow: \/checkout/.test(robots) && /Sitemap: .+\/sitemap\.xml/.test(robots), 'S14 SEO: robots.txt disallows cart / checkout / track / order and names the sitemap')
    const sm = (await api('GET', 'store/sitemap')).json
    const expected = sm.products.length + sm.categories.length + sm.sub_categories.length + 8
    check(urls === expected && sitemap.includes('/product/rainbow-stacking-blocks') && !sitemap.includes('/checkout'), 'S14 SEO: sitemap.xml lists every product, category, sub-category and the static pages', { urls, expected })
    for (const route of ['/cart', '/checkout', '/track']) check(/noindex/.test(await html(`${route}/`)), `S14 SEO: ${route} is noindex`)
    const home = await html('/')
    check(/"@type":"Organization"/.test(home) && /"@type":"WebSite"/.test(home) && /SearchAction/.test(home) && /<html[^>]+lang="en"/.test(home) && /rel="icon"/.test(home), 'S14 SEO: the home page has Organization and WebSite (SearchAction) JSON-LD, lang and a favicon')
    check(/rel="preload"[^>]+as="image"/.test(home) || /<link[^>]+as="image"/.test(home), 'S14 performance: the hero picture is preloaded')
    check(/font-display:\s*swap/.test(await (async () => { const css = (home.match(/href="(\/_nuxt\/[^"]+\.css)"/g) || []).map((m) => m.slice(6, -1)); let all = home; for (const c of css) all += await html(c); return all })()), 'S14 performance: fonts are self-hosted with font-display: swap')
    check(!/fonts\.googleapis|fonts\.gstatic/.test(home), 'S14 performance: no request to Google Fonts in the page')
    const shop = await html('/shop/')
    check(/<img[^>]+width="\d+"[^>]+height="\d+"/.test(shop) || /<img[^>]+height="\d+"[^>]+width="\d+"/.test(shop), 'S14 performance: pictures carry width and height (no layout shift)')
    check(!/(google-analytics|googletagmanager|gtag\(|fbq\(|hotjar|plausible)/i.test(home + shop), 'S14 no analytics or tracking code')
  }

  // ================================================================ S15 accessibility basics
  {
    const { page } = await open()
    for (const route of ['/', '/shop', '/product/rainbow-stacking-blocks', '/wholesale', '/about']) {
      await go(page, route)
      const a11y = await page.evaluate(() => ({
        landmarks: ['header', 'main', 'nav', 'footer'].every((t) => document.querySelector(t)),
        imgsWithoutAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
        buttonsWithoutName: [...document.querySelectorAll('button')].filter((b) => !(b.innerText || b.getAttribute('aria-label') || b.getAttribute('title') || '').trim()).length,
        inputsWithoutLabel: [...document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not(.hp-field input), select, textarea')].filter((i) => !i.closest('.hp-field') && !(i.labels && i.labels.length) && !i.getAttribute('aria-label')).length,
        h1: document.querySelectorAll('h1').length,
      }))
      check(a11y.landmarks && a11y.imgsWithoutAlt === 0 && a11y.buttonsWithoutName === 0 && a11y.inputsWithoutLabel === 0 && a11y.h1 === 1, `S15 accessibility ${route}: landmarks, alt text, named buttons, labelled inputs, one h1`, a11y)
    }
    await go(page, '/')
    await page.keyboard.press('Tab')
    check(await page.evaluate(() => document.activeElement?.textContent?.includes('Skip to content') ?? false), 'S15 accessibility: the first Tab stop is "Skip to content"')
    await page.__ctx.close()
  }

  // ================================================================ S17 layout: see-through header on the home page, one-line card descriptions, wholesale page, no fixed toys-only brand picture
  {
    const { page } = await open()
    await go(page, '/')
    check(await page.$eval('[data-testid="site-header"]', (e) => e.dataset.clear) === 'true' && await page.$eval('[data-testid="site-header"]', (e) => getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)'), 'S17 home: the header is see-through at the top of the page (the hero runs under it)')
    await page.evaluate(() => window.scrollTo(0, 600)); await sleep(500)
    check(await page.$eval('[data-testid="site-header"]', (e) => e.dataset.clear) === 'false', 'S17 home: the header turns solid once the page is scrolled')
    const hero = await page.$eval('[data-testid="hero"]', (e) => e.getBoundingClientRect().top + window.scrollY)
    check(hero <= 1, 'S17 home: the hero starts at the very top of the page', hero)
    const desc = await page.$$eval('[data-testid="card-description"]', (els) => els.map((e) => e.getBoundingClientRect().height))
    check(desc.length > 0 && desc.every((h) => h <= 20), 'S17 cards: the description of a product card is one line', Math.max(...desc))
    await go(page, '/shop')
    check(await exists(page, '[data-testid="category-chips"]') && await exists(page, '[data-testid="sort"]') && !(await exists(page, '[data-testid="shop-search"]')) && !(await exists(page, '[data-testid="min-price"]')) && !(await exists(page, '[data-testid="in-stock"]')), 'S17 shop: category chips and the sort; no second search box, price range or in-stock box')
    const oneLine = await page.evaluate(() => Math.abs(document.querySelector('[data-testid="result-count"]').getBoundingClientRect().top - document.querySelector('[data-testid="sort"]').getBoundingClientRect().top) < 30)
    check(oneLine, 'S17 shop: the number of toys and the sort are on one line')
    await go(page, '/wholesale')
    check(/Wholesale/.test(await text(page, 'h1')) && await exists(page, '[data-testid="bulk-form"]'), 'S17 wholesale: the page is called Wholesale and has the enquiry form')
    check(await page.$$eval('nav[aria-label="Main"] a', (as) => as.some((a) => a.getAttribute('href') === '/wholesale') && !as.some((a) => a.getAttribute('href') === '/contact')), 'S17 wholesale: the menu has Wholesale and no Contact')
    check(await page.$$eval('footer a', (as) => as.some((a) => a.getAttribute('href') === '/wholesale')), 'S17 wholesale: the footer links to it')
    await go(page, '/about')
    const ctaColors = await page.$eval('main a.btn-primary', (e) => ({ c: getComputedStyle(e).color, b: getComputedStyle(e).backgroundColor }))
    check(ctaColors.c !== ctaColors.b, 'S17 about: the Shop now button text is not the colour of its background', ctaColors)
    await page.__ctx.close()
  }

  // ================================================================ S16 the buttons wear the colours of the admin panel exactly (primary colour, its text colour)
  {
    const { page } = await open()
    await go(page, '/')
    const theme = (await api('GET', 'store/settings')).json.theme
    const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})` }
    const looks = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector('[data-testid="hero-button"]')); return { bg: cs.backgroundColor, fg: cs.color } })
    check(looks.bg === rgb(theme.primary) && looks.fg === rgb(theme.primary_contrast), 'S16 buttons: Shop Now has exactly the primary colour of the admin panel and its text colour (no darkened shade)', { looks, theme: [theme.primary, theme.primary_contrast] })
    await page.__ctx.close()
  }

  // ================================================================ S18 announcement bar (admin switch + text), WhatsApp button and back to the top
  {
    await putSettings({ announcement_enabled: true, announcement_text: 'E2E announcement text', whatsapp_number: '+92 300 1234567' })
    const { page } = await open()
    await go(page, '/')
    const shown = await waitFor(page, () => !!document.querySelector('[data-testid="announcement-bar"]'), null, 15000)
    const geo = shown && await page.evaluate(() => ({ text: document.querySelector('[data-testid="announcement-bar"]').innerText, barBottom: document.querySelector('[data-testid="announcement-bar"]').getBoundingClientRect().bottom, headerTop: document.querySelector('[data-testid="site-header"]').getBoundingClientRect().top }))
    check(shown && /E2E announcement text/i.test(geo.text) && geo.barBottom <= geo.headerTop + 1, 'S18 announcement bar: the text from the admin panel is shown above the header when it is on', geo)
    check(await waitFor(page, () => /^https:\/\/wa\.me\//.test(document.querySelector('[data-testid="whatsapp-float"]')?.getAttribute('href') || ''), null, 15000), 'S18 WhatsApp: a round WhatsApp button appears when the admin panel has a WhatsApp number')
    check(!(await exists(page, '[data-testid="back-to-top"]')), 'S18 back to top: not shown at the top of the page')
    await page.evaluate(() => window.scrollTo(0, 900)); await sleep(600)
    check(await exists(page, '[data-testid="back-to-top"]'), 'S18 back to top: shown after the page is scrolled')
    await click(page, '[data-testid="back-to-top"]'); await sleep(1200)
    check(await page.evaluate(() => window.scrollY) < 40, 'S18 back to top: the button takes the page back to the top')
    await page.__ctx.close()
    await putSettings({ announcement_enabled: false })
    const r2 = await open()
    await go(r2.page, '/'); await sleep(2500)
    check(!(await exists(r2.page, '[data-testid="announcement-bar"]')), 'S18 announcement bar: switched off in the admin panel = not shown')
    await r2.context.close()
    await putSettings({ announcement_text: '', whatsapp_number: '' })
  }
} catch (e) {
  failures++
  console.log(`\nSCRIPT ERROR: ${e.stack || e}`)
} finally {
  await putSettings({ store_open: true, store_closed_message: '' }).catch(() => {})
  await browser.close()
  server?.kill()
  console.log(`\n${passes} passed, ${failures} failed`)
  process.exit(failures ? 1 : 0)
}
