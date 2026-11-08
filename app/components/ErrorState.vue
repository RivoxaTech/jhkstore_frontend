<script setup lang="ts">
import { RefreshCw, TriangleAlert } from '@lucide/vue'

/** A call to the API failed: say so in plain words and offer to try again. */
defineProps<{ message?: string; title?: string }>()
defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <div class="card mx-auto max-w-md px-6 py-10 text-center" role="alert" data-testid="error-state">
    <TriangleAlert :size="36" class="mx-auto text-[#c0832a]" :stroke-width="1.5" />
    <p class="mt-3 font-semibold">{{ title ?? 'We could not load this' }}</p>
    <p class="mt-1 text-sm text-muted">{{ message ?? 'Please check your connection and try again.' }}</p>
    <button type="button" class="btn btn-primary btn-md mt-5" data-testid="retry" @click="$emit('retry')"><RefreshCw :size="16" /> Try again</button>
  </div>
</template>
