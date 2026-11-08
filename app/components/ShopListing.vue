<script setup lang="ts">
import { Search, SlidersHorizontal, X } from '@lucide/vue'
import type { Category, Paginated, ProductCard } from '~/types'

/**
 * The product listing of /shop and /category/...: a row of category chips (and sub-category chips under it when the store has them), a toolbar with search,
 * the result count, the price range, in-stock, sort and "Load more". Everything lives in the address (?sort=price_asc&min=10): a link can be shared, and the
 * plain page (no query) is prerendered from the API at build time. A category page fixes the category by its path.
 */
const props = defineProps<{ fixedCategory?: string; fixedSub?: string }>()
const route = useRoute()
const router = useRouter()
const PER_PAGE = 24

const SORTS = [
  { value: 'popularity', label: 'Most popular' }, { value: 'newest', label: 'Newest' }, { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' }, { value: 'discount', label: 'Biggest discount' },
]

const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
const category = computed(() => props.fixedCategory ?? (typeof route.query.category === 'string' ? route.query.category : ''))
const sub = computed(() => props.fixedSub ?? (typeof route.query.sub === 'string' ? route.query.sub : ''))
const sort = computed(() => (typeof route.query.sort === 'string' && SORTS.some((s) => s.value === route.query.sort) ? route.query.sort : 'popularity'))
const min = computed(() => (typeof route.query.min === 'string' ? route.query.min : ''))
const max = computed(() => (typeof route.query.max === 'string' ? route.query.max : ''))
const inStock = computed(() => route.query.stock === '1')

function params(page: number) {
  const p: Record<string, any> = { per_page: PER_PAGE, page, sort: sort.value }
  if (q.value) p.q = q.value
  if (category.value) p.category = category.value
  if (sub.value) p.sub_category = sub.value
  if (min.value) p.min_price = min.value
  if (max.value) p.max_price = max.value
  if (inStock.value) p.in_stock = 1
  return p
}

const key = computed(() => `listing:${props.fixedCategory ?? ''}:${props.fixedSub ?? ''}:${JSON.stringify(route.query)}`)
const { data, error, status, refresh } = await useAsyncData(key.value, () => api<Paginated<ProductCard>>('/products', { query: params(1) }), { watch: [() => route.query] })
const { data: categories } = await useFastData('categories', () => api<{ data: Category[] }>('/categories'))

const extra = ref<ProductCard[]>([])
const nextPage = ref(2)
const loadingMore = ref(false)
const moreError = ref('')
watch(() => data.value, () => { extra.value = []; nextPage.value = 2; moreError.value = '' })
const products = computed(() => [...(data.value?.data ?? []), ...extra.value])
const total = computed(() => data.value?.meta.total ?? 0)
const hasMore = computed(() => (data.value ? nextPage.value <= data.value.meta.last_page : false))

async function loadMore() {
  loadingMore.value = true
  moreError.value = ''
  try {
    const res = await api<Paginated<ProductCard>>('/products', { query: params(nextPage.value) })
    extra.value = [...extra.value, ...res.data]
    nextPage.value++
  } catch (e) { moreError.value = apiFailure(e).message } finally { loadingMore.value = false }
}

// prices and stock are live: a page that was built earlier asks again once it is shown
onMounted(() => { if (status.value === 'success') refresh() })

// ---- filters
const cats = computed(() => categories.value?.data ?? [])
const activeCat = computed(() => cats.value.find((c) => c.slug === category.value))
const subs = computed(() => activeCat.value?.sub_categories ?? [])
const filtersOpen = ref(false)
const minInput = ref(min.value)
const maxInput = ref(max.value)
const searchInput = ref(q.value)
watch([min, max], () => { minInput.value = min.value; maxInput.value = max.value })
watch(q, () => { searchInput.value = q.value })

function setQuery(patch: Record<string, string | null>) {
  const query: Record<string, any> = { ...route.query }
  for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') delete query[k]; else query[k] = v }
  router.push({ query })
}
function applyPrice() {
  const lo = Number(minInput.value); const hi = Number(maxInput.value)
  setQuery({ min: minInput.value && lo >= 0 ? String(lo) : null, max: maxInput.value && hi >= 0 ? String(hi) : null })
}
const search = () => setQuery({ q: searchInput.value.trim() || null })
const catLink = (slug: string) => (props.fixedCategory !== undefined ? `/category/${slug}` : { path: '/shop', query: { ...route.query, category: slug, sub: undefined } })
const subLink = (c: Category, s: string) => (props.fixedCategory !== undefined ? `/category/${c.slug}/${s}` : { path: '/shop', query: { ...route.query, category: c.slug, sub: s } })
const allLink = computed(() => (props.fixedCategory !== undefined ? '/shop' : { path: '/shop', query: { ...route.query, category: undefined, sub: undefined } }))
const activeFilters = computed(() => Number(!!min.value || !!max.value) + Number(inStock.value))

const chip = 'inline-flex shrink-0 items-center rounded-full border px-4 py-1.5 text-[13.5px] font-semibold transition-colors'
const chipOn = 'border-primary-btn bg-primary-btn text-primary-contrast'
const chipOff = 'border-line bg-white text-ink hover:border-primary hover:text-primary-dark'

defineExpose({ total })
</script>

<template>
  <div>
    <!-- search -->
    <form class="relative max-w-xl" role="search" @submit.prevent="search">
      <label class="sr-only" for="shop-search">Search toys</label>
      <Search :size="18" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input id="shop-search" v-model="searchInput" type="search" placeholder="Search toys..." class="field-input !rounded-full !bg-white !py-2.5 !pl-11 !pr-24" data-testid="shop-search">
      <button type="submit" class="btn btn-primary btn-sm absolute right-1.5 top-1/2 -translate-y-1/2">Search</button>
    </form>

    <!-- categories -->
    <nav v-if="cats.length" class="mt-5" aria-label="Categories" data-testid="category-chips">
      <ul class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        <li class="shrink-0"><NuxtLink :to="allLink" :class="[chip, !category ? chipOn : chipOff]">All toys</NuxtLink></li>
        <li v-for="c in cats" :key="c.slug" class="shrink-0"><NuxtLink :to="catLink(c.slug)" :class="[chip, category === c.slug && !sub ? chipOn : category === c.slug ? 'border-primary bg-primary-soft text-primary-dark' : chipOff]">{{ c.name }}</NuxtLink></li>
      </ul>
      <ul v-if="subs.length" class="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible" aria-label="Sub-categories">
        <li v-for="s in subs" :key="s.slug" class="shrink-0"><NuxtLink :to="subLink(activeCat as Category, s.slug)" class="inline-flex items-center rounded-full px-3.5 py-1 text-[12.5px] font-semibold transition-colors" :class="sub === s.slug ? 'bg-primary-soft text-primary-dark ring-1 ring-primary' : 'bg-white/70 text-ink/80 ring-1 ring-line hover:ring-primary'">{{ s.name }}</NuxtLink></li>
      </ul>
    </nav>

    <!-- toolbar: count, price, stock, sort -->
    <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-line/80 py-3">
      <p class="mr-auto text-sm text-muted" data-testid="result-count" aria-live="polite"><template v-if="status === 'pending'">Loading...</template><template v-else><strong class="text-ink">{{ total }}</strong> {{ total === 1 ? 'toy' : 'toys' }}<template v-if="q"> for "{{ q }}"</template></template></p>

      <div class="lg:hidden"><button type="button" class="btn btn-outline btn-sm" :aria-expanded="filtersOpen" aria-controls="filters" @click="filtersOpen = !filtersOpen"><SlidersHorizontal :size="14" /> Filters<span v-if="activeFilters" class="rounded-full bg-primary-btn px-1.5 text-[10px] text-primary-contrast">{{ activeFilters }}</span></button></div>

      <div id="filters" class="w-full flex-wrap items-center gap-x-5 gap-y-3 lg:flex lg:w-auto" :class="filtersOpen ? 'flex' : 'hidden'" aria-label="Filters" data-testid="filters">
        <form class="flex items-center gap-2" @submit.prevent="applyPrice">
          <span class="text-sm font-semibold">Price</span>
          <label class="sr-only" for="min-price">Lowest price</label><input id="min-price" v-model="minInput" type="number" min="0" inputmode="decimal" placeholder="Min" class="field-input !w-24 !px-3 !py-1.5 text-sm" data-testid="min-price">
          <span class="text-muted">–</span>
          <label class="sr-only" for="max-price">Highest price</label><input id="max-price" v-model="maxInput" type="number" min="0" inputmode="decimal" placeholder="Max" class="field-input !w-24 !px-3 !py-1.5 text-sm" data-testid="max-price">
          <button type="submit" class="btn btn-primary btn-sm shrink-0" data-testid="apply-price">Go</button>
        </form>
        <label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" class="h-4 w-4 accent-[var(--c-primary)]" :checked="inStock" data-testid="in-stock" @change="setQuery({ stock: ($event.target as HTMLInputElement).checked ? '1' : null })"> In stock only
        </label>
        <button v-if="activeFilters" type="button" class="inline-flex items-center gap-1 text-sm font-semibold text-primary-dark underline" @click="router.push({ query: { sort: route.query.sort, category: route.query.category, sub: route.query.sub, q: route.query.q } })"><X :size="13" /> Clear filters</button>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm font-semibold" for="sort">Sort</label>
        <select id="sort" class="field-select !w-auto !rounded-full !py-1.5 text-sm" :value="sort" data-testid="sort" @change="setQuery({ sort: ($event.target as HTMLSelectElement).value === 'popularity' ? null : ($event.target as HTMLSelectElement).value })">
          <option v-for="s in SORTS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
    </div>

    <div class="mt-6 min-w-0">
      <ErrorState v-if="error && !products.length" :message="apiFailure(error).message" @retry="refresh()" />
      <template v-else>
        <ProductGrid :products="products" :loading="status === 'pending' && !products.length" :skeletons="8" toggle :eager-count="4" />
        <div v-if="status !== 'pending' && !products.length" class="card px-6 py-14 text-center" data-testid="no-results">
          <p class="text-lg font-semibold">No toys found</p>
          <p class="mt-1 text-sm text-muted">Try fewer filters or another search.</p>
          <button v-if="activeFilters || q" type="button" class="btn btn-primary btn-md mt-5" @click="router.push({ query: {} })">Clear filters</button>
        </div>
        <div v-if="hasMore" class="mt-8 text-center">
          <button type="button" class="btn btn-outline btn-md" :disabled="loadingMore" data-testid="load-more" @click="loadMore">{{ loadingMore ? 'Loading...' : 'Load more toys' }}</button>
          <p v-if="moreError" class="mt-2 text-sm text-[#b4233c]" role="alert">{{ moreError }}</p>
        </div>
      </template>
    </div>
  </div>
</template>
