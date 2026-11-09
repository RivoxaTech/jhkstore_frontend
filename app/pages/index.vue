<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { site } from '~/config/site'
import type { Banner, Paginated, ProductCard } from '~/types'

/**
 * Home: hero, trust bar, "Our Collection" (the most popular products; more than 12 = the first 12 and a "View all" button), a Featured section
 * (only when the shop has more products than the list shows) and the gift banner.
 * Everything is fetched at build time and baked into the HTML; the page asks for fresh prices once it is shown (and not again within a minute).
 * Only what the page shows is fetched: the first 12 products and their total, not the whole catalogue.
 */
const { settings, storeName } = useSettings()
const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/$/, '')

const { data, error, status, refresh, refreshIfStale } = await useFastData('home', async () => {
  const [hero, secondary, products] = await Promise.all([
    api<{ data: Banner[] }>('/banners', { query: { placement: 'home_hero' } }),
    api<{ data: Banner[] }>('/banners', { query: { placement: 'home_secondary' } }),
    api<Paginated<ProductCard>>('/products', { query: { per_page: site.collection.homeLimit, page: 1, sort: 'popularity' } }),
  ])
  // a shop with more toys than the list shows has a Featured section of its own; a small shop would only repeat the list
  const featured = products.meta.total > products.data.length
    ? (await api<Paginated<ProductCard>>('/products', { query: { featured: 1, per_page: 8, sort: 'popularity' } })).data
    : []
  return { hero: hero.data, secondary: secondary.data[0] ?? null, products: products.data, total: products.meta.total, featured }
})

const all = computed(() => data.value?.products ?? [])
const total = computed(() => data.value?.total ?? all.value.length)
const shown = computed(() => all.value.slice(0, site.collection.homeLimit))
const title = computed(() => (shown.value.length < 3 ? site.collection.titleFew : site.collection.title.replace('{count}', String(shown.value.length))))
// "Featured" is only worth a section when it adds something: there are featured toys and they are not exactly the list above
const featured = computed(() => {
  const f = data.value?.featured ?? []
  if (!f.length) return []
  const same = f.length === shown.value.length && f.every((p) => shown.value.some((s) => s.id === p.id))
  return same ? [] : f
})


onMounted(() => { if (status.value === 'success') refreshIfStale() })

useSeo(() => ({
  path: '/',
  title: '',
  jsonLd: [
    { '@context': 'https://schema.org', '@type': 'Organization', name: storeName.value, url: siteUrl, logo: settings.value?.store.logo_url || undefined, email: settings.value?.store.email || undefined, telephone: settings.value?.store.phone || undefined },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: storeName.value, url: siteUrl, potentialAction: { '@type': 'SearchAction', target: `${siteUrl}/shop?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
  ],
}))
</script>

<template>
  <div class="page-wash">
    <HeroSection :banners="data?.hero ?? []" />
    <TrustBar />

    <section class="container-page pt-14 sm:pt-16" aria-labelledby="collection-title" data-testid="collection">
      <SectionHeading id="collection-title" :label="site.collection.label" :title="title" :subtitle="site.collection.subtitle" as="h2" />
      <div class="mt-9">
        <ErrorState v-if="error && !all.length" :message="apiFailure(error).message" @retry="refresh()" />
        <ProductGrid v-else :products="shown" :loading="status === 'pending' && !all.length" :skeletons="8" toggle :eager-count="4" />
        <p v-if="status !== 'pending' && !error && !all.length" class="py-10 text-center text-muted">New toys are on their way. Please check back soon.</p>
        <div v-if="total > shown.length" class="mt-9 text-center">
          <NuxtLink to="/shop" class="btn btn-primary btn-lg" data-testid="view-all">View all products <ArrowRight :size="18" /></NuxtLink>
        </div>
      </div>
    </section>

    <section v-if="featured.length" class="container-page pt-16" aria-labelledby="featured-title" data-testid="featured">
      <SectionHeading id="featured-title" label="Featured" title="Our *Favourites*" subtitle="Hand-picked by our team." as="h2" />
      <div class="mt-9"><LazyProductGrid :products="featured" hydrate-on-visible /></div>
    </section>

    <!-- the gift strip is a banner of the admin panel (home_secondary): no banner, no strip -->
    <div v-if="data?.secondary" class="pt-16"><LazyGiftBanner :banner="data.secondary" hydrate-on-visible /></div>
  </div>
</template>
