/** Prices in the store currency. The amounts come from the API (never calculated here); this only formats them. */
export function useMoney() {
  const state = useSettingsState()
  function money(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return ''
    const c = state.value?.currency ?? { symbol: '$', decimals: 2 }
    const decimals = Math.max(0, Math.min(2, c.decimals))
    const text = Number(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    const symbol = c.symbol || ''
    return `${symbol}${/[a-z]/i.test(symbol) ? ' ' : ''}${text}`
  }
  return { money }
}

/** "20% off" from a compare price and a price (only used when the API gave no label). */
export function percentOff(price: number | null, compare: number | null): number {
  if (!price || !compare || compare <= price) return 0
  return Math.round(((compare - price) / compare) * 100)
}
