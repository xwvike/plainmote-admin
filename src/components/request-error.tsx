import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RequestError } from '@/lib/client'
import { useTargets } from '@/lib/target-context'
import type { Target } from '@/lib/targets'

export interface Described {
  title: string
  description: string
}

/** Turns a failed request into words a person can act on. */
export function useDescribeError() {
  const { t } = useTranslation()
  const { active } = useTargets()
  return (error: unknown, target: Target | null = active): Described => {
    if (!(error instanceof RequestError)) {
      return { title: t('errors.apiTitle'), description: error instanceof Error ? error.message : String(error) }
    }
    switch (error.kind) {
      case 'network':
        return {
          title: t('errors.networkTitle', { host: target ? new URL(target.baseUrl).host : '' }),
          description: t('errors.networkBody', { origin: window.location.origin }),
        }
      case 'rejected':
        return { title: t('errors.rejectedTitle'), description: t('errors.rejectedBody', { keyId: target?.keyId ?? '' }) }
      case 'http':
        return { title: t('errors.httpTitle', { status: error.status }), description: t('errors.httpBody') }
      case 'api': {
        const codes = t('errors.codes', { returnObjects: true }) as Record<string, string>
        const description = error.code in codes && error.code !== 'unknown'
          ? codes[error.code]
          : t('errors.codes.unknown', { code: error.code })
        return { title: t('errors.apiTitle'), description }
      }
    }
  }
}

export function ErrorAlert({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()
  const { title, description } = useDescribeError()(error)
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {onRetry && (
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            {t('common.retry')}
          </Button>
        </AlertAction>
      )}
    </Alert>
  )
}
