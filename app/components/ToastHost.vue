<script setup lang="ts">
import { Check, CircleAlert, X } from '@lucide/vue'
const { items, dismiss } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite" aria-atomic="false">
    <div
      v-for="t in items" :key="t.id" role="status"
      class="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl"
      :class="t.kind === 'error' ? 'bg-[#b4233c]' : 'bg-footer'"
    >
      <component :is="t.kind === 'error' ? CircleAlert : Check" :size="18" class="shrink-0" aria-hidden="true" />
      <span>{{ t.text }}</span>
      <button type="button" class="ml-1 rounded-full p-1 hover:bg-white/15" aria-label="Dismiss" @click="dismiss(t.id)"><X :size="14" /></button>
    </div>
  </div>
</template>
