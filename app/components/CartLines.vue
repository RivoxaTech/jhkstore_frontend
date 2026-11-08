<script setup lang="ts">
import { Trash2, TriangleAlert } from '@lucide/vue'

/** The lines of the server cart: picture, name, option, quantity, the price of the line and every warning the API gave. Used by the drawer and the cart page. */
defineProps<{ compact?: boolean }>()
const cart = useCart()
const toast = useToast()
const { money } = useMoney()

async function qty(variantId: number, value: number) {
  const r = await cart.setQty(variantId, value)
  if (!r.ok) { toast.error(r.message || 'Could not change the quantity'); await cart.refresh(undefined, true) }
}
async function remove(variantId: number) {
  const r = await cart.remove(variantId)
  if (!r.ok) toast.error(r.message || 'Could not remove this toy')
}
</script>

<template>
  <ul class="divide-y divide-line" data-testid="cart-lines">
    <li v-for="l in cart.lines.value" :key="l.variant_id" class="flex gap-3 py-4" :data-variant="l.variant_id">
      <NuxtLink :to="`/product/${l.slug}`" class="shrink-0 overflow-hidden rounded-xl bg-primary-soft" :class="compact ? 'h-16 w-16' : 'h-20 w-20 sm:h-24 sm:w-24'" @click="cart.drawerOpen.value = false">
        <img v-if="l.thumb_url || l.image_url" :src="l.thumb_url || l.image_url || ''" :alt="l.name" width="96" height="96" class="h-full w-full object-cover" loading="lazy">
      </NuxtLink>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <NuxtLink :to="`/product/${l.slug}`" class="block text-sm font-semibold leading-snug hover:text-primary-dark" @click="cart.drawerOpen.value = false">{{ l.name }}</NuxtLink>
            <p v-if="l.option_name && l.option_name !== l.name" class="mt-0.5 truncate text-xs text-muted">{{ l.option_name.replace(`${l.name} - `, '') }}</p>
          </div>
          <button type="button" class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-[#fde8ec] hover:text-[#b4233c]" :aria-label="`Remove ${l.name}`" data-testid="cart-remove" @click="remove(l.variant_id)"><Trash2 :size="16" /></button>
        </div>

        <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper :model-value="l.qty" :min="l.min_order_qty" :max="Math.min(l.max_order_qty || 99, l.available_qty || 99)" :disabled="cart.busy.value" size="sm" :label="`Quantity of ${l.name}`" @update:model-value="qty(l.variant_id, $event)" />
          <div class="text-right">
            <p class="text-sm font-bold" data-testid="line-total">{{ money(l.line_total) }}</p>
            <p v-if="l.qty > 1" class="text-[11.5px] text-muted">{{ money(l.unit_price) }} each</p>
          </div>
        </div>

        <p v-if="l.bulk_applied" class="mt-1.5 text-[12px] font-medium text-primary-dark">{{ l.bulk_applied.label || `Bulk price: ${money(l.bulk_applied.price)} each` }}</p>
        <p v-if="l.next_offer" class="mt-1 text-[12px] text-muted">{{ l.next_offer.hint }}: add {{ l.next_offer.add_qty }} more</p>
        <ul v-if="l.warnings.length" class="mt-1.5 space-y-1">
          <li v-for="w in l.warnings" :key="w.code" class="flex items-start gap-1.5 text-[12px]" :class="w.blocking ? 'text-[#b4233c]' : 'text-[#8a5a00]'" role="alert"><TriangleAlert :size="13" class="mt-0.5 shrink-0" /><span>{{ w.message }}</span></li>
        </ul>
      </div>
    </li>
  </ul>
</template>
