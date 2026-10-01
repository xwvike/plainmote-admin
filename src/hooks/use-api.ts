import { useCallback, useEffect, useState } from 'react'
import type { Query } from '@/lib/client'
import { useTargets } from '@/lib/target-context'

export interface ApiState<T> {
  data?: T
  error?: unknown
  loading: boolean
  /** When the data on screen was fetched. */
  fetchedAt?: Date
  reload: () => void
}

/**
 * Fetches a GET endpoint of the active target, again whenever the path, the
 * query or the target changes. Data from the previous request stays on screen
 * while the next one loads, so paging and filtering do not flash.
 */
export function useApi<T>(path: string | null, query?: Query): ApiState<T> {
  const { active, call } = useTargets()
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean; fetchedAt?: Date }>({ loading: path !== null })
  const [generation, setGeneration] = useState(0)
  const queryKey = JSON.stringify(query ?? {})

  useEffect(() => {
    if (path === null || !active) return
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true }))
    call<T>('GET', path, { query: JSON.parse(queryKey) as Query, signal: controller.signal })
      .then((data) => setState({ data, loading: false, fetchedAt: new Date() }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState((s) => ({ ...s, error, loading: false }))
      })
    return () => controller.abort()
  }, [path, queryKey, active, call, generation])

  const reload = useCallback(() => setGeneration((g) => g + 1), [])
  return { ...state, reload }
}
