import type { Cart } from '~/types'

/**
 * The server cart (docs/STOREFRONT-API.md section 5). The browser keeps only a random token in localStorage and sends it as the header X-Cart-Token;
 * the server holds the lines and prices them on EVERY read. Nothing is priced here: totals shown are the server's, never a sum made in the browser.
 * Client side only: the cart does not exist while the pages are generated.
 */
const TOKEN_KEY = 'jhk_cart_token'

export interface AddResult { ok: boolean; message?: string }

// the read of the cart that is on its way (shared by everybody who asks while it runs)
let reading: Promise<void> | null = null
let emptied = 0   // counts the orders placed in this visit (see afterOrder)

export function useCart() {
  const cart = useState<Cart | null>('cart', () => null)
  const loading = useState('cart-loading', () => false)
  const busy = useState('cart-busy', () => false)
  const loadError = useState<string>('cart-error', () => '')
  const drawerOpen = useState('cart-drawer', () => false)
  const fetchedAt = useState('cart-at', () => 0)   // when the server last answered about this cart: opening the drawer within a few seconds does not ask again

  const count = computed(() => cart.value?.items_count ?? 0)
  const lines = computed(() => cart.value?.items ?? [])
  const warnings = computed(() => (cart.value?.items ?? []).flatMap((l) => l.warnings.map((w) => ({ ...w, line: l }))))

  const readToken = (): string => { try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' } }
  const saveToken = (t: string) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* private mode: the cart lives for this visit */ } }

  /** Calls a /cart endpoint with the token and keeps the answer (and a new token) as the cart. */
  async function call(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<Cart> {
    const token = readToken()
    const started = emptied
    const res = await api<{ data: Cart }>(`/cart${path}`, { method, body, query, headers: token ? { 'X-Cart-Token': token } : {} })
    if (started !== emptied && method === 'GET') return res.data   // an order emptied the cart while this read was on its way: the answer is out of date
    cart.value = res.data
    fetchedAt.value = Date.now()
    if (res.data?.token && res.data.token !== token) saveToken(res.data.token)
    loadError.value = ''
    return res.data
  }

  /**
   * Reads the cart, but only when the browser already has a token (an empty visitor does not create a cart on the server). The answer of every
   * add / change call already IS the latest cart, so a read within 15 seconds of it is skipped unless `force` is true.
   */
  async function refresh(address?: { city?: string; area?: string; postcode?: string }, force = false) {
    if (!import.meta.client) return
    if (!readToken()) { cart.value = null; return }
    if (!force && !address && cart.value && !loadError.value && Date.now() - fetchedAt.value < 15_000) return
    // two places ask at the same moment (the page and the drawer, the checkout and the layout): one call answers both
    if (!address && reading) return reading
    const run = (async () => {
      loading.value = true
      try {
        const q: Record<string, string> = {}
        for (const k of ['city', 'area', 'postcode'] as const) if (address?.[k]) q[k] = address[k] as string
        await call('GET', '', undefined, q)
      } catch (e) {
        loadError.value = apiFailure(e).message
      } finally {
        loading.value = false
      }
    })()
    if (!address) {
      reading = run
      run.finally(() => { if (reading === run) reading = null })
    }
    return run
  }

  async function add(variantId: number, qty = 1): Promise<AddResult> {
    busy.value = true
    try {
      await call('POST', '/items', { variant_id: variantId, qty })
      return { ok: true }
    } catch (e) {
      const f = apiFailure(e)
      return { ok: false, message: f.status === 422 ? firstError(f) : f.message }
    } finally {
      busy.value = false
    }
  }

  async function setQty(variantId: number, qty: number): Promise<AddResult> {
    busy.value = true
    try { await call('PUT', `/items/${variantId}`, { qty }); return { ok: true } } catch (e) { const f = apiFailure(e); return { ok: false, message: firstError(f) } } finally { busy.value = false }
  }

  async function remove(variantId: number): Promise<AddResult> {
    busy.value = true
    try { await call('DELETE', `/items/${variantId}`); return { ok: true } } catch (e) { return { ok: false, message: apiFailure(e).message } } finally { busy.value = false }
  }

  async function applyCoupon(code: string): Promise<AddResult> {
    busy.value = true
    try { await call('PUT', '/coupon', { code }); return { ok: true } } catch (e) {
      const f = apiFailure(e)
      return { ok: false, message: f.data?.coupon_error?.message || f.message }
    } finally { busy.value = false }
  }

  async function removeCoupon(): Promise<AddResult> {
    busy.value = true
    try { await call('DELETE', '/coupon'); return { ok: true } } catch (e) { return { ok: false, message: apiFailure(e).message } } finally { busy.value = false }
  }

  /**
   * Keeps the contact details the customer is typing on the cart (quietly, no spinner, errors ignored) so the shop can follow up a cart that is left behind
   * (Customers > Abandoned carts). Only for a browser that already has a cart; send only the pieces that are valid, the server refuses the whole call otherwise.
   */
  async function saveContact(contact: { name?: string; phone?: string; email?: string }) {
    if (!import.meta.client || !readToken() || !Object.keys(contact).length) return
    try { await call('PUT', '/contact', contact) } catch { /* optional: the order itself is never affected */ }
  }

  /**
   * After an order the server has already emptied the cart (PlaceOrder does it in the same transaction): show it empty at once and do not wait for a call.
   * The token stays (the empty cart on the server is reused); the next time the drawer or the cart page opens, it reads the cart again.
   */
  function afterOrder() { emptied++; reading = null; cart.value = null; fetchedAt.value = 0; loadError.value = '' }

  return { cart, count, lines, warnings, loading, busy, loadError, drawerOpen, refresh, add, setQty, remove, applyCoupon, removeCoupon, saveContact, afterOrder, token: readToken }
}
