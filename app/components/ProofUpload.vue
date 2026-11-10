<script setup lang="ts">
import { ImageUp, LoaderCircle } from '@lucide/vue'
import type { Order } from '~/types'

/**
 * Bank transfer: the customer uploads a screenshot of the payment (JPG, PNG or WEBP, up to 4 MB) with a preview first. After a shop rejection the same box is used
 * again. A wrong phone is a 404, exactly like an unknown order: the form here already asked for the phone to look the order up.
 */
const props = defineProps<{ number: string; phone: string; rejected?: string | null }>()
const emit = defineEmits<{ (e: 'uploaded', order: Order): void }>()
const MAX = 4 * 1024 * 1024

const file = ref<File | null>(null)
const preview = ref('')
const reference = ref('')
const busy = ref(false)
const error = ref('')
const input = ref<HTMLInputElement | null>(null)

function pick(e: Event) {
  error.value = ''
  const f = (e.target as HTMLInputElement).files?.[0] ?? null
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
  file.value = null
  if (!f) return
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { error.value = 'Please choose a JPG, PNG or WEBP picture.'; return }
  if (f.size > MAX) { error.value = 'This picture is larger than 4 MB. Please choose a smaller one.'; return }
  file.value = f
  preview.value = URL.createObjectURL(f)
}

async function send() {
  if (!file.value) { error.value = 'Choose the screenshot of your payment first.'; return }
  busy.value = true
  error.value = ''
  const body = new FormData()
  body.append('proof', file.value)
  if (reference.value.trim()) body.append('reference', reference.value.trim())
  body.append('hp_extra', '')   // the honeypot field, left empty
  try {
    const res = await api<{ data: Order }>(`/orders/${encodeURIComponent(props.number)}/payment-proof`, { method: 'POST', body, query: { phone: props.phone } })
    emit('uploaded', res.data)
    file.value = null
    if (preview.value) URL.revokeObjectURL(preview.value)
    preview.value = ''
  } catch (e) {
    const f = apiFailure(e)
    error.value = f.status === 404 ? 'We could not match this order. Please check the order number and phone.' : firstError(f)
  } finally { busy.value = false }
}
onBeforeUnmount(() => { if (preview.value) URL.revokeObjectURL(preview.value) })
</script>

<template>
  <form class="space-y-3" data-testid="proof-form" @submit.prevent="send">
    <p v-if="rejected" class="rounded-xl bg-[#fde8ec] px-3 py-2.5 text-sm text-[#9a1d33]" role="alert" data-testid="proof-rejected"><strong>Your last screenshot was not accepted:</strong> {{ rejected }} Please upload a new one.</p>
    <div>
      <label class="field-label" for="proof-file">Screenshot of your payment</label>
      <input id="proof-file" ref="input" type="file" accept="image/jpeg,image/png,image/webp" class="field-input !p-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-primary-contrast" data-testid="proof-file" @change="pick">
      <p class="field-hint">JPG, PNG or WEBP, up to 4 MB.</p>
    </div>
    <img v-if="preview" :src="preview" alt="Preview of your payment screenshot" class="max-h-56 rounded-xl border border-line object-contain" data-testid="proof-preview">
    <div>
      <label class="field-label" for="proof-ref">Transaction reference <span class="font-normal text-muted">(optional)</span></label>
      <input id="proof-ref" v-model="reference" maxlength="120" class="field-input" placeholder="The bank's transaction id">
    </div>
    <p v-if="error" class="text-sm text-[#b4233c]" role="alert" data-testid="proof-error">{{ error }}</p>
    <button type="submit" class="btn btn-primary btn-md" :disabled="busy || !file" data-testid="proof-submit"><LoaderCircle v-if="busy" :size="16" class="animate-spin" /><ImageUp v-else :size="16" /> {{ busy ? 'Uploading...' : 'Send the screenshot' }}</button>
  </form>
</template>
