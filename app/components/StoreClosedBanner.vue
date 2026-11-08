<script setup lang="ts">
import { Clock } from '@lucide/vue'
const { store, isClosed } = useSettings()
</script>

<template>
  <div v-if="isClosed" class="bg-[#fff4d6] text-[#7a5200]" role="status" data-testid="store-closed-banner">
    <div class="container-page flex items-center justify-center gap-2 py-2 text-center text-sm font-medium">
      <Clock :size="16" aria-hidden="true" class="shrink-0" />
      <span>{{ store?.closed_message || 'We are closed right now. You can look around, but orders are paused.' }}</span>
    </div>
  </div>
</template>
