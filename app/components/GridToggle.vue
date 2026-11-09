<script setup lang="ts">
import { LayoutGrid, Square } from '@lucide/vue'

/** One product per row or two (phones only: tablets and desktops have their own columns). The choice is kept by useGrid (localStorage). */
const { cols, set } = useGrid()
</script>

<template>
  <div class="inline-flex rounded-full bg-white p-0.5 shadow-sm ring-1 ring-line sm:hidden" role="group" aria-label="Products per row" data-testid="grid-toggle-wrap">
    <button type="button" class="grid h-7 w-7 place-items-center rounded-full transition" :class="cols === 1 ? 'bg-primary-btn text-primary-contrast' : 'text-muted'" :aria-pressed="cols === 1" aria-label="One product per row" data-testid="grid-1" @click="set(1)"><Square :size="14" /></button>
    <button type="button" class="grid h-7 w-7 place-items-center rounded-full transition" :class="cols === 2 ? 'bg-primary-btn text-primary-contrast' : 'text-muted'" :aria-pressed="cols === 2" aria-label="Two products per row" data-testid="grid-2" @click="set(2)"><LayoutGrid :size="14" /></button>
  </div>
</template>
