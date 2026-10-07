// Response shapes of PlainMote's admin interface (docs/admin.md). Times
// are RFC 3339 strings in UTC; sizes are bytes. Fields marked optional are
// absent from services older than the one that introduced them, so the page
// shows nothing for them there rather than a wrong value.

export interface List<T> {
  items: T[]
  total: number
}

export const ACCESS_OUTCOMES = ['success', 'expired', 'exhausted', 'revoked', 'upstream_error', 'taken_down', 'suspended'] as const
export type AccessOutcome = (typeof ACCESS_OUTCOMES)[number]

export interface Overview {
  version: string
  revision: string
  started_at: string
  config: {
    public_url: string
    registration_mode: string
    anonymous: boolean
    max_content_bytes: number
    log_retention_hours: number
    history_keep: number
    history_retention_days: number
  }
  health: { database: string; object_storage: string }
  users: { total: number; suspended: number; signed_in_last_30d: number; master_password?: number }
  resources: {
    total: number
    remote: number
    taken_down: number
    current_bytes: number
    history_bytes: number
    history_versions: number
    /** Signed-in quick shares not yet kept; included in total. */
    quick_shares?: number
    /** End-to-end encrypted, quick shares among them. */
    encrypted?: number
  }
  links: { live: number; ended_last_7d: number }
  access: { last_24h: Record<AccessOutcome, number>; last_7d: Record<AccessOutcome, number> }
  anonymous: { live_pastes: number; bytes: number; limit_bytes: number }
  prune: { last_run_at: string; access_logs: number; sessions: number; pastes: number; versions: number } | null
}

export interface Grant {
  plan_id: string
  name: string
  default: boolean
  granted_at: string
  expires_at: string | null
}

export interface User {
  id: string
  github_id: string
  login: string
  name: string
  created_at: string
  last_signed_in_at: string | null
  status: 'active' | 'suspended'
  suspended_reason: string
  resources: number
  resources_limit: number
  live_links: number
  storage: { current_bytes: number; history_bytes: number; limit_bytes: number }
  plans?: Grant[]
  /** Whether a master password for end-to-end encryption is set; none of its keys is ever returned. */
  master_password?: boolean
  master_password_at?: string | null
}

export interface Plan {
  id: string
  name: string
  max_resources: number
  max_storage: number
  default: boolean
  users: number
}

export interface Resource {
  id: string
  owner: { id: string; login: string }
  name: string
  filename: string
  kind: 'stored' | 'remote'
  content_type: string
  size: number
  origin_host: string
  version: number
  history_versions: number
  history_bytes: number
  live_links: number
  created_at: string
  updated_at: string
  status: 'active' | 'taken_down'
  takedown_reason: string
  /** Set on a signed-in quick share not yet kept as a resource: when it is deleted. */
  expires_at?: string | null
  /**
   * master_password: name and filename are encrypted too, so both are empty.
   * link_key: an older encrypted quick share whose key is only in its link.
   */
  encrypted?: '' | 'master_password' | 'link_key'
}

export interface Link {
  id: string
  name: string
  created_at: string
  expires_at: string | null
  max_uses: number
  used_count: number
  revoked_at: string | null
  live: boolean
}

export interface Lookup {
  resource: Resource
  link: Link
}

export interface AuditEntry {
  id: string
  at: string
  key: string
  action: string
  target_type: 'user' | 'resource' | 'plan' | 'link' | string
  target_id: string
  target_label: string
  reason: string
  detail: Record<string, unknown> | null
  remote_ip: string
}

/** Quick shares belong to this account; it has no user page. */
export const ANONYMOUS_LOGIN = 'anonymous'
