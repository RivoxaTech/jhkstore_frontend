<script setup lang="ts">
const { settings, storeName } = useSettings()
const cart = useCart()
const grid = useGrid()

// the theme of the admin panel as CSS variables (baked into the HTML), the favicon and the Organization / WebSite data of the store
useHead(() => ({
  htmlAttrs: { lang: 'en' },
  style: [{ key: 'theme', innerHTML: themeCss(settings.value) }],
  // the favicon uploaded in the admin panel; without one, the icon set of public/ (favicon.svg, the 96 px png, favicon.ico) is used
  link: [
    ...(settings.value?.store.favicon_url
      ? [{ rel: 'icon', href: settings.value.store.favicon_url }]
      : [{ rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' }, { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }, { rel: 'shortcut icon', href: '/favicon.ico' }]),
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'manifest', href: '/site.webmanifest' },
  ],
  meta: [{ name: 'apple-mobile-web-app-title', content: storeName.value }],
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
