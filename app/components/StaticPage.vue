<script setup lang="ts">
import { ArrowRight, Check, Info } from '@lucide/vue'
import type { PageContent } from '~/content/types'

/**
 * One of the static information pages (About, Shipping, Returns, Terms, Privacy). The words live in app/content/*.ts, not in the admin panel and not in an API.
 * {store} {email} {phone} {address} {hours} in the text are replaced with the values of GET /settings.
 */
const props = defineProps<{ content: PageContent; path: string }>()
const { settings, storeName } = useSettings()

function fill(text: string): string {
  const s = settings.value
  const email = s?.store.email || 'our contact page'
  const phone = s?.store.phone || 'the number on our contact page'
  return text
    .replaceAll('{store}', storeName.value)
    .replaceAll('{email}', email)
    .replaceAll('{phone}', phone)
    .replaceAll('{address}', s?.store.address || 'our address on the contact page')
    .replaceAll('{hours}', s?.footer.support_hours ? `Support hours: ${s.footer.support_hours}.` : '')
    .trim()
}

useSeo(() => ({
  title: props.content.title,
  description: fill(props.content.description),
  path: props.path,
  jsonLd: breadcrumbLd([{ name: 'Home', path: '/' }, { name: props.content.title, path: props.path }]),
}))
</script>

<template>
  <div class="page-wash">
    <div class="container-page pb-6 pt-6 sm:pt-8">
      <Breadcrumbs :items="[{ name: 'Home', path: '/' }, { name: content.title }]" />
      <article class="mx-auto mt-6 max-w-3xl">
        <h1 class="text-4xl font-semibold sm:text-5xl">{{ content.title }}</h1>
        <p v-if="content.lead" class="mt-3 text-lg text-ink/80">{{ fill(content.lead) }}</p>

        <div class="prose-page mt-6">
          <template v-for="(b, i) in content.blocks" :key="i">
            <h2 v-if="b.type === 'h2'">{{ fill(b.text) }}</h2>
            <h3 v-else-if="b.type === 'h3'">{{ fill(b.text) }}</h3>
            <p v-else-if="b.type === 'p'">{{ fill(b.text) }}</p>
            <ul v-else-if="b.type === 'ul'"><li v-for="(it, n) in b.items" :key="n">{{ fill(it) }}</li></ul>
            <ol v-else-if="b.type === 'ol'"><li v-for="(it, n) in b.items" :key="n">{{ fill(it) }}</li></ol>
            <p v-else-if="b.type === 'note'" class="flex gap-2.5 rounded-2xl bg-primary-soft px-4 py-3 text-sm text-primary-dark"><Info :size="17" class="mt-0.5 shrink-0" /><span>{{ fill(b.text) }}</span></p>
            <ul v-else-if="b.type === 'features'" class="!ml-0 grid list-none gap-4 sm:grid-cols-2">
              <li v-for="(f, n) in b.items" :key="n" class="card-flat !my-0 flex gap-3 p-4"><Check :size="20" class="mt-0.5 shrink-0 text-primary" /><div><p class="!m-0 font-semibold text-ink">{{ f.title }}</p><p class="!m-0 mt-0.5 text-sm text-muted">{{ fill(f.text) }}</p></div></li>
            </ul>
            <div v-else-if="b.type === 'cta'" class="not-prose mt-8 rounded-[22px] bg-primary-soft px-6 py-8 text-center">
              <p class="!m-0 text-xl font-semibold text-ink">{{ b.text }}</p>
              <NuxtLink :to="b.to" class="btn btn-primary btn-lg mt-4 !no-underline">{{ b.button }} <ArrowRight :size="18" /></NuxtLink>
            </div>
          </template>
        </div>
      </article>
    </div>
  </div>
</template>
