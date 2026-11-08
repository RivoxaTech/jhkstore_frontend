<script setup lang="ts">
import type { QuoteSummary } from '~/types'

/** The totals of a quote or the cart: every figure is the server's. An unknown delivery fee says "to be confirmed", never a number. */
const props = withDefaults(defineProps<{ summary: QuoteSummary; delivery?: boolean }>(), { delivery: true })   // (a boolean prop that is not passed would be false)
const { money } = useMoney()
const s = computed(() => props.summary)
const deliveryText = computed(() => {
  if (s.value.delivery_pending) return 'To be confirmed'
  if (s.value.delivery_needs_address) return 'Calculated at checkout'
  if (s.value.delivery_free || s.value.delivery_fee === 0) return 'Free'
  return money(s.value.delivery_fee)
})
</script>

<template>
  <dl class="space-y-2 text-sm" data-testid="totals">
    <div class="flex justify-between"><dt class="text-muted">Subtotal</dt><dd class="font-medium">{{ money(s.subtotal + s.coupon_discount) }}</dd></div>
    <div v-if="s.coupon_discount > 0" class="flex justify-between text-primary-dark"><dt>Coupon <span v-if="s.coupon_code" class="rounded bg-primary-soft px-1.5 py-0.5 text-xs font-bold">{{ s.coupon_code }}</span></dt><dd class="font-medium">−{{ money(s.coupon_discount) }}</dd></div>
    <div v-if="delivery !== false" class="flex justify-between"><dt class="text-muted">Delivery</dt><dd class="font-medium" data-testid="delivery-line">{{ deliveryText }}</dd></div>
    <p v-if="delivery !== false && s.delivery_zone?.eta_text" class="text-xs text-muted">Arrives in {{ s.delivery_zone.eta_text }}</p>
    <p v-else-if="delivery !== false && s.delivery_eta_text" class="text-xs text-muted">Arrives in {{ s.delivery_eta_text }}</p>
    <p v-if="delivery !== false && s.amount_for_free_delivery && s.amount_for_free_delivery > 0" class="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary-dark">Add {{ money(s.amount_for_free_delivery) }} more for free delivery.</p>
    <div v-if="s.total_savings > 0" class="flex justify-between text-xs text-primary-dark"><dt>You save</dt><dd class="font-semibold">{{ money(s.total_savings) }}</dd></div>
    <div class="flex items-baseline justify-between border-t border-line pt-3 text-base"><dt class="font-semibold">Total</dt><dd class="text-xl font-bold" data-testid="grand-total">{{ money(s.grand_total) }}</dd></div>
    <p v-if="s.delivery_pending" class="text-xs text-muted">The total does not include delivery yet: we confirm the delivery fee after you order.</p>
    <p v-else-if="s.tax_total > 0" class="text-xs text-muted">{{ s.tax_inclusive ? `Includes ${s.tax_label}: ${money(s.tax_total)}` : `${s.tax_label} added: ${money(s.tax_total)}` }}</p>
  </dl>
</template>
