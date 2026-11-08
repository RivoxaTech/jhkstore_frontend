<script setup lang="ts">
/** The "Our Collection" style heading: a small pill label, a centred two-colour title (*asterisks* = accent colour), a line of text, and little teal strokes either side. */
defineProps<{ label?: string; title: string; subtitle?: string; as?: 'h1' | 'h2' }>()
</script>

<template>
  <header class="mx-auto max-w-4xl px-2 text-center">
    <p v-if="label" class="mx-auto inline-block rounded-full bg-primary-btn px-6 py-1.5 text-[15px] font-semibold text-primary-contrast">{{ label }}</p>
    <div class="mt-3 flex items-center justify-center gap-4">
      <svg class="hidden h-9 w-12 shrink-0 text-primary sm:block" viewBox="0 0 48 36" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 8c10 0 20 2 30 7M10 22c9-2 17-1 26 3" /></svg>
      <component :is="as ?? 'h2'" class="text-[clamp(1.7rem,3.6vw,2.6rem)] font-bold leading-tight"><AccentText :text="title" /></component>
      <svg class="hidden h-9 w-12 shrink-0 -scale-x-100 text-primary sm:block" viewBox="0 0 48 36" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 8c10 0 20 2 30 7M10 22c9-2 17-1 26 3" /></svg>
    </div>
    <p v-if="subtitle" class="mt-2.5 text-[15px] text-ink/80">{{ subtitle }}</p>
  </header>
</template>
