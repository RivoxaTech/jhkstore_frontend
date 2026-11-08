<script setup lang="ts">
import { Menu, Search, ShoppingCart, X } from '@lucide/vue'
import { site } from '~/config/site'

/**
 * Sticky header: logo left, the menu centred (the active page has an underline), search, cart. No account icon: customers have no accounts.
 * On the home page it is see-through while the page is at the top, so the hero picture runs under it, and turns solid as soon as the page is scrolled.
 */
const route = useRoute()
const cart = useCart()
const menuOpen = ref(false)
const searchOpen = ref(false)
const scrolled = ref(false)

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`))
watch(() => route.fullPath, () => { menuOpen.value = false; searchOpen.value = false })

// see-through only on the home page, at the top, with nothing open under it
const clear = computed(() => route.path === '/' && !scrolled.value && !menuOpen.value && !searchOpen.value)

function onScroll() { scrolled.value = window.scrollY > 24 }
onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) })
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header
    class="sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-200"
    :class="clear ? 'border-b border-transparent bg-gradient-to-b from-white/75 via-white/35 to-transparent' : 'border-b border-line/70 bg-white/92 shadow-[0_6px_24px_-18px_rgb(15_23_42/0.35)] backdrop-blur-md'"
    data-testid="site-header" :data-clear="clear"
  >
    <div class="container-page">
      <div class="flex h-16 items-center gap-3 md:grid md:h-[76px] md:grid-cols-[1fr_auto_1fr] md:gap-6">
        <!-- phone: menu button -->
        <button type="button" class="grid h-10 w-10 place-items-center rounded-full hover:bg-primary-soft md:hidden" :aria-expanded="menuOpen" aria-controls="mobile-menu" aria-label="Menu" @click="menuOpen = !menuOpen">
          <X v-if="menuOpen" :size="22" /><Menu v-else :size="22" />
        </button>

        <div class="flex min-w-0 flex-1 justify-center md:flex-none md:justify-start"><BrandLogo :height="52" /></div>

        <nav class="hidden items-center gap-9 md:flex" aria-label="Main">
          <NuxtLink
            v-for="l in site.nav" :key="l.to" :to="l.to"
            class="relative py-2 text-[14.5px] font-medium transition-colors hover:text-primary-dark" :class="isActive(l.to) ? 'text-primary-dark' : 'text-ink'"
            :aria-current="isActive(l.to) ? 'page' : undefined"
          >
            {{ l.label }}
            <span v-if="isActive(l.to)" class="absolute inset-x-0 -bottom-0.5 h-[2.5px] rounded-full bg-primary" aria-hidden="true" />
          </NuxtLink>
        </nav>

        <div class="flex items-center justify-end gap-2 md:gap-3">
          <div class="hidden w-[250px] md:block lg:w-[280px]"><SearchBox /></div>
          <button type="button" class="grid h-10 w-10 place-items-center rounded-full hover:bg-primary-soft md:hidden" :aria-expanded="searchOpen" aria-label="Search" @click="searchOpen = !searchOpen">
            <X v-if="searchOpen" :size="21" /><Search v-else :size="21" />
          </button>
          <button type="button" class="relative grid h-10 w-10 place-items-center rounded-full hover:bg-primary-soft" :aria-label="`Open the cart, ${cart.count.value} items`" data-testid="cart-button" @click="cart.drawerOpen.value = true">
            <ShoppingCart :size="22" />
            <span class="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary-btn px-1 text-[10.5px] font-bold leading-none text-primary-contrast" data-testid="cart-count">{{ cart.count.value }}</span>
          </button>
        </div>
      </div>

      <!-- phone: the search box opens under the bar -->
      <div v-if="searchOpen" class="pb-3 md:hidden"><SearchBox autofocus @done="searchOpen = false" /></div>
    </div>

    <!-- phone: the menu -->
    <nav v-if="menuOpen" id="mobile-menu" class="border-t border-line bg-white md:hidden" aria-label="Main">
      <ul class="container-page py-2">
        <li v-for="l in site.nav" :key="l.to">
          <NuxtLink :to="l.to" class="block rounded-xl px-3 py-3 text-base font-medium" :class="isActive(l.to) ? 'bg-primary-soft text-primary-dark' : 'text-ink'">{{ l.label }}</NuxtLink>
        </li>
      </ul>
    </nav>
  </header>
</template>
