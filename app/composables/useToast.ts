export interface ToastItem { id: number; text: string; kind: 'success' | 'error' | 'info' }

let seq = 0

/** Small messages at the bottom of the screen ("Added to cart"). Shown by ToastHost in the layout. */
export function useToast() {
  const items = useState<ToastItem[]>('toasts', () => [])
  function push(text: string, kind: ToastItem['kind'] = 'success', ms = 3500) {
    if (!import.meta.client) return
    const id = ++seq
    items.value = [...items.value.slice(-2), { id, text, kind }]
    setTimeout(() => dismiss(id), ms)
  }
  function dismiss(id: number) { items.value = items.value.filter((t) => t.id !== id) }
  return { items, push, dismiss, success: (t: string) => push(t, 'success'), error: (t: string) => push(t, 'error', 5500) }
}
