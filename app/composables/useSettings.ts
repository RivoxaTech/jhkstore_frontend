import type { Settings } from '~/types'

/**
 * GET /settings: the one call everything else depends on. Fetched once at build time (kept in the page payload, so there is no request on page
 * load) and once more in the browser a moment after the page is shown, so `store.open` and the payment methods are current.
 */
export function useSettingsState() {
  return useState<Settings | null>('settings', () => null)
}

export function useSettings() {
  const state = useSettingsState()
  const settings = computed(() => state.value)
  const store = computed(() => state.value?.store)
  const storeName = computed(() => state.value?.store?.name || 'JHK Store')
  const isClosed = computed(() => state.value ? state.value.store.open === false : false)
  return { settings, store, storeName, isClosed, state }
}

const THEME_DEFAULT_FONT = 'Poppins'
const SHADOWS: Record<string, string> = {
  none: 'none',
  soft: '0 6px 24px -10px rgb(4 70 76 / 0.22)',
  medium: '0 14px 34px -12px rgb(4 70 76 / 0.38)',
}

function fontStack(name: string | undefined): string {
  if (!name || name === 'system-ui') return 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
  return `"${name}", ui-sans-serif, system-ui, sans-serif`
}

/** WCAG contrast ratio of two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
    const [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [Math.max(lum(a), lum(b)), Math.min(lum(a), lum(b))]
  return (hi + 0.05) / (lo + 0.05)
}

/** The colour itself when text of `fg` on it is readable (4.5:1), else the colour darkened in small steps until it is. */
export function readableOn(bg: string, fg: string, min = 4.5): string {
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16))
  const hex = () => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
  for (let i = 0; i < 30 && contrastRatio(hex(), fg) < min; i++) { r *= 0.94; g *= 0.94; b *= 0.94 }
  return hex()
}

/** The theme of the API as the CSS variables of main.css. */
export function themeCss(s: Settings | null): string {
  const t = s?.theme
  if (!t) return ''
  const v: Record<string, string> = {
    '--c-primary': t.primary, '--c-primary-contrast': t.primary_contrast, '--c-accent': t.accent, '--c-bg': t.bg, '--c-surface': t.surface,
    '--c-text': t.text, '--c-muted': t.muted, '--c-border': t.border, '--radius': t.radius === '999px' ? '24px' : t.radius,
    '--shadow': SHADOWS[t.shadow] ?? SHADOWS.soft,
    '--c-primary-btn': readableOn(t.primary, t.primary_contrast), '--c-accent-btn': readableOn(t.accent, '#FFFFFF'),
    '--font-heading': fontStack(t.font_heading || THEME_DEFAULT_FONT), '--font-body': fontStack(t.font_body || THEME_DEFAULT_FONT),
  }
  return `:root{${Object.entries(v).map(([k, val]) => `${k}:${val}`).join(';')}}`
}
