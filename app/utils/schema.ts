import type { Product, ProductCard, Settings } from '~/types'

/**
 * schema.org data (JSON-LD) built from what the API already knows. Nothing is invented: a field is only written when the shop has the value
 * (no ratings, no brand, no "valid until" dates, no shipping or return terms unless the store country is set). Pure functions, so the tests can call them.
 */

const ISO_COUNTRY = /^[A-Za-z]{2}$/
const ISO_CURRENCY = /^[A-Za-z]{3}$/

/** The ISO code of the currency, or undefined when the store uses a short label like "Rs" (search engines only know ISO codes). */
export function currencyCode(settings: Settings | null | undefined): string | undefined {
  const code = settings?.currency?.code ?? ''
  return ISO_CURRENCY.test(code) ? code.toUpperCase() : undefined
}

/** The store country as a two-letter ISO code (Settings > General), or undefined: shipping and return terms need it, so they are left out without it. */
export function countryCode(settings: Settings | null | undefined): string | undefined {
  const c = (settings?.store?.country ?? '').trim()
  return ISO_COUNTRY.test(c) ? c.toUpperCase() : undefined
}

export function organizationLd(settings: Settings | null | undefined, siteUrl: string, name: string) {
  const st = settings?.store
  const sameAs = (settings?.social_links ?? []).map((l) => l.url).filter((u) => /^https?:\/\//.test(u))
  const country = countryCode(settings)
  const contact = st?.phone || st?.email
    ? [{ '@type': 'ContactPoint', contactType: 'customer service', telephone: st?.phone || undefined, email: st?.email || undefined, availableLanguage: 'English' }]
    : undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name,
    url: siteUrl,
    logo: st?.logo_url || undefined,
    image: settings?.seo?.share_image_url || st?.logo_url || undefined,
    description: st?.tagline || settings?.footer?.text || undefined,
    email: st?.email || undefined,
    telephone: st?.phone || undefined,
    address: st?.address ? { '@type': 'PostalAddress', streetAddress: st.address, addressCountry: country } : undefined,
    contactPoint: contact,
    sameAs: sameAs.length ? sameAs : undefined,
  }
}

export function websiteLd(siteUrl: string, name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name,
    url: siteUrl,
    inLanguage: 'en',
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: { '@type': 'SearchAction', target: `${siteUrl}/shop?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
  }
}

/** An information page (About, Shipping, Returns, Terms, Privacy). */
export function webPageLd(siteUrl: string, name: string, path: string, description: string, kind: 'WebPage' | 'AboutPage' | 'ContactPage' = 'WebPage') {
  return {
    '@context': 'https://schema.org',
    '@type': kind,
    name,
    description: description || undefined,
    url: `${siteUrl}${path}`,
    inLanguage: 'en',
    isPartOf: { '@id': `${siteUrl}/#website` },
  }
}

/** A list of products (the shop page, a category): the first products as an ItemList, so the page can be shown as a carousel of toys. */
export function collectionLd(siteUrl: string, name: string, path: string, products: ProductCard[], limit = 24) {
  const items = products.filter((p) => p.slug).slice(0, limit)
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: `${siteUrl}${path}`,
    inLanguage: 'en',
    isPartOf: { '@id': `${siteUrl}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((p, n) => ({ '@type': 'ListItem', position: n + 1, url: `${siteUrl}/product/${p.slug}`, name: p.name, image: p.image_url || undefined })),
    },
  }
}

/** Shipping terms of an offer: only for a flat delivery fee and a known store country (zones differ per address, so they cannot be stated here). */
export function shippingLd(settings: Settings | null | undefined) {
  const d = settings?.delivery
  const country = countryCode(settings)
  const currency = currencyCode(settings)
  if (!d || d.method !== 'flat' || !country || !currency || !(d.fee >= 0)) return undefined
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: d.fee, currency },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: country },
    deliveryTime: d.days > 0 ? { '@type': 'ShippingDeliveryTime', transitTime: { '@type': 'QuantitativeValue', minValue: d.days, maxValue: d.days, unitCode: 'DAY' } } : undefined,
  }
}

/** The return terms are written in words on the Returns page, so the data only points there (the category says "see the page"). Needs the store country. */
export function returnPolicyLd(settings: Settings | null | undefined, siteUrl: string) {
  const country = countryCode(settings)
  if (!country) return undefined
  return { '@type': 'MerchantReturnPolicy', applicableCountry: country, returnPolicyCategory: 'https://schema.org/MerchantReturnUnspecified', merchantReturnLink: `${siteUrl}/return-policy` }
}

/** The Product with its offer, uploaded videos and (when the shop has the facts) shipping and return terms. */
export function productLd(p: Product, settings: Settings | null | undefined, siteUrl: string, storeName: string, slug: string) {
  const url = `${siteUrl}/product/${slug}`
  const currency = currencyCode(settings)
  const availability = p.availability === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  const prices = (p.variants ?? []).map((v) => v.price)
  const seller = { '@type': 'Organization', name: storeName, url: siteUrl }
  const shipping = shippingLd(settings)
  const returns = returnPolicyLd(settings, siteUrl)
  const common = { priceCurrency: currency, availability, url, seller, shippingDetails: shipping, hasMerchantReturnPolicy: returns }
  const offers = prices.length > 1
    ? { '@type': 'AggregateOffer', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, ...common }
    : { '@type': 'Offer', price: prices[0], itemCondition: 'https://schema.org/NewCondition', ...common }
  const videos = (p.videos ?? [])
    .filter((v) => v.source === 'upload' && v.poster_url && v.uploaded_at)
    .map((v) => ({ '@type': 'VideoObject', name: `${p.name}: video`, description: p.seo?.description || p.short_description || p.name, thumbnailUrl: v.poster_url, contentUrl: v.url, uploadDate: v.uploaded_at, encodingFormat: v.mime || undefined }))
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    url,
    name: p.name,
    image: (p.images.length ? p.images.map((i) => i.url) : [p.image_url]).filter(Boolean),
    description: p.seo?.description || p.short_description || undefined,
    sku: p.sku,
    category: p.category?.name,
    offers,
    video: videos.length ? videos : undefined,
  }
}
