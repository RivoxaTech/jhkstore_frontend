<script setup lang="ts">
import type { Order } from '~/types'

/** Track an order: order number + phone (the e-mail links open this page with ?order=NUMBER; the phone is always asked). Client only, not indexed. */
const route = useRoute()
const memory = useOrderMemory()
useSeo({ title: 'Track your order', path: '/track', noindex: true })

const found = ref<{ order: Order; phone: string } | null>(null)
const initial = ref(typeof route.query.order === 'string' ? route.query.order : '')
onMounted(() => { if (!initial.value) initial.value = memory.lastNumber() })

function onFound(p: { order: Order; phone: string }) { found.value = p; memory.remember(p.order, p.phone) }
function onUpdated(order: Order) { if (found.value) { found.value = { ...found.value, order }; memory.update(order) } }
</script>

<template>
  <div class="page-wash">
    <PageHeader title="Track your order" subtitle="Enter your order number and the phone number you used when you ordered." :crumbs="[{ name: 'Home', path: '/' }, { name: 'Track your order' }]" />
    <div class="container-page pb-10 pt-8">
      <TrackForm v-if="!found" :initial-number="initial" @found="onFound" />
      <div v-else>
        <div class="mb-5 text-center"><button type="button" class="text-sm font-semibold text-primary-dark underline" @click="found = null">Track another order</button></div>
        <OrderView :order="found.order" :phone="found.phone" @updated="onUpdated" />
      </div>
    </div>
  </div>
</template>
