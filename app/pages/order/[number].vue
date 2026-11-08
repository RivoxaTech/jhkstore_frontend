<script setup lang="ts">
import type { Order } from '~/types'

/**
 * The page after an order. Right after ordering it shows the order from this visit's memory (with the bank accounts and the screenshot upload for a bank
 * transfer). Opened any other way (a reload in a new tab, another device) it asks for the phone number like the tracking page. Client only, not indexed.
 */
const route = useRoute()
const number = String(route.params.number).toUpperCase()
const memory = useOrderMemory()
useSeo({ title: `Order ${number}`, path: `/order/${number}`, noindex: true })

const state = ref<{ order: Order; phone: string } | null>(null)
const fresh = ref(false)
const refreshing = ref(false)
onMounted(async () => {
  const known = memory.recall(number)
  if (!known) return
  state.value = known
  fresh.value = true
  // the shop may have answered since: read the order again (silently)
  refreshing.value = true
  try { state.value = { ...known, order: (await api<{ data: Order }>(`/orders/${encodeURIComponent(number)}`, { query: { phone: known.phone } })).data } } catch { /* keep what we have */ } finally { refreshing.value = false }
})

function onFound(p: { order: Order; phone: string }) { state.value = p; memory.remember(p.order, p.phone) }
function onUpdated(order: Order) { if (state.value) { state.value = { ...state.value, order }; memory.update(order) } }
</script>

<template>
  <div class="page-wash">
    <div class="container-page pb-10 pt-6 sm:pt-10">
      <OrderView v-if="state" :order="state.order" :phone="state.phone" :fresh="fresh" @updated="onUpdated" />
      <div v-else>
        <h1 class="mb-2 text-center text-3xl font-semibold">Your order {{ number }}</h1>
        <p class="mx-auto mb-8 max-w-md text-center text-muted">For your privacy, please enter the phone number you used to see this order.</p>
        <TrackForm :initial-number="number" @found="onFound" />
      </div>
      <div class="mt-8 text-center"><NuxtLink to="/shop" class="btn btn-outline btn-md">Continue shopping</NuxtLink></div>
    </div>
  </div>
</template>
