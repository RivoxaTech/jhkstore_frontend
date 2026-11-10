<script setup lang="ts">
import { Headset, RefreshCw, ShieldCheck, Truck } from '@lucide/vue'
import { site } from '~/config/site'

const icons: Record<string, any> = { shield: ShieldCheck, truck: Truck, headset: Headset, refresh: RefreshCw }
</script>

<template>
  <div class="container-page relative z-10 -mt-[4.4rem] sm:-mt-9">   <!-- phone: half of the card sits on the picture, half below it -->
    <ul class="grid grid-cols-2 gap-x-2 gap-y-3.5 rounded-[18px] bg-white px-3 py-4 shadow-[0_12px_40px_-18px_rgb(4_70_76/0.35)] sm:rounded-[22px] sm:gap-y-5 sm:px-6 sm:py-5 lg:grid-cols-4 lg:gap-y-0" data-testid="trust-bar">
      <li v-for="(t, i) in site.trust" :key="t.title" class="flex min-w-0 items-center gap-2 sm:justify-center sm:gap-3 lg:px-4" :class="i > 0 ? 'lg:border-l lg:border-line' : ''">
        <component :is="icons[t.icon] ?? ShieldCheck" :stroke-width="1.7" class="h-6 w-6 shrink-0 text-primary sm:h-9 sm:w-9 lg:h-10 lg:w-10" aria-hidden="true" />
        <div class="min-w-0"><p class="truncate text-[12px] font-semibold leading-tight sm:text-[15px]">{{ t.title }}</p><p class="mt-0.5 truncate text-[10.5px] text-muted sm:text-[12.5px]">{{ t.text }}</p></div>
      </li>
    </ul>
  </div>
</template>
