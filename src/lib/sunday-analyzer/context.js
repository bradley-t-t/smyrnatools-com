import { createContext } from 'react'

/**
 * @typedef {object} SundayAnalyticsApi
 * @property {(name: string, props?: Record<string, unknown>) => void} track
 *   Reserved for future custom events. Exposed in v1 but intentionally a no-op
 *   — the ingest pipeline only stores pageviews for now (YAGNI).
 */

/** @type {import('react').Context<SundayAnalyticsApi | null>} */
export const SundayAnalyticsContext = createContext(null)
