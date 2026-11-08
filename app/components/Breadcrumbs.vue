<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'

/** Home > Category > Product. The last item is the current page (not a link). */
defineProps<{ items: { name: string; path?: string }[] }>()
</script>

<template>
  <nav aria-label="Breadcrumb" class="text-[13px] text-muted">
    <ol class="flex flex-wrap items-center gap-1.5">
      <li v-for="(it, i) in items" :key="i" class="flex items-center gap-1.5">
        <NuxtLink v-if="it.path && i < items.length - 1" :to="it.path" class="hover:text-primary-dark hover:underline">{{ it.name }}</NuxtLink>
        <span v-else class="font-medium text-ink" :aria-current="i === items.length - 1 ? 'page' : undefined">{{ it.name }}</span>
        <ChevronRight v-if="i < items.length - 1" :size="13" aria-hidden="true" />
      </li>
    </ol>
  </nav>
</template>
