import { createClient } from '@supabase/supabase-js'

import APIUtility from '../utils/APIUtility'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

/** Shared Supabase client instance configured with realtime support. */
const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
})

export default supabase
export { supabase }

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
    'list_items',
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
    'reports',
    'notifications',
    'documents'
])

/** Allowlisted SQL migrations that can be executed via the migration endpoint. */
const ALLOWED_MIGRATIONS = new Set(['alter table public.operators add column if not exists phone text'])

/** Validates and sanitizes a table name against the allowlist. Returns null if disallowed. */
const sanitizeTableName = (tableName) => {
    if (!tableName || typeof tableName !== 'string') return null
    const cleaned = tableName.toLowerCase().replace(/[^a-z0-9_]/g, '')
    return ALLOWED_TABLES.has(cleaned) ? cleaned : null
}

/** Strips non-alphanumeric/underscore characters from a column name to prevent injection. */
const sanitizeColumnName = (columnName) => {
    if (!columnName || typeof columnName !== 'string') return null
    return columnName.replace(/[^a-zA-Z0-9_]/g, '')
}

/** Escapes SQL LIKE pattern special characters (%, _, \) in user input. */
const sanitizeLikePattern = (input) => {
    if (!input || typeof input !== 'string') return ''
    return input.trim().replace(/[%_\\]/g, (char) => '\\' + char)
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

/** Formats a Supabase error into a human-readable string with details, hint, and code. */
export const getSupabaseErrorDetails = (error) => {
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

/** Logs a Supabase error with context label and full details to the console. */
export const logSupabaseError = (context, error) => {
    console.error(`Supabase error in ${context}:`, error)
    console.error('Details:', getSupabaseErrorDetails(error))
}

/** Converts a date value to ISO string format for Supabase queries. Returns null on invalid input. */
export const formatDateForSupabase = (date) => {
    if (!date) return null
    if (date instanceof Date) return date.toISOString()
    try {
        const d = new Date(date)
        return isNaN(d.getTime()) ? null : d.toISOString()
    } catch {
        return null
    }
}

/**
 * Attempts to refresh the Supabase auth session using multiple strategies:
 * refreshSession → getSession → getUser, returning the first successful userId.
 */
export const refreshAuth = async () => {
    try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (!refreshError && refreshData?.session?.user?.id) {
            return { source: 'refreshSession', userId: refreshData.session.user.id }
        }
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.user?.id) {
            return { source: 'getSession', userId: sessionData.session.user.id }
        }
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user?.id) {
            return { source: 'getUser', userId: userData.user.id }
        }
        return { source: 'none', userId: null }
    } catch (error) {
        return { error, source: 'error', userId: null }
    }
}

/** Validates that Supabase is properly configured with real (non-placeholder) credentials. */
export const isSupabaseConfigured = (supabase) => {
    if (!supabase) return false
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) return false
    if (!supabase.supabaseUrl || supabase.supabaseUrl.includes('example.supabase.co')) return false
    if (!supabase.supabaseKey || supabase.supabaseKey === 'your-public-anon-key') return false
    return true
}

/** Extracts an error message from a Supabase response, or null if no error. */
export const extractSupabaseErrorMessage = (response) => {
    if (!response) return 'Empty response received'
    return response.error ? getSupabaseErrorDetails(response.error) : null
}

/** Builds a case-insensitive partial text filter object for Supabase ILIKE queries. */
export const createPartialTextFilter = (column, searchTerm) => {
    const sanitizedColumn = sanitizeColumnName(column)
    if (!searchTerm?.trim() || !sanitizedColumn) return {}
    const sanitizedTerm = sanitizeLikePattern(searchTerm)
    return { [sanitizedColumn]: { ilike: `%${sanitizedTerm}%` } }
}

/**
 * Low-level CRUD operations against allowlisted tables via the database-service edge function.
 * All table and column names are sanitized before being sent to the API.
 */
export const SupabaseUtils = {
    /** Deletes records matching a filter column/value from an allowlisted table. */
    async delete(table, filterColumn, value) {
        const sanitizedTable = sanitizeTableName(table)
        const sanitizedColumn = sanitizeColumnName(filterColumn)
        if (!sanitizedTable) throw new Error('Invalid or disallowed table name')
        if (!sanitizedColumn || value === undefined) throw new Error('Filter column and value are required')
        const { res, json } = await APIUtility.post('/database-service/delete', {
            filterColumn: sanitizedColumn,
            table: sanitizedTable,
            value
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to delete')
        return true
    },

    /** Fetches records from an allowlisted table filtered by a column/value pair. */
    async fetch(table, columns = '*', filterColumn, value) {
        const sanitizedTable = sanitizeTableName(table)
        const sanitizedColumn = sanitizeColumnName(filterColumn)
        if (!sanitizedTable) throw new Error('Invalid or disallowed table name')
        if (!sanitizedColumn || value === undefined) throw new Error('Filter column and value are required')
        const { res, json } = await APIUtility.post('/database-service/fetch', {
            columns,
            filterColumn: sanitizedColumn,
            table: sanitizedTable,
            value
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch')
        return json?.data ?? []
    },

    /** Fetches all records from an allowlisted table, ordered by ID. */
    async fetchAll(table, columns = '*') {
        const sanitizedTable = sanitizeTableName(table)
        if (!sanitizedTable) throw new Error('Invalid or disallowed table name')
        const { res, json } = await APIUtility.post('/database-service/fetch-all', {
            columns,
            orderBy: 'id',
            table: sanitizedTable
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch all')
        return json?.data ?? []
    },

    /** Inserts a record into an allowlisted table. */
    async insert(table, item) {
        const sanitizedTable = sanitizeTableName(table)
        if (!sanitizedTable || !item) throw new Error('Invalid table or item missing')
        const { res, json } = await APIUtility.post('/database-service/insert', {
            item,
            table: sanitizedTable
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to insert')
        return json?.data ?? []
    },

    /** Updates records in an allowlisted table matching a filter column/value pair. */
    async update(table, filterColumn, value, data) {
        const sanitizedTable = sanitizeTableName(table)
        const sanitizedColumn = sanitizeColumnName(filterColumn)
        if (!sanitizedTable) throw new Error('Invalid or disallowed table name')
        if (!sanitizedColumn || value === undefined || !data)
            throw new Error('Filter column, value, and data are required')
        const { res, json } = await APIUtility.post('/database-service/update', {
            data,
            filterColumn: sanitizedColumn,
            table: sanitizedTable,
            value
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to update')
        return true
    }
}
