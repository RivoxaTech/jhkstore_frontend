import type { Order } from '~/types'

/**
 * What the browser remembers about the last order: its NUMBER in localStorage (so the tracking form can be filled in), and the order itself in sessionStorage
 * for this visit (so the success page still works after a reload). No token, nothing secret, and nothing is ever put in a URL.
 */
const LAST = 'jhk_last_order'
const phoneKey = (n: string) => `jhk_order_phone_${n}`
const orderKey = (n: string) => `jhk_order_${n}`
const atKey = (n: string) => `jhk_order_at_${n}`

export function useOrderMemory() {
  function remember(order: Order, phone: string) {
    try {
      localStorage.setItem(LAST, order.order_number)
      sessionStorage.setItem(orderKey(order.order_number), JSON.stringify(order))
      sessionStorage.setItem(phoneKey(order.order_number), phone)
      sessionStorage.setItem(atKey(order.order_number), String(Date.now()))
    } catch { /* private mode: the success page works for this visit only */ }
  }
  /** True when the order was remembered a moment ago (it was just placed or looked up): there is nothing newer to ask the server for. */
  function isJustNow(number: string, seconds = 15): boolean {
    try { return Date.now() - Number(sessionStorage.getItem(atKey(number)) || 0) < seconds * 1000 } catch { return false }
  }
  function lastNumber(): string { try { return localStorage.getItem(LAST) || '' } catch { return '' } }
  function recall(number: string): { order: Order; phone: string } | null {
    try {
      const raw = sessionStorage.getItem(orderKey(number))
      const phone = sessionStorage.getItem(phoneKey(number)) || ''
      return raw && phone ? { order: JSON.parse(raw) as Order, phone } : null
    } catch { return null }
  }
  function update(order: Order) { try { sessionStorage.setItem(orderKey(order.order_number), JSON.stringify(order)) } catch { /* ignore */ } }
  return { remember, lastNumber, recall, update, isJustNow }
}
