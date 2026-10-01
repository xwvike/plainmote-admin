import { useId, useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useDescribeError } from '@/components/request-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useTargets } from '@/lib/target-context'

const REASON_MAX = 500

/** Counts characters the way the service does: code points, after trimming. */
export function reasonLength(reason: string): number {
  return [...reason.trim()].length
}

interface ActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** Extra fields above the reason, e.g. which plan to add. */
  children?: ReactNode
  confirmLabel: string
  destructive?: boolean
  /** Whether the person acted upon will see the reason. */
  shownToUser?: boolean
  /** On a production target, the name that must be typed before the action runs. */
  confirmName?: string
  /** Whether the extra fields are complete. */
  ready?: boolean
  onConfirm: (reason: string) => Promise<void>
}

/**
 * Every change the admin interface makes carries a reason, so every change
 * goes through this dialog. It stays open, with the service's answer, when the
 * change is refused.
 */
export function ActionDialog(props: ActionDialogProps) {
  // Mounting the form only while open resets it for the next use.
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <ActionForm {...props} />}
    </Dialog>
  )
}

function ActionForm({
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  destructive,
  shownToUser,
  confirmName,
  ready = true,
  onConfirm,
}: ActionDialogProps) {
  const { t } = useTranslation()
  const { active } = useTargets()
  const describe = useDescribeError()
  const id = useId()
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const length = reasonLength(reason)
  const needsName = Boolean(confirmName && active?.production)
  const valid = ready && length > 0 && length <= REASON_MAX && (!needsName || typed === confirmName)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
      onOpenChange(false)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const failure = error ? describe(error) : null

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={submit} className="grid gap-5">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription asChild><div className="space-y-2">{description}</div></DialogDescription>}
        </DialogHeader>

        <FieldGroup className="gap-4">
          {children}
          <Field>
            <FieldLabel htmlFor={`${id}-reason`}>{t('reason.label')}</FieldLabel>
            <Textarea
              id={`${id}-reason`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reason.placeholder')}
              aria-invalid={length > REASON_MAX}
              className="min-h-20"
              autoFocus={!children}
            />
            <FieldDescription className="flex justify-between gap-3 text-xs">
              <span>{shownToUser ? t('reason.visibleToUser') : t('reason.auditOnly')}</span>
              <span className={length > REASON_MAX ? 'text-destructive tabular-nums' : 'tabular-nums'}>
                {t('reason.counter', { count: length })}
              </span>
            </FieldDescription>
          </Field>
          {needsName && (
            <Field>
              <FieldLabel htmlFor={`${id}-confirm`}>
                <span>
                  <Trans
                    i18nKey="reason.typeToConfirm"
                    values={{ name: confirmName }}
                    components={{ code: <span className="font-mono" /> }}
                  />
                </span>
              </FieldLabel>
              <Input
                id={`${id}-confirm`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                spellCheck={false}
                className="font-mono"
              />
              <FieldDescription className="text-xs text-production">
                {t('reason.production', { name: active?.name ?? '' })}
              </FieldDescription>
            </Field>
          )}
          {failure && (
            <FieldError>
              <strong className="font-medium">{failure.title}</strong> {failure.description}
            </FieldError>
          )}
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!valid || busy}
            className={destructive ? 'bg-destructive text-white hover:bg-destructive/90' : undefined}
          >
            {busy ? t('common.working') : confirmLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
