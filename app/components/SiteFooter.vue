<script setup lang="ts">
import { site } from '~/config/site'

/** Dark teal footer (the primary colour darkened): logo and tagline, Quick Links, Support, Stay Connected, copyright and the tagline on the right. */
const { settings, store, storeName } = useSettings()
const year = new Date().getFullYear()
const copyright = computed(() => settings.value?.footer.copyright || `© ${year} ${storeName.value}. All rights reserved.`)
const links = computed(() => settings.value?.social_links ?? [])
const agency = computed(() => settings.value?.footer.agency ?? { name: '', url: '', logo_url: null })
const whatsapp = computed(() => settings.value?.footer.whatsapp_url)
</script>

<template>
  <footer class="mt-16 bg-footer text-white" data-testid="site-footer">
    <div class="container-page">
      <div class="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr] lg:gap-0">
        <div class="lg:pr-8">
          <BrandLogo light :height="58" />
          <p v-if="store?.tagline" class="mt-3 text-sm font-medium text-white/85">{{ store.tagline }}</p>
          <p v-if="settings?.footer.text" class="mt-3 max-w-xs text-sm text-white/65">{{ settings.footer.text }}</p>
        </div>

        <nav class="lg:border-l lg:border-white/15 lg:px-8" aria-label="Quick links">
          <h2 class="mb-3 text-[15px] font-semibold text-white" style="color:#fff">Quick Links</h2>
          <ul class="space-y-2 text-sm text-white/80">
            <li v-for="l in site.footer.quickLinks" :key="l.to"><NuxtLink :to="l.to" class="hover:text-white hover:underline">{{ l.label }}</NuxtLink></li>
          </ul>
        </nav>

        <nav class="lg:border-l lg:border-white/15 lg:px-8" aria-label="Support">
          <h2 class="mb-3 text-[15px] font-semibold" style="color:#fff">Support</h2>
          <ul class="space-y-2 text-sm text-white/80">
            <li v-for="l in site.footer.support" :key="l.to"><NuxtLink :to="l.to" class="hover:text-white hover:underline">{{ l.label }}</NuxtLink></li>
          </ul>
        </nav>

        <div class="lg:border-l lg:border-white/15 lg:pl-8">
          <h2 class="mb-3 text-[15px] font-semibold" style="color:#fff">Stay Connected</h2>
          <p class="text-sm text-white/80">{{ site.footer.followText }}</p>
          <ul v-if="links.length || whatsapp" class="mt-4 flex flex-wrap gap-3">
            <li v-for="l in links" :key="l.url">
              <a :href="l.url" target="_blank" rel="noopener noreferrer" class="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25" :aria-label="l.label"><SocialIcon :platform="l.platform" /></a>
            </li>
            <li v-if="whatsapp && !links.some((l) => l.platform === 'whatsapp')">
              <a :href="whatsapp" target="_blank" rel="noopener noreferrer" class="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25" aria-label="WhatsApp"><SocialIcon platform="whatsapp" /></a>
            </li>
          </ul>
          <ul v-if="store?.email || store?.phone || settings?.footer.support_hours" class="mt-4 space-y-1 text-sm text-white/70">
            <li v-if="store?.phone"><a :href="`tel:${store.phone}`" class="hover:text-white hover:underline">{{ store.phone }}</a></li>
            <li v-if="store?.email"><a :href="`mailto:${store.email}`" class="hover:text-white hover:underline">{{ store.email }}</a></li>
            <li v-if="settings?.footer.support_hours">{{ settings.footer.support_hours }}</li>
          </ul>
        </div>
      </div>

      <div class="flex flex-col items-center gap-3 border-t border-white/15 py-5 text-center text-[13px] text-white/75 sm:flex-row sm:justify-between sm:text-left">
        <p>{{ copyright }}</p>
        <!-- "Developed by": name, link and logo come from Settings → Footer & Social of the admin panel (no name = no credit) -->
        <component
          :is="agency.url ? 'a' : 'span'" v-if="agency.name" :href="agency.url || undefined" :target="agency.url ? '_blank' : undefined" :rel="agency.url ? 'noopener noreferrer' : undefined"
          class="inline-flex items-center gap-1.5 text-white/75" :class="agency.url ? 'hover:text-white' : ''" data-testid="agency-credit"
        >
          <span>Developed by</span>
          <img v-if="agency.logo_url" :src="agency.logo_url" :alt="agency.name" height="36" class="h-[36px] w-auto" loading="lazy" decoding="async">
          <strong v-else class="font-semibold text-white">{{ agency.name }}</strong>
        </component>
      </div>
    </div>
  </footer>
</template>
