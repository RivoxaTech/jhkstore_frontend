/**
 * Page data that does not travel again on every visit. Without this, every click on a link asked the API for the same lists again (and a slow API made the
 * whole site feel slow): going Home -> About -> Home fetched the home page twice.
 *
 *  - Inside `ttl` (a minute) after the browser fetched something, a page that needs it again gets it from memory, instantly.
 *  - A page that came out of the build (the HTML or the prerendered payload) is shown at once and checked once, with `refreshIfStale()`, so prices and
 *    stock are still live but a quick back-and-forth does not repeat the call.
 * A change of the key (a filter in the address) is a new question and is always fetched.
 */
const stamps = new Map<string, number>()   // browser only: when each key was last fetched live

export async function useFastData<T>(key: string, fetcher: () => Promise<T>, options: { ttl?: number } = {}) {
  const ttl = options.ttl ?? 60_000
  const res = await useAsyncData<T>(key, async () => {
    const value = await fetcher()
    if (import.meta.client) stamps.set(key, Date.now())
    return value
  }, {
    getCachedData(k, nuxtApp, ctx) {
      // A refresh that somebody asked for is ALWAYS a real call. This must come before the hydration check: a page's onMounted runs while Nuxt still counts
      // as hydrating, and answering that refresh from the baked data meant a page opened directly (a link, a search result, a reload) never got its live
      // price and stock, only a page reached by clicking inside the site did.
      if (ctx.cause === 'refresh:manual' || ctx.cause === 'refresh:hook' || ctx.cause === 'watch') return undefined
      if (nuxtApp.isHydrating) return nuxtApp.payload.data[k]
      const at = stamps.get(k)
      if (at && Date.now() - at < ttl) return nuxtApp.payload.data[k]
      return nuxtApp.static.data[k]   // the prerendered payload of a static page
    },
  })
  /** Asks the API again only when the data is older than `ttl` (or was never fetched live in this browser). */
  const refreshIfStale = async () => {
    const at = stamps.get(key)
    if (!at || Date.now() - at >= ttl) await res.refresh()
  }
  return { ...res, refreshIfStale }
}
