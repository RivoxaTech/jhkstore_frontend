// Unit checks of app/utils/schema.ts (the schema.org data of the pages): node tests/seo-schema.mjs  (Node 22.18+ reads the .ts file as it is).
import assert from 'node:assert/strict'
import { currencyCode, countryCode, organizationLd, websiteLd, webPageLd, collectionLd, shippingLd, returnPolicyLd, productLd } from '../app/utils/schema.ts'

let n = 0
const check = (cond, label) => { n++; assert.ok(cond, label); console.log(`ok ${n} ${label}`) }
const SITE = 'https://shop.example'
const settings = (over = {}) => ({
  store: { name: 'Toy Shop', tagline: 'Play. Learn. Grow.', logo_url: 'https://api.example/logo.png', favicon_url: null, email: 'hi@shop.example', phone: '+230 5260 4550', address: '1 Main Street, Port Louis', country: 'mu', open: true, closed_message: '' },
  social_links: [{ platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/toyshop' }, { platform: 'x', label: 'bad', url: 'javascript:alert(1)' }],
  footer: { text: 'Safe toys.' }, seo: { meta_title: '', meta_description: '', share_image_url: null },
  currency: { code: 'MUR', symbol: 'Rs', decimals: 2 }, delivery: { method: 'flat', fee: 150, free_delivery_min_cart: 0, days: 5 },
  ...over,
})
const variant = (price) => ({ id: 1, name: 'v', sku: 's', is_default: true, mrp: price, price, compare_price: null, discount_label: null, in_stock: true, qty: 5, low_stock: false, price_tiers: [], image_url: null, thumb_url: null, images: [] })
const product = (over = {}) => ({
  id: 1, name: 'Blocks', slug: 'blocks', short_description: 'Stack them', image_url: 'https://api.example/b.jpg', category: { name: 'Indoor', slug: 'indoor' }, sku: 'BLK-1',
  availability: 'in_stock', seo: { title: 'Blocks', description: 'Colourful blocks', image_url: null }, images: [{ url: 'https://api.example/b1.jpg' }, { url: 'https://api.example/b2.jpg' }],
  variants: [variant(180)], videos: [], ...over,
})

// currency and country
check(currencyCode(settings()) === 'MUR' && currencyCode(settings({ currency: { code: 'Rs' } })) === undefined, 'currency: an ISO code is used, a short label like "Rs" is not')
check(countryCode(settings()) === 'MU' && countryCode(settings({ store: { country: 'Mauritius' } })) === undefined && countryCode(settings({ store: { country: '' } })) === undefined, 'country: a two-letter code only, upper-cased')

// organization
const org = organizationLd(settings(), SITE, 'Toy Shop')
check(org['@type'] === 'Organization' && org['@id'] === `${SITE}/#organization` && org.contactPoint[0].telephone === '+230 5260 4550', 'organization: id, contact point')
check(org.address.streetAddress === '1 Main Street, Port Louis' && org.address.addressCountry === 'MU', 'organization: postal address with the country code')
check(JSON.stringify(org.sameAs) === JSON.stringify(['https://instagram.com/toyshop']), 'organization: sameAs holds the social links and drops anything that is not http(s)')
const bare = organizationLd(settings({ store: { name: 'X', tagline: '', logo_url: null, email: '', phone: '', address: '', country: '' }, social_links: [] }), SITE, 'X')
check(bare.address === undefined && bare.contactPoint === undefined && bare.sameAs === undefined, 'organization: nothing is invented when the shop has no address, contact or links')

// website, pages, collections
check(websiteLd(SITE, 'Toy Shop').potentialAction.target === `${SITE}/shop?q={search_term_string}`, 'website: search action')
check(webPageLd(SITE, 'About us', '/about', 'text', 'AboutPage')['@type'] === 'AboutPage', 'web page: kind')
const coll = collectionLd(SITE, 'Indoor', '/category/indoor', [product(), { ...product({ name: 'Cube', slug: 'cube' }) }], 1)
check(coll.mainEntity.numberOfItems === 1 && coll.mainEntity.itemListElement[0].url === `${SITE}/product/blocks` && coll.mainEntity.itemListElement[0].position === 1, 'collection: ItemList with positions and product addresses, cut at the limit')

// shipping and returns need a flat fee, a currency and a country
const ship = shippingLd(settings())
check(ship.shippingRate.value === 150 && ship.shippingRate.currency === 'MUR' && ship.shippingDestination.addressCountry === 'MU' && ship.deliveryTime.transitTime.maxValue === 5, 'shipping: flat fee, country and days')
check(shippingLd(settings({ delivery: { method: 'zones', fee: 0, days: 5 } })) === undefined && shippingLd(settings({ store: { country: '' } })) === undefined, 'shipping: left out for zone delivery and without a country')
check(returnPolicyLd(settings(), SITE).merchantReturnLink === `${SITE}/return-policy` && returnPolicyLd(settings({ store: { country: '' } }), SITE) === undefined, 'returns: points to the Returns page, needs the country')

// product
const p = productLd(product({ videos: [{ source: 'upload', url: 'https://api.example/v.mp4', poster_url: 'https://api.example/v.jpg', mime: 'video/mp4', uploaded_at: '2026-11-19T10:00:00+04:00' }, { source: 'embed', url: 'https://www.youtube-nocookie.com/embed/x', poster_url: null, mime: null }] }), settings(), SITE, 'Toy Shop', 'blocks')
check(p['@type'] === 'Product' && p.url === `${SITE}/product/blocks` && p.sku === 'BLK-1' && p.image.length === 2, 'product: url, sku, pictures')
check(p.offers['@type'] === 'Offer' && p.offers.price === 180 && p.offers.priceCurrency === 'MUR' && p.offers.availability === 'https://schema.org/InStock' && p.offers.seller.name === 'Toy Shop', 'product: offer with price, currency, availability, seller')
check(p.offers.shippingDetails && p.offers.hasMerchantReturnPolicy, 'product: shipping and return terms when the country is set')
check(p.video.length === 1 && p.video[0].thumbnailUrl === 'https://api.example/v.jpg' && p.video[0].uploadDate === '2026-11-19T10:00:00+04:00', 'product: a VideoObject for an uploaded video with poster and date, none for a YouTube link')
const multi = productLd(product({ variants: [variant(100), variant(250)], availability: 'out_of_stock' }), settings({ store: { country: '' } }), SITE, 'Toy Shop', 'blocks')
check(multi.offers['@type'] === 'AggregateOffer' && multi.offers.lowPrice === 100 && multi.offers.highPrice === 250 && multi.offers.offerCount === 2 && multi.offers.availability === 'https://schema.org/OutOfStock', 'product: several options make an AggregateOffer')
check(multi.offers.shippingDetails === undefined && multi.offers.hasMerchantReturnPolicy === undefined && multi.video === undefined, 'product: no shipping, returns or video when the shop has none of it')
const json = JSON.parse(JSON.stringify(multi))
check(!('video' in json) && !('shippingDetails' in json.offers), 'product: undefined fields disappear from the JSON')
const nocur = productLd(product(), settings({ currency: { code: 'Rs' } }), SITE, 'Toy Shop', 'blocks')
check(nocur.offers.priceCurrency === undefined, 'product: no currency is said when the store has no ISO code')
console.log(`\n${n} checks passed`)
