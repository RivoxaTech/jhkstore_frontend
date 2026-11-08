<script setup lang="ts">
/** The store logo: the picture uploaded in the admin panel (Settings > Branding), else the bundled one. `light` turns it white for the dark footer. */
const props = defineProps<{ light?: boolean; height?: number }>()
const { store, storeName } = useSettings()
const h = computed(() => props.height ?? 40)
</script>

<template>
  <NuxtLink to="/" class="inline-flex items-center" :aria-label="`${storeName}: home`">
    <img
      :src="store?.logo_url || '/images/logo.svg'" :alt="storeName" :height="h" :style="{ height: `${h}px` }" class="w-auto max-w-[220px] object-contain"
      :class="{ 'brightness-0 invert': light }" decoding="async" fetchpriority="high"
    >
  </NuxtLink>
</template>
