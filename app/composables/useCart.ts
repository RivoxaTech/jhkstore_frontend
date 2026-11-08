import type { Cart } from '~/types'

/**
 * The server cart (docs/STOREFRONT-API.md section 5). The browser keeps only a random token in localStorage and sends it as the header X-Cart-Token;
 * the server holds the lines and prices them on EVERY read. Nothing is priced here: totals shown are the server's, never a sum made in the browser.
 * Client side only: the cart does not exist while the pages are generated.
 */
const TOKEN_KEY = 'jhk_cart_token'

export interface AddResult { ok: boolean; message?: string }

export function useCart() {
  const cart = useState<Cart | null>('cart', () => null)
  const loading = useState('cart-loading', () => false)
  const busy = useState('cart-busy', () => false)
  const loadError = useState<string>('cart-error', () => '')
  const drawerOpen = useState('cart-drawer', () => false)

  const count = computed(() => cart.value?.items_count ?? 0)
  const lines = computed(() => cart.value?.items ?? [])
  const warnings = computed(() => (cart.value?.items ?? []).flatMap((l) => l.warnings.map((w) => ({ ...w, line: l }))))

  const readToken = (): string => { try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' } }
  const saveToken = (t: string) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* private mode: the cart lives for this visit */ } }

  /** Calls a /cart endpoint with the token and keeps the answer (and a new token) as the cart. */
  async function call(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<Cart> {
    const token = readToken()
    const res = await api<{ data: Cart }>(`/cart${path}`, { method, body, query, headers: token ? { 'X-Cart-Token': token } : {} })
    cart.value = res.data
    if (res.data?.token && res.data.token !== token) saveToken(res.data.token)
    loadError.value = ''
    return res.data
  }

  /** Reads the cart, but only when the browser already has a token (an empty visitor does not create a cart on the server). */
  async function refresh(address?: { city?: string; area?: string; postcode?: string }) {
    if (!import.meta.client) return
    if (!readToken()) { cart.value = null; return }
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

  /** After an order the server has already emptied the cart: just read it again. */
  async function afterOrder() { await refresh() }

  return { cart, count, lines, warnings, loading, busy, loadError, drawerOpen, refresh, add, setQty, remove, applyCoupon, removeCoupon, afterOrder, token: readToken }
}
