import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { request, type Query } from './client'
import {
  deleteTarget,
  listTargets,
  readActiveTargetId,
  saveTarget,
  writeActiveTargetId,
  type Target,
} from './targets'

type Method = 'GET' | 'POST' | 'DELETE'

export type Call = <T>(method: Method, path: string, options?: { query?: Query; body?: unknown; signal?: AbortSignal }) => Promise<T>

interface TargetState {
  ready: boolean
  targets: Target[]
  active: Target | null
  select: (id: string) => void
  save: (target: Target) => Promise<void>
  remove: (id: string) => Promise<void>
  /** Signs and sends a request to the active target. */
  call: Call
}

const TargetContext = createContext<TargetState | null>(null)

export function TargetProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [targets, setTargets] = useState<Target[]>([])
  const [activeId, setActiveId] = useState<string | null>(readActiveTargetId)

  useEffect(() => {
    listTargets()
      .then(setTargets)
      .catch(() => setTargets([]))
      .finally(() => setReady(true))
  }, [])

  const active = targets.find((t) => t.id === activeId) ?? targets[0] ?? null

  const select = useCallback((id: string) => {
    setActiveId(id)
    writeActiveTargetId(id)
  }, [])

  const save = useCallback(async (target: Target) => {
    await saveTarget(target)
    setTargets(await listTargets())
  }, [])

  const remove = useCallback(
    async (id: string) => {
      await deleteTarget(id)
      setTargets(await listTargets())
      if (id === activeId) {
        setActiveId(null)
        writeActiveTargetId(null)
      }
    },
    [activeId],
  )

  const call = useCallback<Call>(
    (method, path, options) => {
      if (!active) return Promise.reject(new Error('no target'))
      return request(active, method, path, options)
    },
    [active],
  )

  const value = useMemo(
    () => ({ ready, targets, active, select, save, remove, call }),
    [ready, targets, active, select, save, remove, call],
  )
  return <TargetContext.Provider value={value}>{children}</TargetContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useTargets(): TargetState {
  const state = useContext(TargetContext)
  if (!state) throw new Error('useTargets outside TargetProvider')
  return state
}
