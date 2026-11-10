<script setup lang="ts">
import { CircleCheck, Clock, MessageCircle, Package, Phone, Truck, XCircle } from '@lucide/vue'
import type { Order } from '~/types'

/**
 * An order as the customer sees it (after placing it, and on the tracking page): the status and its timeline, the items, the totals (an unknown delivery fee
 * says "to be confirmed"), the payment (bank accounts and instructions of THIS order, the proof upload and what the shop answered), the courier and the tracking number.
 */
const props = defineProps<{ order: Order; phone: string; fresh?: boolean }>()
const emit = defineEmits<{ (e: 'updated', order: Order): void }>()
const { money } = useMoney()

const o = computed(() => props.order)
const rejected = computed(() => o.value.status === 'rejected')
const cancelled = computed(() => o.value.status === 'cancelled')
const closed = computed(() => rejected.value || cancelled.value)
const bank = computed(() => o.value.payment_method === 'bank_transfer')
const proof = computed(() => o.value.payment?.proof_status ?? 'none')
const STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'delivered']
const stepIndex = computed(() => STEPS.indexOf(o.value.status))
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const t = computed(() => o.value.totals ?? {})
</script>

<template>
  <div class="space-y-6" data-testid="order-view">
    <section class="card p-5 sm:p-7">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p v-if="fresh" class="mb-1 flex items-center gap-2 text-sm font-semibold text-primary-dark"><CircleCheck :size="18" /> Thank you! We have your order.</p>
          <h2 class="text-2xl font-semibold" data-testid="order-number">{{ o.order_number }}</h2>
          <p class="text-sm text-muted">Placed {{ when(o.placed_at) }}<template v-if="o.estimated_delivery_date && !closed"> · Arrives by {{ new Date(`${o.estimated_delivery_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}</template></p>
        </div>
        <span class="rounded-full px-4 py-1.5 text-sm font-bold" :class="closed ? 'bg-[#fde8ec] text-[#9a1d33]' : o.status === 'delivered' ? 'bg-primary text-primary-contrast' : 'bg-primary-soft text-primary-dark'" data-testid="order-status">{{ o.status_label }}</span>
      </div>

      <p v-if="rejected && o.reject_reason" class="mt-4 flex gap-2 rounded-xl bg-[#fde8ec] px-4 py-3 text-sm text-[#9a1d33]" role="alert" data-testid="reject-reason"><XCircle :size="18" class="mt-0.5 shrink-0" /><span><strong>The shop could not accept this order:</strong> {{ o.reject_reason }}</span></p>
      <p v-else-if="cancelled" class="mt-4 flex gap-2 rounded-xl bg-[#fde8ec] px-4 py-3 text-sm text-[#9a1d33]"><XCircle :size="18" class="mt-0.5 shrink-0" /><span>This order was cancelled.<template v-if="o.cancel_reason"> {{ o.cancel_reason }}</template></span></p>

      <ol v-if="!closed" class="mt-6 grid grid-cols-5 gap-1 text-center text-[11px] sm:text-xs" aria-label="Order progress">
        <li v-for="(s, i) in STEPS" :key="s" class="relative">
          <!-- the line from the step before to this one: filled once the order has reached this step -->
          <span v-if="i > 0" class="absolute -left-[calc(50%+2px)] right-[calc(50%-2px)] top-[13px] h-[3px] rounded-full" :class="i <= stepIndex ? 'bg-primary' : 'bg-primary/20'" aria-hidden="true" data-testid="step-line" />
          <span class="relative z-10 mx-auto grid h-7 w-7 place-items-center rounded-full text-xs font-bold" :class="i <= stepIndex ? 'bg-primary text-primary-contrast' : 'bg-primary-soft text-muted'">{{ i < stepIndex ? '✓' : i + 1 }}</span>
          <span class="mt-1 block font-medium capitalize" :class="i <= stepIndex ? 'text-ink' : 'text-muted'">{{ s }}</span>
        </li>
      </ol>

      <div v-if="o.tracking" class="mt-5 flex items-start gap-3 rounded-xl bg-primary-soft px-4 py-3 text-sm" data-testid="tracking-box">
        <Truck :size="20" class="mt-0.5 shrink-0 text-primary" />
        <div><p class="font-semibold">On its way with {{ o.tracking.courier || 'the courier' }}</p><p v-if="o.tracking.awb_number">Tracking number: <strong data-testid="awb">{{ o.tracking.awb_number }}</strong></p><a v-if="o.tracking.tracking_url" :href="o.tracking.tracking_url" target="_blank" rel="noopener noreferrer" class="font-semibold text-primary-dark underline">Track with the courier</a></div>
      </div>
    </section>

    <section v-if="bank && !closed" class="card p-5 sm:p-7" data-testid="payment-section">
      <h3 class="text-lg font-semibold">Payment by bank transfer</h3>
      <p v-if="proof === 'verified' || o.payment_status === 'paid'" class="mt-3 flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary-dark" data-testid="payment-verified"><CircleCheck :size="18" /> We have verified your payment. Thank you!</p>
      <template v-else>
        <div v-if="o.payment.accounts?.length" class="mt-3 space-y-3" data-testid="bank-accounts">
          <p class="text-sm text-ink/85">Please transfer <strong>{{ money(o.grand_total) }}</strong> to one of these accounts and use <strong>{{ o.order_number }}</strong> as the reference.</p>
          <ul class="grid gap-3 sm:grid-cols-2">
            <li v-for="(a, i) in o.payment.accounts" :key="i" class="card-flat p-4 text-sm"><p class="font-semibold">{{ a.bank }}</p><p v-if="a.title" class="text-muted">{{ a.title }}</p><p v-if="a.number">Account: <strong>{{ a.number }}</strong></p><p v-if="a.iban">IBAN: <strong>{{ a.iban }}</strong></p></li>
          </ul>
          <p v-if="o.payment.instructions" class="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">{{ o.payment.instructions }}</p>
        </div>

        <div class="mt-5">
          <p v-if="proof === 'submitted'" class="flex items-start gap-2 rounded-xl bg-[#e9f6ff] px-4 py-3 text-sm text-[#0b4f7a]" role="status" data-testid="proof-submitted"><Clock :size="18" class="mt-0.5 shrink-0" /><span><strong>Thank you! We will verify your payment.</strong> We start preparing your order as soon as we have checked it.</span></p>
          <ProofUpload v-else-if="o.payment.can_upload_proof" :number="o.order_number" :phone="phone" :rejected="proof === 'rejected' ? (o.payment.reject_reason || 'Please send a clearer picture.') : null" @uploaded="emit('updated', $event)" />
        </div>
      </template>
    </section>
    <section v-else-if="!bank && !closed" class="card p-5 text-sm sm:p-7"><h3 class="text-lg font-semibold">Cash on delivery</h3><p class="mt-2 text-ink/85">Please keep <strong>{{ money(o.grand_total) }}</strong><template v-if="o.delivery_fee_pending"> (plus the delivery fee we will confirm)</template> ready for the courier.</p></section>

    <div class="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section class="card p-5 sm:p-7" aria-label="Items">
        <h3 class="mb-3 text-lg font-semibold">Items ({{ o.items_count }})</h3>
        <ul class="divide-y divide-line">
          <li v-for="i in o.items" :key="i.id" class="flex items-center gap-3 py-3">
            <span class="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-primary-soft"><img v-if="i.image_url" :src="i.image_url" :alt="i.name" width="56" height="56" class="h-full w-full object-cover" loading="lazy"></span>
            <span class="min-w-0 flex-1"><span class="block text-sm font-semibold">{{ i.name }}</span><span v-if="i.option_name && i.option_name !== i.name" class="block truncate text-xs text-muted">{{ i.option_name.replace(`${i.name} - `, '') }}</span><span class="block text-xs text-muted">Qty {{ i.qty }}</span></span>
            <span class="text-sm font-bold">{{ money(i.line_total) }}</span>
          </li>
        </ul>
      </section>

      <aside class="space-y-6">
        <section class="card p-5 text-sm" aria-label="Totals">
          <dl class="space-y-2">
            <div class="flex justify-between"><dt class="text-muted">Items</dt><dd>{{ money((t.subtotal ?? 0) + (t.coupon_discount ?? 0)) }}</dd></div>
            <div v-if="t.coupon_discount > 0" class="flex justify-between text-primary-dark"><dt>Coupon {{ t.coupon_code }}</dt><dd>−{{ money(t.coupon_discount) }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted">Delivery</dt><dd data-testid="order-delivery">{{ o.delivery_fee_pending || t.delivery_fee === null ? 'To be confirmed' : t.delivery_fee === 0 ? 'Free' : money(t.delivery_fee) }}</dd></div>
            <div class="flex justify-between border-t border-line pt-3 text-base font-bold"><dt>Total</dt><dd data-testid="order-total">{{ money(o.grand_total) }}</dd></div>
          </dl>
          <p v-if="o.delivery_fee_pending" class="mt-3 rounded-xl bg-[#fff4d6] px-3 py-2.5 text-xs text-[#7a5200]" data-testid="fee-pending">The delivery fee is still to be confirmed. We will tell you the final total before we send your order.</p>
        </section>

        <section class="card p-5 text-sm" aria-label="Delivery details">
          <h3 class="mb-2 font-semibold">Delivery to</h3>
          <p>{{ o.customer.name }}</p>
          <p class="text-muted">{{ [o.shipping_address.line1, o.shipping_address.area, o.shipping_address.city, o.shipping_address.postcode].filter(Boolean).join(', ') }}</p>
          <p class="text-muted">{{ o.customer.phone }}</p>
        </section>

        <section v-if="o.store_phone || o.whatsapp_url" class="card p-5 text-sm" aria-label="Need help">
          <h3 class="mb-2 font-semibold">Need help with this order?</h3>
          <div class="flex flex-wrap gap-2">
            <a v-if="o.store_phone" :href="`tel:${o.store_phone}`" class="btn btn-outline btn-sm"><Phone :size="14" /> {{ o.store_phone }}</a>
            <a v-if="o.whatsapp_url" :href="o.whatsapp_url" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm"><MessageCircle :size="14" /> WhatsApp</a>
          </div>
        </section>
      </aside>
    </div>

    <section class="card p-5 sm:p-7" aria-label="History">
      <h3 class="mb-3 flex items-center gap-2 text-lg font-semibold"><Package :size="18" class="text-primary" /> History</h3>
      <ol class="space-y-3 border-l-2 border-line pl-5" data-testid="timeline">
        <li v-for="(e, i) in [...o.timeline].reverse()" :key="i" class="relative">
          <span class="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white" :class="i === 0 ? 'bg-primary' : 'bg-primary/40'" />
          <p class="text-sm font-semibold">{{ e.label }}</p><p v-if="e.note" class="text-sm text-ink/80">{{ e.note }}</p><p class="text-xs text-muted">{{ when(e.at) }}</p>
        </li>
      </ol>
    </section>
  </div>
</template>
