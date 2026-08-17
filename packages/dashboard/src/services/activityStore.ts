/**
 * Activity store — notification center + audit log.
 * Client-side command-center journal: live socket events and officer actions
 * are recorded here so the bell badge, notification panel and Audit Log page
 * all read from one consistent, persisted source.
 */

export type NotificationKind = 'alert' | 'node' | 'incident' | 'response' | 'system'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical'
  at: string // ISO
  read: boolean
  /** Route to jump to when opened, e.g. /alerts */
  link?: string
}

export interface AuditEntry {
  id: string
  at: string // ISO
  actor: string // e.g. "Admin", "System", "Ranger Team Bravo"
  action: string
  target?: string
}

const NOTIF_KEY = 'fg2.notifications.v1'
const AUDIT_KEY = 'fg2.audit.v1'
const MAX_NOTIFS = 100
const MAX_AUDIT = 300

let notifications: AppNotification[] = load<AppNotification[]>(NOTIF_KEY, [])
let auditLog: AuditEntry[] = load<AuditEntry[]>(AUDIT_KEY, [])
const listeners = new Set<() => void>()

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function persist(): void {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications))
    localStorage.setItem(AUDIT_KEY, JSON.stringify(auditLog))
  } catch {
    /* storage full — in-memory only */
  }
}

function emit(): void {
  persist()
  listeners.forEach((l) => l())
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function pushNotification(n: Omit<AppNotification, 'id' | 'at' | 'read'>): void {
  // De-duplicate identical titles within 30 s (socket retries)
  const cutoff = Date.now() - 30_000
  const dup = notifications.find(
    (x) => x.title === n.title && new Date(x.at).getTime() >= cutoff
  )
  if (dup) return
  notifications = [
    { ...n, id: uid(), at: new Date().toISOString(), read: false },
    ...notifications,
  ].slice(0, MAX_NOTIFS)
  emit()
}

export function markNotificationRead(id: string): void {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
  emit()
}

export function markAllNotificationsRead(): void {
  notifications = notifications.map((n) => ({ ...n, read: true }))
  emit()
}

export function getNotifications(): AppNotification[] {
  return notifications
}

export function unreadCount(): number {
  return notifications.filter((n) => !n.read).length
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export function addAudit(actor: string, action: string, target?: string): void {
  auditLog = [
    { id: uid(), at: new Date().toISOString(), actor, action, target },
    ...auditLog,
  ].slice(0, MAX_AUDIT)
  emit()
}

export function getAuditLog(): AuditEntry[] {
  return auditLog
}

// ---------------------------------------------------------------------------
// Subscription (useSyncExternalStore-compatible — arrays are replaced on
// every mutation so snapshot identity change triggers re-render)
// ---------------------------------------------------------------------------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
