import type { Order } from '~/types'

/**
 * What the browser remembers about the last order: its NUMBER in localStorage (so the tracking form can be filled in), and the order itself in sessionStorage
 * for this visit (so the success page still works after a reload). No token, nothing secret, and nothing is ever put in a URL.
 */
const LAST = 'jhk_last_order'
const phoneKey = (n: string) => `jhk_order_phone_${n}`
const orderKey = (n: string) => `jhk_order_${n}`

export function useOrderMemory() {
  function remember(order: Order, phone: string) {
    try {
      localStorage.setItem(LAST, order.order_number)
      sessionStorage.setItem(orderKey(order.order_number), JSON.stringify(order))
      sessionStorage.setItem(phoneKey(order.order_number), phone)
    } catch { /* private mode: the success page works for this visit only */ }
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
  return { remember, lastNumber, recall, update }
}
