<script setup lang="ts">
/**
 * The top of an inner page: a soft band with the breadcrumb, the title and an optional line under it, all on the left. Every page uses it, so every page
 * looks the same. A slot puts something extra under the title.
 */
defineProps<{ title: string; subtitle?: string; crumbs: { name: string; path?: string }[] }>()
</script>

<template>
  <header class="border-b border-line/60 bg-primary-soft/55" data-testid="page-header">
    <div class="container-page py-8 sm:py-11">
      <Breadcrumbs :items="crumbs" />
      <h1 class="mt-3 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-tight">{{ title }}</h1>
      <p v-if="subtitle" class="mt-2.5 max-w-2xl text-[16px] text-ink/75">{{ subtitle }}</p>
      <slot />
    </div>
  </header>
</template>
