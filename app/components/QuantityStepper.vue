<script setup lang="ts">
import { Minus, Plus } from '@lucide/vue'

/** − 1 + : stays between the smallest and largest quantity the product allows. */
const props = defineProps<{ modelValue: number; min?: number; max?: number; disabled?: boolean; label?: string; size?: 'sm' | 'md' }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()
const lo = computed(() => Math.max(1, props.min ?? 1))
const hi = computed(() => Math.max(lo.value, props.max ?? 99))
const set = (v: number) => emit('update:modelValue', Math.min(hi.value, Math.max(lo.value, Math.round(v) || lo.value)))
const dim = computed(() => (props.size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'))
</script>

<template>
  <div class="inline-flex items-center rounded-full bg-white ring-1 ring-line" role="group" :aria-label="label ?? 'Quantity'">
    <button type="button" class="grid place-items-center rounded-full text-ink hover:bg-primary-soft disabled:opacity-40" :class="dim" :disabled="disabled || modelValue <= lo" aria-label="Decrease the quantity" data-testid="qty-minus" @click="set(modelValue - 1)"><Minus :size="15" /></button>
    <input
      :value="modelValue" type="number" inputmode="numeric" :min="lo" :max="hi" :disabled="disabled" aria-label="Quantity" data-testid="qty-input"
      class="w-10 bg-transparent text-center text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" @change="set(Number(($event.target as HTMLInputElement).value))"
    >
    <button type="button" class="grid place-items-center rounded-full text-ink hover:bg-primary-soft disabled:opacity-40" :class="dim" :disabled="disabled || modelValue >= hi" aria-label="Increase the quantity" data-testid="qty-plus" @click="set(modelValue + 1)"><Plus :size="15" /></button>
  </div>
</template>
