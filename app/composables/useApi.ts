/**
 * Every call to the Laravel API goes through here (build time on the server, live in the browser). The base address is NUXT_PUBLIC_API_BASE.
 * Cart calls add the X-Cart-Token header themselves (useCart); nothing here knows about tokens, and no token ever goes into a URL.
 */
export interface ApiFailure {
  status: number
  code: string | null
  message: string
  errors: Record<string, string[]>
  data: any
  retryAfter: number | null
}

// read once (it never changes while the site runs): a call made after an `await`, where Nuxt has lost its context, can then still use it
let base = ''
export function apiBase(): string {
  if (!base) base = String(useRuntimeConfig().public.apiBase).replace(/\/$/, '')
  return base
}

export async function api<T = any>(path: string, options: Record<string, any> = {}): Promise<T> {
  const headers = { Accept: 'application/json', ...(options.headers || {}) }
  return await ($fetch as any)(apiBase() + path, { ...options, headers })
}

/** The failure of a call, in one shape: HTTP status, the stable `code` of checkout errors, a message a person can read, field errors. */
export function apiFailure(error: any): ApiFailure {
  const status = Number(error?.statusCode ?? error?.status ?? error?.response?.status ?? 0)
  const data = error?.data ?? error?.response?._data ?? null
  const retry = Number(error?.response?.headers?.get?.('retry-after') ?? 0)
  const errors: Record<string, string[]> = data?.errors && typeof data.errors === 'object' ? data.errors : {}
  let message: string = typeof data?.message === 'string' ? data.message : ''
  if (!status) message = 'We could not reach the shop. Check your connection and try again.'
  else if (status === 429) message = `Too many tries. Please wait ${retry ? `${retry} seconds` : 'a moment'} and try again.`
  else if (status >= 500) message = 'Something went wrong on our side. Please try again in a moment.'
  else if (!message) message = 'Something went wrong. Please try again.'
  return { status, code: data?.code ?? null, message, errors, data, retryAfter: retry || null }
}

/** The first field error of a 422, else the message. */
export function firstError(f: ApiFailure): string {
  const first = Object.values(f.errors)[0]
  return (Array.isArray(first) && first[0]) || f.message
}
