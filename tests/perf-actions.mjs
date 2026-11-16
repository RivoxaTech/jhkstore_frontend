// How fast do the three customer actions feel, and what do they cost on the network? Headless Chrome (puppeteer-core) against the GENERATED site
// (npm run generate, served by scripts/serve-static.mjs) and the real API on ANOTHER origin (so every call is cross-origin, like Cloudflare Pages + api.example.com).
//
//   SITE=http://127.0.0.1:3020 API=http://127.0.0.1:8012/api/v1 node tests/perf-actions.mjs [--net none|rtt150|fast4g] [--rounds 3] [--json out.json]
//
// Measured, for each action: ms the customer waits, the API calls it makes (and which of them are CORS preflights = an extra OPTIONS round trip), bytes.
//   1. add to cart  : click on "Add to Cart" of a card -> the drawer is open (what the person sees) -> the server call has finished (the cart is real)
//   2. checkout open: page opened with a cart -> the server has priced it and "Place order" is enabled (cart read + quote)
//   3. place order  : click on "Place order" -> the order page shows its number
//   4. page change  : click from the shop to a product page
// --net rtt150 is for an API behind tests/delay-proxy.mjs (150 ms per round trip, preflights included); fast4g also limits the speed to 1.6 / 0.75 Mbit/s (Chrome's "Fast 4G"). none = no delay.
// It places real orders (cash on delivery, a few) and carts: run it on a scratch database only (the rate limits: CART_PER_MINUTE etc. high on the scratch API).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def }
const SITE = (process.env.SITE || 'http://127.0.0.1:3020').replace(/\/$/, '')
const API = (process.env.API || 'http://127.0.0.1:8012/api/v1').replace(/\/$/, '')
const NET = arg('net', 'none')
const ROUNDS = Number(arg('rounds', 3))
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const PROFILES = { none: null, rtt150: null, fast4g: { latency: 0, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 } }   // the 150 ms of rtt150 / fast4g comes from tests/delay-proxy.mjs in front of the API
if (!(NET in PROFILES)) throw new Error('--net none | rtt150 | fast4g')

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })

/** A fresh browser profile (own localStorage and cart) with a recorder of every call to the API. */
async function open() {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1366, height: 900 })
  const cdp = await page.createCDPSession()
  await cdp.send('Network.enable')
  const calls = new Map()
  let recording = false
  cdp.on('Network.requestWillBeSent', (e) => { if (recording && e.request.url.startsWith(API)) calls.set(e.requestId, { id: e.requestId, method: e.request.method, path: e.request.url.slice(API.length).split('?')[0], type: e.type, t0: Date.now(), bytes: 0 }) })
  cdp.on('Network.loadingFinished', (e) => { const c = calls.get(e.requestId); if (c) { c.done = Date.now(); c.bytes = e.encodedDataLength } })
  cdp.on('Network.loadingFailed', (e) => { const c = calls.get(e.requestId); if (c) c.done = Date.now() })
  const net = PROFILES[NET]
  const throttle = () => net ? cdp.send('Network.emulateNetworkConditions', { offline: false, ...net }) : Promise.resolve()
  await throttle()
  return {
    ctx, page,
    start: () => { calls.clear(); recording = true },
    stop: () => { recording = false; return [...calls.values()] },
    /** Waits until a call that matches has finished; the ms that took from now. */
    async finished(match, timeout = 30000) {
      const t0 = Date.now()
      while (Date.now() - t0 < timeout) { if ([...calls.values()].some((c) => c.done && match(c))) return Date.now() - t0; await sleep(10) }
      throw new Error('the call did not finish')
    },
  }
}

const summarize = (calls) => {
  const preflights = calls.filter((c) => c.method === 'OPTIONS')
  const real = calls.filter((c) => c.method !== 'OPTIONS')
  return { requests: real.length, preflights: preflights.length, list: real.map((c) => `${c.method} ${c.path}`).join(', '), kb: Math.round(calls.reduce((a, c) => a + c.bytes, 0) / 102.4) / 10 }
}
const phone = () => '+2305' + String(Math.floor(1000000 + Math.random() * 8999999))
const post = async (path, body) => (await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })).json()

// one single-option, in-stock product (its card adds to the cart at once) and its option id
const list = (await (await fetch(`${API}/products?per_page=40`)).json()).data
const single = list.find((p) => !p.show_starting_at && !p.is_sold_out && p.in_stock !== false && !(p.options_count > 1)) || list[0]
const detail = (await (await fetch(`${API}/products/${single.slug}`)).json()).data
const variantId = (detail.options || detail.variants)[0].id

async function addToCart() {
  const s = await open()
  await s.page.goto(`${SITE}/shop`, { waitUntil: 'networkidle0', timeout: 60000 })
  await s.page.waitForSelector(`[data-slug="${single.slug}"] [data-testid="add-to-cart"]`)
  await sleep(500)
  s.start()
  const t0 = Date.now()
  await s.page.evaluate((slug) => document.querySelector(`[data-slug="${slug}"] [data-testid="add-to-cart"]`).click(), single.slug)
  await s.page.waitForSelector('[data-testid="cart-drawer"]', { timeout: 20000 })
  const drawer = Date.now() - t0
  await s.page.waitForFunction(() => localStorage.getItem('jhk_cart_token'), { timeout: 20000, polling: 20 })
  await s.page.waitForFunction(() => document.querySelectorAll('[data-testid="cart-lines"] li').length > 0, { timeout: 20000, polling: 20 })
  const real = Date.now() - t0   // the server has answered: the line is in the drawer
  await sleep(1500)
  const calls = s.stop()
  // the same action again in the same visit (the browser may now remember the preflight of /cart/items). The second call is the first one that carries the cart
  // token header, which the remembered answer of the first call did not cover, so it asks once more: measure the third.
  const click = () => s.page.evaluate((slug) => document.querySelector(`[data-slug="${slug}"] [data-testid="add-to-cart"]`).click(), single.slug)
  s.start()
  await click()
  await s.finished((c) => c.method === 'POST' && c.path === '/cart/items')
  await sleep(1000)
  s.stop()
  s.start()
  const t1 = Date.now()
  await s.page.evaluate((slug) => document.querySelector(`[data-slug="${slug}"] [data-testid="add-to-cart"]`).click(), single.slug)
  await s.finished((c) => c.method === 'POST' && c.path === '/cart/items')
  const again = Date.now() - t1
  const second = summarize(s.stop())
  await s.ctx.close()
  return { drawer, real, ...summarize(calls), again, secondPreflights: second.preflights }
}

async function checkout() {
  const cart = await post('/cart/items', { variant_id: variantId, qty: 1 })
  const token = cart.data.token
  const s = await open()
  await s.page.evaluateOnNewDocument((t) => { try { localStorage.setItem('jhk_cart_token', t) } catch { /* */ } }, token)
  s.start()
  const t0 = Date.now()
  await s.page.goto(`${SITE}/checkout`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await s.page.waitForSelector('[data-testid="f-name"]', { timeout: 30000 })
  await s.page.waitForFunction(() => { const b = document.querySelector('[data-testid="place-order"]'); return b && !b.disabled }, { timeout: 30000, polling: 20 })
  const ready = Date.now() - t0
  await sleep(800)
  const open_ = summarize(s.stop())
  // the address changes: the quote is asked again (after the 600 ms pause the page keeps on purpose): the second quote of the visit
  s.start()
  await s.page.click('[data-testid="f-city"]')
  await s.page.type('[data-testid="f-city"]', 'Quatre Bornes', { delay: 0 })
  const t2 = Date.now()
  await s.finished((c) => c.method === 'POST' && c.path === '/checkout/quote')
  const requote = Date.now() - t2
  const requoteCalls = summarize(s.stop())
  // fill the form like a person (typing into the fields), then place the order
  const type = async (sel, text) => { await s.page.click(sel); await s.page.type(sel, text, { delay: 0 }) }
  await type('[data-testid="f-name"]', 'Speed Buyer')
  await type('[data-testid="f-phone"]', phone())
  await type('[data-testid="f-line1"]', '12 Example Street')
  await type('[data-testid="f-city"]', 'Port Louis')
  await s.page.click('[data-testid="pay-cod"]')
  await sleep(1500)   // the quote after the address (600 ms pause) settles
  await s.page.waitForFunction(() => { const b = document.querySelector('[data-testid="place-order"]'); return b && !b.disabled }, { timeout: 30000, polling: 20 })
  await sleep(300)
  s.start()
  const t1 = Date.now()
  await s.page.click('[data-testid="place-order"]')
  await s.page.waitForFunction(() => location.pathname.startsWith('/order/'), { timeout: 40000, polling: 20 })
  const placed = Date.now() - t1
  await s.page.waitForFunction(() => /[A-Z]{2,}-\d{4}-\d{6}/.test(document.body.innerText), { timeout: 40000, polling: 20 })
  const shown = Date.now() - t1
  await sleep(1500)
  const order = summarize(s.stop())
  await s.ctx.close()
  return { ready, open: open_, requote, requotePreflights: requoteCalls.preflights, placed, shown, order }
}

async function pageChange() {
  const s = await open()
  await s.page.goto(`${SITE}/shop`, { waitUntil: 'networkidle0', timeout: 60000 })
  await sleep(500)
  s.start()
  const t0 = Date.now()
  await s.page.evaluate(() => document.querySelector('[data-testid="product-card"] a[href^="/product/"]').click())
  await s.page.waitForFunction(() => location.pathname.startsWith('/product/') && document.querySelector('[data-testid="add-to-cart"]'), { timeout: 30000, polling: 20 })
  const ms = Date.now() - t0
  await sleep(1500)
  const calls = s.stop()
  await s.ctx.close()
  return { ms, ...summarize(calls) }
}

const res = { net: NET, rounds: ROUNDS, add: [], checkout: [], nav: [] }
await addToCart()   // a round that is not counted: the first requests of a freshly started API are slower (OPcache, connections)
for (let i = 0; i < ROUNDS; i++) {
  res.add.push(await addToCart())
  res.checkout.push(await checkout())
  res.nav.push(await pageChange())
}
await browser.close()

const m = (rows, f) => median(rows.map(f))
const first = (rows, f) => f(rows[0])
console.log(`\nnetwork: ${NET}   rounds: ${ROUNDS} (median)   API: ${API}   site: ${SITE}`)
console.log(`add to cart     drawer open ${m(res.add, (r) => r.drawer)} ms | cart real ${m(res.add, (r) => r.real)} ms | ${first(res.add, (r) => r.requests)} api calls + ${first(res.add, (r) => r.preflights)} preflights | ${first(res.add, (r) => r.list)}`)
console.log(`add again       third add in the same visit ${m(res.add, (r) => r.again)} ms | ${first(res.add, (r) => r.secondPreflights)} preflights`)
console.log(`checkout open   ready ${m(res.checkout, (r) => r.ready)} ms | ${first(res.checkout, (r) => r.open.requests)} api calls + ${first(res.checkout, (r) => r.open.preflights)} preflights | ${first(res.checkout, (r) => r.open.list)}`)
console.log(`quote again     address changed -> new quote ${m(res.checkout, (r) => r.requote)} ms | ${first(res.checkout, (r) => r.requotePreflights)} preflights`)
console.log(`place order     order page URL ${m(res.checkout, (r) => r.placed)} ms | order shown ${m(res.checkout, (r) => r.shown)} ms | ${first(res.checkout, (r) => r.order.requests)} api calls + ${first(res.checkout, (r) => r.order.preflights)} preflights | ${first(res.checkout, (r) => r.order.list)}`)
console.log(`page change     shop -> product ${m(res.nav, (r) => r.ms)} ms | ${first(res.nav, (r) => r.requests)} api calls + ${first(res.nav, (r) => r.preflights)} preflights | ${first(res.nav, (r) => r.list)}`)
const out = arg('json', '')
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 2))
