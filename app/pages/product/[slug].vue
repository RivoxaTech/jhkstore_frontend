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
const { settings, isClosed, storeName } = useSettings()
const cart = useCart()
const toast = useToast()
const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/$/, '')

const { data, error, status, refresh, refreshIfStale } = await useFastData(`product:${slug}`, () => api<{ data: Product }>(`/products/${slug}`).then((r) => r.data))
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
onMounted(() => { refreshIfStale() })   // live price, stock and delivery date (not again within a minute)

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
  if (!buyNow) {
    // instant: the cart opens at once, the server call finishes in the background (a failure is shown under the buttons)
    cart.drawerOpen.value = true
    cart.add(variant.value.id, qty.value).then((r) => {
      if (r.ok) toast.success('Added to cart'); else { addError.value = r.message || 'Could not add this toy to the cart'; cart.drawerOpen.value = false }
    }).finally(() => { adding.value = false })
    return
  }
  const r = await cart.add(variant.value.id, qty.value)
  adding.value = false
  if (!r.ok) { addError.value = r.message || 'Could not add this toy to the cart'; return }
  return navigateTo('/checkout')
}

// ---- SEO
useSeo(() => {
  const p = product.value
  const currency = currencyCode(settings.value)   // the store may use a short code like "Rs": search engines only know ISO codes, so none is said then
  const prices = (p?.variants ?? []).map((v) => v.price)
  const crumbs = [{ name: 'Home', path: '/' }, ...(p?.breadcrumbs ?? []).map((b) => ({ name: b.name, path: b.type === 'category' ? `/category/${b.slug}` : b.type === 'sub_category' ? `/category/${b.category_slug}/${b.slug}` : `/product/${b.slug}` }))]
  return {
    title: p?.seo.title || p?.name || 'Toy',
    description: p?.seo.description,
    path: `/product/${slug}`,
    image: p?.seo.image_url,
    imageAlt: p?.name,
    type: 'product',
    // the price and stock for Facebook, Pinterest and WhatsApp previews
    meta: p && currency && prices.length ? [
      { property: 'product:price:amount', content: String(Math.min(...prices)) },
      { property: 'product:price:currency', content: currency },
      { property: 'product:availability', content: p.availability === 'in_stock' ? 'in stock' : 'out of stock' },
    ] : [],
    jsonLd: p ? [productLd(p, settings.value, siteUrl, storeName.value, slug), breadcrumbLd(crumbs)] : [],
  }
})

const crumbs = computed(() => [{ name: 'Home', path: '/' }, ...(product.value?.breadcrumbs ?? []).map((b) => ({ name: b.name, path: b.type === 'category' ? `/category/${b.slug}` : b.type === 'sub_category' ? `/category/${b.category_slug}/${b.slug}` : undefined }))])
</script>

<template>
  <div class="page-wash">
    <div class="container-page pb-12 pt-6 sm:pt-8 lg:pb-16">
      <ErrorState v-if="error && !product" :message="apiFailure(error).message" @retry="refresh()" />
      <div v-else-if="!product && status === 'pending'" class="grid gap-8 lg:grid-cols-2"><div class="skeleton aspect-square" /><div class="space-y-4"><div class="skeleton h-9 w-3/4" /><div class="skeleton h-5 w-full" /><div class="skeleton h-10 w-1/3" /><div class="skeleton h-12 w-full" /></div></div>

      <template v-else-if="product">
        <Breadcrumbs :items="crumbs" />

        <!-- the picture and the details side by side, the same height: the gallery on the left, one panel with everything to decide on the right -->
        <div class="mt-5 grid items-stretch gap-6 lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:gap-9 xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]" data-testid="product-top">
          <ProductGallery :images="gallery" :videos="product.videos" :name="product.name" />

          <section class="card flex flex-col p-5 sm:p-7" aria-label="Product details" data-testid="product-info">
            <div class="flex flex-wrap items-center gap-2 text-[12.5px]">
              <NuxtLink v-if="product.category" :to="`/category/${product.category.slug}`" class="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary-dark hover:bg-primary-tint">{{ product.category.name }}</NuxtLink>
              <span v-if="product.badge_text" class="tag-hot rounded-full px-2.5 py-1 font-bold tracking-wide">{{ product.badge_text }}</span>
              <span v-if="!soldOut" class="ml-auto inline-flex items-center gap-1.5 font-semibold" :class="variant?.low_stock ? 'text-[#b9650a]' : 'text-[#157a3d]'"><span class="h-2 w-2 rounded-full bg-current" aria-hidden="true" />{{ variant?.low_stock ? `Only ${variant.qty} left` : 'In stock' }}</span>
            </div>

            <h1 class="mt-3 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold leading-tight" data-testid="product-name">{{ product.name }}</h1>
            <p v-if="product.short_description" class="mt-2 text-[15px] leading-relaxed text-ink/75" data-testid="product-short">{{ product.short_description }}</p>

            <div class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-y border-line py-4" data-testid="price-block">
              <span v-if="variant?.compare_price && variant.compare_price > variant.price" class="text-lg text-muted line-through" data-testid="compare-price">{{ money(variant.compare_price) }}</span>
              <span class="text-[2rem] font-bold leading-none" data-testid="price">{{ money(variant?.price ?? product.price) }}</span>
              <span v-if="discountLabel && !soldOut" class="rounded-full bg-accent-btn px-2.5 py-0.5 text-xs font-bold text-white">{{ discountLabel }}</span>
            </div>

            <fieldset v-if="multi" class="mt-5">
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

            <p v-if="soldOut" class="mt-5 rounded-xl bg-[#fde8ec] px-4 py-2.5 text-sm font-semibold text-[#b4233c]" data-testid="sold-out">Sold out. Please check back soon.</p>
            <p v-if="variant?.low_stock && !soldOut" class="sr-only" data-testid="low-stock">Hurry: only {{ variant.qty }} left!</p>

            <div v-if="tiers.length && !soldOut" class="mt-5 rounded-2xl bg-primary-soft px-4 py-3 text-sm" data-testid="bulk-tiers">
              <p class="font-semibold text-primary-dark">Buy more, pay less</p>
              <ul class="mt-1 space-y-0.5 text-ink/85">
                <li v-for="t in tiers" :key="t.min_qty" :class="qty >= t.min_qty ? 'font-semibold text-primary-dark' : ''"><Check v-if="qty >= t.min_qty" :size="13" class="mr-1 inline" />Buy {{ t.min_qty }}+ for {{ money(t.price) }} each <span class="text-muted">(save {{ Math.round(t.extra_discount_percent) }}%)</span></li>
              </ul>
              <p v-if="nextTier" class="mt-1.5 text-xs text-primary-dark">Add {{ nextTier.min_qty - qty }} more to pay {{ money(nextTier.price) }} each.</p>
            </div>

            <!-- the quantity on its own row, then Add to Cart and Buy Now side by side (the same on a phone and on a desktop) -->
            <div v-if="!soldOut" class="mt-6 flex items-center gap-3">
              <QuantityStepper v-model="qty" :min="minQty" :max="maxQty" :label="`Quantity of ${product.name}`" />
              <span v-if="minQty > 1" class="text-xs text-muted">Minimum {{ minQty }}</span>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <button type="button" class="btn btn-primary btn-lg !px-3 sm:!px-6" :disabled="soldOut || adding || isClosed" data-testid="add-to-cart" @click="add(false)"><ShoppingCart :size="18" class="shrink-0" /> <span class="truncate">{{ adding ? 'Adding...' : 'Add to Cart' }}</span></button>
              <button type="button" class="btn btn-outline btn-lg !px-3 sm:!px-6" :disabled="soldOut || adding || isClosed" data-testid="buy-now" @click="add(true)"><Zap :size="18" class="shrink-0" /> <span class="truncate">Buy Now</span></button>
            </div>
            <p v-if="addError" class="mt-3 text-sm text-[#b4233c]" role="alert" data-testid="add-error">{{ addError }}</p>
            <p v-if="isClosed" class="mt-3 rounded-xl bg-[#fff4d6] px-4 py-2.5 text-sm text-[#7a5200]">The shop is closed right now, so orders are paused.</p>

            <!-- delivery and reference: pushed to the bottom so the panel is as tall as the pictures -->
            <ul class="mt-auto space-y-2.5 pt-6 text-sm text-ink/85">
              <li v-if="arrives && !soldOut" class="flex items-center gap-2.5 rounded-xl bg-primary-soft/70 px-3.5 py-2.5" data-testid="delivery-estimate"><Truck :size="18" class="shrink-0 text-primary" /><span>Arrives by <strong>{{ arrives }}</strong> <span class="text-muted">(estimate)</span></span></li>
              <li v-if="product.sku && variant" class="px-1 text-xs text-muted">SKU: {{ variant.sku || product.sku }}</li>
            </ul>

          </section>
        </div>

        <div class="mt-12"><ContentTabs :tabs="product.content_tabs" :fallback="product.description" /></div>

        <section v-if="product.related.length" class="mt-16" aria-labelledby="related-title" data-testid="related">
          <h2 id="related-title" class="mb-5 text-2xl font-semibold">You may also like</h2>
          <ProductGrid :products="product.related.slice(0, 4)" />
        </section>

      </template>
    </div>
  </div>
</template>
