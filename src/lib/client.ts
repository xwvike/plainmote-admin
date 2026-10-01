import { signRequest } from './crypto'

const PREFIX = '_admin/v1/'

/** Where requests go and what signs them. */
export interface Signer {
  baseUrl: string
  keyId: string
  key: CryptoKey
}

/**
 * Why a request failed, as far as the page can tell:
 * - network: nothing came back - the service is down, or this origin is not in
 *   PLAINMOTE_ADMIN_ORIGINS and the browser withheld the response.
 * - rejected: the plain-text 404 the service gives any request it will not
 *   authenticate, identical to a path that does not exist.
 * - api: an authenticated request the service refused, with its error code.
 * - http: some other answer, usually a proxy in front of the service.
 */
export type FailureKind = 'network' | 'rejected' | 'api' | 'http'

export class RequestError extends Error {
  readonly kind: FailureKind
  readonly status: number
  readonly code: string
  constructor(kind: FailureKind, status = 0, code = '', message = '') {
    super(message || kind)
    this.kind = kind
    this.status = status
    this.code = code
  }
}

export type Query = Record<string, string | number | undefined | null>

/**
 * Builds the URL once, so the bytes signed are the bytes sent: the signature
 * covers pathname + search of this very URL object, and fetch sends its href.
 */
export function adminUrl(baseUrl: string, path: string, query?: Query): URL {
  const base = new URL(baseUrl)
  const url = new URL(base.pathname.replace(/\/*$/, '/') + PREFIX + path.replace(/^\/+/, ''), base.origin)
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(name, String(value))
  }
  url.search = params.toString()
  return url
}

export async function request<T>(
  signer: Signer,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  options: { query?: Query; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const url = adminUrl(signer.baseUrl, path, options.query)
  const body = options.body === undefined ? new Uint8Array() : new TextEncoder().encode(JSON.stringify(options.body))
  const headers: Record<string, string> = await signRequest({
    key: signer.key,
    keyId: signer.keyId,
    method,
    target: url.pathname + url.search,
    body,
  })
  if (body.length > 0) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(url.href, {
      method,
      headers,
      body: body.length > 0 ? (body as BodyInit) : undefined,
      signal: options.signal,
      credentials: 'omit',
      cache: 'no-store',
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new RequestError('network')
  }

  const isJson = (response.headers.get('Content-Type') ?? '').includes('application/json')
  if (!isJson) {
    throw new RequestError(response.status === 404 ? 'rejected' : 'http', response.status)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const fields = (data ?? {}) as { error?: string; message?: string }
    throw new RequestError('api', response.status, fields.error ?? 'unknown', fields.message ?? '')
  }
  return data as T
}
