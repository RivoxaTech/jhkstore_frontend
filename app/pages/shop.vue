<script setup lang="ts">
const route = useRoute()
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
const { storeName } = useSettings()

// the plain /shop page is prerendered and indexable; a filtered or searched view is not (it would only create near-duplicate pages)
useSeo(() => ({
  title: q.value ? `Search: ${q.value}` : 'Shop all toys',
  description: `Browse every toy at ${storeName.value}: building blocks, soft toys, puzzles, outdoor play, crafts and baby toys.`,
  path: '/shop',
  noindex: Object.keys(route.query).length > 0,
  jsonLd: breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }]),
}))
</script>

<template>
  <div class="page-wash">
    <PageHeader :title="q ? `Results for &quot;${q}&quot;` : 'Shop all toys'" :crumbs="[{ name: 'Home', path: '/' }, { name: 'Shop' }]" />
    <div class="container-page pb-6 pt-3.5 sm:pb-8 sm:pt-7"><ShopListing /></div>
  </div>
</template>
