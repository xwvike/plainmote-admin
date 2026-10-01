import { AlertCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ActionDialog } from '@/components/action-dialog'
import { AuditTable } from '@/components/audit-table'
import { EmptyRow, Facts, LinkStatus, Mono, Pager, PageHeader, ResourceStatus, Time, ZoneRow } from '@/components/bits'
import { ErrorAlert } from '@/components/request-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi } from '@/hooks/use-api'
import { useFormat } from '@/lib/format'
import { resourceConfirmName, resourceTitle, secondaryFilename } from '@/lib/resource-name'
import { useTargets } from '@/lib/target-context'
import { ANONYMOUS_LOGIN, type AuditEntry, type Link, type List, type Resource } from '@/lib/types'
import { OwnerName, ResourceKind, ResourceName } from './resources'

const LINKS_SIZE = 20

type Dialog = 'takedown' | 'restore' | 'delete' | { revoke: Link } | null

export function ResourceDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const f = useFormat()
  const navigate = useNavigate()
  const { call } = useTargets()
  const [linksPage, setLinksPage] = useState(1)
  const resource = useApi<Resource>(`resources/${id}`)
  const links = useApi<List<Link>>(`resources/${id}/links`, { page: linksPage, size: LINKS_SIZE })
  const audit = useApi<List<AuditEntry>>('audit', { target: id, size: 10 })
  const [dialog, setDialog] = useState<Dialog>(null)

  const r = resource.data?.id === id ? resource.data : undefined
  if (!r) {
    return resource.error ? <ErrorAlert error={resource.error} onRetry={resource.reload} /> : <Skeleton className="h-64" />
  }

  const title = resourceTitle(r, t)
  const quickShare = r.owner.login === ANONYMOUS_LOGIN
  const after = (message: string) => {
    toast.success(message)
    resource.reload()
    links.reload()
    audit.reload()
  }

  return (
    <>
      <PageHeader
        title={<><ResourceName resource={r} /> <ResourceStatus status={r.status} /></>}
        description={
          <>
            {secondaryFilename(r) && <><Mono>{secondaryFilename(r)}</Mono> · </>}
            {r.content_type} · {t('resource.owner')}{' '}
            {quickShare ? <OwnerName resource={r} /> : <RouterLink className="text-primary underline-offset-4 hover:underline" to={`/users/${r.owner.id}`}>{r.owner.login}</RouterLink>}
            {' · '}<Mono className="text-xs">{r.id}</Mono>
          </>
        }
      />
      {resource.error ? <ErrorAlert error={resource.error} onRetry={resource.reload} /> : null}

      {r.status === 'taken_down' && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>{t('resource.takenDownTitle')}</AlertTitle>
          <AlertDescription>{t('resource.takenDownBody', { reason: r.takedown_reason })}</AlertDescription>
        </Alert>
      )}

      <Card className="gap-3">
        <CardHeader>
          <CardTitle>{t('resource.meta')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Facts
            items={[
              [t('resource.kind'), <ResourceKind key="k" resource={r} />],
              [t('resource.size'), f.bytes(r.size)],
              [t('resource.version'), `v${r.version}`],
              [t('resource.history'), t('resource.historyValue', { count: r.history_versions, size: f.bytes(r.history_bytes) })],
              [t('resource.liveLinks'), f.number(r.live_links)],
              [t('resource.created'), <Time key="c" iso={r.created_at} />],
              [t('resource.updated'), <Time key="u" iso={r.updated_at} />],
            ]}
          />
        </CardContent>
      </Card>

      <Card className="gap-2 py-0 pt-4">
        <CardHeader>
          <CardTitle>{t('resource.links')}</CardTitle>
        </CardHeader>
        {links.error ? <div className="px-4 pb-4"><ErrorAlert error={links.error} onRetry={links.reload} /></div> : null}
        <div className="overflow-x-auto">
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t('resource.col.name')}</TableHead>
                <TableHead>{t('resource.col.created')}</TableHead>
                <TableHead>{t('resource.col.expires')}</TableHead>
                <TableHead className="text-right">{t('resource.col.uses')}</TableHead>
                <TableHead>{t('resource.col.state')}</TableHead>
                <TableHead className="pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.data?.items.length === 0 && <EmptyRow colSpan={6}>{t('resource.linksEmpty')}</EmptyRow>}
              {links.data?.items.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="pl-4">{link.name || <span className="text-muted-foreground">{t('resource.unnamed')}</span>}</TableCell>
                  <TableCell><Time iso={link.created_at} /></TableCell>
                  <TableCell>{link.expires_at ? <Time iso={link.expires_at} /> : <span className="text-muted-foreground">{t('resource.noExpiry')}</span>}</TableCell>
                  <TableCell className="text-right">
                    {link.max_uses > 0
                      ? t('resource.uses', { used: f.number(link.used_count), max: f.number(link.max_uses) })
                      : t('resource.usesUnlimited', { used: f.number(link.used_count) })}
                  </TableCell>
                  <TableCell><LinkStatus link={link} /></TableCell>
                  <TableCell className="pr-4 text-right">
                    {link.live && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDialog({ revoke: link })}>
                        {t('resource.revokeLink')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {links.data && links.data.total > LINKS_SIZE && (
          <Pager page={linksPage} size={LINKS_SIZE} total={links.data.total} onPage={setLinksPage} />
        )}
      </Card>

      <Card className="gap-2 py-0 pt-4">
        <CardHeader>
          <CardTitle>{t('resource.audit')}</CardTitle>
        </CardHeader>
        <AuditTable entries={audit.data?.items} compact empty={t('resource.noAudit')} />
      </Card>

      <Card className="gap-3 border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">{t('resource.zone')}</CardTitle>
        </CardHeader>
        <CardContent>
          {r.status === 'active' ? (
            <ZoneRow
              title={t('resource.takedown')}
              help={quickShare ? t('resource.takedownQuick') : t('resource.takedownHelp')}
              action={<Button size="sm" variant="outline" className="text-destructive" onClick={() => setDialog('takedown')}>{t('resource.takedown')}…</Button>}
            />
          ) : (
            <ZoneRow
              title={t('resource.restore')}
              help={t('resource.restoreHelp')}
              action={<Button size="sm" variant="outline" onClick={() => setDialog('restore')}>{t('resource.restore')}…</Button>}
            />
          )}
          <ZoneRow
            title={t('resource.delete')}
            help={t('resource.deleteHelp')}
            action={<Button size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => setDialog('delete')}>{t('resource.delete')}…</Button>}
          />
        </CardContent>
      </Card>

      <ActionDialog
        open={dialog === 'takedown'}
        onOpenChange={() => setDialog(null)}
        title={quickShare ? t('resource.dialog.takedownQuickTitle', { name: title }) : t('resource.dialog.takedownTitle', { name: title })}
        description={
          quickShare ? (
            t('resource.takedownQuick')
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              <li>{t('resource.dialog.takedownPoint1', { count: r.live_links })}</li>
              <li>{t('resource.dialog.takedownPoint2')}</li>
            </ul>
          )
        }
        confirmLabel={t('resource.takedown')}
        destructive
        shownToUser={!quickShare}
        confirmName={quickShare ? resourceConfirmName(r) : undefined}
        onConfirm={async (reason) => {
          const result = await call<Resource | { deleted: true }>('POST', `resources/${r.id}/takedown`, { body: { reason } })
          if ('deleted' in result) {
            toast.success(t('resource.done.takedownDeleted', { name: title }))
            navigate('/resources')
          } else {
            after(t('resource.done.takedown', { name: title }))
          }
        }}
      />
      <ActionDialog
        open={dialog === 'restore'}
        onOpenChange={() => setDialog(null)}
        title={t('resource.dialog.restoreTitle', { name: title })}
        description={t('resource.dialog.restoreBody')}
        confirmLabel={t('resource.restore')}
        onConfirm={async (reason) => {
          await call('POST', `resources/${r.id}/restore`, { body: { reason } })
          after(t('resource.done.restore', { name: title }))
        }}
      />
      <ActionDialog
        open={dialog === 'delete'}
        onOpenChange={() => setDialog(null)}
        title={t('resource.dialog.deleteTitle', { name: title })}
        description={t('resource.dialog.deleteBody', { versions: r.history_versions })}
        confirmLabel={t('resource.delete')}
        destructive
        confirmName={resourceConfirmName(r)}
        onConfirm={async (reason) => {
          await call('DELETE', `resources/${r.id}`, { body: { reason } })
          toast.success(t('resource.done.delete', { name: title }))
          navigate('/resources')
        }}
      />
      <ActionDialog
        open={typeof dialog === 'object' && dialog !== null}
        onOpenChange={() => setDialog(null)}
        title={typeof dialog === 'object' && dialog ? t('resource.dialog.revokeLinkTitle', { name: dialog.revoke.name || t('resource.unnamed') }) : ''}
        description={t('resource.dialog.revokeLinkBody')}
        confirmLabel={t('resource.revokeLink')}
        destructive
        onConfirm={async (reason) => {
          if (typeof dialog !== 'object' || !dialog) return
          await call('POST', `links/${dialog.revoke.id}/revoke`, { body: { reason } })
          after(t('resource.done.revokeLink'))
        }}
      />
    </>
  )
}
