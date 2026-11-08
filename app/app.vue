<script setup lang="ts">
const { settings, storeName } = useSettings()
const cart = useCart()
const grid = useGrid()

// the theme of the admin panel as CSS variables (baked into the HTML), the favicon and the Organization / WebSite data of the store
useHead(() => ({
  htmlAttrs: { lang: 'en' },
  style: [{ key: 'theme', innerHTML: themeCss(settings.value) }],
  link: settings.value?.store.favicon_url ? [{ rel: 'icon', href: settings.value.store.favicon_url }] : [{ rel: 'icon', type: 'image/svg+xml', href: '/images/logo.svg' }],
}))

onMounted(() => {
  grid.load()
  cart.refresh()   // a visitor who has a cart token sees the real count at once
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
