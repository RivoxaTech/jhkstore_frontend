<script setup lang="ts">
import type { Category } from '~/types'

const route = useRoute()
const slug = String(route.params.slug)
const { storeName } = useSettings()

// the category (name, text, own SEO fields) is baked in at build time; a category created after the build is loaded in the browser
const { data, error, refresh } = await useAsyncData(`category:${slug}`, () => api<{ data: Category }>(`/categories/${slug}`).then((r) => r.data))
if (!data.value && error.value && apiFailure(error.value).status === 404) throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })

const category = computed(() => data.value)
useSeo(() => ({
  title: category.value?.meta_title || category.value?.name || 'Category',
  description: category.value?.meta_description || category.value?.description || `Shop ${category.value?.name ?? 'toys'} at ${storeName.value}.`,
  path: `/category/${slug}`,
  image: (category.value as any)?.image_url,
  noindex: Object.keys(route.query).length > 0,
  jsonLd: breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: category.value?.name ?? slug, path: `/category/${slug}` }]),
}))
</script>

<template>
  <div class="page-wash">
    <div class="container-page pb-6 pt-6 sm:pt-8">
      <ErrorState v-if="error && !category" :message="apiFailure(error).message" @retry="refresh()" />
      <template v-else-if="category">
        <Breadcrumbs :items="[{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: category.name }]" />
        <h1 class="mt-3 text-3xl font-semibold sm:text-4xl">{{ category.name }}</h1>
        <p v-if="category.description" class="mb-6 mt-2 max-w-2xl text-muted">{{ category.description }}</p>
        <div v-else class="mb-6" />
        <ShopListing :fixed-category="slug" />
      </template>
    </div>
  </div>
</template>
