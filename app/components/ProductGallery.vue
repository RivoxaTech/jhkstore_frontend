<script setup lang="ts">
import { ChevronLeft, ChevronRight, Play, X, ZoomIn } from '@lucide/vue'
import type { Picture, VideoItem } from '~/types'

/**
 * The picture gallery of a product page: the main picture (swipe, arrows), thumbnails, the product videos inside the same gallery (an uploaded file with its poster,
 * or a YouTube / Vimeo embed; loaded only when it is opened) and a full-screen view with zoom. Every picture has its real width and height: no layout shift.
 */
const props = defineProps<{ images: Picture[]; videos: VideoItem[]; name: string }>()

type Slide = { kind: 'image'; image: Picture } | { kind: 'video'; video: VideoItem }
const slides = computed<Slide[]>(() => [
  ...props.images.map((image) => ({ kind: 'image', image }) as Slide),
  ...props.videos.map((video) => ({ kind: 'video', video }) as Slide),
])
const index = ref(0)
watch(() => props.images, () => { index.value = 0 })
const current = computed(() => slides.value[Math.min(index.value, slides.value.length - 1)])
const go = (i: number) => { if (slides.value.length) index.value = (i + slides.value.length) % slides.value.length }

// swipe on the main picture
let startX = 0
let moved = false
function down(e: PointerEvent) { startX = e.clientX; moved = false }
function up(e: PointerEvent) {
  const dx = e.clientX - startX
  if (Math.abs(dx) > 45) { moved = true; go(index.value + (dx < 0 ? 1 : -1)) }
}

// full-screen view
const zoomOpen = ref(false)
const zoomed = ref(false)
const origin = ref('50% 50%')
function openZoom() { if (moved) return; if (current.value?.kind === 'image') { zoomOpen.value = true; zoomed.value = false } }
function closeZoom() { zoomOpen.value = false }
function toggleZoom(e: MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  origin.value = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`
  zoomed.value = !zoomed.value
}
function key(e: KeyboardEvent) {
  if (!zoomOpen.value) return
  if (e.key === 'Escape') closeZoom()
  if (e.key === 'ArrowRight') go(index.value + 1)
  if (e.key === 'ArrowLeft') go(index.value - 1)
}
onMounted(() => document.addEventListener('keydown', key))
onBeforeUnmount(() => document.removeEventListener('keydown', key))
watch(zoomOpen, (open) => { if (import.meta.client) document.documentElement.style.overflow = open ? 'hidden' : '' })

const embedSrc = (v: VideoItem) => v.url
const isFile = (v: VideoItem) => v.source === 'upload' || /\.(mp4|webm)(\?|$)/i.test(v.url)
</script>

<template>
  <div data-testid="gallery">
    <div class="relative overflow-hidden rounded-[var(--radius)] bg-white shadow-[var(--shadow)]">
      <div v-if="current?.kind === 'image'" class="relative aspect-square cursor-zoom-in touch-pan-y" @pointerdown="down" @pointerup="up" @click="openZoom">
        <img
          :key="current.image.medium_url" :src="current.image.medium_url" :alt="name" :width="current.image.medium_width || 512" :height="current.image.medium_height || 512"
          class="h-full w-full object-cover" :fetchpriority="index === 0 ? 'high' : undefined" :loading="index === 0 ? 'eager' : 'lazy'" decoding="async" data-testid="gallery-main"
        >
        <span class="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow" aria-hidden="true"><ZoomIn :size="17" /></span>
      </div>
      <div v-else-if="current?.kind === 'video'" class="aspect-square bg-black" data-testid="gallery-video">
        <video v-if="isFile(current.video)" :key="current.video.url" class="h-full w-full object-contain" controls playsinline preload="none" :poster="current.video.poster_url || undefined" :aria-label="`${name}: video`"><source :src="current.video.url" :type="current.video.mime || undefined"></video>
        <iframe v-else :key="current.video.url" :src="embedSrc(current.video)" class="h-full w-full" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen :title="`${name}: video`" referrerpolicy="strict-origin-when-cross-origin" />
      </div>
      <div v-else class="grid aspect-square place-items-center bg-primary-soft text-sm text-muted">No picture yet</div>

      <template v-if="slides.length > 1">
        <button type="button" class="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow hover:bg-white" aria-label="Previous picture" @click.stop="go(index - 1)"><ChevronLeft :size="18" /></button>
        <button type="button" class="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow hover:bg-white" aria-label="Next picture" @click.stop="go(index + 1)"><ChevronRight :size="18" /></button>
      </template>
    </div>

    <ul v-if="slides.length > 1" class="mt-3 flex gap-2.5 overflow-x-auto pb-1" aria-label="Pictures and videos">
      <li v-for="(s, i) in slides" :key="i" class="shrink-0">
        <button type="button" class="relative block h-16 w-16 overflow-hidden rounded-xl bg-primary-soft ring-2 transition sm:h-[72px] sm:w-[72px]" :class="i === index ? 'ring-primary' : 'ring-transparent hover:ring-primary/40'" :aria-label="s.kind === 'image' ? `Picture ${i + 1}` : 'Video'" :aria-current="i === index" data-testid="gallery-thumb" @click="go(i)">
          <img v-if="s.kind === 'image'" :src="s.image.thumb_url" alt="" width="72" height="72" class="h-full w-full object-cover" loading="lazy">
          <template v-else>
            <img v-if="s.video.poster_url" :src="s.video.poster_url" alt="" width="72" height="72" class="h-full w-full object-cover" loading="lazy">
            <span class="absolute inset-0 grid place-items-center bg-black/35 text-white"><Play :size="20" fill="currentColor" /></span>
          </template>
        </button>
      </li>
    </ul>

    <Teleport to="body">
      <div v-if="zoomOpen && current?.kind === 'image'" class="fixed inset-0 z-[85] grid place-items-center bg-black/85" role="dialog" aria-modal="true" aria-label="Picture, full size" data-testid="lightbox" @click.self="closeZoom">
        <button type="button" class="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30" aria-label="Close" @click="closeZoom"><X :size="22" /></button>
        <button v-if="slides.length > 1" type="button" class="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30" aria-label="Previous" @click="go(index - 1)"><ChevronLeft :size="24" /></button>
        <button v-if="slides.length > 1" type="button" class="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30" aria-label="Next" @click="go(index + 1)"><ChevronRight :size="24" /></button>
        <div class="max-h-[88vh] max-w-[92vw] overflow-hidden rounded-xl" :class="zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'" @click="toggleZoom">
          <img :src="current.image.url" :alt="name" class="max-h-[88vh] max-w-[92vw] object-contain transition-transform duration-200" :style="{ transform: zoomed ? 'scale(2.2)' : 'none', transformOrigin: origin }">
        </div>
      </div>
    </Teleport>
  </div>
</template>
