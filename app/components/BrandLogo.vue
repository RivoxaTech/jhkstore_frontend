<script setup lang="ts">
/** The store logo: the picture uploaded in the admin panel (Settings > Branding), else the store name as text. `black` turns it solid black for the footer (the footer is the light-cyan primary colour). */
const props = defineProps<{ black?: boolean; height?: number; mobileHeight?: number }>()
const { store, storeName } = useSettings()
const h = computed(() => props.height ?? 40)
const hm = computed(() => props.mobileHeight ?? h.value)   // below the md breakpoint
</script>

<template>
  <NuxtLink to="/" class="inline-flex items-center" :aria-label="`${storeName}: home`">
    <img
      v-if="store?.logo_url" :src="store.logo_url" :alt="storeName" :height="h" :style="{ '--h': `${h}px`, '--hm': `${hm}px` }" class="h-[var(--hm)] w-auto max-w-[220px] object-contain md:h-[var(--h)]"
      :class="{ 'brightness-0': black }" decoding="async" fetchpriority="high"
    >
    <span v-else class="font-heading text-2xl font-bold tracking-tight" :class="black ? 'text-black' : 'text-ink'">{{ storeName }}</span>
  </NuxtLink>
</template>
