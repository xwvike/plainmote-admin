import { ShieldCheckIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router'
import { toast } from 'sonner'
import { ActionDialog } from '@/components/action-dialog'
import { Facts, LinkStatus, Mono, PageHeader, ResourceStatus, Time } from '@/components/bits'
import { ErrorAlert } from '@/components/request-error'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RequestError } from '@/lib/client'
import { useFormat } from '@/lib/format'
import { resourceConfirmName, resourceTitle, secondaryFilename } from '@/lib/resource-name'
import { useTargets } from '@/lib/target-context'
import { ANONYMOUS_LOGIN, type Lookup, type Resource } from '@/lib/types'
import { OwnerName, ResourceName } from './resources'

export function LookupPage() {
  const { t } = useTranslation()
  const f = useFormat()
  const { call } = useTargets()
  const id = useId()
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Lookup | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [dialog, setDialog] = useState<'revoke' | 'takedown' | null>(null)

  // The address is kept only long enough to send it; the result is looked up
  // again after an action through the link's own ID, never through the address.
  async function lookUp(event: React.FormEvent) {
    event.preventDefault()
    const link = address.trim()
    if (!link || busy) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      setResult(await call<Lookup>('POST', 'lookup', { body: { link } }))
    } catch (e) {
      setError(e)
    } finally {
      setAddress('')
      setBusy(false)
    }
  }

  const notFound = error instanceof RequestError && error.kind === 'api' && error.code === 'not_found'

  return (
    <>
      <PageHeader title={t('lookup.title')} description={t('lookup.subtitle')} />
      <Card>
        <CardContent>
          <form onSubmit={lookUp}>
            <Field>
              <FieldLabel htmlFor={`${id}-link`}>{t('lookup.label')}</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id={`${id}-link`}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('lookup.placeholder')}
                  className="font-mono"
                  spellCheck={false}
                />
                <Button type="submit" disabled={busy || address.trim() === ''}>
                  {busy ? t('common.working') : t('lookup.submit')}
                </Button>
              </div>
              <FieldDescription className="flex gap-2 text-xs">
                <ShieldCheckIcon className="mt-px size-3.5 shrink-0" />
                {t('lookup.privacy')}
              </FieldDescription>
            </Field>
          </form>
        </CardContent>
      </Card>

      {notFound ? (
        <Card className="px-4 py-6 text-center text-[13px] text-muted-foreground">{t('lookup.notFound')}</Card>
      ) : error ? (
        <ErrorAlert error={error} />
      ) : null}

      {result && <LookupResult result={result} onRevoke={() => setDialog('revoke')} onTakedown={() => setDialog('takedown')} format={f} />}

      {result && (
        <>
          <ActionDialog
            open={dialog === 'revoke'}
            onOpenChange={() => setDialog(null)}
            title={t('resource.dialog.revokeLinkTitle', { name: result.link.name || t('resource.unnamed') })}
            description={t('resource.dialog.revokeLinkBody')}
            confirmLabel={t('resource.revokeLink')}
            destructive
            onConfirm={async (reason) => {
              await call('POST', `links/${result.link.id}/revoke`, { body: { reason } })
              toast.success(t('resource.done.revokeLink'))
              setResult({ ...result, link: { ...result.link, revoked_at: new Date().toISOString(), live: false } })
            }}
          />
          <TakedownFromLookup
            open={dialog === 'takedown'}
            resource={result.resource}
            onClose={() => setDialog(null)}
            onDone={(updated) => setResult(updated ? { ...result, resource: updated } : null)}
          />
        </>
      )}
    </>
  )
}

function LookupResult({ result, onRevoke, onTakedown, format: f }: { result: Lookup; onRevoke: () => void; onTakedown: () => void; format: ReturnType<typeof useFormat> }) {
  const { t } = useTranslation()
  const { link, resource: r } = result
  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>{t('lookup.link')}</CardTitle>
          <CardAction><LinkStatus link={link} /></CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Facts
            items={[
              [t('lookup.name'), link.name || <span key="n" className="text-muted-foreground">{t('resource.unnamed')}</span>],
              [t('lookup.created'), <Time key="c" iso={link.created_at} />],
              [t('lookup.expires'), link.expires_at ? <Time key="e" iso={link.expires_at} /> : t('resource.noExpiry')],
              [
                t('lookup.uses'),
                link.max_uses > 0
                  ? t('resource.uses', { used: f.number(link.used_count), max: f.number(link.max_uses) })
                  : t('resource.usesUnlimited', { used: f.number(link.used_count) }),
              ],
              [t('lookup.linkId'), <Mono key="i" className="text-xs">{link.id}</Mono>],
            ]}
          />
          {link.live && (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" className="text-destructive" onClick={onRevoke}>
                {t('resource.revokeLink')}…
              </Button>
              <span className="text-xs text-muted-foreground">{t('lookup.revokeHelp')}</span>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>{t('lookup.resource')}</CardTitle>
          <CardAction><ResourceStatus status={r.status} /></CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Facts
            items={[
              [
                t('resources.col.resource'),
                <span key="r">
                  <RouterLink className="text-primary underline-offset-4 hover:underline" to={`/resources/${r.id}`}><ResourceName resource={r} /></RouterLink>
                  {secondaryFilename(r) && <Mono className="ml-2 text-xs text-muted-foreground">{secondaryFilename(r)}</Mono>}
                </span>,
              ],
              [
                t('resource.owner'),
                r.owner.login === ANONYMOUS_LOGIN ? (
                  <OwnerName key="o" resource={r} />
                ) : (
                  <RouterLink key="o" className="text-primary underline-offset-4 hover:underline" to={`/users/${r.owner.id}`}>{r.owner.login}</RouterLink>
                ),
              ],
              [t('resource.size'), `${f.bytes(r.size)} · v${r.version}`],
              [t('resource.liveLinks'), f.number(r.live_links)],
            ]}
          />
          {r.status === 'active' && (
            <div>
              <Button size="sm" variant="outline" className="text-destructive" onClick={onTakedown}>
                {t('resource.takedown')}…
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TakedownFromLookup({ open, resource: r, onClose, onDone }: { open: boolean; resource: Resource; onClose: () => void; onDone: (updated: Resource | null) => void }) {
  const { t } = useTranslation()
  const { call } = useTargets()
  const title = resourceTitle(r, t)
  const quickShare = r.owner.login === ANONYMOUS_LOGIN
  return (
    <ActionDialog
      open={open}
      onOpenChange={onClose}
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
          onDone(null)
        } else {
          toast.success(t('resource.done.takedown', { name: title }))
          onDone(result)
        }
      }}
    />
  )
}
