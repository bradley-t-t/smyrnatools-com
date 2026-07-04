import { createClient } from '@supabase/supabase-js'

import APIUtility from '../utils/APIUtility'
import { getSessionJwt, registerRealtimeAuthApplier } from './SessionService'

const databaseUrl = import.meta.env.REACT_APP_SUPABASE_URL
const databaseKey = import.meta.env.REACT_APP_SUPABASE_ANON_KEY

/** Wraps `fetch` so every Supabase REST + Storage request swaps the anon-key
 *  bearer for the current session JWT. The `apikey` header stays — Supabase's
 *  edge router needs it to identify the project — but the `Authorization`
 *  header carries the JWT, which is what PostgREST evaluates RLS against.
 *
 *  Reading the JWT on every request (rather than at client construction)
 *  keeps the client in lockstep with login / logout / token refresh without
 *  ever having to reconstruct it. The JWT lives in module memory only
 *  (see SessionService), never in sessionStorage. */
const sessionJwtFetch = (input, init = {}) => {
    const jwt = getSessionJwt()
    if (!jwt) {
        /* Pre-auth: PostgREST will reject anon with 401 because RLS denies
         * every table to the anon role. Skip the doomed network round-trip
         * and synthesize the same shape PostgREST would return — keeps the
         * Supabase client's error path intact without flooding the console
         * with predictable "Failed to load resource" entries while
         * AuthContext is still restoring the session. */
        return Promise.resolve(
            new Response(JSON.stringify({ code: 'PGRST301', message: 'Not authenticated' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 401,
                statusText: 'Unauthorized'
            })
        )
    }
    const mergedHeaders = new Headers(init.headers || {})
    if (input instanceof Request) {
        const requestHeaders = new Headers(input.headers)
        requestHeaders.forEach((value, key) => {
            if (!mergedHeaders.has(key)) mergedHeaders.set(key, value)
        })
    }
    mergedHeaders.set('Authorization', `Bearer ${jwt}`)
    return fetch(input, { ...init, headers: mergedHeaders })
}

/** Shared database client instance. The fetch wrapper above injects the
 *  current session JWT into REST + Storage requests; realtime subscriptions
 *  use `Database.realtime.setAuth(jwt)` (called from AuthContext after
 *  login / refresh / signout). */
const Database = createClient(databaseUrl, databaseKey, {
    global: { fetch: sessionJwtFetch },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
})

/** Pushes the current JWT (or the anon key when signed out) into the
 *  realtime websocket so postgres_changes subscriptions evaluate RLS
 *  against the authenticated user. SessionService invokes this whenever
 *  the JWT changes. */
const applyRealtimeAuth = (jwt) => {
    try {
        Database.realtime.setAuth(jwt || databaseKey)
    } catch {}
}
registerRealtimeAuthApplier(applyRealtimeAuth)

export default Database
/** Prefer named import: `import { Database } from './DatabaseService'` */
export { Database }
/** Base URL for constructing edge function endpoints. */
export { databaseUrl }
/** Anonymous API key for authenticating edge function requests. */
export { databaseKey }
/** Allowlisted tables for sanitized database operations to prevent injection. */
const ALLOWED_TABLES = new Set([
    'users',
    'users_preferences',
    'users_presence',
    'users_sessions',
    'mixers',
    'operators',
    'tractors',
    'trailers',
    'equipment',
    'pickup_trucks',
    'plants',
    'regions',
    'mixer_comments',
    'mixer_history',
    'mixer_images',
    'tractor_comments',
    'tractor_history',
    'trailer_comments',
    'equipment_comments',
    'equipment_history',
    'operator_history',
    'pickup_truck_comments',
    'roles',
    'notifications',
    'notification_reads',
    'client_errors',
    'messages',
    'messages_decrypted',
    'users_pinned_conversations'
])
/** Allowlisted SQL migrations that can be executed via the migration endpoint. */
const ALLOWED_MIGRATIONS = new Set(['alter table public.operators add column if not exists phone text'])
/** Validates and sanitizes a table name against the allowlist. Returns null if disallowed. */
const sanitizeTableName = (tableName) => {
    if (!tableName || typeof tableName !== 'string') return null
    const cleaned = tableName.toLowerCase().replace(/[^a-z0-9_]/g, '')
    return ALLOWED_TABLES.has(cleaned) ? cleaned : null
}
/**
 * Provides controlled database operations (migrations, existence checks, record retrieval)
 * through the edge function API, enforcing table/migration allowlists.
 */
export class DatabaseService {
    /** Executes a pre-approved SQL migration via the edge function. */
    static async executeMigration(sql) {
        const normalizedSql = sql.toLowerCase().trim()
        if (!ALLOWED_MIGRATIONS.has(normalizedSql)) {
            throw new Error('Migration not allowed')
        }
        const { res, json } = await APIUtility.post('/database-service/execute-migration', { migration: normalizedSql })
        if (!res.ok) throw new Error(json?.error || 'Failed to execute migration')
        return json?.data ?? []
    }
    /** Checks if a table exists in the database. */
    static async tableExists(tableName) {
        const sanitized = sanitizeTableName(tableName)
        if (!sanitized) throw new Error('Invalid or disallowed table name')
        const { res, json } = await APIUtility.post('/database-service/table-exists', { tableName: sanitized })
        if (!res.ok) return false
        return json?.exists === true
    }
    /** Fetches all records from an allowlisted table. */
    static async getAllRecords(tableName) {
        const sanitized = sanitizeTableName(tableName)
        if (!sanitized) throw new Error('Invalid or disallowed table name')
        const { res, json } = await APIUtility.post('/database-service/get-all-records', { tableName: sanitized })
        if (!res.ok) return []
        return json?.data ?? []
    }
}
/** Formats a database error into a human-readable string with details, hint, and code. */
export const getDatabaseErrorDetails = (error) => {
    if (!error) return 'Unknown error'
    if (error.message) {
        if (error.details || error.hint || error.code) {
            return `${error.message}\nDetails: ${error.details || 'none'}\nHint: ${error.hint || 'none'}\nCode: ${error.code || 'none'}`
        }
        return error.message
    }
    try {
        return JSON.stringify(error)
    } catch {
        return 'Error object could not be stringified'
    }
}
/** Logs a database error with context label and full details to the console. */
export const logDatabaseError = (context, error) => {
    console.error(`Database error in ${context}:`, error)
    console.error('Details:', getDatabaseErrorDetails(error))
}
