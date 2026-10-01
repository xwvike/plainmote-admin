// Targets - a PlainMote service and the key that administers it - live in
// IndexedDB. The key is kept as a non-extractable CryptoKey: the browser
// stores it and signs with it, but no script can read its bytes back, and no
// plaintext JWK is ever written anywhere.

export interface Target {
  id: string
  name: string
  baseUrl: string
  keyId: string
  key: CryptoKey
  production: boolean
  createdAt: string
}

const DB_NAME = 'plainmote-admin'
const STORE = 'targets'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = action(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function listTargets(): Promise<Target[]> {
  const targets = await run<Target[]>('readonly', (store) => store.getAll())
  return targets.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function saveTarget(target: Target): Promise<IDBValidKey> {
  return run('readwrite', (store) => store.put(target))
}

export function deleteTarget(id: string): Promise<undefined> {
  return run('readwrite', (store) => store.delete(id))
}

/** Normalises what was typed as the service address to its origin plus any path. */
export function normaliseBaseUrl(text: string): string | null {
  let url: URL
  try {
    url = new URL(text.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password || url.search || url.hash) return null
  return url.origin + url.pathname.replace(/\/+$/, '')
}

// Which target this tab works on. The tab keeps its own choice, so two tabs can
// work on two targets; a new tab starts on the one used last.
const ACTIVE_KEY = 'plainmote-admin.target'

export function readActiveTargetId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_KEY) ?? localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function writeActiveTargetId(id: string | null) {
  try {
    for (const storage of [sessionStorage, localStorage]) {
      if (id) storage.setItem(ACTIVE_KEY, id)
      else storage.removeItem(ACTIVE_KEY)
    }
  } catch {
    // Storage may be unavailable (private windows); the choice then lasts
    // only as long as the page.
  }
}
