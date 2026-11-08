<script setup lang="ts">
import { Check, ShoppingCart, Truck, Zap } from '@lucide/vue'
import type { Product } from '~/types'

/**
 * Product page. Build time: name, description, price, pictures, options, tabs, related products and the SEO data (title, description, canonical, Open Graph,
 * Product and BreadcrumbList JSON-LD) are baked into the HTML. In the browser the product is read again, so price, stock and the delivery date are current.
 * A product created after the last build has no HTML file: the same page then loads it from the API.
 */
const route = useRoute()
const slug = String(route.params.slug)
const { money } = useMoney()
const { settings, isClosed } = useSettings()
const cart = useCart()
const toast = useToast()
const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/$/, '')

const { data, error, status, refresh } = await useAsyncData(`product:${slug}`, () => api<{ data: Product }>(`/products/${slug}`).then((r) => r.data))
if (!data.value && error.value && apiFailure(error.value).status === 404) throw createError({ statusCode: 404, statusMessage: 'Product not found', fatal: true })

const product = computed(() => data.value)
const variantId = ref<number | null>(null)
const qty = ref(1)

function pickDefault() {
  const p = product.value
  if (!p) return
  if (!p.variants.some((v) => v.id === variantId.value)) {
    variantId.value = (p.variants.find((v) => v.is_default && v.in_stock) ?? p.variants.find((v) => v.in_stock) ?? p.variants[0])?.id ?? null
  }
  qty.value = Math.max(qty.value, p.min_order_qty || 1)
}
pickDefault()
watch(product, pickDefault)
onMounted(() => { refresh() })   // live price, stock and delivery date

const variant = computed(() => product.value?.variants.find((v) => v.id === variantId.value) ?? null)
const multi = computed(() => (product.value?.variants.length ?? 0) > 1)
const maxQty = computed(() => Math.max(1, Math.min(product.value?.max_order_qty ?? 99, variant.value?.qty ?? 99)))
const minQty = computed(() => Math.min(product.value?.min_order_qty || 1, maxQty.value))
watch(variant, () => { qty.value = Math.min(Math.max(qty.value, minQty.value), maxQty.value) })

const soldOut = computed(() => !variant.value || !variant.value.in_stock || (product.value?.is_sold_out ?? false))
const discountLabel = computed(() => variant.value?.discount_label || (variant.value && variant.value.compare_price && variant.value.compare_price > variant.value.price ? `${percentOff(variant.value.price, variant.value.compare_price)}% off` : ''))

// the pictures: the option's own first, then the product's
const gallery = computed(() => {
  const own = variant.value?.images ?? []
  const all = [...own, ...(product.value?.images ?? [])]
  return all.filter((p, i) => all.findIndex((x) => x.url === p.url) === i)
})

// bulk prices: the tiers, and a hint for the next one
const tiers = computed(() => variant.value?.price_tiers ?? [])
const nextTier = computed(() => tiers.value.find((t) => t.min_qty > qty.value))
const arrives = computed(() => {
  const d = product.value?.delivery.arrives_by
  return d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
})

const adding = ref(false)
const addError = ref('')
async function add(buyNow = false) {
  if (!variant.value || soldOut.value) return
  adding.value = true
  addError.value = ''
  const r = await cart.add(variant.value.id, qty.value)
  adding.value = false
  if (!r.ok) { addError.value = r.message || 'Could not add this toy to the cart'; return }
  if (buyNow) return navigateTo('/checkout')
  toast.success('Added to cart')
  cart.drawerOpen.value = true
}

// ---- SEO
const availability = computed(() => (product.value?.availability === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'))
useSeo(() => {
  const p = product.value
  const currency = settings.value?.currency.code
  const prices = (p?.variants ?? []).map((v) => v.price)
  const offer = !p ? undefined : prices.length > 1
    ? { '@type': 'AggregateOffer', priceCurrency: currency, lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability: availability.value, url: `${siteUrl}/product/${slug}` }
    : { '@type': 'Offer', priceCurrency: currency, price: prices[0], availability: availability.value, url: `${siteUrl}/product/${slug}`, itemCondition: 'https://schema.org/NewCondition' }
  const crumbs = [{ name: 'Home', path: '/' }, ...(p?.breadcrumbs ?? []).map((b) => ({ name: b.name, path: b.type === 'category' ? `/category/${b.slug}` : b.type === 'sub_category' ? `/category/${b.category_slug}/${b.slug}` : `/product/${b.slug}` }))]
  return {
    title: p?.seo.title || p?.name || 'Toy',
    description: p?.seo.description,
    path: `/product/${slug}`,
    image: p?.seo.image_url,
    type: 'product',
    jsonLd: p ? [
      { '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: (p.images.length ? p.images.map((i) => i.url) : [p.image_url]).filter(Boolean), description: p.seo.description || p.short_description || undefined, sku: p.sku, category: p.category.name, offers: offer },
      breadcrumbLd(crumbs),
    ] : [],
  }
})

const crumbs = computed(() => [{ name: 'Home', path: '/' }, ...(product.value?.breadcrumbs ?? []).map((b) => ({ name: b.name, path: b.type === 'category' ? `/category/${b.slug}` : b.type === 'sub_category' ? `/category/${b.category_slug}/${b.slug}` : undefined }))])
</script>

<template>
  <div class="page-wash">
    <div class="container-page pb-28 pt-6 sm:pt-8 lg:pb-16">
      <ErrorState v-if="error && !product" :message="apiFailure(error).message" @retry="refresh()" />
      <div v-else-if="!product && status === 'pending'" class="grid gap-8 lg:grid-cols-2"><div class="skeleton aspect-square" /><div class="space-y-4"><div class="skeleton h-9 w-3/4" /><div class="skeleton h-5 w-full" /><div class="skeleton h-10 w-1/3" /><div class="skeleton h-12 w-full" /></div></div>

      <template v-else-if="product">
        <Breadcrumbs :items="crumbs" />

        <div class="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
          <ProductGallery :images="gallery" :videos="product.videos" :name="product.name" />

          <div>
            <h1 class="text-[clamp(1.6rem,3vw,2.3rem)] font-semibold leading-tight" data-testid="product-name">{{ product.name }}</h1>
            <p v-if="product.short_description" class="mt-2 text-[15px] text-ink/80">{{ product.short_description }}</p>

            <div class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1" data-testid="price-block">
              <span class="text-3xl font-bold" data-testid="price">{{ money(variant?.price ?? product.price) }}</span>
              <span v-if="variant?.compare_price && variant.compare_price > variant.price" class="text-lg text-muted line-through">{{ money(variant.compare_price) }}</span>
              <span v-if="discountLabel && !soldOut" class="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">{{ discountLabel }}</span>
            </div>

            <fieldset v-if="multi" class="mt-6">
              <legend class="mb-2 text-sm font-semibold">Choose an option</legend>
              <div class="flex flex-wrap gap-2" role="radiogroup" data-testid="variants">
                <label v-for="v in product.variants" :key="v.id" class="cursor-pointer">
                  <input v-model="variantId" type="radio" name="variant" :value="v.id" class="peer sr-only" :disabled="false">
                  <span class="block rounded-2xl border-[1.5px] px-4 py-2 text-sm transition peer-checked:border-primary peer-checked:bg-primary-soft peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary" :class="v.in_stock ? 'border-line bg-white hover:border-primary/50' : 'border-line bg-white/60 text-muted'">
                    <span class="block font-semibold">{{ v.name.replace(`${product.name} - `, '') }}</span>
                    <span class="block text-xs" :class="v.in_stock ? 'text-muted' : 'text-[#b4233c]'">{{ money(v.price) }}<template v-if="!v.in_stock"> · Sold out</template><template v-else-if="v.low_stock"> · Only {{ v.qty }} left</template></span>
                  </span>
                </label>
              </div>
            </fieldset>

            <p v-if="variant?.low_stock && !soldOut" class="mt-4 text-sm font-semibold text-[#b9650a]" data-testid="low-stock">Hurry: only {{ variant.qty }} left!</p>
            <p v-if="soldOut" class="mt-4 rounded-xl bg-[#fde8ec] px-4 py-2.5 text-sm font-semibold text-[#b4233c]" data-testid="sold-out">Sold out. Please check back soon.</p>

            <div v-if="tiers.length && !soldOut" class="mt-5 rounded-2xl bg-primary-soft px-4 py-3 text-sm" data-testid="bulk-tiers">
              <p class="font-semibold text-primary-dark">Buy more, pay less</p>
              <ul class="mt-1 space-y-0.5 text-ink/85">
                <li v-for="t in tiers" :key="t.min_qty" :class="qty >= t.min_qty ? 'font-semibold text-primary-dark' : ''"><Check v-if="qty >= t.min_qty" :size="13" class="mr-1 inline" />Buy {{ t.min_qty }}+ for {{ money(t.price) }} each <span class="text-muted">(save {{ Math.round(t.extra_discount_percent) }}%)</span></li>
              </ul>
              <p v-if="nextTier" class="mt-1.5 text-xs text-primary-dark">Add {{ nextTier.min_qty - qty }} more to pay {{ money(nextTier.price) }} each.</p>
            </div>

            <div v-if="!soldOut" class="mt-6 flex flex-wrap items-center gap-3">
              <QuantityStepper v-model="qty" :min="minQty" :max="maxQty" :label="`Quantity of ${product.name}`" />
              <span v-if="minQty > 1" class="text-xs text-muted">Minimum {{ minQty }}</span>
            </div>

            <div class="mt-5 hidden gap-3 sm:flex">
              <button type="button" class="btn btn-primary btn-lg flex-1" :disabled="soldOut || adding || isClosed" data-testid="add-to-cart" @click="add(false)"><ShoppingCart :size="18" /> {{ adding ? 'Adding...' : 'Add to Cart' }}</button>
              <button type="button" class="btn btn-outline btn-lg flex-1" :disabled="soldOut || adding || isClosed" data-testid="buy-now" @click="add(true)"><Zap :size="18" /> Buy Now</button>
            </div>
            <p v-if="addError" class="mt-3 text-sm text-[#b4233c]" role="alert" data-testid="add-error">{{ addError }}</p>
            <p v-if="isClosed" class="mt-3 rounded-xl bg-[#fff4d6] px-4 py-2.5 text-sm text-[#7a5200]">The shop is closed right now, so orders are paused.</p>

            <p v-if="arrives && !soldOut" class="mt-5 flex items-center gap-2 text-sm text-ink/85" data-testid="delivery-estimate"><Truck :size="18" class="text-primary" /> Arrives by <strong>{{ arrives }}</strong> <span class="text-muted">(estimate)</span></p>
            <p v-if="product.sku && variant" class="mt-2 text-xs text-muted">SKU: {{ variant.sku || product.sku }}</p>
          </div>
        </div>

        <div class="mt-12"><ContentTabs :tabs="product.content_tabs" :fallback="product.description" /></div>

        <section v-if="product.related.length" class="mt-16" aria-labelledby="related-title" data-testid="related">
          <h2 id="related-title" class="mb-5 text-2xl font-semibold">You may also like</h2>
          <ProductGrid :products="product.related.slice(0, 4)" />
        </section>

        <!-- phone: the Add to Cart bar stays in reach -->
        <div v-if="!soldOut" class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:hidden" data-testid="sticky-atc">
          <div class="flex items-center gap-3">
            <div class="min-w-0"><p class="text-lg font-bold leading-none">{{ money(variant?.price ?? product.price) }}</p><p class="mt-0.5 text-[11px] text-muted">Qty {{ qty }}</p></div>
            <button type="button" class="btn btn-primary btn-md flex-1" :disabled="adding || isClosed" data-testid="sticky-add" @click="add(false)"><ShoppingCart :size="17" /> Add to Cart</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
