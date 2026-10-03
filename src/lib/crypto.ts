// Signing for PlainMote's admin interface, following docs/admin.md in the
// PlainMote repository. Everything here runs on WebCrypto, so it works the
// same in the browser and under Node for tests.

export const SIGNATURE_LABEL = 'PLAINMOTE-ADMIN-V1'

const encoder = new TextEncoder()

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlDecode(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('not base64url')
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))
}

/** A private key as PlainMote's keygen writes it (RFC 8037). */
export interface PrivateJwk {
  kty: 'OKP'
  crv: 'Ed25519'
  x: string
  d: string
}

export type KeyProblem = 'not_json' | 'not_ed25519' | 'no_private_part' | 'mismatch' | 'unsupported'

export class KeyError extends Error {
  readonly problem: KeyProblem
  constructor(problem: KeyProblem) {
    super(problem)
    this.problem = problem
  }
}

/** Reads a JWK from pasted text or a file, and checks it is a whole Ed25519 private key. */
export function parsePrivateJwk(text: string): PrivateJwk {
  let value: unknown
  try {
    value = JSON.parse(text.trim())
  } catch {
    throw new KeyError('not_json')
  }
  const jwk = value as Partial<PrivateJwk> | null
  if (!jwk || typeof jwk !== 'object' || jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string') {
    throw new KeyError('not_ed25519')
  }
  if (typeof jwk.d !== 'string' || jwk.d === '') throw new KeyError('no_private_part')
  try {
    if (base64urlDecode(jwk.x).length !== 32 || base64urlDecode(jwk.d).length !== 32) throw new Error()
  } catch {
    throw new KeyError('not_ed25519')
  }
  return { kty: 'OKP', crv: 'Ed25519', x: jwk.x, d: jwk.d }
}

/** The key's name on the server: the first 16 hex digits of the public key's SHA-256. */
export async function keyIdOf(x: string): Promise<string> {
  return hex(await sha256(base64urlDecode(x))).slice(0, 16)
}

/**
 * Imports a private key so that it can sign and never be read back. A test
 * signature is checked against the JWK's public half, so a JWK whose x does
 * not belong to its d is refused here rather than at the server.
 */
export async function importPrivateKey(jwk: PrivateJwk): Promise<{ key: CryptoKey; keyId: string }> {
  let key: CryptoKey
  let publicKey: CryptoKey
  try {
    key = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['sign'])
    publicKey = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, { name: 'Ed25519' }, true, ['verify'])
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotSupportedError') throw new KeyError('unsupported')
    // Some engines check x against d on import (DataError); the lengths were
    // checked in parsePrivateJwk, so that is the likely cause.
    throw new KeyError(error instanceof DOMException && error.name === 'DataError' ? 'mismatch' : 'not_ed25519')
  }
  const probe = encoder.encode('plainmote-admin key check')
  const signature = await crypto.subtle.sign({ name: 'Ed25519' }, key, probe)
  if (!(await crypto.subtle.verify({ name: 'Ed25519' }, publicKey, signature, probe))) {
    throw new KeyError('mismatch')
  }
  return { key, keyId: await keyIdOf(jwk.x) }
}

export interface SignInput {
  key: CryptoKey
  keyId: string
  method: string
  /** Path and query exactly as sent, which is what the server's r.URL.RequestURI() sees. */
  target: string
  body: Uint8Array
  now?: Date
}

export async function signingString(method: string, target: string, timestamp: string, nonce: string, body: Uint8Array) {
  return [SIGNATURE_LABEL, method.toUpperCase(), target, timestamp, nonce, hex(await sha256(body))].join('\n')
}

/** The four headers that authenticate one request. */
export async function signRequest({ key, keyId, method, target, body, now = new Date() }: SignInput) {
  const timestamp = String(Math.floor(now.getTime() / 1000))
  const nonce = base64urlEncode(crypto.getRandomValues(new Uint8Array(18)))
  const message = encoder.encode(await signingString(method, target, timestamp, nonce, body))
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, key, message))
  return {
    'X-PlainMote-Key': keyId,
    'X-PlainMote-Timestamp': timestamp,
    'X-PlainMote-Nonce': nonce,
    'X-PlainMote-Signature': base64urlEncode(signature),
  }
}
