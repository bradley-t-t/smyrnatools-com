import { createClient } from '@supabase/supabase-js'
import APIUtility from '../utils/APIUtility'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
})

export default supabase
export { supabase }

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
    'notifications'
])

const ALLOWED_MIGRATIONS = new Set(['alter table public.operators add column if not exists phone text'])

const sanitizeTableName = (tableName) => {
    if (!tableName || typeof tableName !== 'string') return null
    const cleaned = tableName.toLowerCase().replace(/[^a-z0-9_]/g, '')
    return ALLOWED_TABLES.has(cleaned) ? cleaned : null
}

const sanitizeColumnName = (columnName) => {
    if (!columnName || typeof columnName !== 'string') return null
    return columnName.replace(/[^a-zA-Z0-9_]/g, '')
}

const sanitizeLikePattern = (input) => {
    if (!input || typeof input !== 'string') return ''
    return input.trim().replace(/[%_\\]/g, (char) => '\\' + char)
}

export class DatabaseService {
    static async executeMigration(sql) {
        const normalizedSql = sql.toLowerCase().trim()
        if (!ALLOWED_MIGRATIONS.has(normalizedSql)) {
            throw new Error('Migration not allowed')
        }
        const { res, json } = await APIUtility.post('/database-service/execute-migration', { migration: normalizedSql })
        if (!res.ok) throw new Error(json?.error || 'Failed to execute migration')
        return json?.data ?? []
    }

    static async tableExists(tableName) {
        const sanitized = sanitizeTableName(tableName)
        if (!sanitized) throw new Error('Invalid or disallowed table name')
        const { res, json } = await APIUtility.post('/database-service/table-exists', { tableName: sanitized })
        if (!res.ok) return false
        return json?.exists === true
    }

    static async getAllRecords(tableName) {
        const sanitized = sanitizeTableName(tableName)
        if (!sanitized) throw new Error('Invalid or disallowed table name')
        const { res, json } = await APIUtility.post('/database-service/get-all-records', { tableName: sanitized })
        if (!res.ok) return []
        return json?.data ?? []
    }
}

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

export const logSupabaseError = (context, error) => {
    console.error(`Supabase error in ${context}:`, error)
    console.error('Details:', getSupabaseErrorDetails(error))
}

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

export const refreshAuth = async () => {
    try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (!refreshError && refreshData?.session?.user?.id) {
            return { userId: refreshData.session.user.id, source: 'refreshSession' }
        }
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.user?.id) {
            return { userId: sessionData.session.user.id, source: 'getSession' }
        }
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user?.id) {
            return { userId: userData.user.id, source: 'getUser' }
        }
        return { userId: null, source: 'none' }
    } catch (error) {
        return { userId: null, source: 'error', error }
    }
}

export const isSupabaseConfigured = (supabase) => {
    if (!supabase) return false
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) return false
    if (!supabase.supabaseUrl || supabase.supabaseUrl.includes('example.supabase.co')) return false
    if (!supabase.supabaseKey || supabase.supabaseKey === 'your-public-anon-key') return false
    return true
}

export const extractSupabaseErrorMessage = (response) => {
    if (!response) return 'Empty response received'
    return response.error ? getSupabaseErrorDetails(response.error) : null
}

export const createPartialTextFilter = (column, searchTerm) => {
    const sanitizedColumn = sanitizeColumnName(column)
    if (!searchTerm?.trim() || !sanitizedColumn) return {}
    const sanitizedTerm = sanitizeLikePattern(searchTerm)
    return { [sanitizedColumn]: { ilike: `%${sanitizedTerm}%` } }
}

export const SupabaseUtils = {
    async fetchAll(table, columns = '*') {
        const sanitizedTable = sanitizeTableName(table)
        if (!sanitizedTable) throw new Error('Invalid or disallowed table name')
        const { res, json } = await APIUtility.post('/database-service/fetch-all', {
            table: sanitizedTable,
            columns,
            orderBy: 'id'
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch all')
        return json?.data ?? []
    },

    async fetch(table, columns = '*', filterColumn, value) {
        const sanitizedTable = sanitizeTableName(table)
        const sanitizedColumn = sanitizeColumnName(filterColumn)
        if (!sanitizedTable) throw new Error('Invalid or disallowed table name')
        if (!sanitizedColumn || value === undefined) throw new Error('Filter column and value are required')
        const { res, json } = await APIUtility.post('/database-service/fetch', {
            table: sanitizedTable,
            columns,
            filterColumn: sanitizedColumn,
            value
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch')
        return json?.data ?? []
    },

    async insert(table, item) {
        const sanitizedTable = sanitizeTableName(table)
        if (!sanitizedTable || !item) throw new Error('Invalid table or item missing')
        const { res, json } = await APIUtility.post('/database-service/insert', {
            table: sanitizedTable,
            item
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to insert')
        return json?.data ?? []
    },

    async update(table, filterColumn, value, data) {
        const sanitizedTable = sanitizeTableName(table)
        const sanitizedColumn = sanitizeColumnName(filterColumn)
        if (!sanitizedTable) throw new Error('Invalid or disallowed table name')
        if (!sanitizedColumn || value === undefined || !data)
            throw new Error('Filter column, value, and data are required')
        const { res, json } = await APIUtility.post('/database-service/update', {
            table: sanitizedTable,
            filterColumn: sanitizedColumn,
            value,
            data
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to update')
        return true
    },

    async delete(table, filterColumn, value) {
        const sanitizedTable = sanitizeTableName(table)
        const sanitizedColumn = sanitizeColumnName(filterColumn)
        if (!sanitizedTable) throw new Error('Invalid or disallowed table name')
        if (!sanitizedColumn || value === undefined) throw new Error('Filter column and value are required')
        const { res, json } = await APIUtility.post('/database-service/delete', {
            table: sanitizedTable,
            filterColumn: sanitizedColumn,
            value
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to delete')
        return true
    }
}
