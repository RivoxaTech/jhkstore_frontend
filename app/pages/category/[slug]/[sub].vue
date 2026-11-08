<script setup lang="ts">
import type { Category } from '~/types'

const route = useRoute()
const slug = String(route.params.slug)
const subSlug = String(route.params.sub)
const { storeName } = useSettings()

const { data, error, refresh } = await useFastData(`category:${slug}`, () => api<{ data: Category }>(`/categories/${slug}`).then((r) => r.data))
if (!data.value && error.value && apiFailure(error.value).status === 404) throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })

const category = computed(() => data.value)
const sub = computed(() => category.value?.sub_categories.find((s) => s.slug === subSlug))
if (category.value && !sub.value && import.meta.server) throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })

useSeo(() => ({
  title: sub.value?.meta_title || (sub.value ? `${sub.value.name} (${category.value?.name})` : 'Category'),
  description: sub.value?.meta_description || `Shop ${sub.value?.name ?? 'toys'} in ${category.value?.name ?? 'our range'} at ${storeName.value}.`,
  path: `/category/${slug}/${subSlug}`,
  noindex: Object.keys(route.query).length > 0,
  jsonLd: breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: category.value?.name ?? slug, path: `/category/${slug}` }, { name: sub.value?.name ?? subSlug, path: `/category/${slug}/${subSlug}` }]),
}))
</script>

<template>
  <div class="page-wash">
    <div v-if="error && !category" class="container-page pb-6 pt-8"><ErrorState :message="apiFailure(error).message" @retry="refresh()" /></div>
    <template v-else-if="category">
      <PageHeader :title="sub?.name ?? subSlug" :crumbs="[{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: category.name, path: `/category/${slug}` }, { name: sub?.name ?? subSlug }]" />
      <div class="container-page pb-8 pt-7"><ShopListing :fixed-category="slug" :fixed-sub="subSlug" /></div>
    </template>
  </div>
</template>
