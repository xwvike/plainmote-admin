import { createHash, generateKeyPairSync } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { adminUrl, request, RequestError } from './client'
import {
  base64urlDecode, base64urlEncode, importPrivateKey, KeyError, keyIdOf, parsePrivateJwk, signingString,
} from './crypto'

function freshJwk() {
  const { privateKey } = generateKeyPairSync('ed25519')
  return privateKey.export({ format: 'jwk' }) as { kty: string; crv: string; x: string; d: string }
}

describe('encoding', () => {
  it('round-trips base64url without padding', () => {
    for (const length of [0, 1, 2, 3, 18, 32, 64]) {
      const bytes = crypto.getRandomValues(new Uint8Array(length))
      const text = base64urlEncode(bytes)
      expect(text).not.toMatch(/[=+/]/)
      expect(base64urlDecode(text)).toEqual(bytes)
      expect(text).toBe(Buffer.from(bytes).toString('base64url'))
    }
  })
})

describe('keys', () => {
  it('names a key the way the server does', async () => {
    const jwk = freshJwk()
    const expected = createHash('sha256').update(Buffer.from(jwk.x, 'base64url')).digest('hex').slice(0, 16)
    expect(await keyIdOf(jwk.x)).toBe(expected)
    const { keyId, key } = await importPrivateKey(parsePrivateJwk(JSON.stringify(jwk)))
    expect(keyId).toBe(expected)
    expect(key.extractable).toBe(false)
  })

  it('refuses what is not a whole Ed25519 private key', async () => {
    const jwk = freshJwk()
    const problem = (text: string) => {
      try { parsePrivateJwk(text); return 'ok' } catch (e) { return (e as KeyError).problem }
    }
    expect(problem('nope')).toBe('not_json')
    expect(problem(JSON.stringify({ ...jwk, crv: 'X25519' }))).toBe('not_ed25519')
    expect(problem(JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x }))).toBe('no_private_part')
    const other = freshJwk()
    await expect(importPrivateKey(parsePrivateJwk(JSON.stringify({ ...jwk, x: other.x })))).rejects.toMatchObject({ problem: 'mismatch' })
  })
})

describe('signing', () => {
  it('builds the signing string from six lines without a trailing newline', async () => {
    const text = await signingString('get', '/_admin/v1/users?q=a+b', '1700000000', 'bm9uY2Vub25jZW5vbmNlbm9u', new Uint8Array())
    expect(text).toBe([
      'PLAINMOTE-ADMIN-V1', 'GET', '/_admin/v1/users?q=a+b', '1700000000', 'bm9uY2Vub25jZW5vbmNlbm9u',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    ].join('\n'))
  })

  it('signs the path and query exactly as they will be sent', () => {
    const url = adminUrl('https://example.com/', 'users', { q: 'mira chen/å', status: '', page: 2 })
    expect(url.pathname + url.search).toBe('/_admin/v1/users?q=mira+chen%2F%C3%A5&page=2')
    expect(new URL(url.href).search).toBe(url.search)
    expect(adminUrl('https://example.com/pm', '/overview').pathname).toBe('/pm/_admin/v1/overview')
  })
})

// Against a running PlainMote whose PLAINMOTE_ADMIN_KEYS holds the key in
// PLAINMOTE_ADMIN_TEST_KEY (a JWK file), e.g. the dev compose stack.
const liveUrl = process.env.PLAINMOTE_ADMIN_TEST_URL
const liveKey = process.env.PLAINMOTE_ADMIN_TEST_KEY
describe.skipIf(!liveUrl || !liveKey)('against a live service', () => {
  it('is accepted, and a stranger key is answered like a missing path', async () => {
    const own = await importPrivateKey(parsePrivateJwk(readFileSync(liveKey!, 'utf8')))
    const overview = await request<{ health: { database: string } }>({ baseUrl: liveUrl!, ...own }, 'GET', 'overview')
    expect(overview.health.database).toBe('ok')
    const users = await request<{ items: unknown[]; total: number }>({ baseUrl: liveUrl!, ...own }, 'GET', 'users', { query: { q: 'mi ra', size: 5 } })
    expect(Array.isArray(users.items)).toBe(true)
    const bad = await request({ baseUrl: liveUrl!, ...own }, 'POST', 'users/00000000-0000-0000-0000-00000000abcd/suspend', { body: { reason: '' } }).catch((e) => e)
    expect(bad).toBeInstanceOf(RequestError)
    expect(bad).toMatchObject({ kind: 'api', status: 400, code: 'bad_reason' })

    const stranger = await importPrivateKey(parsePrivateJwk(JSON.stringify(freshJwk())))
    const refused = await request({ baseUrl: liveUrl!, ...stranger }, 'GET', 'overview').catch((e) => e)
    expect(refused).toMatchObject({ kind: 'rejected', status: 404 })
  })
})
