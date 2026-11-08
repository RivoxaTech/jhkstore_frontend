<script setup lang="ts">
import type { NuxtError } from '#app'
import { ArrowRight } from '@lucide/vue'

/** 404 and unexpected errors: a friendly page inside the normal layout. */
const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error?.statusCode === 404)
useHead({ title: notFound.value ? 'Page not found' : 'Something went wrong', meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <NuxtLayout>
    <section class="page-wash">
      <div class="container-page grid min-h-[55vh] place-items-center py-20 text-center">
        <div class="max-w-md">
          <p class="text-6xl font-bold text-primary">{{ notFound ? '404' : 'Oops' }}</p>
          <h1 class="mt-3 text-3xl font-semibold">{{ notFound ? 'We could not find that page' : 'Something went wrong' }}</h1>
          <p class="mt-3 text-muted">{{ notFound ? 'The toy or page you are looking for may have moved or is no longer here.' : 'Please try again in a moment.' }}</p>
          <div class="mt-7 flex flex-wrap justify-center gap-3">
            <button type="button" class="btn btn-primary btn-md" @click="clearError({ redirect: '/' })">Back to home</button>
            <button type="button" class="btn btn-outline btn-md" @click="clearError({ redirect: '/shop' })">Browse the shop <ArrowRight :size="16" /></button>
          </div>
        </div>
      </div>
    </section>
  </NuxtLayout>
</template>
