<script setup lang="ts">
import { SlidersHorizontal, X } from '@lucide/vue'
import type { Category, Paginated, ProductCard } from '~/types'

/**
 * The product listing of /shop and /category/...: category and sub-category filters (the sub-category level disappears when the store has none), sort, price range,
 * in-stock, search (?q=) and "Load more". Everything lives in the address (?sort=price_asc&min=10): a link can be shared, and the plain page (no query) is
 * prerendered from the API at build time. A category page fixes the category by its path.
 */
const props = defineProps<{ fixedCategory?: string; fixedSub?: string }>()
const route = useRoute()
const router = useRouter()
const { money } = useMoney()
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
const { data: categories } = await useAsyncData('categories', () => api<{ data: Category[] }>('/categories'))

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
const anySubs = computed(() => cats.value.some((c) => c.sub_categories.length))
const filtersOpen = ref(false)
const minInput = ref(min.value)
const maxInput = ref(max.value)
watch([min, max], () => { minInput.value = min.value; maxInput.value = max.value })

function setQuery(patch: Record<string, string | null>) {
  const query: Record<string, any> = { ...route.query }
  for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') delete query[k]; else query[k] = v }
  router.push({ query })
}
function applyPrice() {
  const lo = Number(minInput.value); const hi = Number(maxInput.value)
  setQuery({ min: minInput.value && lo >= 0 ? String(lo) : null, max: maxInput.value && hi >= 0 ? String(hi) : null })
}
const catLink = (slug: string) => (props.fixedCategory !== undefined ? `/category/${slug}` : { path: '/shop', query: { ...route.query, category: slug, sub: undefined } })
const subLink = (c: Category, s: string) => (props.fixedCategory !== undefined ? `/category/${c.slug}/${s}` : { path: '/shop', query: { ...route.query, category: c.slug, sub: s } })
const activeFilters = computed(() => Number(!!min.value || !!max.value) + Number(inStock.value) + Number(!!q.value))

defineExpose({ total })
</script>

<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted" data-testid="result-count" aria-live="polite"><template v-if="status === 'pending'">Loading...</template><template v-else>{{ total }} {{ total === 1 ? 'toy' : 'toys' }}<template v-if="q"> for "{{ q }}"</template></template></p>
      <div class="flex items-center gap-2">
        <button type="button" class="btn btn-outline btn-sm lg:hidden" :aria-expanded="filtersOpen" aria-controls="filters" @click="filtersOpen = !filtersOpen"><SlidersHorizontal :size="14" /> Filters<span v-if="activeFilters" class="rounded-full bg-primary px-1.5 text-[10px] text-primary-contrast">{{ activeFilters }}</span></button>
        <label class="sr-only" for="sort">Sort by</label>
        <select id="sort" class="field-select !w-auto !py-1.5 text-sm" :value="sort" data-testid="sort" @change="setQuery({ sort: ($event.target as HTMLSelectElement).value === 'popularity' ? null : ($event.target as HTMLSelectElement).value })">
          <option v-for="s in SORTS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
    </div>

    <div class="grid gap-7 lg:grid-cols-[230px_1fr]">
      <aside id="filters" class="space-y-6 lg:block" :class="filtersOpen ? 'block' : 'hidden'" aria-label="Filters" data-testid="filters">
        <div class="flex items-center justify-between lg:hidden"><h2 class="text-base font-semibold">Filters</h2><button type="button" class="grid h-8 w-8 place-items-center rounded-full hover:bg-primary-soft" aria-label="Close the filters" @click="filtersOpen = false"><X :size="16" /></button></div>

        <section v-if="cats.length">
          <h3 class="mb-2 text-sm font-semibold">Categories</h3>
          <ul class="space-y-0.5 text-sm">
            <li v-if="fixedCategory === undefined"><NuxtLink :to="{ path: '/shop', query: { ...route.query, category: undefined, sub: undefined } }" class="block rounded-lg px-2.5 py-1.5 hover:bg-primary-soft" :class="!category ? 'bg-primary-soft font-semibold text-primary-dark' : ''">All toys</NuxtLink></li>
            <li v-else><NuxtLink to="/shop" class="block rounded-lg px-2.5 py-1.5 hover:bg-primary-soft">All toys</NuxtLink></li>
            <li v-for="c in cats" :key="c.slug">
              <NuxtLink :to="catLink(c.slug)" class="block rounded-lg px-2.5 py-1.5 hover:bg-primary-soft" :class="category === c.slug && !sub ? 'bg-primary-soft font-semibold text-primary-dark' : ''">{{ c.name }}</NuxtLink>
              <ul v-if="anySubs && c.sub_categories.length && category === c.slug" class="ml-3 mt-0.5 space-y-0.5 border-l border-line pl-2">
                <li v-for="s in c.sub_categories" :key="s.slug"><NuxtLink :to="subLink(c, s.slug)" class="block rounded-lg px-2.5 py-1 text-[13px] hover:bg-primary-soft" :class="sub === s.slug ? 'bg-primary-soft font-semibold text-primary-dark' : 'text-ink/85'">{{ s.name }}</NuxtLink></li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="mb-2 text-sm font-semibold">Price</h3>
          <form class="flex items-center gap-2" @submit.prevent="applyPrice">
            <label class="sr-only" for="min-price">Lowest price</label><input id="min-price" v-model="minInput" type="number" min="0" inputmode="decimal" placeholder="Min" class="field-input !px-3 !py-2 text-sm" data-testid="min-price">
            <span class="text-muted">–</span>
            <label class="sr-only" for="max-price">Highest price</label><input id="max-price" v-model="maxInput" type="number" min="0" inputmode="decimal" placeholder="Max" class="field-input !px-3 !py-2 text-sm" data-testid="max-price">
            <button type="submit" class="btn btn-primary btn-sm shrink-0" data-testid="apply-price">Go</button>
          </form>
        </section>

        <label class="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" class="h-4 w-4 accent-[var(--c-primary)]" :checked="inStock" data-testid="in-stock" @change="setQuery({ stock: ($event.target as HTMLInputElement).checked ? '1' : null })"> In stock only
        </label>

        <button v-if="activeFilters" type="button" class="text-sm font-semibold text-primary-dark underline" @click="router.push({ query: { sort: route.query.sort, category: route.query.category, sub: route.query.sub } })">Clear filters</button>
      </aside>

      <div class="min-w-0">
        <ErrorState v-if="error && !products.length" :message="apiFailure(error).message" @retry="refresh()" />
        <template v-else>
          <ProductGrid :products="products" :loading="status === 'pending' && !products.length" :skeletons="8" toggle :eager-count="4" />
          <div v-if="status !== 'pending' && !products.length" class="card px-6 py-14 text-center" data-testid="no-results">
            <p class="text-lg font-semibold">No toys found</p>
            <p class="mt-1 text-sm text-muted">Try fewer filters or another search.</p>
            <button v-if="activeFilters" type="button" class="btn btn-primary btn-md mt-5" @click="router.push({ query: {} })">Clear filters</button>
          </div>
          <div v-if="hasMore" class="mt-8 text-center">
            <button type="button" class="btn btn-outline btn-md" :disabled="loadingMore" data-testid="load-more" @click="loadMore">{{ loadingMore ? 'Loading...' : 'Load more toys' }}</button>
            <p v-if="moreError" class="mt-2 text-sm text-[#b4233c]" role="alert">{{ moreError }}</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
