<script setup lang="ts">
import { ShoppingBag, X } from '@lucide/vue'

/** The cart as a slide-over (header icon, and after "Add to Cart"). Client-only: the cart does not exist in the generated HTML. */
const cart = useCart()
const { money } = useMoney()
const { isClosed } = useSettings()
const route = useRoute()
const panel = ref<HTMLElement | null>(null)

watch(() => cart.drawerOpen.value, async (open) => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = open ? 'hidden' : ''
  if (open) { cart.refresh(); await nextTick(); panel.value?.focus() }
})
watch(() => route.fullPath, () => { cart.drawerOpen.value = false })
onBeforeUnmount(() => { if (import.meta.client) document.documentElement.style.overflow = '' })

const close = () => { cart.drawerOpen.value = false }
const issue = computed(() => cart.cart.value?.issues?.[0]?.message || '')
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" leave-active-class="transition duration-150" leave-to-class="opacity-0">
        <div v-if="cart.drawerOpen.value" class="fixed inset-0 z-[70] bg-black/40" aria-hidden="true" @click="close" />
      </Transition>
      <Transition enter-active-class="transition duration-250 ease-out" enter-from-class="translate-x-full" leave-active-class="transition duration-200 ease-in" leave-to-class="translate-x-full">
        <aside
          v-if="cart.drawerOpen.value" ref="panel" class="fixed inset-y-0 right-0 z-[75] flex w-full max-w-[420px] flex-col bg-white shadow-2xl outline-none" role="dialog" aria-modal="true" aria-label="Your cart" tabindex="-1"
          data-testid="cart-drawer" @keydown.esc="close"
        >
          <header class="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 class="flex items-center gap-2 text-lg font-semibold"><ShoppingBag :size="20" class="text-primary" /> Your cart <span class="text-sm font-medium text-muted">({{ cart.count.value }})</span></h2>
            <button type="button" class="grid h-9 w-9 place-items-center rounded-full hover:bg-primary-soft" aria-label="Close the cart" data-testid="cart-close" @click="close"><X :size="20" /></button>
          </header>

          <div class="flex-1 overflow-y-auto px-5">
            <div v-if="cart.loading.value && !cart.cart.value" class="space-y-4 py-6"><div v-for="n in 3" :key="n" class="skeleton h-20 w-full" /></div>
            <p v-else-if="cart.loadError.value" class="py-8 text-center text-sm text-[#b4233c]" role="alert">{{ cart.loadError.value }} <button type="button" class="font-semibold underline" @click="cart.refresh()">Try again</button></p>
            <div v-else-if="!cart.lines.value.length" class="grid place-items-center py-16 text-center">
              <ShoppingBag :size="44" class="text-primary/40" :stroke-width="1.3" />
              <p class="mt-3 font-semibold">Your cart is empty</p>
              <p class="mt-1 text-sm text-muted">Find a toy your little one will love.</p>
              <NuxtLink to="/shop" class="btn btn-primary btn-md mt-5" @click="close">Start shopping</NuxtLink>
            </div>
            <CartLines v-else compact />
          </div>

          <footer v-if="cart.cart.value && cart.lines.value.length" class="border-t border-line bg-white px-5 py-4">
            <div class="flex items-baseline justify-between"><span class="text-sm text-muted">Subtotal</span><span class="text-xl font-bold" data-testid="drawer-subtotal">{{ money(cart.cart.value.summary.subtotal + cart.cart.value.summary.coupon_discount) }}</span></div>
            <p class="mt-1 text-xs text-muted">Delivery and any coupon are worked out at checkout.</p>
            <p v-if="!cart.cart.value.can_checkout && issue" class="mt-2 rounded-lg bg-[#fff4d6] px-3 py-2 text-xs text-[#7a5200]" role="alert">{{ issue }}</p>
            <p v-if="isClosed" class="mt-2 rounded-lg bg-[#fff4d6] px-3 py-2 text-xs text-[#7a5200]">The shop is closed right now, so orders are paused.</p>
            <div class="mt-3 grid gap-2">
              <NuxtLink to="/checkout" class="btn btn-primary btn-lg w-full" :class="{ 'pointer-events-none opacity-50': !cart.cart.value.can_checkout || isClosed }" data-testid="drawer-checkout" @click="close">Checkout</NuxtLink>
              <NuxtLink to="/cart" class="btn btn-outline btn-md w-full" data-testid="drawer-view-cart" @click="close">View cart</NuxtLink>
            </div>
          </footer>
        </aside>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>
