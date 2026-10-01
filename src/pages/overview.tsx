import { RefreshCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Facts, Meter, Mono, PageHeader, Stat, StatusBadge, Time } from '@/components/bits'
import { ErrorAlert } from '@/components/request-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi } from '@/hooks/use-api'
import { useFormat } from '@/lib/format'
import { ACCESS_OUTCOMES, type Overview } from '@/lib/types'

function Health({ label, state }: { label: string; state: string }) {
  const { t } = useTranslation()
  const tone = state === 'ok' ? 'ok' : state === 'error' ? 'bad' : 'muted'
  const word = state === 'ok' || state === 'error' ? t(`overview.health.${state}`) : t('overview.health.unknown')
  return (
    <span className="inline-flex items-center gap-2">
      {label} <StatusBadge tone={tone}>{word}</StatusBadge>
    </span>
  )
}

export function OverviewPage() {
  const { t } = useTranslation()
  const f = useFormat()
  const { data: o, error, loading, reload, fetchedAt } = useApi<Overview>('overview')

  const refresh = (
    <div className="flex items-center gap-3">
      {fetchedAt && <span className="font-mono text-xs text-muted-foreground">{t('common.updatedAt', { time: fetchedAt.toLocaleTimeString(f.locale) })}</span>}
      <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
        <RefreshCwIcon className={loading ? 'animate-spin' : undefined} />
        {t('common.refresh')}
      </Button>
    </div>
  )

  if (!o) {
    return (
      <>
        <PageHeader title={t('overview.title')} actions={refresh} />
        {error ? <ErrorAlert error={error} onRetry={reload} /> : <OverviewSkeleton />}
      </>
    )
  }

  const max7d = Math.max(1, ...ACCESS_OUTCOMES.map((k) => o.access.last_7d[k] ?? 0))
  const modes = t('overview.registrationModes', { returnObjects: true }) as Record<string, string>

  return (
    <>
      <PageHeader
        title={t('overview.title')}
        description={
          <>
            <Mono>{o.config.public_url}</Mono> · {t('overview.subtitle', { version: o.version, time: f.relative(o.started_at) })}
          </>
        }
        actions={refresh}
      />
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}

      <Card className="flex-row flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 text-[13px]">
        <Health label={t('overview.database')} state={o.health.database} />
        <Health label={t('overview.objectStorage')} state={o.health.object_storage} />
        <span className="text-muted-foreground">
          {o.prune
            ? t('overview.prune', {
                time: f.relative(o.prune.last_run_at),
                access_logs: f.number(o.prune.access_logs),
                sessions: f.number(o.prune.sessions),
                pastes: f.number(o.prune.pastes),
                versions: f.number(o.prune.versions),
              })
            : t('overview.pruneNone')}
        </span>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t('overview.users')}
          value={f.number(o.users.total)}
          sub={t('overview.usersSub', { suspended: f.number(o.users.suspended), signedIn: f.number(o.users.signed_in_last_30d) })}
        />
        <Stat
          label={t('overview.resources')}
          value={f.number(o.resources.total)}
          sub={t('overview.resourcesSub', { remote: f.number(o.resources.remote), takenDown: f.number(o.resources.taken_down) })}
        />
        <Stat label={t('overview.links')} value={f.number(o.links.live)} sub={t('overview.linksSub', { ended: f.number(o.links.ended_last_7d) })} />
        <Stat
          label={t('overview.storage')}
          value={f.bytes(o.resources.current_bytes + o.resources.history_bytes)}
          sub={t('overview.storageSub', {
            current: f.bytes(o.resources.current_bytes),
            history: f.bytes(o.resources.history_bytes),
            versions: f.number(o.resources.history_versions),
          })}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="gap-2 pb-2">
          <CardHeader>
            <CardTitle>{t('overview.access')}</CardTitle>
            <p className="text-xs text-muted-foreground">{t('overview.accessNote')}</p>
          </CardHeader>
          <CardContent className="px-2">
            <Table className="tabular-nums">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('overview.outcome')}</TableHead>
                  <TableHead className="text-right">{t('overview.last24h')}</TableHead>
                  <TableHead>{t('overview.last7d')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ACCESS_OUTCOMES.map((outcome) => {
                  const week = o.access.last_7d[outcome] ?? 0
                  return (
                    <TableRow key={outcome}>
                      <TableCell>{t(`outcomes.${outcome}`)}</TableCell>
                      <TableCell className="text-right">{f.number(o.access.last_24h[outcome] ?? 0)}</TableCell>
                      <TableCell>
                        <div className="flex min-w-40 items-center gap-2.5">
                          <Meter parts={[week]} max={max7d} className="h-1 flex-1" />
                          <Mono className="w-14 text-right">{f.number(week)}</Mono>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          <Card className="gap-3">
            <CardHeader className="flex items-baseline justify-between">
              <CardTitle>{t('overview.anonymous')}</CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {f.bytes(o.anonymous.bytes)} / {f.bytes(o.anonymous.limit_bytes)}
              </span>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Meter parts={[o.anonymous.bytes]} max={o.anonymous.limit_bytes} />
              <span className="text-xs text-muted-foreground">{t('overview.anonymousSub', { count: o.anonymous.live_pastes })}</span>
            </CardContent>
          </Card>
          <Card className="gap-3">
            <CardHeader>
              <CardTitle>{t('overview.config')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Facts
                items={[
                  [t('overview.registration'), modes[o.config.registration_mode] ?? o.config.registration_mode],
                  [t('overview.quickShare'), o.config.anonymous ? t('overview.enabled') : t('overview.disabled')],
                  [t('overview.maxContent'), f.bytes(o.config.max_content_bytes)],
                  [
                    t('overview.logRetention'),
                    t('overview.logRetentionValue', {
                      days: f.number(Math.round((o.config.log_retention_hours / 24) * 10) / 10),
                      hours: f.number(o.config.log_retention_hours),
                    }),
                  ],
                  [t('overview.history'), t('overview.historyValue', { keep: o.config.history_keep, days: o.config.history_retention_days })],
                  [t('overview.revision'), <Mono key="r">{o.revision}</Mono>],
                  [t('overview.started'), <Time key="s" iso={o.started_at} />],
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-10" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}
