import { KeyRoundIcon, PencilIcon, PlugZapIcon, PlusIcon, ServerIcon, ShieldCheckIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Mono, PageHeader, StatusBadge } from '@/components/bits'
import { useDescribeError } from '@/components/request-error'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { request } from '@/lib/client'
import { importPrivateKey, KeyError, parsePrivateJwk } from '@/lib/crypto'
import { useTargets } from '@/lib/target-context'
import { normaliseBaseUrl, type Target } from '@/lib/targets'
import type { Overview } from '@/lib/types'

export function TargetsPage() {
  const { t } = useTranslation()
  const { targets, active, select, remove } = useTargets()
  const [editing, setEditing] = useState<Target | 'new' | null>(null)
  const [removing, setRemoving] = useState<Target | null>(null)
  const test = useConnectionTest()

  return (
    <>
      <PageHeader
        title={t('targets.title')}
        description={t('targets.subtitle')}
        actions={
          targets.length > 0 && (
            <Button onClick={() => setEditing('new')}>
              <PlusIcon />
              {t('targets.add')}
            </Button>
          )
        }
      />

      {targets.length === 0 ? (
        <Card className="items-center gap-3 px-6 py-12 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-accent text-primary">
            <ServerIcon className="size-5" />
          </span>
          <h2 className="text-base font-semibold">{t('targets.emptyTitle')}</h2>
          <p className="max-w-md text-[13px] text-muted-foreground">{t('targets.emptyBody')}</p>
          <Button onClick={() => setEditing('new')} className="mt-2">
            <PlusIcon />
            {t('targets.add')}
          </Button>
        </Card>
      ) : (
        <Card className="py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t('targets.col.name')}</TableHead>
                  <TableHead>{t('targets.col.address')}</TableHead>
                  <TableHead>{t('targets.col.key')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2 font-medium">
                        {target.name}
                        {target.production && <StatusBadge tone="warn" dot={false}>{t('nav.production')}</StatusBadge>}
                        {target.id === active?.id && <StatusBadge tone="ok">{t('targets.inUse')}</StatusBadge>}
                      </div>
                    </TableCell>
                    <TableCell><Mono>{target.baseUrl}</Mono></TableCell>
                    <TableCell><Mono className="text-muted-foreground">{target.keyId}</Mono></TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1.5">
                        {target.id !== active?.id && (
                          <Button size="sm" variant="outline" onClick={() => select(target.id)}>
                            {t('targets.use')}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => test(target)}>
                          <PlugZapIcon />
                          {t('targets.test')}
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={t('common.edit')} onClick={() => setEditing(target)}>
                          <PencilIcon />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={t('common.remove')} onClick={() => setRemoving(target)}>
                          <Trash2Icon className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing !== null && (
          <TargetForm
            target={editing === 'new' ? null : editing}
            onDone={(saved) => {
              setEditing(null)
              if (saved) test(saved)
            }}
          />
        )}
      </Dialog>

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        {removing && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('targets.removeTitle', { name: removing.name })}</DialogTitle>
              <DialogDescription>{t('targets.removeBody')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoving(null)}>{t('common.cancel')}</Button>
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={async () => {
                  await remove(removing.id)
                  toast.success(t('targets.removed', { name: removing.name }))
                  setRemoving(null)
                }}
              >
                {t('common.remove')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

/** Asks a target for its overview and says whether that worked. */
function useConnectionTest() {
  const { t } = useTranslation()
  const describe = useDescribeError()
  return (target: Target) => {
    const pending = request<Overview>(target, 'GET', 'overview')
    toast.promise(pending, {
      loading: `${target.name} · ${t('targets.test')}`,
      success: (o) => t('targets.testOk', { url: o.config.public_url, version: o.version }),
      error: (e) => {
        const { title, description } = describe(e, target)
        return { message: title, description }
      },
    })
  }
}

function TargetForm({ target, onDone }: { target: Target | null; onDone: (saved: Target | null) => void }) {
  const { t } = useTranslation()
  const { targets, save, select, active } = useTargets()
  const id = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(target?.name ?? '')
  const [address, setAddress] = useState(target?.baseUrl ?? '')
  const [production, setProduction] = useState(target?.production ?? false)
  const [replacingKey, setReplacingKey] = useState(target === null)
  const [keyText, setKeyText] = useState('')
  const [keyInfo, setKeyInfo] = useState<{ keyId?: string; problem?: string }>({})
  const [dragging, setDragging] = useState(false)
  const [addressTouched, setAddressTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  const baseUrl = normaliseBaseUrl(address)
  const nameError = submitted && name.trim() === '' ? t('targets.form.nameRequired') : null
  const addressError = (submitted || addressTouched) && !baseUrl ? t('targets.form.addressInvalid') : null
  const keyError = keyInfo.problem ?? (submitted && replacingKey && !keyInfo.keyId ? t('targets.form.keyRequired') : null)

  async function readKey(text: string) {
    setKeyText(text)
    if (text.trim() === '') {
      setKeyInfo({})
      return
    }
    try {
      const { keyId } = await importPrivateKey(parsePrivateJwk(text))
      setKeyInfo({ keyId })
    } catch (e) {
      const problem = e instanceof KeyError ? e.problem : 'not_ed25519'
      setKeyInfo({ problem: t(`targets.form.keyErrors.${problem}`) })
    }
  }

  async function readFile(file: File | undefined) {
    if (file) await readKey(await file.text())
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (name.trim() === '' || !baseUrl || (replacingKey && !keyInfo.keyId) || busy) return
    setBusy(true)
    try {
      let key = target?.key
      let keyId = target?.keyId
      if (replacingKey) {
        // Imported afresh here so the CryptoKey stored is the one made from
        // this text; the text itself is dropped when the dialog closes.
        ;({ key, keyId } = await importPrivateKey(parsePrivateJwk(keyText)))
      }
      const saved: Target = {
        id: target?.id ?? crypto.randomUUID(),
        name: name.trim(),
        baseUrl,
        key: key!,
        keyId: keyId!,
        production,
        createdAt: target?.createdAt ?? new Date().toISOString(),
      }
      await save(saved)
      if (!active || targets.length === 0) select(saved.id)
      toast.success(t('targets.form.saved', { name: saved.name }))
      onDone(saved)
    } catch (e) {
      const problem = e instanceof KeyError ? e.problem : 'not_ed25519'
      setKeyInfo({ problem: t(`targets.form.keyErrors.${problem}`) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <DialogHeader>
          <DialogTitle>{target ? t('targets.form.editTitle', { name: target.name }) : t('targets.form.addTitle')}</DialogTitle>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <Field data-invalid={Boolean(nameError)}>
            <FieldLabel htmlFor={`${id}-name`}>{t('targets.form.name')}</FieldLabel>
            <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('targets.form.namePlaceholder')} aria-invalid={Boolean(nameError)} autoFocus />
            {nameError && <FieldError>{nameError}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(addressError)}>
            <FieldLabel htmlFor={`${id}-url`}>{t('targets.form.address')}</FieldLabel>
            <Input
              id={`${id}-url`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => setAddressTouched(address.trim() !== '')}
              placeholder="https://plainmote.example"
              className="font-mono"
              inputMode="url"
              spellCheck={false}
              aria-invalid={Boolean(addressError)}
            />
            {addressError ? (
              <FieldError>{addressError}</FieldError>
            ) : (
              <FieldDescription className="text-xs">{t('targets.form.addressHelp', { origin: window.location.origin })}</FieldDescription>
            )}
          </Field>

          <Field data-invalid={Boolean(keyError)}>
            <FieldLabel htmlFor={`${id}-key`}>{t('targets.form.key')}</FieldLabel>
            {!replacingKey && target ? (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2 text-[13px]">
                <span className="flex items-center gap-2">
                  <KeyRoundIcon className="size-4 text-muted-foreground" />
                  {t('targets.form.keyCurrent')}
                  <Mono>{target.keyId}</Mono>
                </span>
                <Button type="button" size="sm" variant="outline" onClick={() => setReplacingKey(true)}>
                  {t('targets.form.keyReplace')}
                </Button>
              </div>
            ) : (
              <>
                <div
                  className={`grid place-items-center gap-1 rounded-md border border-dashed px-4 py-4 text-center text-[13px] text-muted-foreground transition-colors ${dragging ? 'border-primary bg-accent' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    void readFile(e.dataTransfer.files[0])
                  }}
                >
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                    <UploadIcon />
                    {t('targets.form.keyChoose')}
                  </Button>
                  <span>{t('targets.form.keyDrop')}</span>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".jwk,.json,application/json,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      void readFile(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </div>
                <Textarea
                  id={`${id}-key`}
                  value={keyText}
                  onChange={(e) => void readKey(e.target.value)}
                  placeholder={`${t('targets.form.keyPaste')}: {"kty":"OKP","crv":"Ed25519","x":"…","d":"…"}`}
                  className="min-h-16 font-mono text-xs"
                  spellCheck={false}
                  aria-invalid={Boolean(keyError)}
                />
                {keyInfo.keyId && (
                  <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-[13px] text-success">
                    <KeyRoundIcon className="size-4" />
                    {t('targets.form.keyRecognised')}
                    <Mono>{keyInfo.keyId}</Mono>
                  </div>
                )}
                {keyError && <FieldError>{keyError}</FieldError>}
              </>
            )}
          </Field>

          <Field orientation="horizontal">
            <Checkbox id={`${id}-prod`} checked={production} onCheckedChange={(v) => setProduction(v === true)} />
            <FieldContent>
              <FieldLabel htmlFor={`${id}-prod`}>{t('targets.form.production')}</FieldLabel>
              <FieldDescription className="text-xs">{t('targets.form.productionHelp')}</FieldDescription>
            </FieldContent>
          </Field>

          <div className="flex gap-2.5 rounded-md bg-accent px-3 py-2.5 text-xs text-accent-foreground">
            <ShieldCheckIcon className="mt-px size-4 shrink-0" />
            <span>{t('targets.form.storage')}</span>
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onDone(null)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? t('common.working') : t('common.save')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
