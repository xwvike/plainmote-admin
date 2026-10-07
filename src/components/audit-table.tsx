import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router'
import { EmptyRow, Mono, Time } from '@/components/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFormat } from '@/lib/format'
import type { AuditEntry } from '@/lib/types'

const linkClass = 'text-primary underline-offset-4 hover:underline'

export function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id
}

function Target({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation()
  const types = t('audit.types', { returnObjects: true }) as Record<string, string>
  const label = entry.target_label || (
    <span className="text-muted-foreground" title={t('audit.noLabel')}>
      <Mono>{shortId(entry.target_id)}</Mono>
    </span>
  )
  const resourceId = typeof entry.detail?.resource_id === 'string' ? entry.detail.resource_id : null
  const deleted = entry.action === 'resource.delete' || entry.detail?.deleted === true
  let object = <>{label}</>
  if (entry.target_type === 'user') object = <RouterLink className={linkClass} to={`/users/${entry.target_id}`}>{label}</RouterLink>
  else if (entry.target_type === 'resource' && !deleted) object = <RouterLink className={linkClass} to={`/resources/${entry.target_id}`}>{label}</RouterLink>
  else if (entry.target_type === 'plan') object = <RouterLink className={linkClass} to="/plans">{label}</RouterLink>
  else if (entry.target_type === 'link' && resourceId) object = <RouterLink className={linkClass} to={`/resources/${resourceId}`}>{label}</RouterLink>
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{types[entry.target_type] ?? entry.target_type}</span>
      {object}
    </span>
  )
}

function Detail({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation()
  const f = useFormat()
  const d = entry.detail
  if (!d) return null
  let text: string | null = null
  if (typeof d.plan_name === 'string') {
    text = typeof d.expires_at === 'string'
      ? t('audit.detail.planUntil', { plan: d.plan_name, date: f.date(d.expires_at) })
      : t('audit.detail.plan', { plan: d.plan_name })
  } else if (typeof d.max_resources === 'number' && typeof d.max_storage === 'number') {
    text = t('audit.detail.limits', { resources: f.number(d.max_resources), storage: f.bytes(d.max_storage) })
  } else if (d.deleted === true) {
    text = t('audit.detail.quickShareDeleted')
  }
  return text ? <div className="text-xs text-muted-foreground">{text}</div> : null
}

/** Audit records; compact drops the key and source columns for detail pages. */
export function AuditTable({ entries, compact = false, empty }: { entries: AuditEntry[] | undefined; compact?: boolean; empty: string }) {
  const { t } = useTranslation()
  const actions = t('audit.actions', { returnObjects: true }) as Record<string, string>
  const columns = compact ? 4 : 6
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">{t('audit.col.at')}</TableHead>
            <TableHead>{t('audit.col.action')}</TableHead>
            <TableHead>{t('audit.col.target')}</TableHead>
            <TableHead className={compact ? 'pr-4' : undefined}>{t('audit.col.reason')}</TableHead>
            {!compact && <TableHead>{t('audit.col.key')}</TableHead>}
            {!compact && <TableHead className="pr-4">{t('audit.col.source')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries?.length === 0 && <EmptyRow colSpan={columns}>{empty}</EmptyRow>}
          {!entries && <EmptyRow colSpan={columns}>{t('common.loading')}</EmptyRow>}
          {entries?.map((entry) => (
            <TableRow key={entry.id} className="align-top">
              <TableCell className="pl-4 font-mono text-xs text-muted-foreground"><Time iso={entry.at} /></TableCell>
              <TableCell>
                <span className="inline-flex h-5 items-center rounded bg-muted px-1.5 text-xs font-medium" title={entry.action}>
                  {actions[entry.action] ?? entry.action}
                </span>
              </TableCell>
              <TableCell><Target entry={entry} /></TableCell>
              <TableCell className={`min-w-60 whitespace-normal ${compact ? 'pr-4' : ''}`}>
                <div className="max-w-prose">{entry.reason}</div>
                <Detail entry={entry} />
              </TableCell>
              {!compact && <TableCell><Mono className="text-xs text-muted-foreground">{entry.key}</Mono></TableCell>}
              {!compact && <TableCell className="pr-4"><Mono className="text-xs text-muted-foreground">{entry.remote_ip}</Mono></TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
