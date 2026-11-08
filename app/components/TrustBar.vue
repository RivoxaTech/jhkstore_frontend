<script setup lang="ts">
import { Headset, RefreshCw, ShieldCheck, Truck } from '@lucide/vue'
import { site } from '~/config/site'

const icons: Record<string, any> = { shield: ShieldCheck, truck: Truck, headset: Headset, refresh: RefreshCw }
</script>

<template>
  <div class="container-page relative z-10 -mt-9">
    <ul class="grid grid-cols-2 gap-y-5 rounded-[22px] bg-white px-3 py-5 shadow-[0_12px_40px_-18px_rgb(4_70_76/0.35)] sm:px-6 lg:grid-cols-4 lg:gap-y-0" data-testid="trust-bar">
      <li v-for="(t, i) in site.trust" :key="t.title" class="flex items-center gap-3 px-2 sm:justify-center lg:px-4" :class="i > 0 ? 'lg:border-l lg:border-line' : ''">
        <component :is="icons[t.icon] ?? ShieldCheck" :size="34" :stroke-width="1.5" class="shrink-0 text-primary" aria-hidden="true" />
        <div class="min-w-0"><p class="text-[13.5px] font-semibold leading-tight">{{ t.title }}</p><p class="mt-0.5 text-[11.5px] text-muted">{{ t.text }}</p></div>
      </li>
    </ul>
  </div>
</template>
