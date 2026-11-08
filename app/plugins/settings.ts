import type { Settings } from '~/types'

/**
 * Loads GET /settings before the first page renders. At build time (server) the answer is remembered for a few minutes, so generating 100 pages
 * calls the API once; it ends up in the page payload, so the browser does not ask again for the first view. A moment after the page is shown the
 * browser asks once more (the store may have been closed, a payment method switched off since the build).
 */
let remembered: { at: number; value: Settings } | null = null

export default defineNuxtPlugin(async () => {
  const state = useSettingsState()

  if (import.meta.server && !state.value) {
    if (!import.meta.dev && remembered && Date.now() - remembered.at < 5 * 60 * 1000) {   // not in `nuxt dev`: a change made in the admin panel shows at once
      state.value = remembered.value
    } else {
      try {
        state.value = await api<Settings>('/settings')
        remembered = { at: Date.now(), value: state.value }
      } catch {
        state.value = remembered?.value ?? null   // the API is down: render with the default theme and texts
      }
    }
  }

  if (import.meta.client) {
    const refresh = async () => {
      try { state.value = await api<Settings>('/settings') } catch { /* keep what the build knew */ }
    }
    if (!state.value) await refresh()
    else setTimeout(refresh, 1200)
  }
})
