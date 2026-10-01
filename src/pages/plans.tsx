import { PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ActionDialog } from '@/components/action-dialog'
import { EmptyRow, PageHeader } from '@/components/bits'
import { ErrorAlert } from '@/components/request-error'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi } from '@/hooks/use-api'
import { useFormat } from '@/lib/format'
import { useTargets } from '@/lib/target-context'
import type { List, Plan } from '@/lib/types'

const UNITS = { MB: 1024 ** 2, GB: 1024 ** 3 } as const
// The service counts a name's length in characters (code points).
const NAME_MAX = 100

export function PlansPage() {
  const { t } = useTranslation()
  const f = useFormat()
  const { data, error, reload } = useApi<List<Plan>>('plans')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Plan | null>(null)
  const { call } = useTargets()

  return (
    <>
      <PageHeader
        title={t('plans.title')}
        description={t('plans.subtitle')}
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            {t('plans.create')}
          </Button>
        }
      />
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      <Card className="py-0">
        <div className="overflow-x-auto">
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t('plans.col.name')}</TableHead>
                <TableHead className="text-right">{t('plans.col.resources')}</TableHead>
                <TableHead className="text-right">{t('plans.col.storage')}</TableHead>
                <TableHead className="text-right">{t('plans.col.users')}</TableHead>
                <TableHead className="pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data && !error && <EmptyRow colSpan={5}>{t('common.loading')}</EmptyRow>}
              {data?.items.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="pl-4">
                    <span className="flex items-center gap-2 font-medium">
                      {plan.name}
                      {plan.default && <span className="rounded bg-muted px-1.5 text-xs font-normal text-muted-foreground">{t('plans.default')}</span>}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{f.number(plan.max_resources)}</TableCell>
                  <TableCell className="text-right">{f.bytes(plan.max_storage)}</TableCell>
                  <TableCell className="text-right">{f.number(plan.users)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    {plan.default ? null : plan.users > 0 ? (
                      <span className="text-xs text-muted-foreground">{t('plans.inUse', { count: plan.users })}</span>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(plan)}>
                        {t('plans.delete')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      {creating && <CreatePlan onClose={() => setCreating(false)} onDone={reload} />}
      <ActionDialog
        open={deleting !== null}
        onOpenChange={() => setDeleting(null)}
        title={deleting ? t('plans.deleteDialog.title', { name: deleting.name }) : ''}
        description={t('plans.deleteDialog.body')}
        confirmLabel={t('plans.delete')}
        destructive
        confirmName={deleting?.name}
        onConfirm={async (reason) => {
          if (!deleting) return
          await call('DELETE', `plans/${deleting.id}`, { body: { reason } })
          toast.success(t('plans.deleted', { name: deleting.name }))
          reload()
        }}
      />
    </>
  )
}

function CreatePlan({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation()
  const { call } = useTargets()
  const id = useId()
  const [name, setName] = useState('')
  const [resources, setResources] = useState('')
  const [storage, setStorage] = useState('')
  const [unit, setUnit] = useState<keyof typeof UNITS>('GB')

  const maxResources = Number(resources)
  const maxStorage = Math.round(Number(storage) * UNITS[unit])
  const ready =
    name.trim() !== '' && [...name.trim()].length <= NAME_MAX &&
    resources !== '' && Number.isInteger(maxResources) && maxResources >= 0 &&
    storage !== '' && Number.isFinite(maxStorage) && maxStorage >= 0

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title={t('plans.dialog.title')}
      description={t('plans.dialog.body')}
      confirmLabel={t('plans.create')}
      ready={ready}
      onConfirm={async (reason) => {
        await call('POST', 'plans', { body: { name: name.trim(), max_resources: maxResources, max_storage: maxStorage, reason } })
        toast.success(t('plans.done', { name: name.trim() }))
        onDone()
      }}
    >
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>{t('plans.dialog.name')}</FieldLabel>
        <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${id}-res`}>{t('plans.dialog.maxResources')}</FieldLabel>
          <Input id={`${id}-res`} type="number" min={0} step={1} inputMode="numeric" value={resources} onChange={(e) => setResources(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-sto`}>{t('plans.dialog.maxStorage')}</FieldLabel>
          <div className="flex gap-2">
            <Input id={`${id}-sto`} type="number" min={0} step="any" inputMode="decimal" value={storage} onChange={(e) => setStorage(e.target.value)} />
            <Select value={unit} onValueChange={(v) => setUnit(v as keyof typeof UNITS)}>
              <SelectTrigger className="w-20" aria-label={t('plans.dialog.maxStorage')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MB">MB</SelectItem>
                <SelectItem value="GB">GB</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Field>
      </div>
    </ActionDialog>
  )
}
