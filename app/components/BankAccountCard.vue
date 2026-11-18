<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'

/**
 * One bank account of the shop, as the customer reads it when he has to transfer the money: a label and its value on every line (Bank, Title, Account No, IBAN),
 * with the copy icon right behind the value (not at the far end of the row), so the number can be pasted into the banking app.
 */
const props = defineProps<{ account: { bank: string; title?: string | null; number?: string | null; iban?: string | null } }>()

const copied = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
const rows = computed(() => [
  { key: 'bank', label: 'Bank', value: props.account.bank, copy: false, mono: false },
  { key: 'title', label: 'Title', value: props.account.title, copy: true, mono: false },
  { key: 'number', label: 'Account No', value: props.account.number, copy: true, mono: true },
  { key: 'iban', label: 'IBAN', value: props.account.iban, copy: true, mono: true },
].filter((r) => r.value && String(r.value).trim() !== ''))

async function copy(row: { key: string; label: string; value?: string | null }) {
  const text = String(row.value ?? '')
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // an http page or a refused permission: select the text by hand
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try { document.execCommand('copy') } catch { /* the value can still be selected by hand */ }
    area.remove()
  }
  copied.value = row.key
  clearTimeout(timer)
  timer = setTimeout(() => { if (copied.value === row.key) copied.value = '' }, 1600)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <dl class="space-y-1.5 text-sm" data-testid="bank-account-rows">
    <div v-for="r in rows" :key="r.key" class="grid grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-2">
      <dt class="text-muted">{{ r.label }}</dt>
      <dd class="font-medium" :class="r.mono ? 'font-mono' : ''">
        <span class="break-all">{{ r.value }}</span>
        <button v-if="r.copy" type="button" class="ml-1.5 inline-grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-primary-soft hover:text-primary-dark" :aria-label="`Copy ${r.label} of ${account.bank}`" :data-testid="`copy-${r.key}`" @click="copy(r)">
          <Check v-if="copied === r.key" :size="14" class="text-primary" /><Copy v-else :size="14" />
        </button>
      </dd>
    </div>
  </dl>
</template>
