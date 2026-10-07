// Small pieces shared by every page.
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFormat } from '@/lib/format'
import type { Link } from '@/lib/types'
import { cn } from '@/lib/utils'

export type Tone = 'ok' | 'bad' | 'warn' | 'muted'

const TONES: Record<Tone, string> = {
  ok: 'bg-success/12 text-success',
  bad: 'bg-destructive/12 text-destructive',
  warn: 'bg-warning/15 text-warning',
  muted: 'bg-muted text-muted-foreground',
}

/** A state, carried by colour and a dot as well as the word. */
export function StatusBadge({ tone, children, dot = true }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap',
        TONES[tone],
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

export function UserStatus({ status }: { status: 'active' | 'suspended' }) {
  const { t } = useTranslation()
  return <StatusBadge tone={status === 'active' ? 'ok' : 'bad'}>{t(`status.${status}`)}</StatusBadge>
}

export function ResourceStatus({ status }: { status: 'active' | 'taken_down' }) {
  const { t } = useTranslation()
  return <StatusBadge tone={status === 'active' ? 'ok' : 'bad'}>{t(`status.${status}`)}</StatusBadge>
}

export function linkState(link: Link, now = Date.now()): 'live' | 'revoked' | 'expired' | 'exhausted' {
  if (link.revoked_at) return 'revoked'
  if (link.live) return 'live'
  if (link.expires_at && new Date(link.expires_at).getTime() <= now) return 'expired'
  return 'exhausted'
}

export function LinkStatus({ link }: { link: Link }) {
  const { t } = useTranslation()
  const state = linkState(link)
  return <StatusBadge tone={state === 'live' ? 'ok' : state === 'revoked' ? 'bad' : 'muted'}>{t(`status.${state}`)}</StatusBadge>
}

/** A bar of one or two parts against a whole; the second part is drawn lighter. */
export function Meter({ parts, max, className }: { parts: number[]; max: number; className?: string }) {
  return (
    <div className={cn('flex h-1.5 overflow-hidden rounded-full bg-muted', className)} role="presentation">
      {parts.map((part, i) => (
        <span
          key={i}
          className={i === 0 ? 'bg-chart-1' : 'bg-chart-2'}
          style={{ width: `${max > 0 ? Math.min(100, (part / max) * 100) : 0}%` }}
        />
      ))}
    </div>
  )
}

/** A time in the reader's zone, with the UTC original on hover. */
export function Time({ iso, relative = false, className }: { iso: string | null | undefined; relative?: boolean; className?: string }) {
  const f = useFormat()
  const { t } = useTranslation()
  if (!iso) return <span className={cn('text-muted-foreground', className)}>{t('common.never')}</span>
  return (
    <time dateTime={iso} title={`${iso.replace('T', ' ').replace(/\.\d+/, '').replace('Z', '')} UTC`} className={className}>
      {relative ? f.relative(iso) : f.dateTime(iso)}
    </time>
  )
}

export function Stat({ label, value, sub, children }: { label: string; value: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <Card className="gap-1 px-4 py-3.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      {children}
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </Card>
  )
}

export function Pager({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (page: number) => void }) {
  const { t } = useTranslation()
  const pages = Math.max(1, Math.ceil(total / size))
  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-[13px] text-muted-foreground">
      <span>
        {t('common.total', { count: total })}
        {pages > 1 && <> · {t('common.pageOf', { page, pages })}</>}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {t('common.previous')}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="flex flex-wrap items-center gap-2.5 text-xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Label/value pairs that line up down a card. */
export function Facts({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]">
      {items.map(([label, value], i) => (
        <div key={i} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Mono({ children, className }: { children?: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[0.92em]', className)}>{children}</span>
}

/** A row in a danger zone: what the action does, and the button that starts it. */
export function ZoneRow({ title, help, action }: { title: string; help: string; action: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="max-w-prose space-y-0.5">
        <div className="text-sm font-medium">{title}</div>
        <p className="text-xs text-muted-foreground">{help}</p>
      </div>
      {action}
    </div>
  )
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-[13px] text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}
