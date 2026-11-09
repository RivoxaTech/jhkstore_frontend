<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { Banner } from '~/types'
import { site } from '~/config/site'

/**
 * The big hero of the home page. Title, subtitle, button and picture come from the live `home_hero` banners of the admin panel (the words between *asterisks*
 * in the title are shown in the accent colour). Several banners = a slider (autoplay, dots, swipe), one = static. No banner = a plain hero with the store
 * name and tagline (admin panel) and no picture. The eyebrow above the title is the store tagline with dots between the words. Colours come from the theme.
 */
const props = defineProps<{ banners: Banner[] }>()
const { store, storeName } = useSettings()

const slides = computed(() => props.banners.length
  ? props.banners.map((b) => ({ title: b.title || '', subtitle: b.subtitle || '', button: b.button_text || '', link: b.link_url || '', image: b.image_url, mobile: b.mobile_image_url }))
  : [{ title: storeName.value, subtitle: '', button: site.heroFallback.buttonText, link: site.heroFallback.buttonLink, image: null as string | null, mobile: null as string | null }])

const eyebrow = computed(() => {
  const words = (store.value?.tagline || '').split(/\s+/).map((w) => w.replace(/[.,;:!?]+$/g, '')).filter(Boolean)
  return words.map((w) => w.toUpperCase()).join(' • ')
})

const index = ref(0)
const paused = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
const reduced = () => import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function go(i: number) { index.value = (i + slides.value.length) % slides.value.length }
function start() {
  stop()
  if (slides.value.length > 1 && !reduced()) timer = setInterval(() => { if (!paused.value) go(index.value + 1) }, 6500)
}
function stop() { if (timer) clearInterval(timer) }
onMounted(start)
onBeforeUnmount(stop)

// swipe
let startX = 0
function down(e: PointerEvent) { startX = e.clientX }
function up(e: PointerEvent) {
  const dx = e.clientX - startX
  if (Math.abs(dx) > 45) go(index.value + (dx < 0 ? 1 : -1))
}

const first = computed(() => slides.value[0])
useHead(() => ({ link: first.value.image ? [{ rel: 'preload', as: 'image', href: first.value.image, fetchpriority: 'high' }] : [] }))
const isExternal = (l: string) => /^https?:\/\//i.test(l)
</script>

<template>
  <section class="relative isolate -mt-16 overflow-hidden bg-[color-mix(in_srgb,var(--c-primary)_7%,var(--c-bg))] md:-mt-[76px]" aria-roledescription="carousel" aria-label="Featured" data-testid="hero" @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
    <div class="relative" @pointerdown="down" @pointerup="up">
      <div
        v-for="(s, i) in slides" :key="i" class="grid min-h-[640px] items-start pt-16 sm:items-center transition-opacity duration-700 sm:min-h-[560px] md:pt-[76px] lg:min-h-[640px]"
        :class="i === index ? 'relative opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'" :aria-hidden="i !== index" role="group" :aria-label="`Slide ${i + 1} of ${slides.length}`"
      >
        <picture v-if="s.image" class="absolute inset-x-0 bottom-0 top-[42%] -z-10 sm:inset-0">
          <source v-if="s.mobile" media="(max-width: 639px)" :srcset="s.mobile">
          <img
            :src="s.image" alt="" width="1259" height="650" class="h-full w-full origin-[85%_72%] scale-100 object-cover object-[70%_70%] sm:object-[88%_72%] lg:scale-[1.06]" :loading="i === 0 ? 'eager' : 'lazy'"
            :fetchpriority="i === 0 ? 'high' : 'low'" decoding="async"
          >
        </picture>
        <div v-if="s.image" class="absolute inset-0 -z-10 bg-gradient-to-b from-page/95 via-page/65 to-page/0 sm:bg-gradient-to-r sm:from-page/90 sm:via-page/30 sm:to-transparent lg:[background-image:linear-gradient(90deg,color-mix(in_srgb,var(--c-bg)_96%,transparent)_0%,color-mix(in_srgb,var(--c-bg)_60%,transparent)_30%,transparent_50%)]" aria-hidden="true" />

        <div class="container-page pb-14 pt-8 sm:py-14 lg:py-20">
          <div class="max-w-[560px]">
            <p v-if="eyebrow" class="flex items-center gap-3 text-[15px] font-bold tracking-[0.06em] text-accent">
              {{ eyebrow }}<span class="h-px w-16 bg-accent/60" aria-hidden="true" />
            </p>
            <h1 v-if="i === 0" class="mt-4 text-[clamp(2.3rem,5.4vw,4.1rem)] font-semibold leading-[1.06]"><AccentText :text="s.title" /></h1>
            <h2 v-else class="mt-4 text-[clamp(2.3rem,5.4vw,4.1rem)] font-semibold leading-[1.06]"><AccentText :text="s.title" /></h2>
            <p v-if="s.subtitle" class="mt-4 max-w-lg text-[19px] text-ink/90">{{ s.subtitle }}</p>
            <div v-if="s.button" class="mt-8">
              <a v-if="isExternal(s.link)" :href="s.link" class="btn btn-primary btn-lg">{{ s.button }} <ArrowRight :size="18" /></a>
              <NuxtLink v-else :to="s.link || '/shop'" class="btn btn-primary btn-lg" data-testid="hero-button">{{ s.button }} <ArrowRight :size="18" /></NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--c-bg)] to-transparent" aria-hidden="true" />
      <div v-if="slides.length > 1" class="absolute inset-x-0 bottom-14 z-10 flex justify-center gap-2 lg:bottom-16" role="tablist" aria-label="Choose a slide">
        <button
          v-for="(s, i) in slides" :key="i" type="button" role="tab" class="h-2.5 rounded-full transition-all" :class="i === index ? 'w-7 bg-primary' : 'w-2.5 bg-primary/35 hover:bg-primary/60'"
          :aria-selected="i === index" :aria-label="`Slide ${i + 1}`" data-testid="hero-dot" @click="go(i)"
        />
      </div>
    </div>
  </section>
</template>
