<script setup lang="ts">
/**
 * The thin bar above the header (Settings → Store: Announcement bar and its text). Shown only when the admin switched it on and gave it a text.
 * Always ONE line: when the text is wider than the screen (a phone) it scrolls slowly like a ticker instead of wrapping.
 */
const { settings } = useSettings()
const bar = computed(() => settings.value?.announcement)
const box = ref<HTMLElement | null>(null)
const scrolls = ref(false)

function measure() {
  const el = box.value
  if (!el) return
  scrolls.value = false
  nextTick(() => { scrolls.value = el.scrollWidth > el.clientWidth + 1 })
}
onMounted(() => { measure(); window.addEventListener('resize', measure, { passive: true }) })
onBeforeUnmount(() => window.removeEventListener('resize', measure))
watch(() => bar.value?.text, () => nextTick(measure))
const seconds = computed(() => Math.max(14, Math.round((bar.value?.text?.length ?? 0) * 0.32)))
</script>

<template>
  <div v-if="bar?.enabled && bar.text" class="bg-footer text-white" data-testid="announcement-bar">
    <div ref="box" class="container-page overflow-hidden py-2 text-[10px] font-semibold uppercase leading-snug tracking-[0.1em] sm:text-[12px] sm:tracking-[0.2em]" :class="scrolls ? 'ab-scroll' : 'text-center'">
      <span class="ab-track" :style="scrolls ? { animationDuration: `${seconds}s` } : undefined">{{ bar.text }}</span>
    </div>
  </div>
</template>
