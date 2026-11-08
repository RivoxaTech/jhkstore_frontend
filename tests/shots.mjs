// Screenshots of the generated site at 390, 768 and 1440 px: home, shop, product, cart, checkout, about, contact.
//   node tests/shots.mjs [outDir]       (needs the static site served on SITE, default http://127.0.0.1:3000, and the API on 8002 with the demo data)
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const SITE = process.env.SITE || 'http://127.0.0.1:3000'
const API = process.env.API || 'http://127.0.0.1:8002/api/v1/store'
const OUT = path.resolve(process.argv[2] || 'tests/shots')
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p))
fs.mkdirSync(OUT, { recursive: true })

const SIZES = [{ name: '390', width: 390, height: 844 }, { name: '768', width: 768, height: 1024 }, { name: '1440', width: 1440, height: 900 }]
const PAGES = ['home:/', 'shop:/shop', 'product:/product/rainbow-stacking-blocks', 'cart:/cart', 'checkout:/checkout', 'about:/about', 'contact:/contact']
const only = (process.env.ONLY || '').split(',').filter(Boolean)

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
for (const size of SIZES) {
  const page = await browser.newPage()
  await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 })
  // a cart with one item, so the cart and checkout pages show something
  const cart = await (await fetch(`${API}/cart/items`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ variant_id: 1, qty: 2 }) })).json()
  await page.evaluateOnNewDocument((t) => { try { localStorage.setItem('jhk_cart_token', t) } catch {} }, cart.data.token)
  for (const entry of PAGES) {
    const [name, url] = entry.split(':')
    if (only.length && !only.includes(name)) continue
    await page.goto(SITE + url, { waitUntil: 'networkidle0', timeout: 60000 })
    // scroll through the page once so every lazy picture loads before the full-page shot
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)) } window.scrollTo(0, 0) })
    await new Promise((r) => setTimeout(r, 900))
    // a tall viewport instead of fullPage: the sticky header stays at the top of the picture
    const tall = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight))
    await page.setViewport({ width: size.width, height: Math.min(tall, 14000), deviceScaleFactor: 1 })
    await new Promise((r) => setTimeout(r, 500))
    await page.screenshot({ path: path.join(OUT, `${name}-${size.name}.png`) })
    await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 })
    console.log('shot', `${name}-${size.name}`)
  }
  await page.close()
}
await browser.close()
