<script setup lang="ts">
import { ArrowRight, Check, Clock, Info, Mail, MapPin, Phone } from '@lucide/vue'
import type { Block, PageContent } from '~/content/types'

/**
 * One of the static information pages (About, Shipping, Returns, Terms, Privacy). The words live in app/content/*.ts, not in the admin panel and not in an API.
 * {store} {email} {phone} {address} {hours} in the text are replaced with the values of GET /settings.
 * Layout: a soft header band (title, lead), then one row per heading of the content: the heading on the left (it stays in view while its text scrolls),
 * the text on the right; a call-to-action block becomes a full-width band at the end.
 */
const props = defineProps<{ content: PageContent; path: string }>()
const { settings, storeName } = useSettings()

function fill(text: string): string {
  const s = settings.value
  const email = s?.store.email || 'our wholesale page'
  const phone = s?.store.phone || 'the number on our wholesale page'
  return text
    .replaceAll('{store}', storeName.value)
    .replaceAll('{email}', email)
    .replaceAll('{phone}', phone)
    .replaceAll('{address}', s?.store.address || 'the address on our wholesale page')
    .replaceAll('{hours}', s?.footer.support_hours ? `Support hours: ${s.footer.support_hours}.` : '')
    .trim()
}

// the blocks, grouped by heading: a block before the first heading has no title; a cta is not part of a row
const sections = computed(() => {
  const out: { title: string; blocks: Block[] }[] = [{ title: '', blocks: [] }]
  for (const b of props.content.blocks) {
    if (b.type === 'cta') continue
    if (b.type === 'h2') out.push({ title: b.text, blocks: [] })
    else out[out.length - 1]!.blocks.push(b)
  }
  return out.filter((s) => s.title || s.blocks.length)
})
const cta = computed(() => props.content.blocks.find((b) => b.type === 'cta') as Extract<Block, { type: 'cta' }> | undefined)
const store = computed(() => settings.value?.store)
const hours = computed(() => settings.value?.footer.support_hours)

useSeo(() => ({
  title: props.content.title,
  description: fill(props.content.description),
  path: props.path,
  jsonLd: breadcrumbLd([{ name: 'Home', path: '/' }, { name: props.content.title, path: props.path }]),
}))
</script>

<template>
  <div class="page-wash">
    <PageHeader :title="content.title" :subtitle="content.lead ? fill(content.lead) : undefined" :crumbs="[{ name: 'Home', path: '/' }, { name: content.title }]" />

    <div class="container-page pb-3 pt-5 sm:pb-4 sm:pt-12">
      <article class="mx-auto max-w-5xl divide-y divide-line/70">
        <section v-for="(sec, si) in sections" :key="si" class="grid gap-2 py-5 first:pt-0 sm:gap-3 sm:py-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-12 lg:py-10" :aria-label="sec.title || undefined">
          <h2 v-if="sec.title" class="text-[1.35rem] font-semibold leading-snug lg:sticky lg:top-28 lg:self-start">{{ fill(sec.title) }}</h2>
          <div class="prose-page min-w-0 max-w-[68ch]" :class="sec.title ? '' : 'lg:col-span-2 lg:max-w-none'">
            <template v-for="(b, i) in sec.blocks" :key="i">
              <h3 v-if="b.type === 'h3'">{{ fill(b.text) }}</h3>
              <p v-else-if="b.type === 'p'">{{ fill(b.text) }}</p>
              <ul v-else-if="b.type === 'ul'"><li v-for="(it, n) in b.items" :key="n">{{ fill(it) }}</li></ul>
              <ol v-else-if="b.type === 'ol'"><li v-for="(it, n) in b.items" :key="n">{{ fill(it) }}</li></ol>
              <p v-else-if="b.type === 'note'" class="flex gap-2.5 rounded-2xl bg-primary-soft px-4 py-3 text-sm text-primary-dark"><Info :size="17" class="mt-0.5 shrink-0" /><span>{{ fill(b.text) }}</span></p>
              <ul v-else-if="b.type === 'features'" class="!ml-0 grid max-w-none list-none gap-4 sm:grid-cols-2">
                <li v-for="(f, n) in b.items" :key="n" class="!my-0 flex gap-3.5 rounded-[var(--radius)] border border-line bg-white p-4 shadow-sm">
                  <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Check :size="18" /></span>
                  <div class="min-w-0"><p class="!m-0 font-semibold text-ink">{{ f.title }}</p><p class="!m-0 mt-1 text-sm leading-relaxed text-muted">{{ fill(f.text) }}</p></div>
                </li>
              </ul>
              <!-- the contact details of the admin panel (only what the shop filled in), and the pointer to the wholesale page -->
              <div v-else-if="b.type === 'contact'" class="grid gap-3 sm:grid-cols-2" data-testid="about-contact">
                <p v-if="store?.phone" class="!m-0 flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"><Phone :size="18" class="shrink-0 text-primary" /><a :href="`tel:${store.phone}`" class="font-medium">{{ store.phone }}</a></p>
                <p v-if="store?.email" class="!m-0 flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"><Mail :size="18" class="shrink-0 text-primary" /><a :href="`mailto:${store.email}`" class="min-w-0 truncate font-medium">{{ store.email }}</a></p>
                <p v-if="store?.address" class="!m-0 flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 sm:col-span-2"><MapPin :size="18" class="mt-0.5 shrink-0 text-primary" /><span class="whitespace-pre-line font-medium">{{ store.address }}</span></p>
                <p v-if="hours" class="!m-0 flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 sm:col-span-2"><Clock :size="18" class="shrink-0 text-primary" /><span class="font-medium">{{ hours }}</span></p>
                <p class="!m-0 text-sm text-muted sm:col-span-2">Buying in bulk or for a business? <NuxtLink to="/wholesale">Send a wholesale enquiry</NuxtLink>.</p>
              </div>
            </template>
          </div>
        </section>
      </article>

      <div v-if="cta" class="mx-auto mt-4 max-w-5xl overflow-hidden rounded-[26px] bg-primary-soft px-6 py-8 text-center sm:mt-6 sm:px-10 sm:py-12">
        <p class="text-[clamp(1.4rem,2.6vw,1.9rem)] font-semibold leading-snug">{{ fill(cta.text) }}</p>
        <NuxtLink :to="cta.to" class="btn btn-primary btn-lg mt-5">{{ cta.button }} <ArrowRight :size="18" /></NuxtLink>
      </div>
    </div>
  </div>
</template>
