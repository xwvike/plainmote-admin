import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Filters and paging live in the address, so a list can be reloaded, shared
 * between tabs, and returned to with Back. Changing a filter goes back to the
 * first page.
 */
export function useSearchState<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams()
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>
  const page = Math.max(1, Number(params.get('page')) || 1)

  const set = useCallback(
    (changes: Partial<Record<K | 'page', string | number>>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value === '' || value === undefined || (key === 'page' && value === 1)) next.delete(key)
            else next.set(key, String(value))
          }
          if (!('page' in changes)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return { values, page, set }
}

/** Holds what is typed and hands it on after a pause. */
export function useDebounced(value: string, onSettle: (value: string) => void, delay = 300) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onSettle(draft), delay)
    return () => clearTimeout(timer)
  }, [draft, value, onSettle, delay])
  return [draft, setDraft] as const
}
