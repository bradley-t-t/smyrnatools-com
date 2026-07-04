/**
 * Default ingest endpoint — Sunday Analyzer's hosted `analytics-ingest`
 * Supabase edge function. Sites tracked by Sunday Analyzer beacon here unless a
 * consumer overrides it with the provider's `apiUrl` prop (e.g. for a
 * self-hosted ingest function).
 *
 * NOTE: the subdomain is the sunday-my Supabase project ref. Swap it for your
 * own project's `<ref>.supabase.co` if you run your own ingest. The sunday-my
 * app itself passes `apiUrl` explicitly from its env, so its dogfooding never
 * depends on this literal.
 */
export const DEFAULT_API_URL =
  'https://gujgtjqqurildqurpffh.supabase.co/functions/v1/analytics-ingest'

/** sessionStorage key holding the cookieless session descriptor. */
export const SESSION_STORAGE_KEY = 'sa_session'

/** Roll the session id after this many ms of inactivity (30 minutes). */
export const SESSION_INACTIVITY_MS = 30 * 60 * 1000
