import { SESSION_INACTIVITY_MS, SESSION_STORAGE_KEY } from './constants'

/** Cryptographically-random session id, with a non-crypto fallback. */
function createSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readDescriptor() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed.id === 'string' ? parsed : null
  } catch {
    // Private-mode / disabled storage — caller falls back to a fresh id.
    return null
  }
}

function writeDescriptor(descriptor) {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(descriptor))
  } catch {
    // Best-effort; an unwritable store just means a new id next call.
  }
}

/**
 * Resolve the current cookieless session id, rolling it after 30 minutes of
 * inactivity. Each call refreshes the last-activity timestamp, so an active
 * session never expires mid-visit.
 *
 * @returns {string} the active session id
 */
export function resolveSessionId() {
  if (typeof window === 'undefined') return createSessionId()
  const now = Date.now()
  const existing = readDescriptor()
  const expired = !existing || now - (existing.lastActivity ?? 0) > SESSION_INACTIVITY_MS
  const descriptor = expired
    ? { id: createSessionId(), lastActivity: now }
    : { id: existing.id, lastActivity: now }
  writeDescriptor(descriptor)
  return descriptor.id
}
