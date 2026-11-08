<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { Banner } from '~/types'
import { site } from '~/config/site'

/**
 * The big hero of the home page. Title, subtitle, button and picture come from the live `home_hero` banners of the admin panel (the words between *asterisks*
 * in the title are shown in the accent colour). Several banners = a slider (autoplay, dots, swipe), one = static. No banner = the fallback of config/site.ts.
 * The eyebrow above the title is the store tagline with dots between the words.
 */
const props = defineProps<{ banners: Banner[] }>()
const { store } = useSettings()

const slides = computed(() => props.banners.length
  ? props.banners.map((b) => ({ title: b.title || '', subtitle: b.subtitle || '', button: b.button_text || '', link: b.link_url || '', image: b.image_url, mobile: b.mobile_image_url }))
  : [{ title: site.heroFallback.title, subtitle: site.heroFallback.subtitle, button: site.heroFallback.buttonText, link: site.heroFallback.buttonLink, image: site.heroFallback.image, mobile: null as string | null }])

const eyebrow = computed(() => {
  const words = (store.value?.tagline || site.footerFallbackTagline).split(/\s+/).map((w) => w.replace(/[.,;:!?]+$/g, '')).filter(Boolean)
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
useHead(() => ({ link: [{ rel: 'preload', as: 'image', href: first.value.image, fetchpriority: 'high' }] }))
const isExternal = (l: string) => /^https?:\/\//i.test(l)
</script>

<template>
  <section class="relative isolate overflow-hidden" aria-roledescription="carousel" aria-label="Featured" data-testid="hero" @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
    <div class="relative" @pointerdown="down" @pointerup="up">
      <div
        v-for="(s, i) in slides" :key="i" class="grid min-h-[470px] items-center transition-opacity duration-700 sm:min-h-[500px] lg:min-h-[560px]"
        :class="i === index ? 'relative opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'" :aria-hidden="i !== index" role="group" :aria-label="`Slide ${i + 1} of ${slides.length}`"
      >
        <picture class="absolute inset-0 -z-10">
          <source v-if="s.mobile" media="(max-width: 639px)" :srcset="s.mobile">
          <img
            :src="s.image" alt="" width="1259" height="650" class="h-full w-full object-cover object-[78%_center] sm:object-right" :loading="i === 0 ? 'eager' : 'lazy'"
            :fetchpriority="i === 0 ? 'high' : 'low'" decoding="async"
          >
        </picture>
        <div class="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/70 to-white/0 sm:via-white/45 lg:from-[#f4fbfb]/95 lg:via-[#f4fbfb]/40" aria-hidden="true" />

        <div class="container-page py-14 lg:py-20">
          <div class="max-w-[560px]">
            <p class="flex items-center gap-3 text-[13px] font-bold tracking-[0.08em] text-accent">
              {{ eyebrow }}<span class="h-px w-16 bg-accent/60" aria-hidden="true" />
            </p>
            <h1 v-if="i === 0" class="mt-4 text-[clamp(2.2rem,5.2vw,3.6rem)] font-semibold leading-[1.08]"><AccentText :text="s.title" /></h1>
            <h2 v-else class="mt-4 text-[clamp(2.2rem,5.2vw,3.6rem)] font-semibold leading-[1.08]"><AccentText :text="s.title" /></h2>
            <p v-if="s.subtitle" class="mt-4 max-w-md text-[17px] text-ink/85">{{ s.subtitle }}</p>
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
