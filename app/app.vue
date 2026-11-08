<script setup lang="ts">
const { settings, storeName } = useSettings()
const cart = useCart()
const grid = useGrid()

// the theme of the admin panel as CSS variables (baked into the HTML), the favicon and the Organization / WebSite data of the store
useHead(() => ({
  htmlAttrs: { lang: 'en' },
  style: [{ key: 'theme', innerHTML: themeCss(settings.value) }],
  // the favicon of the admin panel, else the logo, else an empty icon (no request for /favicon.ico)
  link: [{ rel: 'icon', href: settings.value?.store.favicon_url || settings.value?.store.logo_url || 'data:,' }],
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
