<script setup lang="ts">
import { LayoutGrid, Square } from '@lucide/vue'
import type { ProductCard } from '~/types'

/**
 * The product grid: ONE product per row on a phone by default, with a small toggle in the corner of the header to switch to two (kept in localStorage);
 * 2 to 3 columns on a tablet, 4 on a desktop. Skeletons while loading have the size of the cards, so nothing jumps.
 */
const props = defineProps<{ products: ProductCard[]; loading?: boolean; skeletons?: number; toggle?: boolean; eagerCount?: number }>()
const { cols, set } = useGrid()
</script>

<template>
  <div>
    <div v-if="toggle" class="mb-3 flex justify-end sm:hidden" data-testid="grid-toggle-wrap">
      <div class="inline-flex rounded-full bg-white p-0.5 shadow-sm ring-1 ring-line" role="group" aria-label="Products per row">
        <button type="button" class="grid h-8 w-8 place-items-center rounded-full transition" :class="cols === 1 ? 'bg-primary text-primary-contrast' : 'text-muted'" :aria-pressed="cols === 1" aria-label="One product per row" data-testid="grid-1" @click="set(1)"><Square :size="15" /></button>
        <button type="button" class="grid h-8 w-8 place-items-center rounded-full transition" :class="cols === 2 ? 'bg-primary text-primary-contrast' : 'text-muted'" :aria-pressed="cols === 2" aria-label="Two products per row" data-testid="grid-2" @click="set(2)"><LayoutGrid :size="15" /></button>
      </div>
    </div>

    <ul class="grid gap-3.5 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5" :class="cols === 2 ? 'grid-cols-2' : 'grid-cols-1'" data-testid="product-grid" :data-cols="cols">
      <template v-if="loading">
        <li v-for="n in skeletons ?? 8" :key="`s${n}`" class="card overflow-hidden" aria-hidden="true">
          <div class="skeleton aspect-[5/4] rounded-none" />
          <div class="space-y-2 p-3.5"><div class="skeleton h-4 w-3/4" /><div class="skeleton h-3 w-full" /><div class="skeleton h-3 w-2/3" /><div class="skeleton h-5 w-1/3" /><div class="skeleton ml-auto h-[30px] w-28 rounded-full" /></div>
        </li>
      </template>
      <template v-else>
        <li v-for="(p, i) in products" :key="p.id"><ProductCard :product="p" :eager="i < (eagerCount ?? 0)" /></li>
      </template>
    </ul>
  </div>
</template>
