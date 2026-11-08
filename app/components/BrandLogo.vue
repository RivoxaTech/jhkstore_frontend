<script setup lang="ts">
/** The store logo: the picture uploaded in the admin panel (Settings > Branding), else the store name as text. `light` turns it white for the dark footer. */
const props = defineProps<{ light?: boolean; height?: number }>()
const { store, storeName } = useSettings()
const h = computed(() => props.height ?? 40)
</script>

<template>
  <NuxtLink to="/" class="inline-flex items-center" :aria-label="`${storeName}: home`">
    <img
      v-if="store?.logo_url" :src="store.logo_url" :alt="storeName" :height="h" :style="{ height: `${h}px` }" class="w-auto max-w-[220px] object-contain"
      :class="{ 'brightness-0 invert': light }" decoding="async" fetchpriority="high"
    >
    <span v-else class="font-heading text-2xl font-bold tracking-tight" :class="light ? 'text-white' : 'text-ink'">{{ storeName }}</span>
  </NuxtLink>
</template>
