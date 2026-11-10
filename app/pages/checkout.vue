<script setup lang="ts">
import { Banknote, Check, Copy, CreditCard, ImageUp, LoaderCircle, ShieldCheck, TriangleAlert, X } from '@lucide/vue'
import type { Order, Quote } from '~/types'
import type { ApiFailure } from '~/composables/useApi'

/**
 * One-page checkout (client only, not indexed). The cart lives on the server: this page asks the server to price it (POST /checkout/quote) whenever the address
 * or the coupon changes and shows the server's totals, never a sum of its own. Placing the order sends an Idempotency-Key (created when the page opens, so a double
 * tap or a retry never makes two orders), the total the customer saw (a changed price is explained and has to be confirmed), and the hidden honeypot field `hp_extra`.
 * Bank transfer: the bank details and the amount are shown right here and the customer attaches the screenshot of the transfer; when the shop requires it
 * (Settings → Payments) the order cannot be placed without it. The order and the screenshot travel together (multipart).
 */
useSeo({ title: 'Checkout', path: '/checkout', noindex: true })
const cart = useCart()
const toast = useToast()
const memory = useOrderMemory()
const { settings, isClosed } = useSettings()
const { money } = useMoney()

const form = reactive({ name: '', phone: '', email: '', line1: '', city: '', area: '', postcode: '', landmark: '', country: '', note: '', payment: 'cod' as 'cod' | 'bank_transfer', hp_extra: '' })
const touched = ref(false)
const idempotencyKey = ref('')
const quote = ref<Quote | null>(null)
const quoting = ref(false)
const quoteError = ref('')
const submitting = ref(false)
const problem = ref<{ code: string; message: string; lines?: { variant_id: number; code: string; message: string }[] } | null>(null)
const priceChanged = ref<{ expected: number; current: number } | null>(null)
const couponCode = ref('')
const couponMessage = ref('')

const payment = computed(() => settings.value?.payment)
const codOn = computed(() => payment.value?.cod.enabled ?? true)
const bankOn = computed(() => payment.value?.bank_transfer.enabled ?? false)
const bank = computed(() => payment.value?.bank_transfer)
const proofRequired = computed(() => bankOn.value && (bank.value?.proof_required ?? false))
const cardVisible = computed(() => payment.value?.card.visible ?? false)
const summary = computed(() => quote.value?.summary ?? cart.cart.value?.summary)
const lines = computed(() => quote.value?.items ?? cart.lines.value)

function pickPayment() {
  if (form.payment === 'cod' && !codOn.value && bankOn.value) form.payment = 'bank_transfer'
  if (form.payment === 'bank_transfer' && !bankOn.value && codOn.value) form.payment = 'cod'
}

onMounted(async () => {
  idempotencyKey.value = crypto.randomUUID()
  form.country = settings.value?.store.country || ''
  pickPayment()
  await Promise.all([cart.refresh(), requote()])   // both only need the cart token: ask at the same time
})
watch([codOn, bankOn], pickPayment)

// ---- the server prices the cart; the address and phone decide delivery and coupon rules
let timer: ReturnType<typeof setTimeout> | undefined
async function requote() {
  if (!cart.token()) return
  quoting.value = true
  quoteError.value = ''
  try {
    const body: Record<string, any> = { cart_token: cart.token(), address: { city: form.city.trim(), area: form.area.trim(), postcode: form.postcode.trim() }, hp_extra: '' }
    if (form.phone.trim()) body.phone = form.phone.trim()
    quote.value = (await api<{ data: Quote }>('/checkout/quote', { method: 'POST', body })).data
  } catch (e) { quoteError.value = apiFailure(e).message } finally { quoting.value = false }
}
watch(() => [form.city, form.area, form.postcode, form.phone], () => { clearTimeout(timer); timer = setTimeout(requote, 600) })
onBeforeUnmount(() => clearTimeout(timer))

async function applyCoupon() {
  couponMessage.value = ''
  if (!couponCode.value.trim()) return
  const r = await cart.applyCoupon(couponCode.value.trim())
  if (r.ok) { couponCode.value = ''; toast.success('Coupon applied'); await requote() } else couponMessage.value = r.message || 'This coupon cannot be used'
}
async function dropCoupon() { await cart.removeCoupon(); await requote() }

// ---- the screenshot of a bank transfer
const MAX_PROOF = 4 * 1024 * 1024
const proof = ref<File | null>(null)
const proofPreview = ref('')
const proofError = ref('')
const proofReference = ref('')
const copied = ref('')
function pickProof(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  proofError.value = ''
  if (!f) return
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { proofError.value = 'Please choose a JPG, PNG or WEBP picture.'; input.value = ''; return }
  if (f.size > MAX_PROOF) { proofError.value = 'This picture is larger than 4 MB. Please choose a smaller one.'; input.value = ''; return }
  dropProof()
  proof.value = f
  proofPreview.value = URL.createObjectURL(f)
}
function dropProof() {
  if (proofPreview.value) URL.revokeObjectURL(proofPreview.value)
  proof.value = null
  proofPreview.value = ''
}
onBeforeUnmount(dropProof)
async function copy(text: string, id: string) {
  try { await navigator.clipboard.writeText(text); copied.value = id; setTimeout(() => { if (copied.value === id) copied.value = '' }, 1600) } catch { /* the number can still be selected by hand */ }
}

/** The order as multipart: nested fields as customer[name], address[city]... (the screenshot is one more part). */
function toFormData(value: Record<string, any>, fd = new FormData(), prefix = ''): FormData {
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined || v === null) continue
    const key = prefix ? `${prefix}[${k}]` : k
    if (v instanceof File) fd.append(key, v)
    else if (typeof v === 'object') toFormData(v, fd, key)
    else fd.append(key, String(v))
  }
  return fd
}

// ---- validation
const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = 'Please tell us your name.'
  if (!form.phone.trim()) e.phone = 'A phone number is needed so the courier can reach you.'
  else if (form.phone.replace(/\D/g, '').length < 7) e.phone = 'Please enter a valid phone number.'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Please enter a valid e-mail address, or leave it empty.'
  if (!form.line1.trim()) e.line1 = 'Please enter your street address.'
  if (!form.city.trim()) e.city = 'Please enter your city.'
  if (form.payment === 'bank_transfer' && proofRequired.value && !proof.value) e.proof = 'Please upload the screenshot of your transfer to place the order.'
  return e
})

const closed = computed(() => isClosed.value || problem.value?.code === 'store_closed')
const empty = computed(() => !cart.lines.value.length)
const canPlace = computed(() => !!quote.value?.can_checkout && !closed.value && !empty.value && !submitting.value)

async function place(confirmChange = false) {
  touched.value = true
  problem.value = null
  if (Object.keys(errors.value).length) { await nextTick(); (document.querySelector('[aria-invalid="true"]') ?? document.querySelector('[data-testid="proof-error"]'))?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return }
  if (confirmChange && priceChanged.value) { /* the total the customer now agrees to is the server's current one */ }
  submitting.value = true
  const expected = confirmChange && priceChanged.value ? priceChanged.value.current : quote.value?.summary.grand_total
  const body: Record<string, any> = {
    customer: { name: form.name.trim(), phone: form.phone.trim(), ...(form.email.trim() ? { email: form.email.trim() } : {}) },
    address: { line1: form.line1.trim(), city: form.city.trim(), area: form.area.trim() || undefined, postcode: form.postcode.trim() || undefined, landmark: form.landmark.trim() || undefined, country: form.country.trim() || undefined },
    cart_token: cart.token(),
    payment_method: form.payment,
    customer_note: form.note.trim() || undefined,
    expected_total: expected,
    hp_extra: form.hp_extra,   // the honeypot: a real visitor never fills it
  }
  const withProof = form.payment === 'bank_transfer' && !!proof.value
  if (withProof) { body.proof = proof.value; if (proofReference.value.trim()) body.reference = proofReference.value.trim() }
  try {
    const res = await api<{ data: Order }>('/orders', { method: 'POST', body: withProof ? toFormData(body) : body, headers: { 'Idempotency-Key': idempotencyKey.value } })
    priceChanged.value = null
    memory.remember(res.data, form.phone.trim())
    await cart.afterOrder()
    cart.drawerOpen.value = false
    await navigateTo(`/order/${res.data.order_number}`)
  } catch (e) {
    await explain(apiFailure(e))
  } finally { submitting.value = false }
}

/** Every error code of POST /orders, said clearly. */
async function explain(f: ApiFailure) {
  const code = f.code || ''
  if (f.status === 409 && code === 'price_changed') {
    priceChanged.value = { expected: Number(f.data?.expected_total), current: Number(f.data?.current_total) }
    await requote()
    return
  }
  if (f.status === 429) { problem.value = { code: 'rate_limited', message: f.message }; return }
  if (code === 'cart_invalid') { problem.value = { code, message: f.message || 'Some items in your cart can no longer be ordered.', lines: f.data?.lines ?? [] }; await cart.refresh(undefined, true); await requote(); return }
  if (code === 'below_min_order') { problem.value = { code, message: f.message || 'Your order is below the minimum order amount.' }; await requote(); return }
  if (code === 'cod_not_allowed') { problem.value = { code, message: f.message || 'Cash on delivery is not available for this order.' }; if (bankOn.value) form.payment = 'bank_transfer'; return }
  if (code === 'coupon_invalid') { problem.value = { code, message: f.data?.coupon_error?.message || f.message }; return }
  if (code === 'delivery_not_available') { problem.value = { code, message: f.message || 'We cannot deliver to this address yet.' }; await requote(); return }
  if (code === 'store_closed') { problem.value = { code, message: f.message || 'The shop is closed right now.' }; return }
  if (code === 'payment_method_unavailable') { problem.value = { code, message: 'This payment method is not available right now. Please choose another one.' }; try { settings.value && (useSettingsState().value = await api('/settings')) } catch { /* keep */ } pickPayment(); return }
  if (code === 'rejected') {
    // a browser that auto-filled the hidden trap field: empty it and send once more, the customer never notices
    if (form.hp_extra) { form.hp_extra = ''; submitting.value = false; await place(false); return }
    problem.value = { code, message: 'We could not place your order just now. Please try again in a moment, or call us and we will take it by phone.' }
    return
  }
  problem.value = { code: code || 'error', message: firstError(f) }
}

const showField = (k: string) => touched.value && errors.value[k]
const showProofError = computed(() => (touched.value && errors.value.proof) || proofError.value)
</script>

<template>
  <div class="page-wash">
    <PageHeader title="Checkout" :crumbs="[{ name: 'Home', path: '/' }, { name: 'Checkout' }]" />
    <div class="container-page pb-12 pt-7">

      <div v-if="empty && !cart.loading.value" class="card mx-auto max-w-lg px-6 py-14 text-center" data-testid="checkout-empty">
        <p class="text-xl font-semibold">Your cart is empty</p><p class="mt-1 text-muted">Add a toy to your cart to check out.</p>
        <NuxtLink to="/shop" class="btn btn-primary btn-lg mt-6">Start shopping</NuxtLink>
      </div>

      <form v-else class="mx-auto grid max-w-[1100px] grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]" novalidate data-testid="checkout-form" @submit.prevent="place(false)">
        <div class="space-y-6">
          <!-- what went wrong, in plain words -->
          <div v-if="closed" class="flex gap-2 rounded-2xl bg-[#fff4d6] px-4 py-3 text-sm text-[#7a5200]" role="alert" data-testid="closed-notice"><TriangleAlert :size="18" class="mt-0.5 shrink-0" /><span>{{ settings?.store.closed_message || 'The shop is closed right now, so we cannot take orders. You can still look around.' }}</span></div>
          <div v-if="priceChanged" class="rounded-2xl bg-[#fff4d6] px-4 py-4 text-sm text-[#7a5200]" role="alert" data-testid="price-changed">
            <p class="font-semibold">The price changed while you were checking out.</p>
            <p class="mt-1">The total was {{ money(priceChanged.expected) }}, it is now <strong>{{ money(priceChanged.current) }}</strong>. Please check your order, then confirm to place it at the new price.</p>
            <button type="button" class="btn btn-primary btn-md mt-3" :disabled="submitting" data-testid="confirm-price" @click="place(true)">Confirm and place order</button>
          </div>
          <div v-if="problem" class="rounded-2xl bg-[#fde8ec] px-4 py-4 text-sm text-[#9a1d33]" role="alert" :data-code="problem.code" data-testid="checkout-problem">
            <p class="flex items-start gap-2 font-semibold"><TriangleAlert :size="18" class="mt-0.5 shrink-0" /> {{ problem.message }}</p>
            <ul v-if="problem.lines?.length" class="mt-2 list-disc space-y-1 pl-9"><li v-for="l in problem.lines" :key="l.variant_id + l.code">{{ l.message }}</li></ul>
            <NuxtLink v-if="problem.code === 'cart_invalid'" to="/cart" class="mt-3 inline-block font-semibold underline">Go to your cart to fix this</NuxtLink>
            <button v-if="problem.code === 'coupon_invalid'" type="button" class="mt-3 block font-semibold underline" @click="dropCoupon().then(() => (problem = null))">Remove the coupon</button>
          </div>
          <p v-if="settings?.checkout.notice" class="rounded-2xl bg-primary-soft px-4 py-3 text-sm text-primary-dark" data-testid="checkout-notice">{{ settings.checkout.notice }}</p>

          <section class="card p-5 sm:p-7" aria-labelledby="contact-h">
            <h2 id="contact-h" class="mb-4 text-lg font-semibold">Your details</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <div><label class="field-label" for="name">Full name *</label><input id="name" v-model="form.name" class="field-input" autocomplete="name" :aria-invalid="!!showField('name')" data-testid="f-name"><p v-if="showField('name')" class="field-error">{{ errors.name }}</p></div>
              <div><label class="field-label" for="phone">Phone *</label><input id="phone" v-model="form.phone" type="tel" class="field-input" autocomplete="tel" :aria-invalid="!!showField('phone')" data-testid="f-phone"><p v-if="showField('phone')" class="field-error">{{ errors.phone }}</p></div>
              <div class="sm:col-span-2"><label class="field-label" for="email">E-mail <span class="font-normal text-muted">(optional)</span></label><input id="email" v-model="form.email" type="email" class="field-input" autocomplete="email" :aria-invalid="!!showField('email')" data-testid="f-email"><p v-if="showField('email')" class="field-error">{{ errors.email }}</p><p v-else class="field-hint">If you add an e-mail, we send you updates about your order.</p></div>
            </div>
          </section>

          <section class="card p-5 sm:p-7" aria-labelledby="address-h">
            <h2 id="address-h" class="mb-4 text-lg font-semibold">Delivery address</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2"><label class="field-label" for="line1">Street address *</label><input id="line1" v-model="form.line1" class="field-input" autocomplete="address-line1" :aria-invalid="!!showField('line1')" data-testid="f-line1"><p v-if="showField('line1')" class="field-error">{{ errors.line1 }}</p></div>
              <div><label class="field-label" for="city">City *</label><input id="city" v-model="form.city" class="field-input" autocomplete="address-level2" :aria-invalid="!!showField('city')" data-testid="f-city"><p v-if="showField('city')" class="field-error">{{ errors.city }}</p></div>
              <div><label class="field-label" for="area">Area <span class="font-normal text-muted">(optional)</span></label><input id="area" v-model="form.area" class="field-input" autocomplete="address-level3" data-testid="f-area"></div>
              <div><label class="field-label" for="postcode">Postcode <span class="font-normal text-muted">(optional)</span></label><input id="postcode" v-model="form.postcode" class="field-input" autocomplete="postal-code" data-testid="f-postcode"></div>
              <div><label class="field-label" for="country">Country</label><input id="country" v-model="form.country" class="field-input" autocomplete="country-name" data-testid="f-country"></div>
              <div class="sm:col-span-2"><label class="field-label" for="landmark">Landmark <span class="font-normal text-muted">(optional)</span></label><input id="landmark" v-model="form.landmark" class="field-input" placeholder="Near the park, next to the school..." data-testid="f-landmark"></div>
              <div class="sm:col-span-2"><label class="field-label" for="note">Note for the shop <span class="font-normal text-muted">(optional)</span></label><textarea id="note" v-model="form.note" rows="2" maxlength="500" class="field-textarea" placeholder="For example: please call before delivery" data-testid="f-note" /></div>
            </div>
          </section>

          <section class="card p-5 sm:p-7" aria-labelledby="pay-h">
            <h2 id="pay-h" class="mb-4 text-lg font-semibold">Payment</h2>
            <div class="grid gap-3" role="radiogroup" aria-labelledby="pay-h">
              <label v-if="codOn" class="flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] p-4 transition" :class="form.payment === 'cod' ? 'border-primary bg-primary-soft' : 'border-line hover:border-primary/50'">
                <input v-model="form.payment" type="radio" value="cod" class="mt-1 accent-[var(--c-primary)]" data-testid="pay-cod"><span><span class="flex items-center gap-2 font-semibold"><Banknote :size="18" class="text-primary" /> Cash on delivery</span><span class="block text-sm text-muted">Pay the courier when your order arrives.</span></span>
              </label>
              <div v-if="bankOn" class="rounded-2xl border-[1.5px] transition" :class="form.payment === 'bank_transfer' ? 'border-primary bg-primary-soft' : 'border-line hover:border-primary/50'">
                <label class="flex cursor-pointer items-start gap-3 p-4">
                  <input v-model="form.payment" type="radio" value="bank_transfer" class="mt-1 accent-[var(--c-primary)]" data-testid="pay-bank"><span><span class="flex items-center gap-2 font-semibold"><ShieldCheck :size="18" class="text-primary" /> Bank transfer</span><span class="block text-sm text-muted">Transfer the amount to our account, then upload the screenshot of the payment.</span></span>
                </label>

                <!-- the details and the upload appear as soon as bank transfer is chosen -->
                <div v-if="form.payment === 'bank_transfer'" class="space-y-5 border-t border-primary/20 px-4 pb-5 pt-4 sm:px-5" data-testid="bank-panel">
                  <div v-if="bank?.accounts.length">
                    <p class="text-xs font-bold uppercase tracking-wider text-muted">Our bank details</p>
                    <ul class="mt-2 space-y-3">
                      <li v-for="(a, i) in bank.accounts" :key="i" class="rounded-xl bg-white p-3.5 text-sm shadow-sm ring-1 ring-line" data-testid="bank-account">
                        <p class="font-semibold">{{ a.bank }}<span v-if="a.title" class="font-normal text-muted"> · {{ a.title }}</span></p>
                        <dl class="mt-2 space-y-1.5">
                          <div v-if="a.number" class="flex items-center justify-between gap-3"><dt class="text-muted">Account</dt><dd class="flex items-center gap-2 font-mono font-medium">{{ a.number }}<button type="button" class="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-primary-soft hover:text-primary-dark" :aria-label="`Copy the account number of ${a.bank}`" @click="copy(a.number, `n${i}`)"><Check v-if="copied === `n${i}`" :size="14" class="text-primary" /><Copy v-else :size="14" /></button></dd></div>
                          <div v-if="a.iban" class="flex items-center justify-between gap-3"><dt class="text-muted">IBAN</dt><dd class="flex items-center gap-2 break-all font-mono font-medium">{{ a.iban }}<button type="button" class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-primary-soft hover:text-primary-dark" :aria-label="`Copy the IBAN of ${a.bank}`" @click="copy(a.iban, `i${i}`)"><Check v-if="copied === `i${i}`" :size="14" class="text-primary" /><Copy v-else :size="14" /></button></dd></div>
                        </dl>
                      </li>
                    </ul>
                  </div>
                  <p v-if="bank?.instructions" class="whitespace-pre-line rounded-xl bg-white/70 px-3.5 py-2.5 text-sm" data-testid="bank-instructions">{{ bank.instructions }}</p>

                  <div v-if="summary" class="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-line" data-testid="bank-amount">
                    <div><p class="text-xs font-bold uppercase tracking-wider text-muted">Amount to transfer now</p><p v-if="summary.delivery_pending" class="mt-0.5 text-xs text-muted">The products total. The delivery fee is confirmed with you after you order.</p></div>
                    <p class="flex items-center gap-1.5 text-xl font-bold">{{ money(summary.grand_total) }}<button type="button" class="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-primary-soft hover:text-primary-dark" aria-label="Copy the amount" @click="copy(String(summary.grand_total), 'amount')"><Check v-if="copied === 'amount'" :size="14" class="text-primary" /><Copy v-else :size="14" /></button></p>
                  </div>

                  <div>
                    <p class="field-label">Payment screenshot <span v-if="proofRequired" class="text-[#b4233c]">*</span><span v-else class="font-normal text-muted">(optional, you can also add it later)</span></p>
                    <div class="rounded-xl border-[1.5px] border-dashed bg-white p-4" :class="showProofError ? 'border-[#d6455d]' : 'border-primary/40'">
                      <div class="flex items-center gap-4">
                        <span class="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-soft text-primary">
                          <img v-if="proofPreview" :src="proofPreview" alt="Preview of your payment screenshot" class="h-full w-full object-cover" data-testid="proof-preview"><ImageUp v-else :size="28" :stroke-width="1.6" />
                        </span>
                        <div class="min-w-0 flex-1 text-sm">
                          <p class="text-muted">A screenshot or photo of the transfer. JPG, PNG or WEBP, up to 4 MB.</p>
                          <div class="mt-2 flex flex-wrap items-center gap-2">
                            <label class="btn btn-outline btn-sm cursor-pointer"><ImageUp :size="14" /> {{ proof ? 'Change screenshot' : 'Choose screenshot' }}<input id="proof-file" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" data-testid="proof-file" @change="pickProof"></label>
                            <button v-if="proof" type="button" class="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-[#b4233c]" @click="dropProof"><X :size="13" /> Remove</button>
                            <span v-if="proof" class="truncate text-xs text-muted">{{ proof.name }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p v-if="showProofError" class="field-error" role="alert" data-testid="proof-error">{{ showProofError }}</p>
                    <div class="mt-3"><label class="field-label" for="proof-ref">Transaction reference <span class="font-normal text-muted">(optional)</span></label><input id="proof-ref" v-model="proofReference" maxlength="120" class="field-input" placeholder="The bank's transaction id"></div>
                  </div>
                </div>
              </div>

              <div v-if="cardVisible" class="flex items-start gap-3 rounded-2xl border-[1.5px] border-line p-4 opacity-60" aria-disabled="true"><input type="radio" disabled class="mt-1"><span><span class="flex items-center gap-2 font-semibold"><CreditCard :size="18" /> Card payment</span><span class="block text-sm text-muted">Coming soon.</span></span></div>
              <p v-if="!codOn && !bankOn" class="text-sm text-[#b4233c]" role="alert">No payment method is available right now. Please contact the shop.</p>
            </div>
          </section>
        </div>

        <aside class="card space-y-5 p-5 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 class="text-lg font-semibold">Your order</h2>
          <ul class="max-h-64 divide-y divide-line overflow-y-auto pr-1">
            <li v-for="l in lines" :key="l.variant_id" class="flex items-center gap-3 py-2.5">
              <span class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-primary-soft"><img v-if="l.thumb_url || l.image_url" :src="l.thumb_url || l.image_url || ''" :alt="l.name" width="48" height="48" class="h-full w-full object-cover" loading="lazy"><span class="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center rounded-bl-lg bg-ink/80 px-1 text-[10px] font-bold text-white">{{ l.qty }}</span></span>
              <span class="min-w-0 flex-1 text-sm"><span class="block truncate font-medium">{{ l.name }}</span><span v-if="l.warnings.length" class="block text-xs text-[#b4233c]">{{ l.warnings[0].message }}</span></span>
              <span class="text-sm font-semibold">{{ money(l.line_total) }}</span>
            </li>
          </ul>

          <div>
            <form v-if="!summary?.coupon_code" class="flex gap-2" @submit.prevent="applyCoupon">
              <label class="sr-only" for="coupon">Coupon code</label><input id="coupon" v-model="couponCode" class="field-input !py-1.5 !text-sm uppercase" placeholder="Coupon code" autocomplete="off" data-testid="coupon-input">
              <button type="submit" class="btn btn-outline btn-sm !h-9 shrink-0" :disabled="cart.busy.value || !couponCode.trim()" data-testid="coupon-apply">Apply</button>
            </form>
            <p v-else class="flex items-center justify-between rounded-xl bg-primary-soft px-3 py-2 text-sm"><span>Coupon <strong>{{ summary.coupon_code }}</strong> applied</span><button type="button" class="text-xs font-semibold underline" @click="dropCoupon">Remove</button></p>
            <p v-if="couponMessage" class="mt-2 text-sm text-[#b4233c]" role="alert" data-testid="coupon-error">{{ couponMessage }}</p>
            <p v-else-if="summary?.coupon_error" class="mt-2 text-sm text-[#b4233c]" role="alert">{{ summary.coupon_error.message }}</p>
          </div>

          <div :class="{ 'opacity-60': quoting }" aria-live="polite">
            <CartTotals v-if="summary" :summary="summary" />
            <p v-if="quote && !quote.can_checkout && quote.issues.length" class="mt-3 rounded-xl bg-[#fff4d6] px-3 py-2.5 text-sm text-[#7a5200]" role="alert" data-testid="quote-issue">{{ quote.issues[0].message }}</p>
            <p v-if="quoteError" class="mt-3 text-sm text-[#b4233c]" role="alert">{{ quoteError }} <button type="button" class="font-semibold underline" @click="requote">Try again</button></p>
          </div>
          <p v-if="settings?.checkout.eta_text && !summary?.delivery_zone?.eta_text" class="text-xs text-muted">Usual delivery time: {{ settings.checkout.eta_text }}</p>

          <!-- honeypot: invisible to people, filled by bots -->
          <div class="hp-field" aria-hidden="true"><label for="hp_extra">Leave this empty</label><input id="hp_extra" v-model="form.hp_extra" type="text" name="hp_extra" tabindex="-1" autocomplete="off"></div>

          <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="!canPlace || (!codOn && !bankOn)" data-testid="place-order">
            <LoaderCircle v-if="submitting" :size="18" class="animate-spin" /> {{ submitting ? 'Placing your order...' : closed ? 'The shop is closed' : 'Place order' }}
          </button>
          <p class="text-center text-xs text-muted">By placing your order you agree to our <NuxtLink to="/terms-and-conditions" class="underline">terms</NuxtLink> and <NuxtLink to="/privacy-policy" class="underline">privacy policy</NuxtLink>.</p>
        </aside>
      </form>
    </div>
  </div>
</template>
