<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { Banner } from '~/types'

/** The soft banner at the bottom of the home page: the first live `home_secondary` banner of the admin panel (the page shows nothing when there is none). */
const props = defineProps<{ banner: Banner }>()
const b = computed(() => ({ title: props.banner.title || '', subtitle: props.banner.subtitle || '', button: props.banner.button_text || '', link: props.banner.link_url || '/shop', image: props.banner.image_url, mobile: props.banner.mobile_image_url }))
const isExternal = computed(() => /^https?:\/\//i.test(b.value.link))
</script>

<template>
  <section class="container-page" aria-label="Gift ideas" data-testid="gift-banner">
    <div class="relative isolate overflow-hidden rounded-[26px] bg-primary-tint">
      <picture class="absolute inset-0 -z-10">
        <source v-if="b.mobile" media="(max-width: 639px)" :srcset="b.mobile">
        <img :src="b.image" alt="" width="1376" height="389" class="h-full w-full object-cover object-right" loading="lazy" decoding="async">
      </picture>
      <div class="absolute inset-0 -z-10 bg-gradient-to-r from-primary-tint/90 via-primary-tint/30 to-transparent sm:from-primary-tint/70 sm:via-transparent" aria-hidden="true" />
      <div class="px-6 py-9 sm:px-10 sm:py-12 lg:px-14">
        <div class="max-w-[420px]">
          <h2 class="text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-tight"><AccentText :text="b.title" /></h2>
          <p v-if="b.subtitle" class="mt-3 text-[14.5px] text-ink/85">{{ b.subtitle }}</p>
          <div v-if="b.button" class="mt-5">
            <a v-if="isExternal" :href="b.link" class="btn btn-primary btn-md">{{ b.button }} <ArrowRight :size="16" /></a>
            <NuxtLink v-else :to="b.link" class="btn btn-primary btn-md">{{ b.button }} <ArrowRight :size="16" /></NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
