<script setup lang="ts">
import { LoaderCircle, Send } from '@lucide/vue'
import type { Paginated, ProductCard } from '~/types'

/**
 * Wholesale (this is also the site's contact page): the ONE form of the site, a bulk / wholesale enquiry (POST /wholesale-requests, honeypot included),
 * centred on the page. There is no other contact form.
 */
const { storeName } = useSettings()
useSeo(() => ({
  title: 'Wholesale',
  description: `Wholesale and bulk orders at ${storeName.value}: tell us what you need and we will send you a price.`,
  path: '/wholesale',
  jsonLd: breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Wholesale', path: '/wholesale' }]),
}))

// the product list of the enquiry form is baked in at build time
const { data: products } = await useFastData('wholesale-products', () => api<Paginated<ProductCard>>('/products', { query: { per_page: 100, sort: 'newest' } }).then((r) => r.data))

const form = reactive({ name: '', phone: '', email: '', business_name: '', product: '' as string, product_name: '', quantity: '' as string | number, message: '', hp_extra: '' })
const busy = ref(false)
const done = ref('')
const error = ref('')
const fieldErrors = ref<Record<string, string>>({})

const chosen = computed(() => products.value?.find((p) => String(p.id) === form.product))

async function submit() {
  error.value = ''
  fieldErrors.value = {}
  const local: Record<string, string> = {}
  if (!form.name.trim()) local.name = 'Please tell us your name.'
  if (!form.phone.trim()) local.phone = 'Please enter a phone number so we can call you back.'
  if (!chosen.value && !form.product_name.trim()) local.product_name = 'Choose a toy or tell us what you are looking for.'
  if (!Number(form.quantity) || Number(form.quantity) < 1) local.quantity = 'Please enter how many you need.'
  if (Object.keys(local).length) { fieldErrors.value = local; return }

  busy.value = true
  const body: Record<string, any> = {
    name: form.name.trim(), phone: form.phone.trim(), quantity: Number(form.quantity), hp_extra: form.hp_extra,
    ...(form.email.trim() ? { email: form.email.trim() } : {}), ...(form.business_name.trim() ? { business_name: form.business_name.trim() } : {}),
    ...(form.message.trim() ? { message: form.message.trim() } : {}),
    ...(chosen.value && chosen.value.variant_id ? { product_id: chosen.value.id, variant_id: chosen.value.variant_id } : { product_name: form.product_name.trim() }),
  }
  try {
    const res = await api<{ data: { reference: string } }>('/wholesale-requests', { method: 'POST', body })
    done.value = res.data.reference
  } catch (e) {
    const f = apiFailure(e)
    if (f.status === 422 && f.code === 'rejected') {
      if (form.hp_extra) { form.hp_extra = ''; busy.value = false; await submit(); return }   // an auto-filled trap field: empty it and send once more
      error.value = 'We could not send your enquiry just now. Please try again in a moment, or call us.'
    }
    else if (f.status === 422) { fieldErrors.value = Object.fromEntries(Object.entries(f.errors).map(([k, v]) => [k, v[0]])); error.value = Object.keys(fieldErrors.value).length ? 'Please check the highlighted fields.' : f.message }
    else if (f.status === 429) error.value = `You have sent several enquiries already. Please try again ${f.retryAfter ? `in about ${Math.max(1, Math.ceil(f.retryAfter / 60))} minute(s)` : 'a little later'}, or call us.`
    else error.value = f.message
  } finally { busy.value = false }
}
</script>

<template>
  <div class="page-wash">
    <PageHeader title="Wholesale" subtitle="Buying for a shop, a school or an event? Tell us what you need and we will send you a price." :crumbs="[{ name: 'Home', path: '/' }, { name: 'Wholesale' }]" />
    <div class="container-page pb-6 pt-8 sm:pt-12">
      <div class="mx-auto max-w-3xl">
        <section class="card p-5 sm:p-8" aria-labelledby="bulk-h">
          <h2 id="bulk-h" class="text-xl font-semibold">Bulk &amp; wholesale enquiries</h2>
          <p class="mt-1 text-sm text-muted">Tell us what you need and how many. We will call you back with a price.</p>

          <div v-if="done" class="mt-6 rounded-2xl bg-primary-soft px-5 py-6 text-center" role="status" data-testid="bulk-success">
            <p class="text-lg font-semibold text-primary-dark">Thank you! We have your enquiry.</p>
            <p class="mt-1 text-sm">Your reference is <strong data-testid="bulk-reference">{{ done }}</strong>. We will contact you soon.</p>
          </div>

          <form v-else class="mt-6 grid gap-4 sm:grid-cols-2" novalidate data-testid="bulk-form" @submit.prevent="submit">
            <div><label class="field-label" for="b-name">Your name *</label><input id="b-name" v-model="form.name" class="field-input" autocomplete="name" :aria-invalid="!!fieldErrors.name" data-testid="b-name"><p v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</p></div>
            <div><label class="field-label" for="b-phone">Phone *</label><input id="b-phone" v-model="form.phone" type="tel" class="field-input" autocomplete="tel" :aria-invalid="!!fieldErrors.phone" data-testid="b-phone"><p v-if="fieldErrors.phone" class="field-error">{{ fieldErrors.phone }}</p></div>
            <div><label class="field-label" for="b-email">E-mail <span class="font-normal text-muted">(optional)</span></label><input id="b-email" v-model="form.email" type="email" class="field-input" autocomplete="email" :aria-invalid="!!fieldErrors.email"><p v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</p></div>
            <div><label class="field-label" for="b-business">Business name <span class="font-normal text-muted">(optional)</span></label><input id="b-business" v-model="form.business_name" class="field-input" autocomplete="organization"></div>
            <div class="sm:col-span-2">
              <label class="field-label" for="b-product">Which toy? *</label>
              <select id="b-product" v-model="form.product" class="field-select" data-testid="b-product"><option value="">Something else (describe it below)</option><option v-for="p in products" :key="p.id" :value="String(p.id)">{{ p.name }}</option></select>
            </div>
            <div v-if="!chosen" class="sm:col-span-2"><label class="field-label" for="b-pname">What are you looking for? *</label><input id="b-pname" v-model="form.product_name" class="field-input" placeholder="For example: wooden puzzles for a nursery" :aria-invalid="!!fieldErrors.product_name" data-testid="b-product-name"><p v-if="fieldErrors.product_name" class="field-error">{{ fieldErrors.product_name }}</p></div>
            <div><label class="field-label" for="b-qty">Quantity *</label><input id="b-qty" v-model="form.quantity" type="number" min="1" inputmode="numeric" class="field-input" :aria-invalid="!!fieldErrors.quantity" data-testid="b-quantity"><p v-if="fieldErrors.quantity" class="field-error">{{ fieldErrors.quantity }}</p></div>
            <div class="sm:col-span-2"><label class="field-label" for="b-msg">Message <span class="font-normal text-muted">(optional)</span></label><textarea id="b-msg" v-model="form.message" rows="3" maxlength="1000" class="field-textarea" placeholder="Delivery place, how often, anything we should know" /></div>
            <div class="hp-field" aria-hidden="true"><label for="b-hp">Leave this empty</label><input id="b-hp" v-model="form.hp_extra" type="text" name="hp_extra" tabindex="-1" autocomplete="off"></div>
            <p v-if="error" class="rounded-xl bg-[#fde8ec] px-4 py-3 text-sm text-[#9a1d33] sm:col-span-2" role="alert" data-testid="bulk-error">{{ error }}</p>
            <div class="sm:col-span-2"><button type="submit" class="btn btn-primary btn-lg" :disabled="busy" data-testid="bulk-submit"><LoaderCircle v-if="busy" :size="18" class="animate-spin" /><Send v-else :size="17" /> {{ busy ? 'Sending...' : 'Send my enquiry' }}</button></div>
          </form>
        </section>
      </div>
    </div>
  </div>
</template>
