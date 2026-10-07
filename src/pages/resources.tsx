import { ArrowRightIcon, ClockIcon, LockIcon, XIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router'
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

const tag = 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs whitespace-nowrap'

/** Where the content lives, and whether it is a quick share or encrypted. */
export function ResourceKind({ resource: r }: { resource: Resource }) {
  const { t } = useTranslation()
  const f = useFormat()
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`${tag} bg-muted text-muted-foreground`}>
        {r.kind === 'stored' ? t('resources.stored') : <>{t('resources.remote')} · <Mono>{r.origin_host}</Mono></>}
      </span>
      {r.expires_at && (
        <span className={`${tag} bg-warning/15 text-warning`} title={r.expires_at}>
          <ClockIcon className="size-3" />
          {t('resources.tagQuickShare')} · {t('resources.deletesAt', { time: f.relative(r.expires_at) })}
        </span>
      )}
      {r.encrypted && (
        <span className={`${tag} bg-accent text-accent-foreground`}>
          <LockIcon className="size-3" />
          {t('resources.tagEncrypted')}
        </span>
      )}
    </span>
  )
}

/** The resource's name, or a marked placeholder when it has none or it is encrypted. */
export function ResourceName({ resource }: { resource: Resource }) {
  const { t } = useTranslation()
  const label = resourceLabel(resource)
  if (label) return <>{label}</>
  return (
    <span className="font-normal text-muted-foreground">
      {resource.encrypted ? t('resource.encryptedLabel') : t('resource.unnamed')} <Mono>{resource.id.slice(0, 8)}</Mono>
    </span>
  )
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function OwnerName({ resource }: { resource: Resource }) {
  const { t } = useTranslation()
  return resource.owner.login === ANONYMOUS_LOGIN ? <span className="text-muted-foreground">{t('resources.quickShare')}</span> : <>{resource.owner.login}</>
}

export function ResourcesPage() {
  const { t } = useTranslation()
  const f = useFormat()
  const navigate = useNavigate()
  const { values, page, set } = useSearchState(['q', 'status', 'owner', 'kind', 'encrypted'] as const)
  const { data, error, loading, reload } = useApi<List<Resource>>('resources', {
    q: values.q,
    status: values.status,
    owner: values.owner,
    kind: values.kind,
    encrypted: values.encrypted,
    page,
    size: SIZE,
  })
  const ownerLogin = data?.items[0]?.owner.id === values.owner ? data.items[0].owner.login : shortId(values.owner)
  // The search matches names only; an ID, the way to reach an encrypted resource, is offered as a link.
  const idQuery = UUID.test(values.q.trim()) ? values.q.trim().toLowerCase() : null

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
        <Segmented
          label={t('resources.col.kind')}
          value={values.kind || 'all'}
          onChange={(v) => set({ kind: v === 'all' ? '' : v })}
          options={[
            ['all', t('resources.kindFilter.all')],
            ['resource', t('resources.kindFilter.resource')],
            ['quick_share', t('resources.kindFilter.quick_share')],
          ]}
        />
        <Button
          variant="outline"
          size="sm"
          className={values.encrypted ? 'border-primary/40 bg-accent text-primary hover:bg-accent' : undefined}
          aria-pressed={Boolean(values.encrypted)}
          onClick={() => set({ encrypted: values.encrypted ? '' : '1' })}
        >
          <LockIcon />
          {t('resources.encryptedOnly')}
        </Button>
        {values.owner && (
          <span className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed pr-1 pl-3 text-[13px]">
            {t('resources.owner', { login: ownerLogin })}
            <Button size="icon-xs" variant="ghost" aria-label={t('resources.clearOwner')} onClick={() => set({ owner: '' })}>
              <XIcon />
            </Button>
          </span>
        )}
      </div>
      {idQuery && (
        <RouterLink
          to={`/resources/${idQuery}`}
          className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-[13px] text-primary hover:bg-muted"
        >
          <ArrowRightIcon className="size-4" />
          <span>
            <Trans i18nKey="resources.openById" values={{ id: idQuery }} components={{ code: <Mono /> }} />
          </span>
        </RouterLink>
      )}
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
