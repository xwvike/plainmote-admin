import { XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { shortId } from '@/components/audit-table'
import { EmptyRow, Mono, Pager, PageHeader, ResourceStatus, Time } from '@/components/bits'
import { SearchBox, Segmented } from '@/components/filters'
import { ErrorAlert } from '@/components/request-error'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi } from '@/hooks/use-api'
import { useSearchState } from '@/hooks/use-search-state'
import { useFormat } from '@/lib/format'
import { resourceLabel, secondaryFilename } from '@/lib/resource-name'
import { ANONYMOUS_LOGIN, type List, type Resource } from '@/lib/types'

const SIZE = 20

export function ResourceKind({ resource }: { resource: Resource }) {
  const { t } = useTranslation()
  if (resource.kind === 'stored') return <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t('resources.stored')}</span>
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
      {t('resources.remote')} · <Mono>{resource.origin_host}</Mono>
    </span>
  )
}

/** The resource's name, or a marked placeholder when it has none. */
export function ResourceName({ resource }: { resource: Resource }) {
  const { t } = useTranslation()
  const label = resourceLabel(resource)
  if (label) return <>{label}</>
  return (
    <span className="font-normal text-muted-foreground">
      {t('resource.unnamed')} <Mono>{resource.id.slice(0, 8)}</Mono>
    </span>
  )
}

export function OwnerName({ resource }: { resource: Resource }) {
  const { t } = useTranslation()
  return resource.owner.login === ANONYMOUS_LOGIN ? <span className="text-muted-foreground">{t('resources.quickShare')}</span> : <>{resource.owner.login}</>
}

export function ResourcesPage() {
  const { t } = useTranslation()
  const f = useFormat()
  const navigate = useNavigate()
  const { values, page, set } = useSearchState(['q', 'status', 'owner'] as const)
  const { data, error, loading, reload } = useApi<List<Resource>>('resources', {
    q: values.q,
    status: values.status,
    owner: values.owner,
    page,
    size: SIZE,
  })
  const ownerLogin = data?.items[0]?.owner.id === values.owner ? data.items[0].owner.login : shortId(values.owner)

  return (
    <>
      <PageHeader title={t('resources.title')} description={t('resources.subtitle')} />
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={values.q} onChange={(q) => set({ q })} placeholder={t('resources.search')} />
        <Segmented
          label={t('resources.col.status')}
          value={values.status || 'all'}
          onChange={(v) => set({ status: v === 'all' ? '' : v })}
          options={[
            ['all', t('resources.filter.all')],
            ['active', t('resources.filter.active')],
            ['taken_down', t('resources.filter.taken_down')],
          ]}
        />
        {values.owner && (
          <span className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed pr-1 pl-3 text-[13px]">
            {t('resources.owner', { login: ownerLogin })}
            <Button size="icon-xs" variant="ghost" aria-label={t('resources.clearOwner')} onClick={() => set({ owner: '' })}>
              <XIcon />
            </Button>
          </span>
        )}
      </div>
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      <Card className={`gap-0 py-0 transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t('resources.col.resource')}</TableHead>
                <TableHead>{t('resources.col.owner')}</TableHead>
                <TableHead>{t('resources.col.kind')}</TableHead>
                <TableHead className="text-right">{t('resources.col.size')}</TableHead>
                <TableHead>{t('resources.col.version')}</TableHead>
                <TableHead className="text-right">{t('resources.col.liveLinks')}</TableHead>
                <TableHead>{t('resources.col.updated')}</TableHead>
                <TableHead className="pr-4">{t('resources.col.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.length === 0 && <EmptyRow colSpan={8}>{t('resources.empty')}</EmptyRow>}
              {!data && !error && <EmptyRow colSpan={8}>{t('common.loading')}</EmptyRow>}
              {data?.items.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => navigate(`/resources/${r.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/resources/${r.id}`)}
                >
                  <TableCell className="pl-4">
                    <div className="grid max-w-72">
                      <span className="truncate font-medium"><ResourceName resource={r} /></span>
                      {secondaryFilename(r) && <Mono className="truncate text-xs text-muted-foreground">{secondaryFilename(r)}</Mono>}
                    </div>
                  </TableCell>
                  <TableCell><OwnerName resource={r} /></TableCell>
                  <TableCell><ResourceKind resource={r} /></TableCell>
                  <TableCell className="text-right">{f.bytes(r.size)}</TableCell>
                  <TableCell>
                    v{r.version}
                    {r.history_versions > 0 && <span className="text-xs text-muted-foreground"> · {t('resources.earlier', { count: r.history_versions })}</span>}
                  </TableCell>
                  <TableCell className="text-right">{f.number(r.live_links)}</TableCell>
                  <TableCell><Time iso={r.updated_at} relative /></TableCell>
                  <TableCell className="pr-4"><ResourceStatus status={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data && <Pager page={page} size={SIZE} total={data.total} onPage={(p) => set({ page: p })} />}
      </Card>
    </>
  )
}
