import { LockIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { EmptyRow, Meter, Pager, PageHeader, Time, UserStatus } from '@/components/bits'
import { SearchBox, Segmented } from '@/components/filters'
import { ErrorAlert } from '@/components/request-error'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi } from '@/hooks/use-api'
import { useSearchState } from '@/hooks/use-search-state'
import { useFormat } from '@/lib/format'
import type { List, User } from '@/lib/types'

const SIZE = 20

export function UsersPage() {
  const { t } = useTranslation()
  const f = useFormat()
  const navigate = useNavigate()
  const { values, page, set } = useSearchState(['q', 'status'] as const)
  const { data, error, loading, reload } = useApi<List<User>>('users', { q: values.q, status: values.status, page, size: SIZE })

  return (
    <>
      <PageHeader title={t('users.title')} description={t('users.subtitle')} />
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={values.q} onChange={(q) => set({ q })} placeholder={t('users.search')} />
        <Segmented
          label={t('users.col.status')}
          value={values.status || 'all'}
          onChange={(v) => set({ status: v === 'all' ? '' : v })}
          options={[
            ['all', t('users.filter.all')],
            ['active', t('users.filter.active')],
            ['suspended', t('users.filter.suspended')],
          ]}
        />
      </div>
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      <Card className={`gap-0 py-0 transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t('users.col.user')}</TableHead>
                <TableHead>{t('users.col.status')}</TableHead>
                <TableHead className="text-right">{t('users.col.resources')}</TableHead>
                <TableHead className="text-right">{t('users.col.liveLinks')}</TableHead>
                <TableHead>{t('users.col.storage')}</TableHead>
                <TableHead>{t('users.col.masterPassword')}</TableHead>
                <TableHead>{t('users.col.lastSignIn')}</TableHead>
                <TableHead className="pr-4">{t('users.col.joined')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.length === 0 && <EmptyRow colSpan={8}>{t('users.empty')}</EmptyRow>}
              {!data && !error && <EmptyRow colSpan={8}>{t('common.loading')}</EmptyRow>}
              {data?.items.map((user) => {
                const used = user.storage.current_bytes + user.storage.history_bytes
                return (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    onClick={() => navigate(`/users/${user.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/users/${user.id}`)}
                  >
                    <TableCell className="pl-4">
                      <div className="grid">
                        <span className="font-medium">{user.login}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.name ? `${user.name} · ` : ''}
                          {t('users.github', { id: user.github_id })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell><UserStatus status={user.status} /></TableCell>
                    <TableCell className="text-right">
                      {f.number(user.resources)}
                      <span className="text-muted-foreground"> / {f.number(user.resources_limit)}</span>
                    </TableCell>
                    <TableCell className="text-right">{f.number(user.live_links)}</TableCell>
                    <TableCell>
                      <div className="grid min-w-36 gap-1">
                        <Meter parts={[user.storage.current_bytes, user.storage.history_bytes]} max={user.storage.limit_bytes} />
                        <span className="text-xs text-muted-foreground">
                          {f.bytes(used)} / {f.bytes(user.storage.limit_bytes)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.master_password ? (
                        <span className="inline-flex items-center gap-1 text-xs text-accent-foreground">
                          <LockIcon className="size-3" />
                          {t('users.masterPasswordSet')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{t('common.none')}</span>
                      )}
                    </TableCell>
                    <TableCell><Time iso={user.last_signed_in_at} relative /></TableCell>
                    <TableCell className="pr-4"><Time iso={user.created_at} className="text-muted-foreground" /></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {data && <Pager page={page} size={SIZE} total={data.total} onPage={(p) => set({ page: p })} />}
      </Card>
    </>
  )
}
