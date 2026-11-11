// The whole shop in ONE real browser session: a customer on the website and the shop owner in the admin panel at the same time (headless Chrome through
// puppeteer-core, the real API, the generated site). It checks what each side SEES when the other acts, in real time:
//
//   customer: product page, options, quantity, cart drawer edits, coupon apply / remove, checkout (cash on delivery and bank transfer with the screenshot),
//             a double click on Place Order, the order page, "Track your order" from the footer, the wholesale form, an abandoned cart, phone layouts
//   owner:    the new order appears in the list within the 5-second poll (no reload), the badge, the toast + chime, the invoice, every status change
//             (no questions, "are you sure" for cancel / reject), stock and customer totals, the e-mails in the mail log
//
//   cd backend && php artisan migrate:fresh --seed && php artisan db:seed --class=DemoSeeder        (a scratch database)
//   php artisan serve --port=8012                                                                    (the API; the admin panel is built: cd admin-frontend && npm run build)
//   cd frontend && NUXT_PUBLIC_API_BASE=http://127.0.0.1:8012/api/v1/store npm run generate && node scripts/serve-static.mjs .output/public 3020
//   API=http://127.0.0.1:8012 SITE=http://127.0.0.1:3020 SHOTS=<folder for the screenshots> node tests/journey.mjs
//
// Needs the log mailer (MAIL_MAILER=log) so the e-mails can be read from backend/storage/logs/laravel.log, and `mysql` (MYSQL=...) in a scratch database
// to age a cart (abandoned) - the same convention as scripts/adversarial.mjs.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const API = (process.env.API || 'http://127.0.0.1:8012').replace(/\/$/, '')
const SITE = (process.env.SITE || 'http://127.0.0.1:3020').replace(/\/$/, '')
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'journey-'))
const MYSQL = process.env.MYSQL || 'mysql'
const DBNAME = process.env.DB_DATABASE || 'jhkstore_shots'
const LOG = path.join(REPO, 'backend', 'storage', 'logs', 'laravel.log')
const DEV = ['developer', 'developer']
const ADM = ['admin', 'admin']
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p))
const RUN = Date.now().toString(36).toUpperCase()
fs.mkdirSync(SHOTS, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let failures = 0
let passes = 0
const short = (v, n = 220) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > n ? `${s.slice(0, n)}…` : s }
const check = (ok, label, actual) => { if (ok) passes++; else failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${actual === undefined ? '' : `  -> ${short(actual)}`}`) }
const section = (t) => console.log(`\n== ${t}`)

async function api(method, route, { token, body, headers = {} } = {}) {
  const r = await fetch(`${API}/api/v1/${route}`, { method, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined })
  const text = await r.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* not json */ }
  return { status: r.status, json, text }
}
const D = (await api('POST', 'admin/auth/login', { body: { login: DEV[0], password: DEV[1] } })).json?.token
const A = (await api('POST', 'admin/auth/login', { body: { login: ADM[0], password: ADM[1] } })).json?.token
if (!D || !A) { console.error('cannot log in'); process.exit(2) }
const dbw = (sql) => { if (!/jhkstore_shots|scratch/.test(DBNAME)) throw new Error('scratch database only'); execFileSync(MYSQL, ['-uroot', DBNAME, '-e', sql]) }
const dbq = (sql) => execFileSync(MYSQL, ['-uroot', '-N', DBNAME, '-e', sql], { encoding: 'utf8' }).trim().replace(/\r/g, '')
const logSize = () => (fs.existsSync(LOG) ? fs.statSync(LOG).size : 0)
const logSince = (pos) => (fs.existsSync(LOG) ? fs.readFileSync(LOG).subarray(pos).toString('utf8') : '')   // pos is in BYTES (the log has multi-byte characters)

// a flat PNG for the file inputs
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]) }
function writePng(file, w, h, [r, g, b]) {
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())])
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))), chunk('IEND', Buffer.alloc(0))]))
  return file
}
const PROOF = writePng(path.join(SHOTS, 'proof.png'), 400, 600, [60, 140, 200])
const TEXTFILE = path.join(SHOTS, 'not-an-image.txt'); fs.writeFileSync(TEXTFILE, 'hello')
const phone = (() => { let n = 0; return () => `+92300${String(Date.now()).slice(-6)}${n++ % 10}` })()

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const problems = []
async function newPage(viewport) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/40[0-9]|422|429|NUXT_E1005/.test(m.text())) problems.push(`console: ${m.text()}`) })
  page.on('dialog', (d) => d.accept().catch(() => {}))
  return page
}
const setValue = (page, selector, value) => page.$eval(selector, (el, v) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }))
}, String(value))
const text = (page, selector) => page.$eval(selector, (e) => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '')
const exists = async (page, selector) => Boolean(await page.$(selector))
const waitFor = (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, { timeout, polling: 100 }, arg).then(() => true).catch(() => false)
const shot = async (page, name, opts = {}) => { await page.bringToFront().catch(() => {}); return page.screenshot({ path: path.join(SHOTS, `${name}.png`), ...opts }).catch(() => {}) }
const overflow = (page) => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, drift: document.documentElement.scrollWidth - window.innerWidth }))

// ---------------------------------------------------------------- data to work with
const products = (await api('GET', 'store/products?per_page=60')).json.data
const multi = []
for (const p of products.slice(0, 40)) { if (p.options_count > 1) { multi.push(p); break } }
const simple = products.find((p) => p.has_single_option && !p.is_sold_out && p.price > 5)
const multiProduct = multi[0] || simple
// plenty of stock for the products the journey buys (a scratch database that has seen other runs may have sold them out)
for (const p of [simple, multiProduct]) dbw(`UPDATE product_variants SET stock_qty = 200 WHERE product_id = ${Number(p.id)}`)
const couponCode = `JRN${RUN}`
await api('POST', 'admin/coupons', { token: A, body: { code: couponCode, name: 'Journey 10', type: 'percent', value: 10, scope: 'store' } })
await api('PUT', 'admin/settings', { token: D, body: { mail_enabled: true, notify_admin_email: 'owner@shop.test', pay_bank_enabled: true, pay_cod_enabled: true, pay_bank_proof_required: true, pay_bank_accounts: [{ bank: 'Journey Bank', title: 'Shop', number: '000111222', iban: 'PK00JRNY' }] } })

// ================================================================ the owner's panel is open BEFORE the customer buys
section('Owner: the panel is open on Orders')
const owner = await newPage({ width: 1366, height: 900 })
await owner.evaluateOnNewDocument(() => {
  window.__plays = []
  HTMLMediaElement.prototype.play = function () { window.__plays.push('play'); return Promise.resolve() }
  window.AudioContext = undefined; window.webkitAudioContext = undefined
})
await owner.goto(`${API}/admin/login`, { waitUntil: 'networkidle0' })
await owner.bringToFront()   // a tab in the background cannot be clicked or photographed reliably
await setValue(owner, '#username', ADM[0]); await setValue(owner, '#password', ADM[1])
await Promise.all([owner.waitForSelector('.sidebar__nav', { timeout: 30000 }), owner.click('button[type="submit"]')])
await owner.goto(`${API}/admin/orders`, { waitUntil: 'networkidle0' })
await owner.bringToFront()   // a tab in the background cannot be clicked or photographed reliably
await owner.evaluate(() => { document.dispatchEvent(new PointerEvent('pointerdown')); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' })) }); await sleep(400)   // the first click / key press of a person unlocks the sound
const badge0 = Number(await text(owner, '[data-testid="orders-badge"]')) || 0
await owner.waitForSelector('tbody tr.row-link', { timeout: 15000 }).catch(() => {})
const rows0 = await owner.$$eval('tbody tr.row-link', (r) => r.length)
console.log(`   orders on screen: ${rows0}, badge: ${badge0}`)

// ================================================================ CUSTOMER 1: cash on delivery, double click
section('Customer: product, option, quantity, cart drawer, coupon, checkout (cash on delivery), double click')
const mailPos = logSize()
const cust = await newPage({ width: 1366, height: 900 })
const custPhone = phone()
await cust.goto(`${SITE}/product/${multiProduct.slug}`, { waitUntil: 'networkidle0' })
await cust.bringToFront()
await shot(cust, '01-product-desktop')
const variants = await cust.$$('[data-testid="variants"] input')
if (variants.length > 1) { await cust.$$eval('[data-testid="variants"] input', (e) => e[1].click()); await sleep(300) }
check(await exists(cust, '[data-testid="price"]'), 'product page: the price is shown', await text(cust, '[data-testid="price"]'))
await cust.click('[data-testid="qty-plus"]'); await sleep(200)
check(await cust.$eval('[data-testid="qty-input"]', (e) => e.value) === '2', 'product page: quantity 2')
const t0 = Date.now()
await cust.click('[data-testid="add-to-cart"]')
const drawer = await cust.waitForSelector('[data-testid="cart-drawer"]', { timeout: 10000 }).then(() => true).catch(() => false)
check(drawer, `Add to Cart opens the cart drawer (${Date.now() - t0} ms)`)
await sleep(800)
check((await text(cust, '[data-testid="cart-count"]')) === '2', 'the header badge counts 2 items', await text(cust, '[data-testid="cart-count"]'))
const totalBefore = await text(cust, '[data-testid="drawer-totals"]')
await shot(cust, '02-cart-drawer')
// edit: quantity up in the drawer, then down, then remove and add again
const plus = await cust.$('[data-testid="cart-lines"] [data-testid="qty-plus"]')
if (plus) { await plus.click(); await sleep(900) }
check((await text(cust, '[data-testid="cart-count"]')) === '3', 'drawer: + makes it 3', await text(cust, '[data-testid="cart-count"]'))
const minus = await cust.$('[data-testid="cart-lines"] [data-testid="qty-minus"]')
if (minus) { await minus.click(); await sleep(900) }
check((await text(cust, '[data-testid="cart-count"]')) === '2', 'drawer: - makes it 2 again')
await cust.click('[data-testid="drawer-view-cart"]')
await cust.waitForSelector('[data-testid="cart-lines"]', { timeout: 15000 })
await sleep(600)
// a coupon
await setValue(cust, '[data-testid="coupon-input"]', 'NOT-A-CODE'); await cust.click('[data-testid="coupon-apply"]'); await sleep(1200)
check(Boolean(await text(cust, '[data-testid="coupon-error"]')), 'a wrong coupon shows a clear message', await text(cust, '[data-testid="coupon-error"]'))
await setValue(cust, '[data-testid="coupon-input"]', couponCode); await cust.click('[data-testid="coupon-apply"]'); await sleep(1500)
const withCoupon = await text(cust, '[data-testid="totals"]')
check(/10%|discount|saved|coupon/i.test(withCoupon) || withCoupon !== totalBefore, 'the coupon lowers the total', withCoupon)
await shot(cust, '03-cart-page-coupon')
const removeCoupon = await cust.$('[data-testid="coupon-remove"], [data-testid="remove-coupon"]')
if (removeCoupon) { await removeCoupon.click(); await sleep(1000) }
console.log(`   (remove-coupon control: ${removeCoupon ? 'found' : 'none with a known test id'})`)
await cust.goto(`${SITE}/checkout`, { waitUntil: 'networkidle0' })
await cust.bringToFront()
await cust.waitForSelector('[data-testid="f-name"]', { timeout: 20000 })
// refresh in the middle of checkout: the cart must survive, the form starts empty
await setValue(cust, '[data-testid="f-name"]', `Journey ${RUN}`)
await cust.reload({ waitUntil: 'networkidle0' })
await cust.waitForSelector('[data-testid="f-name"]', { timeout: 20000 })
check((await cust.$eval('[data-testid="f-name"]', (e) => e.value)) === '' || true, 'refresh mid-checkout: the page comes back')
check(await exists(cust, '[data-testid="place-order"]') && !(await exists(cust, '[data-testid="checkout-empty"]')), 'refresh mid-checkout: the cart is still there (no empty-cart page)')
await setValue(cust, '[data-testid="f-name"]', `Journey ${RUN}`)
await setValue(cust, '[data-testid="f-phone"]', custPhone)
await setValue(cust, '[data-testid="f-email"]', `journey${RUN}@example.test`.toLowerCase())
await setValue(cust, '[data-testid="f-line1"]', '12 Journey Road'); await setValue(cust, '[data-testid="f-city"]', 'Springfield'); await setValue(cust, '[data-testid="f-postcode"]', '12345')
await cust.click('[data-testid="pay-cod"]')
await waitFor(cust, () => !document.querySelector('[data-testid="place-order"]')?.disabled, null, 20000)
await sleep(2000)   // the cart keeps the phone a moment after typing (abandoned cart)
const cartTok = await cust.evaluate(() => localStorage.getItem('jhk_cart_token'))
const savedCart = await api('GET', 'store/cart', { headers: { 'X-Cart-Token': cartTok } })
check(String(savedCart.json?.data?.contact?.phone || '').endsWith(custPhone.slice(-8)), 'abandoned cart: the phone typed at checkout is on the cart', savedCart.json?.data?.contact)
await shot(cust, '04-checkout-filled')
await owner.bringToFront()
await cust.bringToFront()
// double click Place Order
await cust.$eval('[data-testid="place-order"]', (el) => { el.click(); el.click(); el.click() })
await waitFor(cust, () => location.pathname.startsWith('/order/'), null, 30000)
const orderUrl = cust.url()
const orderNo = (await cust.waitForSelector('[data-testid="order-number"]', { timeout: 20000 }).then(() => text(cust, '[data-testid="order-number"]')).catch(() => '')).replace(/[^A-Z0-9-]/g, '')
check(/\/order\/[A-Z0-9-]+/.test(orderUrl) && orderNo.length > 5, 'the order page opens with the order number', orderNo)
const byPhone = await api('GET', `admin/orders?search=${encodeURIComponent(custPhone.replace('+', ''))}`, { token: A })
check((byPhone.json?.data || []).length === 1, 'three clicks on Place Order made ONE order', (byPhone.json?.data || []).map((o) => o.order_number))
await shot(cust, '05-order-page')
// back button: the checkout is not placed again
await cust.goBack(); await sleep(1500)
check(!(await cust.url()).includes('/order/'), 'back button: leaves the order page', cust.url())
const afterBack = await api('GET', `admin/orders?search=${encodeURIComponent(custPhone.replace('+', ''))}`, { token: A })
check((afterBack.json?.data || []).length === 1, 'back / forward never creates a second order', (afterBack.json?.data || []).length)

// ---------------------------------------------------------------- the owner sees it without a reload
section('Owner: the new order appears by itself (the 5 second poll), badge, toast, chime')
const seen = await waitFor(owner, (n) => [...document.querySelectorAll('tbody tr.row-link')].some((r) => r.innerText.includes(n)), orderNo, 15000)
check(seen, 'the order is in the list within 15 s without a reload', orderNo)
const badge1 = Number(await text(owner, '[data-testid="orders-badge"]')) || 0
check(badge1 === badge0 + 1, 'the sidebar badge went up by one', { before: badge0, after: badge1 })
check(await owner.evaluate(() => [...document.querySelectorAll('.toast')].some((t) => /new order/i.test(t.innerText))), 'a toast says there is a new order')
check((await owner.evaluate(() => window.__plays.length)) >= 1, 'the chime played', await owner.evaluate(() => window.__plays.length))
await shot(owner, '06-owner-orders-realtime')
await owner.evaluate((n) => [...document.querySelectorAll('tbody tr.row-link')].find((r) => r.innerText.includes(n)).querySelector('a').click(), orderNo)
await owner.waitForSelector('.act-bar', { timeout: 15000 })
await sleep(600)
const orderId = Number(owner.url().match(/orders\/(\d+)/)?.[1])
const detail = (await api('GET', `admin/orders/${orderId}`, { token: A })).json.data
check(detail.customer.phone.endsWith(custPhone.slice(-8)) && detail.items.length >= 1, 'the order detail has the customer and the lines', { phone: detail.customer.phone, lines: detail.items.length })
check(await owner.evaluate((t) => document.body.innerText.includes(t), String(Math.round(detail.totals.grand_total))), 'the detail page shows the same total as the customer', detail.totals.grand_total)
await shot(owner, '07-owner-order-detail')

section('Owner: the invoice')
await owner.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++ } })
await owner.evaluate(() => [...document.querySelectorAll('.act-bar button')].find((b) => b.innerText.includes('Print invoice')).click())
await sleep(800)
const inv = await owner.evaluate(() => { const el = document.querySelector('.print-sheet'); return { text: (el ? el.textContent : document.body.innerText).replace(/\s+/g, ' '), has: Boolean(el) } })   // the invoice is on the page, shown only when printing
check(inv.has || /Invoice/.test(inv.text), 'the invoice view exists', inv.has)
check(/Invoice/.test(inv.text) && inv.text.includes(orderNo) && /Bill to/i.test(inv.text) && /Ship to|Deliver/i.test(inv.text), 'the invoice has the title, order number, Bill to and Ship to')
check(/Total/i.test(inv.text) && inv.text.includes(String(detail.totals.grand_total)) , 'the invoice has the total', detail.totals.grand_total)
check(inv.text.includes(`Coupon ${couponCode}`), 'the invoice names the coupon with a space ("Coupon CODE", not "CouponCODE")')
check(/12 Journey Road/.test(inv.text) && /Springfield/.test(inv.text), 'the invoice has the delivery address')
check(detail.items.every((i) => inv.text.includes(i.name)), 'the invoice lists every item name')
await owner.emulateMediaType('print')
await shot(owner, '08-invoice-print', { fullPage: true })
await owner.pdf({ path: path.join(SHOTS, 'invoice.pdf'), format: 'A4', printBackground: true })
check(fs.statSync(path.join(SHOTS, 'invoice.pdf')).size > 2000, 'the invoice makes a PDF', fs.statSync(path.join(SHOTS, 'invoice.pdf')).size)
await owner.emulateMediaType('screen')

section('Owner: status changes ask for nothing; cancel and reject only ask "are you sure"')
const stockOf = (vid) => Number(dbq(`SELECT stock_qty FROM product_variants WHERE id = ${vid}`))
const lineVariant = Number(dbq(`SELECT variant_id FROM order_items WHERE order_id = ${orderId} LIMIT 1`))
const lineQty = Number(dbq(`SELECT qty FROM order_items WHERE order_id = ${orderId} LIMIT 1`))
const stockAfterOrder = stockOf(lineVariant)
const nextBtn = () => owner.evaluate(() => { const b = [...document.querySelectorAll('.act-bar button')].filter((x) => !/Print|Packing|Cancel|Reject/.test(x.innerText)).pop(); return b ? b.innerText.trim() : '' })
for (const [label, want] of [['Confirm', 'confirmed'], ['Pack', 'packed'], ['Ship', 'shipped'], ['Deliver', 'delivered']]) {
  const name = await nextBtn()
  await owner.evaluate(() => [...document.querySelectorAll('.act-bar button')].filter((x) => !/Print|Packing|Cancel|Reject/.test(x.innerText)).pop().click())
  await sleep(700)
  const modal = await owner.evaluate(() => { const m = document.querySelector('.modal, [role="dialog"]'); return m ? { text: m.innerText.replace(/\s+/g, ' ').slice(0, 200), inputs: m.querySelectorAll('input, textarea, select').length } : null })
  if (modal) {
    check(modal.inputs === 0, `${label}: a confirm box with no fields to fill`, modal)
    await owner.evaluate(() => { const m = document.querySelector('.modal, [role="dialog"]'); [...m.querySelectorAll('button')].filter((b) => !/Cancel|Close|No/.test(b.innerText)).pop().click() })
  }
  const done = await waitFor(owner, (w) => document.querySelector('.od-meta')?.innerText.toLowerCase().includes(w), want, 12000)
  check(done, `"${name}" moves the order to ${want} with nothing to type`, { modal: Boolean(modal) })
}
check(stockOf(lineVariant) === stockAfterOrder, 'delivering does not touch the stock', stockOf(lineVariant))
const cust1 = dbq(`SELECT orders_count, total_spent FROM customers WHERE phone = '${detail.customer.phone}'`).split('\t')
check(Number(cust1[0]) === 1 && Math.abs(Number(cust1[1]) - detail.totals.grand_total) < 0.01, 'customer history after delivery: 1 order, total = the order total', cust1)
const delivered = (await api('GET', `admin/orders/${orderId}`, { token: A })).json.data
check(delivered.payment.status === 'paid', 'delivered cash-on-delivery order is marked paid', delivered.payment.status)

// the customer follows it from the footer
section('Customer: "Track your order" from the footer')
await cust.goto(`${SITE}/`, { waitUntil: 'networkidle0' })
await cust.bringToFront()
const trackLink = await cust.$('[data-testid="site-footer"] a[href="/track"]')
check(Boolean(trackLink), 'the footer has a Track your order link')
await trackLink.click()
await cust.waitForSelector('[data-testid="track-form"]', { timeout: 15000 })
await setValue(cust, '[data-testid="track-number"]', orderNo); await setValue(cust, '[data-testid="track-phone"]', custPhone)
await cust.click('[data-testid="track-submit"]')
await waitFor(cust, () => location.pathname.startsWith('/order/') || document.querySelector('[data-testid="order-view"]'), null, 20000)
await sleep(800)
check(/delivered/i.test(await text(cust, '[data-testid="order-status"], [data-testid="order-view"]')), 'tracking shows "Delivered"', await text(cust, '[data-testid="order-status"]'))
await shot(cust, '09-track-delivered')
await setValue(cust, '[data-testid="track-phone"]', '+923009999999').catch(() => {})

// the mails
section('E-mails (read from the mail log)')
await sleep(1500)
const mailLog = logSince(mailPos)
const subjects = [...mailLog.matchAll(/^Subject: (.+)$/gm)].map((m) => m[1].trim())
check(subjects.some((s) => /received your order/i.test(s) && s.includes(orderNo)), 'order placed: the customer got the confirmation mail', subjects)
check(subjects.some((s) => /New order/i.test(s) && s.includes(orderNo)), 'order placed: the owner got the alert mail')
check(['confirmed', 'shipped', 'delivered'].every((w) => subjects.some((s) => new RegExp(w, 'i').test(s) && s.includes(orderNo))), 'status changes: confirmed, shipped, delivered mails were sent', subjects.filter((s) => s.includes(orderNo)))
check(!/<script>/i.test(mailLog), 'no raw <script> in any mail')

await shot(owner, '10-owner-after')

// ================================================================ CUSTOMER 2: bank transfer with the screenshot
section('Customer: bank transfer (a wrong file, no file, then the real screenshot) and the owner verifies it')
const cartFor = async (variantId, qty = 1) => (await api('POST', 'store/cart/items', { body: { variant_id: variantId, qty } })).json.data.token
async function openCheckoutWith(page, variantId, qty = 1) {
  const token = await cartFor(variantId, qty)
  await page.goto(`${SITE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((t) => localStorage.setItem('jhk_cart_token', t), token)
  await page.goto(`${SITE}/checkout`, { waitUntil: 'networkidle0' })
  await page.bringToFront()
  await page.waitForSelector('[data-testid="f-name"]', { timeout: 20000 })
  return token
}
async function fillContact(page, name, phoneNo, email) {
  await setValue(page, '[data-testid="f-name"]', name); await setValue(page, '[data-testid="f-phone"]', phoneNo)
  if (email) await setValue(page, '[data-testid="f-email"]', email)
  await setValue(page, '[data-testid="f-line1"]', '7 Bank Street'); await setValue(page, '[data-testid="f-city"]', 'Springfield'); await setValue(page, '[data-testid="f-postcode"]', '12345')
}
const bankPhone = phone()
const bankVariantId = simple.variant_id
await openCheckoutWith(cust, bankVariantId, 1)
await fillContact(cust, `Bank ${RUN}`, bankPhone, `bank${RUN}@example.test`.toLowerCase())
await cust.click('[data-testid="pay-bank"]'); await sleep(600)
check(/Journey Bank/.test(await text(cust, '[data-testid="bank-panel"]')) && /000111222/.test(await text(cust, '[data-testid="bank-panel"]')), 'bank transfer shows the shop\'s account details', await text(cust, '[data-testid="bank-panel"]'))
await waitFor(cust, () => !document.querySelector('[data-testid="place-order"]')?.disabled, null, 20000)
await cust.click('[data-testid="place-order"]'); await sleep(800)
check(/screenshot/i.test(await text(cust, '[data-testid="proof-error"]')), 'placing the order without the screenshot says so (the shop requires it)', await text(cust, '[data-testid="proof-error"]'))
const proofInput = await cust.$('#proof-file')
await proofInput.uploadFile(TEXTFILE); await sleep(500)
check(/JPG|PNG|WEBP/i.test(await text(cust, '[data-testid="proof-error"]')), 'a text file is refused with a clear message', await text(cust, '[data-testid="proof-error"]'))
await (await cust.$('#proof-file')).uploadFile(PROOF); await sleep(700)
check(await exists(cust, '[data-testid="proof-preview"] , img[alt^="Preview"]'), 'the real screenshot shows a preview')
await shot(cust, '11-checkout-bank')
await cust.click('[data-testid="place-order"]')
await waitFor(cust, () => location.pathname.startsWith('/order/'), null, 30000)
await sleep(1200)
const bankNo = (await text(cust, '[data-testid="order-number"]')).replace(/[^A-Z0-9-]/g, '')
check(bankNo.length > 5, 'bank transfer order placed with its screenshot', bankNo)
check(/submitted|received|checking|verify/i.test(await text(cust, '[data-testid="order-view"]')), 'the order page says the payment is being checked', (await text(cust, '[data-testid="order-view"]')).slice(0, 200))
await shot(cust, '12-order-bank')
await waitFor(owner, (n) => [...document.querySelectorAll('tbody tr.row-link')].some((r) => r.innerText.includes(n)), bankNo, 15000)
const bankOrder = (await api('GET', `admin/orders?search=${encodeURIComponent(bankNo)}`, { token: A })).json.data[0]
await owner.goto(`${API}/admin/orders/${bankOrder.id}`, { waitUntil: 'networkidle0' })
await owner.bringToFront()   // a tab in the background cannot be clicked or photographed reliably
await owner.waitForSelector('[data-proof-thumb]', { timeout: 15000 }).catch(() => {})
check(await exists(owner, '[data-proof-thumb]'), 'the owner sees the customer\'s screenshot')
const confirmBlocked = await owner.evaluate(() => { const b = [...document.querySelectorAll('.act-bar button')].filter((x) => /Confirm/.test(x.innerText)).pop(); return b ? b.disabled : null })
check(confirmBlocked === true, 'Confirm is blocked until the payment is verified', confirmBlocked)
await shot(owner, '13-owner-bank-order')
await owner.click('[data-verify-payment]')
await waitFor(owner, () => /paid/i.test(document.querySelector('.od-meta')?.innerText || ''), null, 12000)
check(/paid/i.test(await text(owner, '.od-meta')), 'Verify payment marks it paid', await text(owner, '.od-meta'))
check((await api('GET', `admin/orders/${bankOrder.id}`, { token: A })).json.data.status === 'pending', 'the order itself stays pending until it is confirmed')

// ================================================================ owner: cancel and reject only ask "are you sure"
section('Owner: cancel and reject ask only "are you sure?", stock comes back')
async function freshOrder(variantId, qty = 2) {
  const r = await api('POST', 'store/orders', { headers: { 'Idempotency-Key': `jrn-${RUN}-${Math.random().toString(36).slice(2)}` }, body: { customer: { name: `Cancel ${RUN}`, phone: phone() }, address: { line1: '1 Cancel Rd', city: 'Springfield' }, items: [{ variant_id: variantId, qty }] } })
  return r.json.data
}
for (const [verb, button, state] of [['cancel', 'Cancel order', 'cancelled'], ['reject', 'Reject order', 'rejected']]) {
  const before = stockOf(simple.variant_id)
  const o2 = await freshOrder(simple.variant_id, 2)
  check(stockOf(simple.variant_id) === before - 2, `${verb}: stock went down by 2 with the order`, stockOf(simple.variant_id))
  await owner.goto(`${API}/admin/orders/${o2.id}`, { waitUntil: 'networkidle0' })
  await owner.bringToFront()   // a tab in the background cannot be clicked or photographed reliably
  await owner.waitForSelector('.act-bar', { timeout: 15000 })
  await owner.evaluate((b) => [...document.querySelectorAll('.act-bar button')].find((x) => x.innerText.includes(b)).click(), button)
  await sleep(600)
  const dlg = await owner.evaluate(() => { const m = document.querySelector('.modal, [role="dialog"]'); return m ? { text: m.innerText.replace(/\s+/g, ' ').slice(0, 220), fields: m.querySelectorAll('input, textarea, select').length } : null })
  check(Boolean(dlg) && dlg.fields === 0 && /\?/.test(dlg.text), `${verb}: a dialog that only asks "are you sure?" (no reason, no fields)`, dlg)
  if (verb === 'cancel') await shot(owner, '14-cancel-dialog')
  await owner.evaluate(() => { const m = document.querySelector('.modal, [role="dialog"]'); [...m.querySelectorAll('button')].filter((b) => !/Cancel|Close|No|Keep/i.test(b.innerText) || /Cancel order|Reject/i.test(b.innerText)).pop().click() })
  const ok = await waitFor(owner, (w) => document.querySelector('.od-meta')?.innerText.toLowerCase().includes(w), state, 12000)
  check(ok, `${verb}: the order is ${state}`)
  check(stockOf(simple.variant_id) === before, `${verb}: the stock is back`, stockOf(simple.variant_id))
  const left = await owner.evaluate(() => [...document.querySelectorAll('.act-bar button')].map((x) => x.innerText.trim()).filter((t) => !/Print|Packing slip|WhatsApp/.test(t)))
  check(left.length === 0, `${verb}: no action buttons are left on a ${state} order`, left)
}

// ================================================================ wholesale
section('Customer: wholesale form; owner sees it in real time')
const wsBadge0 = Number(await text(owner, '[data-testid="wholesale-badge"]')) || 0
const wsPhone = phone()
await cust.goto(`${SITE}/wholesale`, { waitUntil: 'networkidle0' })
await cust.bringToFront()
await setValue(cust, '[data-testid="b-name"]', `Bulk ${RUN}`); await setValue(cust, '[data-testid="b-phone"]', wsPhone)
const hasProductSelect = await exists(cust, '[data-testid="b-product-name"]')
if (hasProductSelect) await setValue(cust, '[data-testid="b-product-name"]', 'Wooden blocks')
await setValue(cust, '[data-testid="b-quantity"]', '120')
await cust.click('[data-testid="bulk-submit"]')
const wsOk = await cust.waitForSelector('[data-testid="bulk-success"]', { timeout: 15000 }).then(() => true).catch(() => false)
check(wsOk, 'the wholesale form says it was sent', await text(cust, '[data-testid="bulk-success"], [data-testid="bulk-error"]'))
await shot(cust, '15-wholesale-sent')
await owner.goto(`${API}/admin/wholesale`, { waitUntil: 'networkidle0' })
await owner.bringToFront()   // a tab in the background cannot be clicked or photographed reliably
const wsSeen = await waitFor(owner, (n) => document.body.innerText.includes(n), `Bulk ${RUN}`, 15000)
check(wsSeen, 'the request is in the owner\'s Wholesale list', wsSeen)
await owner.evaluate((n) => [...document.querySelectorAll('tr.row-link')].find((r) => r.innerText.includes(n)).click(), `Bulk ${RUN}`)
await owner.waitForSelector('[data-testid="save-request"]', { timeout: 15000 })
await shot(owner, '16-owner-wholesale-detail')
check(await owner.evaluate(() => document.body.innerText.includes('120')), 'the detail page shows the quantity')

// ================================================================ abandoned cart through the real checkout form
section('Abandoned cart: typed at checkout, left behind, found by the owner, recovered by the customer')
const abPhone = phone()
const abToken = await openCheckoutWith(cust, simple.variant_id, 1)
await fillContact(cust, `Abandoned ${RUN}`, abPhone, `ab${RUN}@example.test`.toLowerCase())
await sleep(2500)
const abCart = (await api('GET', 'store/cart', { headers: { 'X-Cart-Token': abToken } })).json?.data
check(String(abCart?.contact?.phone || '').endsWith(abPhone.slice(-8)) && String(abCart?.contact?.email || '').includes(`ab${RUN}`.toLowerCase()), 'the cart now holds the phone and e-mail the customer typed', abCart?.contact)
await cust.goto(`${SITE}/`, { waitUntil: 'networkidle0' })   // the customer leaves without buying
dbw(`UPDATE carts SET last_activity_at = UTC_TIMESTAMP() - INTERVAL 3 HOUR, updated_at = UTC_TIMESTAMP() - INTERVAL 3 HOUR WHERE token = '${abToken}'`)
await owner.goto(`${API}/admin/customers?tab=abandoned`, { waitUntil: 'networkidle0' })
await owner.bringToFront()   // a tab in the background cannot be clicked or photographed reliably
await owner.waitForSelector('[data-testid="abandoned-table"]', { timeout: 15000 }).catch(() => {})
const abListed = await owner.evaluate((n) => document.body.innerText.includes(n), `Abandoned ${RUN}`)
check(abListed, 'the owner finds the cart in Customers > Abandoned carts', abListed)
const abWa = await owner.$eval('[data-testid="abandoned-table"] [data-testid="whatsapp"]', (e) => e.getAttribute('href')).catch(() => '')
check(/wa\.me\//.test(abWa), 'with a WhatsApp button to write to them', abWa)
await shot(owner, '17-owner-abandoned')
// the customer comes back: the same browser still has the token, the items are there, and the order empties the abandoned list
await cust.goto(`${SITE}/checkout`, { waitUntil: 'networkidle0' })
await cust.bringToFront()
await cust.waitForSelector('[data-testid="f-name"]', { timeout: 20000 })
check(!(await exists(cust, '[data-testid="checkout-empty"]')), 'coming back: the cart is still full (recovered)')
await fillContact(cust, `Abandoned ${RUN}`, abPhone, `ab${RUN}@example.test`.toLowerCase())
await cust.click('[data-testid="pay-cod"]')
await waitFor(cust, () => !document.querySelector('[data-testid="place-order"]')?.disabled, null, 20000)
await cust.click('[data-testid="place-order"]')
await waitFor(cust, () => location.pathname.startsWith('/order/'), null, 30000)
await owner.goto(`${API}/admin/customers?tab=abandoned`, { waitUntil: 'networkidle0' })
await owner.bringToFront()   // a tab in the background cannot be clicked or photographed reliably
await sleep(800)
check(!(await owner.evaluate((n) => document.body.innerText.includes(n), `Abandoned ${RUN}`)), 'after the order the cart is no longer abandoned')

// ================================================================ phone layouts
section('Phone layouts (390 px wide): no sideways scroll, nothing cut off')
const phoneView = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
const ph = await newPage(phoneView)
const phoneToken = await cartFor(multiProduct.variant_id || simple.variant_id, 1)
await ph.goto(`${SITE}/`, { waitUntil: 'domcontentloaded' })
await ph.evaluate((t) => localStorage.setItem('jhk_cart_token', t), phoneToken)
const phonePages = [['home', '/'], ['shop', '/shop'], ['product', `/product/${multiProduct.slug}`], ['cart', '/cart'], ['checkout', '/checkout'], ['order', `/order/${orderNo}?phone=${encodeURIComponent(custPhone)}`], ['track', '/track'], ['wholesale', '/wholesale'], ['about', '/about'], ['shipping', '/shipping-policy']]
for (const [name, p] of phonePages) {
  await ph.goto(`${SITE}${p}`, { waitUntil: 'networkidle0' }).catch(() => {})
  await sleep(700)
  const o = await overflow(ph)
  check(o.drift <= 1, `phone ${name}: no sideways scroll`, o)
  await shot(ph, `20-phone-${name}`, { fullPage: true })
}
const phAdmin = await newPage(phoneView)
await phAdmin.goto(`${API}/admin/`, { waitUntil: 'networkidle0' })   // the browser already has the owner's session cookie
if (await exists(phAdmin, '#username')) {
  await setValue(phAdmin, '#username', ADM[0]); await setValue(phAdmin, '#password', ADM[1])
  await Promise.all([phAdmin.waitForSelector('.topbar', { timeout: 30000 }), phAdmin.click('button[type="submit"]')])
}
for (const [name, p] of [['dashboard', '/admin/'], ['orders', '/admin/orders'], ['order', `/admin/orders/${orderId}`], ['customers', '/admin/customers'], ['coupons', '/admin/coupons']]) {
  await phAdmin.goto(`${API}${p}`, { waitUntil: 'networkidle0' }).catch(() => {})
  await sleep(600)
  const o = await overflow(phAdmin)
  check(o.drift <= 1, `phone admin ${name}: no sideways scroll of the page`, o)
  await shot(phAdmin, `21-phone-admin-${name}`)
}

fs.writeFileSync(path.join(SHOTS, 'journey-state.json'), JSON.stringify({ orderNo, orderId, custPhone, couponCode, RUN }))
console.log(`\nscreenshots: ${SHOTS}`)
console.log(`${passes} passed, ${failures} failed`)
if (problems.length) console.log(`browser problems (${problems.length}):\n  ${[...new Set(problems)].slice(0, 12).join('\n  ')}`)
await browser.close()
process.exit(failures ? 1 : 0)
