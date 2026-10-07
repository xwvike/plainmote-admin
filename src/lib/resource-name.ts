import type { TFunction } from 'i18next'
import type { Resource } from './types'

// Owners may leave a resource without a name or a file name, and a resource
// encrypted under a master password has neither, both being encrypted too. It
// is then called by what it does have, and failing that, marked as unnamed or
// encrypted with the start of its ID so that two of them can be told apart.

/** The resource's own name, its file name, or its remote host; null when it has none. */
export function resourceLabel(r: Resource): string | null {
  return r.name || r.filename || r.origin_host || null
}

/** A name to use in sentences - dialog titles, notices. */
export function resourceTitle(r: Resource, t: TFunction): string {
  return resourceLabel(r) ?? t(r.encrypted ? 'resource.encryptedId' : 'resource.unnamedId', { id: r.id.slice(0, 8) })
}

/** What must be typed to confirm deleting it: its label, or the start of its ID. */
export function resourceConfirmName(r: Resource): string {
  return resourceLabel(r) ?? r.id.slice(0, 8)
}

/** The file name, shown beside the name only when it says something more. */
export function secondaryFilename(r: Resource): string | null {
  return r.name && r.filename && r.filename !== r.name ? r.filename : null
}
