<script setup lang="ts">
/**
 * The top of an inner page: a soft band with the breadcrumb, the title and an optional line under it. `center` centres the text (About, Wholesale);
 * the shop lists keep it on the left. A slot puts something extra under the title (the shop's search box).
 */
defineProps<{ title: string; subtitle?: string; crumbs: { name: string; path?: string }[]; center?: boolean }>()
</script>

<template>
  <header class="border-b border-line/60 bg-primary-soft/55" data-testid="page-header">
    <div class="container-page py-8 sm:py-11" :class="center ? 'text-center' : ''">
      <Breadcrumbs :items="crumbs" :class="center ? 'flex justify-center' : ''" />
      <h1 class="mt-3 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-tight">{{ title }}</h1>
      <p v-if="subtitle" class="mt-2.5 max-w-2xl text-[16px] text-ink/75" :class="center ? 'mx-auto' : ''">{{ subtitle }}</p>
      <slot />
    </div>
  </header>
</template>
