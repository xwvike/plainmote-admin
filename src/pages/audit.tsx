import { useTranslation } from 'react-i18next'
import { AuditTable } from '@/components/audit-table'
import { Pager, PageHeader } from '@/components/bits'
import { SearchBox } from '@/components/filters'
import { ErrorAlert } from '@/components/request-error'
import { Card } from '@/components/ui/card'
import { useApi } from '@/hooks/use-api'
import { useSearchState } from '@/hooks/use-search-state'
import type { AuditEntry, List } from '@/lib/types'

const SIZE = 50

export function AuditPage() {
  const { t } = useTranslation()
  const { values, page, set } = useSearchState(['target'] as const)
  const { data, error, loading, reload } = useApi<List<AuditEntry>>('audit', { target: values.target.trim(), page, size: SIZE })

  return (
    <>
      <PageHeader title={t('audit.title')} description={t('audit.subtitle')} />
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={values.target} onChange={(target) => set({ target })} placeholder={t('audit.filter')} className="sm:max-w-md [&_input]:font-mono" />
      </div>
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      <Card className={`gap-0 py-0 transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
        <AuditTable entries={data?.items} empty={t('audit.empty')} />
        {data && <Pager page={page} size={SIZE} total={data.total} onPage={(p) => set({ page: p })} />}
      </Card>
    </>
  )
}
