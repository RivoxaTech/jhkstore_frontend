<script setup lang="ts">
import { ShoppingCart, LoaderCircle } from '@lucide/vue'
import type { ProductCard } from '~/types'

/**
 * One product in a list. A fixed-ratio picture with its real width / height (no layout shift), the name, a two-line description (no star ratings),
 * the price (what one unit costs now; the old price struck through and a label when there is a discount) and the "Add to Cart" pill.
 * A product with one option is added straight away; a product with several options opens its page to choose.
 */
const props = defineProps<{ product: ProductCard; eager?: boolean }>()
const { money } = useMoney()
const cart = useCart()
const toast = useToast()
const { isClosed } = useSettings()
const adding = ref(false)

const href = computed(() => `/product/${props.product.slug}`)
const soldOut = computed(() => props.product.is_sold_out || !props.product.in_stock)
const discount = computed(() => props.product.discount_label || (percentOff(props.product.price, props.product.compare_price) ? `${percentOff(props.product.price, props.product.compare_price)}% off` : ''))
// the corner badge: the shop's own badge text, or "N Offers" (bulk prices); "1 Option" / "N Options" is not worth a badge
const corner = computed(() => props.product.badge_text || (/offer/i.test(props.product.badge_label || '') ? props.product.badge_label : ''))
const multi = computed(() => !props.product.has_single_option || !props.product.variant_id)

async function addToCart() {
  if (multi.value) return navigateTo(href.value)
  adding.value = true
  const r = await cart.add(props.product.variant_id as number, props.product.min_order_qty || 1)
  adding.value = false
  if (r.ok) { toast.success('Added to cart'); cart.drawerOpen.value = true } else toast.error(r.message || 'Could not add this toy')
}
</script>

<template>
  <article class="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-xl" :data-testid="`product-card`" :data-slug="product.slug">
    <NuxtLink :to="href" class="relative block aspect-[5/4] overflow-hidden bg-primary-soft" :aria-label="product.name" tabindex="-1">
      <img
        v-if="product.image_url" :src="product.image_url" :alt="product.name" :width="product.image_width || 512" :height="product.image_height || 512"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" :loading="eager ? 'eager' : 'lazy'" :fetchpriority="eager ? 'high' : undefined" decoding="async"
      >
      <span v-else class="grid h-full w-full place-items-center text-sm text-muted">No picture</span>
      <span v-if="discount && !soldOut" class="absolute left-2.5 top-2.5 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-white">{{ discount }}</span>
      <span v-if="corner" class="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-primary-dark shadow-sm">{{ corner }}</span>
      <span v-if="soldOut" class="absolute inset-0 grid place-items-center bg-white/60 text-sm font-bold tracking-wide text-ink">SOLD OUT</span>
    </NuxtLink>

    <div class="flex flex-1 flex-col p-3 sm:p-3.5">
      <h3 class="text-[13.5px] font-semibold leading-snug"><NuxtLink :to="href" class="hover:text-primary-dark">{{ product.name }}</NuxtLink></h3>
      <p class="clamp-2 mt-1 min-h-[2.4em] text-[12px] leading-[1.2rem] text-muted">{{ product.short_description }}</p>

      <div class="mt-2 flex items-baseline gap-2">
        <span class="text-[15px] font-bold">{{ product.show_starting_at ? 'From ' : '' }}{{ money(product.price) }}</span>
        <span v-if="product.compare_price && product.compare_price > (product.price ?? 0)" class="text-[12px] text-muted line-through">{{ money(product.compare_price) }}</span>
      </div>

      <div class="mt-auto flex justify-end pt-2.5">
        <button
          type="button" class="btn btn-primary btn-sm !h-[30px] !px-3 text-[11.5px]" :disabled="soldOut || adding || (isClosed && !multi)" data-testid="add-to-cart"
          :aria-label="soldOut ? `${product.name}: sold out` : multi ? `Choose an option for ${product.name}` : `Add ${product.name} to the cart`" @click="addToCart"
        >
          <LoaderCircle v-if="adding" :size="14" class="animate-spin" /><ShoppingCart v-else :size="14" />
          {{ soldOut ? 'Sold out' : multi ? 'Choose option' : 'Add to Cart' }}
        </button>
      </div>
    </div>
  </article>
</template>
