import { site } from '~/config/site'

export interface SeoInput {
  /** The page title without the store name (added by this helper). Empty = the store's default meta title. */
  title?: string
  description?: string
  /** The path of this page, e.g. /product/blocks (the canonical address is NUXT_PUBLIC_SITE_URL + path). */
  path: string
  image?: string | null
  type?: 'website' | 'product' | 'article'
  noindex?: boolean
  jsonLd?: Record<string, any> | Record<string, any>[]
}

/**
 * Title, description, canonical, Open Graph, Twitter and JSON-LD of a page. Everything is written during the build, so it is in the generated HTML.
 * Store defaults (GET /settings -> seo.*) fill in whatever a page does not have.
 */
export function useSeo(input: SeoInput | (() => SeoInput)) {
  const { settings, storeName } = useSettings()
  const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/$/, '')
  const get = () => (typeof input === 'function' ? input() : input)
  // a breadcrumbLd() marker becomes the real BreadcrumbList here (the site address is read once, while the component is being set up)
  const expand = (ld: Record<string, any>) => (ld.__breadcrumbs
    ? { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: (ld.__breadcrumbs as { name: string; path: string }[]).map((it, n) => ({ '@type': 'ListItem', position: n + 1, name: it.name, item: `${siteUrl}${it.path}` })) }
    : ld)

  const title = computed(() => {
    const i = get()
    const base = storeName.value
    if (i.title) return `${i.title}${site.titleSeparator}${base}`
    return settings.value?.seo.meta_title || (settings.value?.store.tagline ? `${base}${site.titleSeparator}${settings.value.store.tagline}` : base)
  })
  const description = computed(() => get().description || settings.value?.seo.meta_description || settings.value?.footer.text || '')
  const image = computed(() => get().image || settings.value?.seo.share_image_url || settings.value?.store.logo_url || '')
  const canonical = computed(() => `${siteUrl}${get().path === '/' ? '' : get().path}` || siteUrl)

  useHead(() => {
    const i = get()
    return {
      title: title.value,
      link: [{ rel: 'canonical', href: i.path === '/' ? `${siteUrl}/` : canonical.value }],
      meta: [
        { name: 'description', content: description.value },
        { name: 'robots', content: i.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' },
        { property: 'og:site_name', content: storeName.value },
        { property: 'og:type', content: i.type ?? 'website' },
        { property: 'og:title', content: title.value },
        { property: 'og:description', content: description.value },
        { property: 'og:url', content: i.path === '/' ? `${siteUrl}/` : canonical.value },
        ...(image.value ? [{ property: 'og:image', content: image.value }] : []),
        { name: 'twitter:card', content: image.value ? 'summary_large_image' : 'summary' },
        { name: 'twitter:title', content: title.value },
        { name: 'twitter:description', content: description.value },
        ...(image.value ? [{ name: 'twitter:image', content: image.value }] : []),
      ],
      script: i.jsonLd
        ? (Array.isArray(i.jsonLd) ? i.jsonLd : [i.jsonLd]).map((ld, n) => ({ key: `ld-${n}`, type: 'application/ld+json', innerHTML: JSON.stringify(expand(ld)) }))
        : [],
    }
  })
}

/** BreadcrumbList JSON-LD from [{name, path}] (path relative to the site): a marker that useSeo turns into the real list. */
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return { __breadcrumbs: items }
}
