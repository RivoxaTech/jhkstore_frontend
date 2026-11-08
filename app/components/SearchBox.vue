<script setup lang="ts">
import { Search, LoaderCircle } from '@lucide/vue'
import type { Paginated, ProductCard } from '~/types'

/** Header search: live suggestions (name, picture, price) after a short pause; Enter goes to /shop?q=. */
const props = defineProps<{ autofocus?: boolean; compact?: boolean }>()
const emit = defineEmits<{ (e: 'done'): void }>()
const { money } = useMoney()
const route = useRoute()
const q = ref('')
const results = ref<ProductCard[]>([])
const open = ref(false)
const loading = ref(false)
const searched = ref('')
const active = ref(-1)
const input = ref<HTMLInputElement | null>(null)
const root = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

watch(q, (value) => {
  clearTimeout(timer)
  active.value = -1
  const term = value.trim()
  if (term.length < 2) { results.value = []; open.value = false; loading.value = false; return }
  loading.value = true
  timer = setTimeout(async () => {
    const mine = ++seq
    try {
      const res = await api<Paginated<ProductCard>>('/products', { query: { q: term, per_page: 5 } })
      if (mine !== seq) return   // a newer search is already running
      results.value = res.data
      searched.value = term
      open.value = true
    } catch {
      if (mine === seq) { results.value = []; open.value = false }
    } finally {
      if (mine === seq) loading.value = false
    }
  }, 280)
})

function go(path: string) { open.value = false; emit('done'); navigateTo(path) }
function submit() {
  const term = q.value.trim()
  if (active.value >= 0 && results.value[active.value]) return go(`/product/${results.value[active.value].slug}`)
  if (term) go(`/shop?q=${encodeURIComponent(term)}`)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { open.value = false; return }
  if (!open.value || !results.value.length) return
  if (e.key === 'ArrowDown') { e.preventDefault(); active.value = (active.value + 1) % results.value.length }
  if (e.key === 'ArrowUp') { e.preventDefault(); active.value = (active.value - 1 + results.value.length) % results.value.length }
}
function outside(e: MouseEvent) { if (root.value && !root.value.contains(e.target as Node)) open.value = false }

onMounted(() => {
  document.addEventListener('click', outside)
  if (props.autofocus) nextTick(() => input.value?.focus())
  if (route.path === '/shop' && typeof route.query.q === 'string') q.value = ''
})
onBeforeUnmount(() => { document.removeEventListener('click', outside); clearTimeout(timer) })
</script>

<template>
  <form ref="root" class="relative w-full" role="search" @submit.prevent="submit">
    <label for="site-search" class="sr-only">Search products</label>
    <div class="flex h-10 items-center rounded-full bg-primary-soft pl-4 pr-1 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-primary/50">
      <input
        id="site-search" ref="input" v-model="q" type="search" autocomplete="off" placeholder="Search products..." role="combobox" :aria-expanded="open" aria-controls="search-results"
        class="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted/70" @keydown="onKey" @focus="results.length && (open = true)"
      >
      <button type="submit" class="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-primary" aria-label="Search">
        <LoaderCircle v-if="loading" :size="16" class="animate-spin" /><Search v-else :size="16" />
      </button>
    </div>

    <div v-if="open" id="search-results" class="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-line sm:min-w-[340px]" role="listbox" data-testid="search-suggestions">
      <ul v-if="results.length">
        <li v-for="(p, i) in results" :key="p.id" role="option" :aria-selected="i === active">
          <NuxtLink :to="`/product/${p.slug}`" class="flex items-center gap-3 px-3 py-2.5 hover:bg-primary-soft" :class="{ 'bg-primary-soft': i === active }" @click="open = false; emit('done')">
            <span class="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-primary-soft">
              <img v-if="p.thumb_url" :src="p.thumb_url" :alt="p.name" width="44" height="44" class="h-full w-full object-cover" loading="lazy">
            </span>
            <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium">{{ p.name }}</span><span class="block text-xs text-muted">{{ p.category.name }}</span></span>
            <span class="text-sm font-semibold">{{ money(p.price) }}</span>
          </NuxtLink>
        </li>
        <li><NuxtLink :to="`/shop?q=${encodeURIComponent(searched)}`" class="block border-t border-line px-4 py-2.5 text-center text-sm font-semibold text-primary-dark hover:bg-primary-soft" @click="open = false; emit('done')">See all results for "{{ searched }}"</NuxtLink></li>
      </ul>
      <p v-else class="px-4 py-4 text-sm text-muted">No toys found for "{{ searched }}".</p>
    </div>
  </form>
</template>
