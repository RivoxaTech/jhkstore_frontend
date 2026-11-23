<script setup lang="ts">
import { ArrowUp } from '@lucide/vue'

/**
 * The two round buttons in the bottom-right corner: WhatsApp (when the admin panel has a WhatsApp number or a WhatsApp link: Settings → General / Footer & Social)
 * and "back to the top" (after the page has been scrolled a little).
 */
const { settings } = useSettings()
const whatsapp = computed(() => settings.value?.footer.whatsapp_url || settings.value?.social_links.find((l) => l.platform === 'whatsapp')?.url || '')
const shown = ref(false)

function onScroll() { shown.value = window.scrollY > 500 }
onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) })
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
function top() { window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }
</script>

<template>
  <div class="fixed bottom-4 right-3.5 z-40 flex flex-col items-center gap-3 sm:bottom-6 sm:right-6" data-testid="floating-actions">
    <a
      v-if="whatsapp" :href="whatsapp" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" data-testid="whatsapp-float"
      class="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_24px_-8px_rgb(0_0_0/0.45)] transition hover:scale-105"
    ><SocialIcon platform="whatsapp" :size="28" mono /></a>
    <Transition enter-active-class="transition duration-200" enter-from-class="translate-y-2 opacity-0" leave-active-class="transition duration-150" leave-to-class="translate-y-2 opacity-0">
      <button v-if="shown" type="button" aria-label="Back to the top" data-testid="back-to-top" class="grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-[0_10px_24px_-8px_rgb(0_0_0/0.35)] ring-1 ring-line transition hover:scale-105" @click="top"><ArrowUp :size="19" /></button>
    </Transition>
  </div>
</template>
