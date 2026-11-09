<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'

/**
 * The sort of a product list as a small menu: a quiet "Sort: Most popular" text button that opens a short list under it (a native <select> opens a wide,
 * unstyled list on a phone). Keyboard: Enter / arrows / Escape. `modelValue` is the chosen value.
 */
const props = defineProps<{ modelValue: string; options: { value: string; label: string }[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const current = computed(() => props.options.find((o) => o.value === props.modelValue) ?? props.options[0])

function pick(v: string) { open.value = false; if (v !== props.modelValue) emit('update:modelValue', v) }
function outside(e: MouseEvent) { if (root.value && !root.value.contains(e.target as Node)) open.value = false }
onMounted(() => document.addEventListener('click', outside))
onBeforeUnmount(() => document.removeEventListener('click', outside))
</script>

<template>
  <div ref="root" class="relative" @keydown.esc="open = false">
    <button
      type="button" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-primary-soft hover:text-ink" :aria-expanded="open" aria-haspopup="listbox"
      data-testid="sort" @click="open = !open"
    >
      <span>Sort: <span class="font-semibold text-ink/80">{{ current?.label }}</span></span>
      <ChevronDown :size="14" class="transition-transform" :class="open ? 'rotate-180' : ''" aria-hidden="true" />
    </button>
    <ul v-if="open" class="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-line" role="listbox" aria-label="Sort by">
      <li v-for="o in options" :key="o.value" role="option" :aria-selected="o.value === modelValue">
        <button type="button" class="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-[13.5px] hover:bg-primary-soft" :class="o.value === modelValue ? 'font-semibold text-primary-dark' : 'text-ink'" @click="pick(o.value)">
          {{ o.label }}<Check v-if="o.value === modelValue" :size="14" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </div>
</template>
