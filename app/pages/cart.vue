<script setup lang="ts">
import { ShoppingBag, TriangleAlert, X } from '@lucide/vue'

/** The cart page (client only, not indexed). Everything shown is the server's answer: lines, bulk prices, warnings, coupon, totals. */
const cart = useCart()
const toast = useToast()
const { money } = useMoney()
const { isClosed } = useSettings()
useSeo({ title: 'Your cart', path: '/cart', noindex: true })

const code = ref('')
const couponMessage = ref('')
onMounted(() => { cart.refresh() })

async function apply() {
  couponMessage.value = ''
  if (!code.value.trim()) return
  const r = await cart.applyCoupon(code.value.trim())
  if (r.ok) { toast.success('Coupon applied'); code.value = '' } else couponMessage.value = r.message || 'This coupon cannot be used'
}
async function dropCoupon() { await cart.removeCoupon() }

const summary = computed(() => cart.cart.value?.summary)
const minOrder = computed(() => (summary.value && summary.value.min_order_amount > 0 && summary.value.subtotal + summary.value.coupon_discount < summary.value.min_order_amount ? summary.value.min_order_amount : 0))
const blocking = computed(() => cart.cart.value?.issues ?? [])
const canCheckout = computed(() => !!cart.cart.value?.can_checkout && !isClosed.value && cart.lines.value.length > 0)
</script>

<template>
  <div class="page-wash">
    <div class="container-page pb-10 pt-6 sm:pt-8">
      <h1 class="mx-auto mb-6 max-w-[1100px] text-3xl font-semibold sm:text-4xl">Your cart</h1>

      <div v-if="cart.loading.value && !cart.cart.value" class="grid gap-6 lg:grid-cols-[1fr_360px]"><div class="space-y-4"><div v-for="n in 3" :key="n" class="skeleton h-28" /></div><div class="skeleton h-64" /></div>
      <ErrorState v-else-if="cart.loadError.value && !cart.cart.value" :message="cart.loadError.value" @retry="cart.refresh()" />

      <div v-else-if="!cart.lines.value.length" class="card mx-auto grid max-w-lg place-items-center px-6 py-16 text-center" data-testid="cart-empty">
        <ShoppingBag :size="52" class="text-primary/40" :stroke-width="1.2" />
        <p class="mt-4 text-xl font-semibold">Your cart is empty</p>
        <p class="mt-1 text-muted">Find a toy your little one will love.</p>
        <NuxtLink to="/shop" class="btn btn-primary btn-lg mt-6">Start shopping</NuxtLink>
      </div>

      <div v-else class="mx-auto grid max-w-[1100px] grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_370px]">
        <section class="card px-4 sm:px-6" aria-label="Items in your cart"><CartLines /></section>

        <aside class="card space-y-5 p-5 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 class="text-lg font-semibold">Order summary</h2>

          <div v-if="summary">
            <form v-if="!summary.coupon_code" class="flex gap-2" @submit.prevent="apply">
              <label class="sr-only" for="coupon">Coupon code</label>
              <input id="coupon" v-model="code" class="field-input !py-1.5 !text-sm uppercase" placeholder="Coupon code" autocomplete="off" data-testid="coupon-input">
              <button type="submit" class="btn btn-outline btn-sm !h-9 shrink-0" :disabled="cart.busy.value || !code.trim()" data-testid="coupon-apply">Apply</button>
            </form>
            <p v-else class="flex items-center justify-between rounded-xl bg-primary-soft px-3 py-2 text-sm"><span>Coupon <strong>{{ summary.coupon_code }}</strong> applied</span><button type="button" class="grid h-6 w-6 place-items-center rounded-full hover:bg-white" aria-label="Remove the coupon" @click="dropCoupon"><X :size="14" /></button></p>
            <p v-if="couponMessage" class="mt-2 text-sm text-[#b4233c]" role="alert" data-testid="coupon-error">{{ couponMessage }}</p>
            <p v-else-if="summary.coupon_error" class="mt-2 text-sm text-[#b4233c]" role="alert">{{ summary.coupon_error.message }}</p>
          </div>

          <CartTotals v-if="summary" :summary="summary" />

          <p v-if="minOrder" class="flex gap-2 rounded-xl bg-[#fff4d6] px-3 py-2.5 text-sm text-[#7a5200]" role="alert" data-testid="min-order"><TriangleAlert :size="16" class="mt-0.5 shrink-0" /> The minimum order is {{ money(minOrder) }}. Add a little more to check out.</p>
          <ul v-else-if="blocking.length" class="space-y-1 rounded-xl bg-[#fff4d6] px-3 py-2.5 text-sm text-[#7a5200]" role="alert"><li v-for="i in blocking" :key="i.code">{{ i.message }}</li></ul>
          <p v-if="isClosed" class="rounded-xl bg-[#fff4d6] px-3 py-2.5 text-sm text-[#7a5200]">The shop is closed right now, so orders are paused.</p>

          <NuxtLink to="/checkout" class="btn btn-primary btn-lg w-full" :class="{ 'pointer-events-none opacity-50': !canCheckout }" :aria-disabled="!canCheckout" data-testid="checkout-button">Checkout</NuxtLink>
          <NuxtLink to="/shop" class="block text-center text-sm font-semibold text-primary-dark hover:underline">Continue shopping</NuxtLink>
        </aside>
      </div>
    </div>
  </div>
</template>
