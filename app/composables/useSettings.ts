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
  const storeName = computed(() => state.value?.store?.name || 'Store')
  const isClosed = computed(() => state.value ? state.value.store.open === false : false)
  return { settings, store, storeName, isClosed, state }
}

const THEME_DEFAULT_FONT = 'Inter'   // the default of Settings → Theme
const SHADOWS: Record<string, string> = {
  none: 'none',
  soft: '0 6px 24px -10px rgb(15 23 42 / 0.18)',
  medium: '0 14px 34px -12px rgb(15 23 42 / 0.32)',
}

function fontStack(name: string | undefined): string {
  if (!name || name === 'system-ui') return 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
  return `"${name}", ui-sans-serif, system-ui, sans-serif`
}

/** The theme of the API as the CSS variables of main.css. */
export function themeCss(s: Settings | null): string {
  const t = s?.theme
  if (!t) return ''
  const v: Record<string, string> = {
    '--c-primary': t.primary, '--c-primary-contrast': t.primary_contrast, '--c-accent': t.accent, '--c-bg': t.bg, '--c-surface': t.surface,
    '--c-text': t.text, '--c-muted': t.muted, '--c-border': t.border, '--radius': t.radius === '999px' ? '24px' : t.radius,
    '--shadow': SHADOWS[t.shadow] ?? SHADOWS.soft,
    '--c-primary-btn': t.primary, '--c-accent-btn': t.accent,   // the colours exactly as set in the admin panel (the text on them is the theme's `primary_contrast`)
    '--font-heading': fontStack(t.font_heading || THEME_DEFAULT_FONT), '--font-body': fontStack(t.font_body || THEME_DEFAULT_FONT),
  }
  // `html:root` is more specific than the defaults of main.css (`:root`), so the theme wins whatever the order of the style sheets is
  return `html:root{${Object.entries(v).map(([k, val]) => `${k}:${val}`).join(';')}}`
}
