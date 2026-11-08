<script setup lang="ts">
import { Search } from '@lucide/vue'
import type { Order } from '~/types'

/** Order number + phone. A wrong phone looks exactly like an unknown order (the API answers 404 for both): one neutral message, nothing is revealed. */
const props = defineProps<{ initialNumber?: string }>()
const emit = defineEmits<{ (e: 'found', payload: { order: Order; phone: string }): void }>()
const number = ref(props.initialNumber ?? '')
const phone = ref('')
const busy = ref(false)
const error = ref('')
watch(() => props.initialNumber, (v) => { if (v && !number.value) number.value = v })

async function submit() {
  error.value = ''
  if (!number.value.trim() || !phone.value.trim()) { error.value = 'Please enter your order number and the phone number you used.'; return }
  busy.value = true
  try {
    const res = await api<{ data: Order }>(`/orders/${encodeURIComponent(number.value.trim().toUpperCase())}`, { query: { phone: phone.value.trim() } })
    emit('found', { order: res.data, phone: phone.value.trim() })
  } catch (e) {
    const f = apiFailure(e)
    error.value = f.status === 404 ? 'We could not find an order with these details. Please check the order number and the phone number.' : f.status === 422 ? 'Please enter your order number and the phone number you used.' : f.message
  } finally { busy.value = false }
}
</script>

<template>
  <form class="card mx-auto max-w-md space-y-4 p-6" data-testid="track-form" @submit.prevent="submit">
    <div><label class="field-label" for="track-number">Order number</label><input id="track-number" v-model="number" class="field-input uppercase" placeholder="e.g. ORD-2026-000123" autocomplete="off" data-testid="track-number" :aria-invalid="!!error"></div>
    <div><label class="field-label" for="track-phone">Phone number</label><input id="track-phone" v-model="phone" type="tel" class="field-input" placeholder="The phone you gave when you ordered" autocomplete="tel" data-testid="track-phone" :aria-invalid="!!error"></div>
    <p v-if="error" class="rounded-xl bg-[#fde8ec] px-3 py-2.5 text-sm text-[#9a1d33]" role="alert" data-testid="track-error">{{ error }}</p>
    <input type="text" name="website" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="busy" data-testid="track-submit"><Search :size="17" /> {{ busy ? 'Looking...' : 'Track my order' }}</button>
  </form>
</template>
