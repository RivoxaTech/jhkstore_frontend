<script setup lang="ts">
import { Check, ChevronDown, Search } from '@lucide/vue'
import type { ProductCard } from '~/types'

/**
 * A calm drop-down for choosing a product (the wholesale form): a button that shows the choice, and a list under it that never leaves the screen - a search
 * box, a scrolling list (thumbnail, name) and a first row for "something else". Replaces the browser's own <select>, whose list covers the page when there are
 * many products. Keyboard: Enter / Space / arrow down open it, arrows move, Enter chooses, Escape closes.
 */
const props = defineProps<{ modelValue: string; products: ProductCard[] | null | undefined; placeholder?: string; elseLabel?: string; invalid?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const open = ref(false)
const query = ref('')
const active = ref(0)
const root = ref<HTMLElement | null>(null)
const search = ref<HTMLInputElement | null>(null)
const list = ref<HTMLElement | null>(null)
const uid = useId()

const current = computed(() => props.products?.find((p) => String(p.id) === props.modelValue))
const items = computed(() => {
  const q = query.value.trim().toLowerCase()
  const found = (props.products ?? []).filter((p) => !q || p.name.toLowerCase().includes(q))
  return [{ id: '', name: props.elseLabel ?? 'Something else (describe it below)', image: null as string | null }, ...found.map((p) => ({ id: String(p.id), name: p.name, image: p.thumb_url || p.image_url || null }))]
})

function choose(id: string) { emit('update:modelValue', id); close() }
async function show() {
  open.value = true
  query.value = ''
  active.value = Math.max(0, items.value.findIndex((i) => i.id === props.modelValue))
  await nextTick()
  search.value?.focus()
  scrollToActive()
}
function close() { open.value = false }
function scrollToActive() { (list.value?.children[active.value] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' }) }
function key(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); active.value = Math.min(items.value.length - 1, active.value + 1); scrollToActive() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active.value = Math.max(0, active.value - 1); scrollToActive() }
  else if (e.key === 'Enter') { e.preventDefault(); const it = items.value[active.value]; if (it) choose(it.id) }
  else if (e.key === 'Escape') { e.preventDefault(); close(); (root.value?.querySelector('button') as HTMLElement | null)?.focus() }
  else if (e.key === 'Tab') close()
}
watch(query, () => { active.value = 0 })
function outside(e: MouseEvent) { if (open.value && root.value && !root.value.contains(e.target as Node)) close() }
onMounted(() => document.addEventListener('mousedown', outside))
onBeforeUnmount(() => document.removeEventListener('mousedown', outside))
</script>

<template>
  <div ref="root" class="picker">
    <button
      id="b-product" type="button" class="field-select picker__button" :aria-expanded="open" aria-haspopup="listbox" :aria-controls="`${uid}-list`" :aria-invalid="invalid || undefined"
      data-testid="b-product" :data-value="modelValue" @click="open ? close() : show()" @keydown.down.prevent="!open && show()"
    >
      <span class="truncate" :class="current ? '' : 'text-muted'">{{ current ? current.name : (placeholder ?? 'Something else (describe it below)') }}</span>
      <ChevronDown :size="17" class="picker__chev" :class="{ 'is-open': open }" aria-hidden="true" />
    </button>
    <div v-if="open" class="picker__pop" data-testid="b-product-pop" @keydown="key">
      <label class="picker__search"><Search :size="15" aria-hidden="true" /><input ref="search" v-model="query" type="search" placeholder="Search toys" aria-label="Search toys" autocomplete="off" data-testid="b-product-search"></label>
      <ul :id="`${uid}-list`" ref="list" class="picker__list" role="listbox" data-testid="b-product-list">
        <li
          v-for="(it, i) in items" :key="it.id || 'else'" role="option" :aria-selected="it.id === modelValue" class="picker__item" :class="{ 'is-active': i === active, 'is-else': it.id === '' }"
          :data-value="it.id" @mouseenter="active = i" @click="choose(it.id)"
        >
          <span v-if="it.id !== ''" class="picker__thumb"><img v-if="it.image" :src="it.image" alt="" loading="lazy" width="32" height="32"></span>
          <span class="picker__name">{{ it.name }}</span>
          <Check v-if="it.id === modelValue" :size="15" class="picker__tick" aria-hidden="true" />
        </li>
        <li v-if="items.length === 1 && query" class="picker__none">No toy called “{{ query }}”. Choose “something else” and describe it.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.picker { position: relative; }
.picker__button { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 10px; text-align: left; cursor: pointer; }
.picker__chev { flex: none; color: var(--c-muted); transition: transform 0.15s; }
.picker__chev.is-open { transform: rotate(180deg); }
.picker__pop { position: absolute; z-index: 40; left: 0; right: 0; top: calc(100% + 6px); border: 1px solid var(--c-border); border-radius: 14px; background: #fff; box-shadow: 0 14px 34px -12px rgb(15 23 42 / 0.28); padding: 8px; }
.picker__search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--c-border); border-radius: 10px; padding: 0 10px; color: var(--c-muted); }
.picker__search input { flex: 1; min-width: 0; height: 38px; border: 0; outline: none; background: transparent; font-size: 14px; color: var(--c-text); }
.picker__list { margin: 8px 0 0; padding: 0; list-style: none; max-height: 260px; overflow-y: auto; overscroll-behavior: contain; }
.picker__item { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 10px; cursor: pointer; font-size: 14px; }
.picker__item.is-active { background: var(--c-primary-soft); }
.picker__item[aria-selected="true"] { font-weight: 600; }
.picker__item.is-else { color: var(--c-muted); border-bottom: 1px dashed var(--c-border); border-radius: 10px 10px 0 0; margin-bottom: 4px; }
.picker__thumb { flex: none; width: 32px; height: 32px; border-radius: 8px; overflow: hidden; background: var(--c-primary-soft); }
.picker__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.picker__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.picker__tick { flex: none; color: var(--c-primary-dark); }
.picker__none { padding: 10px; font-size: 13px; color: var(--c-muted); }
</style>
