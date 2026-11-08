<script setup lang="ts">
import type { ContentTab } from '~/types'

/** The description of a product as tabs (Description, Features, Specifications...). The text is shown as plain text, never as HTML. */
const props = defineProps<{ tabs: ContentTab[]; fallback?: string | null }>()
const list = computed<ContentTab[]>(() => {
  const t = props.tabs.filter((x) => x.content || x.manual_url)
  if (t.length) return t
  return props.fallback ? [{ key: 'description', title: 'Description', format: 'paragraphs', content: props.fallback, manual_url: null }] : []
})
const active = ref(0)
const paragraphs = (s: string | null) => (s ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
const lines = (s: string | null) => (s ?? '').split(/\r?\n/).map((p) => p.trim()).filter(Boolean)
const rows = (s: string | null) => lines(s).map((l) => l.split('|').map((c) => c.trim()))
</script>

<template>
  <section v-if="list.length" aria-label="Product details" data-testid="content-tabs">
    <div class="flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      <button
        v-for="(t, i) in list" :key="t.key" :id="`tab-${t.key}`" type="button" role="tab" class="relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors" :class="i === active ? 'text-primary-dark' : 'text-muted hover:text-ink'"
        :aria-selected="i === active" :aria-controls="`panel-${t.key}`" @click="active = i"
      >{{ t.title }}<span v-if="i === active" class="absolute inset-x-3 -bottom-px h-[2.5px] rounded-full bg-primary" /></button>
    </div>
    <div v-for="(t, i) in list" v-show="i === active" :id="`panel-${t.key}`" :key="t.key" role="tabpanel" :aria-labelledby="`tab-${t.key}`" class="prose-page max-w-3xl py-5">
      <ul v-if="t.format === 'bullets'"><li v-for="(l, n) in lines(t.content)" :key="n">{{ l }}</li></ul>
      <table v-else-if="t.format === 'table'" class="w-full text-left text-sm"><tbody><tr v-for="(r, n) in rows(t.content)" :key="n" class="border-b border-line"><th class="w-1/3 py-2 pr-4 font-semibold">{{ r[0] }}</th><td class="py-2">{{ r[1] }}</td></tr></tbody></table>
      <template v-else><p v-for="(p, n) in paragraphs(t.content)" :key="n">{{ p }}</p></template>
      <p v-if="t.manual_url" class="mt-3"><a :href="t.manual_url" target="_blank" rel="noopener noreferrer">Download the manual</a></p>
    </div>
  </section>
</template>
