<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { site } from '~/config/site'
import type { Banner, Category, Paginated, ProductCard } from '~/types'

/**
 * Home: hero, trust bar, "Our Collection" (every product, most popular first; more than 12 = the first 12 and a "View all" button), a Featured section
 * (only when the shop has featured toys that are not simply the whole list), a row of categories (only when there are some) and the gift banner.
 * Everything is fetched at build time and baked into the HTML; the product cards ask for fresh prices once the page is shown.
 */
const { settings, storeName } = useSettings()
const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/$/, '')

async function allProducts(): Promise<ProductCard[]> {
  const out: ProductCard[] = []
  for (let page = 1; page <= 20; page++) {   // 100 a page, at most 2000 toys on the home page build
    const res = await api<Paginated<ProductCard>>('/products', { query: { per_page: 100, page, sort: 'popularity' } })
    out.push(...res.data)
    if (page >= res.meta.last_page) break
  }
  return out
}

const { data, error, status, refresh } = await useAsyncData('home', async () => {
  const [hero, secondary, products, featured, categories] = await Promise.all([
    api<{ data: Banner[] }>('/banners', { query: { placement: 'home_hero' } }),
    api<{ data: Banner[] }>('/banners', { query: { placement: 'home_secondary' } }),
    allProducts(),
    api<Paginated<ProductCard>>('/products', { query: { featured: 1, per_page: 8, sort: 'popularity' } }),
    api<{ data: Category[] }>('/categories'),
  ])
  return { hero: hero.data, secondary: secondary.data[0] ?? null, products, featured: featured.data, categories: categories.data }
})

const all = computed(() => data.value?.products ?? [])
const shown = computed(() => all.value.slice(0, site.collection.homeLimit))
const title = computed(() => site.collection.title.replace('{count}', String(shown.value.length)))
// "Featured" is only worth a section when it adds something: there are featured toys and they are not exactly the list above
const featured = computed(() => {
  const f = data.value?.featured ?? []
  if (!f.length) return []
  const same = f.length === shown.value.length && f.every((p) => shown.value.some((s) => s.id === p.id))
  return same ? [] : f
})
const categories = computed(() => data.value?.categories ?? [])

onMounted(() => { if (status.value === 'success') refresh() })

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
        <div v-if="all.length > shown.length" class="mt-9 text-center">
          <NuxtLink to="/shop" class="btn btn-primary btn-lg" data-testid="view-all">View all products <ArrowRight :size="18" /></NuxtLink>
        </div>
      </div>
    </section>

    <section v-if="featured.length" class="container-page pt-16" aria-labelledby="featured-title" data-testid="featured">
      <SectionHeading id="featured-title" label="Featured" title="Our *Favourites*" subtitle="Hand-picked by our team." as="h2" />
      <div class="mt-9"><ProductGrid :products="featured" /></div>
    </section>

    <section v-if="categories.length" class="container-page pt-16" aria-labelledby="categories-title" data-testid="categories-row">
      <h2 id="categories-title" class="mb-5 text-center text-2xl font-semibold">Shop by <span class="text-accent">category</span></h2>
      <ul class="flex gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible">
        <li v-for="c in categories" :key="c.slug" class="shrink-0">
          <NuxtLink :to="`/category/${c.slug}`" class="flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-sm ring-1 ring-line transition hover:bg-primary hover:text-primary-contrast hover:ring-primary">
            <img v-if="c.icon_url || c.image_url" :src="(c.icon_url || c.image_url) as string" alt="" width="24" height="24" class="h-6 w-6 rounded-full object-cover" loading="lazy">
            {{ c.name }}
          </NuxtLink>
        </li>
      </ul>
    </section>

    <div class="pt-16"><GiftBanner :banner="data?.secondary" /></div>
  </div>
</template>
