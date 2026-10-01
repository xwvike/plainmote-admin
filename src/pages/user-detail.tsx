import { AlertCircleIcon, PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useParams } from 'react-router'
import { toast } from 'sonner'
import { ActionDialog } from '@/components/action-dialog'
import { AuditTable } from '@/components/audit-table'
import { Meter, Mono, PageHeader, Stat, Time, UserStatus, ZoneRow } from '@/components/bits'
import { ErrorAlert } from '@/components/request-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi } from '@/hooks/use-api'
import { useFormat } from '@/lib/format'
import { useTargets } from '@/lib/target-context'
import type { AuditEntry, Grant, List, Plan, User } from '@/lib/types'

type Dialog = { kind: 'suspend' } | { kind: 'unsuspend' } | { kind: 'grant' } | { kind: 'revoke'; grant: Grant } | null

export function UserDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const f = useFormat()
  const { call } = useTargets()
  const user = useApi<User>(`users/${id}`)
  const audit = useApi<List<AuditEntry>>('audit', { target: id, size: 10 })
  const [dialog, setDialog] = useState<Dialog>(null)

  const u = user.data?.id === id ? user.data : undefined
  if (!u) {
    return user.error ? <ErrorAlert error={user.error} onRetry={user.reload} /> : <Skeleton className="h-64" />
  }

  const after = (message: string) => {
    toast.success(message)
    user.reload()
    audit.reload()
  }
  const used = u.storage.current_bytes + u.storage.history_bytes

  return (
    <>
      <PageHeader
        title={<>{u.login} <UserStatus status={u.status} /></>}
        description={
          <>
            {u.name ? `${u.name} · ` : ''}
            {t('users.github', { id: u.github_id })} · {t('user.joined', { date: f.date(u.created_at) })} ·{' '}
            {u.last_signed_in_at ? t('user.lastSignIn', { time: f.relative(u.last_signed_in_at) }) : t('user.neverSignedIn')} ·{' '}
            <Mono className="text-xs">{u.id}</Mono>
          </>
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <RouterLink to={`/resources?owner=${u.id}`}>{t('user.viewResources', { count: u.resources })}</RouterLink>
          </Button>
        }
      />
      {user.error ? <ErrorAlert error={user.error} onRetry={user.reload} /> : null}

      {u.status === 'suspended' && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>{t('user.suspendedTitle')}</AlertTitle>
          <AlertDescription>{t('user.suspendedBody', { reason: u.suspended_reason })}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat label={t('user.resources')} value={f.number(u.resources)} sub={t('user.resourcesSub', { limit: f.number(u.resources_limit) })} />
        <Stat label={t('user.liveLinks')} value={f.number(u.live_links)} sub={t('user.liveLinksSub')} />
        <Stat
          label={t('user.storage')}
          value={f.bytes(used)}
          sub={t('user.storageSub', {
            current: f.bytes(u.storage.current_bytes),
            history: f.bytes(u.storage.history_bytes),
            limit: f.bytes(u.storage.limit_bytes),
          })}
        >
          <Meter parts={[u.storage.current_bytes, u.storage.history_bytes]} max={u.storage.limit_bytes} className="my-1" />
        </Stat>
      </div>

      <Card className="gap-2 pb-2">
        <CardHeader>
          <CardTitle>{t('user.plans')}</CardTitle>
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setDialog({ kind: 'grant' })}>
              <PlusIcon />
              {t('user.grant')}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('user.col.plan')}</TableHead>
                <TableHead>{t('user.col.granted')}</TableHead>
                <TableHead>{t('user.col.expires')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(u.plans ?? []).map((grant) => (
                <TableRow key={grant.plan_id}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {grant.name}
                      {grant.default && <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{t('user.defaultPlan')}</span>}
                    </span>
                  </TableCell>
                  <TableCell><Time iso={grant.granted_at} /></TableCell>
                  <TableCell>{grant.expires_at ? <Time iso={grant.expires_at} /> : <span className="text-muted-foreground">{t('user.noExpiry')}</span>}</TableCell>
                  <TableCell className="text-right">
                    {grant.default ? (
                      <span className="text-xs text-muted-foreground">{t('user.notRevocable')}</span>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDialog({ kind: 'revoke', grant })}>
                        {t('user.revoke')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="gap-2 py-0 pt-4">
        <CardHeader>
          <CardTitle>{t('user.audit')}</CardTitle>
          <CardAction>
            <RouterLink to={`/audit?target=${u.id}`} className="text-xs text-primary underline-offset-4 hover:underline">
              {t('user.allAudit')}
            </RouterLink>
          </CardAction>
        </CardHeader>
        <AuditTable entries={audit.data?.items} compact empty={t('user.noAudit')} />
      </Card>

      <Card className="gap-3 border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">{t('user.zone')}</CardTitle>
        </CardHeader>
        <CardContent>
          {u.status === 'active' ? (
            <ZoneRow
              title={t('user.suspend')}
              help={t('user.suspendHelp')}
              action={<Button size="sm" variant="outline" className="text-destructive" onClick={() => setDialog({ kind: 'suspend' })}>{t('user.suspend')}…</Button>}
            />
          ) : (
            <ZoneRow
              title={t('user.unsuspend')}
              help={t('user.unsuspendHelp')}
              action={<Button size="sm" variant="outline" onClick={() => setDialog({ kind: 'unsuspend' })}>{t('user.unsuspend')}…</Button>}
            />
          )}
        </CardContent>
      </Card>

      <ActionDialog
        open={dialog?.kind === 'suspend'}
        onOpenChange={() => setDialog(null)}
        title={t('user.dialog.suspendTitle', { login: u.login })}
        description={
          <ul className="list-disc space-y-1 pl-5">
            <li>{t('user.dialog.suspendPoint1')}</li>
            <li>{t('user.dialog.suspendPoint2', { count: u.live_links })}</li>
            <li>{t('user.dialog.suspendPoint3')}</li>
          </ul>
        }
        confirmLabel={t('user.suspend')}
        destructive
        shownToUser
        onConfirm={async (reason) => {
          await call('POST', `users/${u.id}/suspend`, { body: { reason } })
          after(t('user.done.suspend', { login: u.login }))
        }}
      />
      <ActionDialog
        open={dialog?.kind === 'unsuspend'}
        onOpenChange={() => setDialog(null)}
        title={t('user.dialog.unsuspendTitle', { login: u.login })}
        description={t('user.dialog.unsuspendBody')}
        confirmLabel={t('user.unsuspend')}
        onConfirm={async (reason) => {
          await call('POST', `users/${u.id}/unsuspend`, { body: { reason } })
          after(t('user.done.unsuspend', { login: u.login }))
        }}
      />
      {dialog?.kind === 'grant' && <GrantDialog user={u} onClose={() => setDialog(null)} onDone={after} />}
      <ActionDialog
        open={dialog?.kind === 'revoke'}
        onOpenChange={() => setDialog(null)}
        title={dialog?.kind === 'revoke' ? t('user.dialog.revokeTitle', { login: u.login, plan: dialog.grant.name }) : ''}
        description={t('user.dialog.revokeBody')}
        confirmLabel={t('user.revoke')}
        destructive
        onConfirm={async (reason) => {
          if (dialog?.kind !== 'revoke') return
          await call('DELETE', `users/${u.id}/plans/${dialog.grant.plan_id}`, { body: { reason } })
          after(t('user.done.revoke', { login: u.login, plan: dialog.grant.name }))
        }}
      />
    </>
  )
}

function GrantDialog({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: (message: string) => void }) {
  const { t } = useTranslation()
  const f = useFormat()
  const { call } = useTargets()
  const id = useId()
  const plans = useApi<List<Plan>>('plans')
  const [planId, setPlanId] = useState('')
  const [expires, setExpires] = useState('')
  const grantable = plans.data?.items.filter((p) => !p.default) ?? []
  const plan = grantable.find((p) => p.id === planId)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title={t('user.dialog.grantTitle', { login: user.login })}
      description={t('user.dialog.grantBody')}
      confirmLabel={t('user.grant')}
      ready={Boolean(plan)}
      onConfirm={async (reason) => {
        await call('POST', `users/${user.id}/plans`, {
          body: { plan_id: planId, expires_at: expires ? `${expires}T00:00:00Z` : null, reason },
        })
        onDone(t('user.done.grant', { login: user.login, plan: plan?.name ?? '' }))
      }}
    >
      {plans.error ? <ErrorAlert error={plans.error} onRetry={plans.reload} /> : null}
      <Field>
        <FieldLabel htmlFor={`${id}-plan`}>{t('user.dialog.grantPlan')}</FieldLabel>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger id={`${id}-plan`} className="w-full">
            <SelectValue placeholder={t('user.dialog.grantPlanPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {grantable.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {t('user.dialog.grantPlanOption', { name: p.name, resources: f.number(p.max_resources), storage: f.bytes(p.max_storage) })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-expires`}>{t('user.dialog.grantExpires')}</FieldLabel>
        <Input id={`${id}-expires`} type="date" min={today} value={expires} onChange={(e) => setExpires(e.target.value)} className="w-48" />
        <FieldDescription className="text-xs">{t('user.dialog.grantExpiresHelp')}</FieldDescription>
      </Field>
    </ActionDialog>
  )
}
