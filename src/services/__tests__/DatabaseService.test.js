/**
 * DatabaseService creates a Supabase client at module load time, requiring
 * REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY. We set these
 * before requiring the module, and mock APIUtility at the module level.
 */

let DatabaseService, getDatabaseErrorDetails, logDatabaseError
let APIUtility

beforeAll(() => {
    process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co'
    process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-anon-key'
    jest.resetModules()

    jest.doMock('../../utils/APIUtility', () => ({
        APIUtility: { post: jest.fn() },
        __esModule: true,
        default: { post: jest.fn() }
    }))

    const dbModule = require('../DatabaseService')
    DatabaseService = dbModule.DatabaseService
    getDatabaseErrorDetails = dbModule.getDatabaseErrorDetails
    logDatabaseError = dbModule.logDatabaseError
    APIUtility = require('../../utils/APIUtility').default
})

describe('DatabaseService', () => {
    afterEach(() => jest.clearAllMocks())

    describe('executeMigration', () => {
        const ALLOWED_SQL = 'alter table public.operators add column if not exists phone text'

        it('executes an allowed migration and returns data', async () => {
            APIUtility.post.mockResolvedValue({
                json: { data: [{ success: true }] },
                res: { ok: true }
            })

            const result = await DatabaseService.executeMigration(ALLOWED_SQL)
            expect(APIUtility.post).toHaveBeenCalledWith('/database-service/execute-migration', {
                migration: ALLOWED_SQL
            })
            expect(result).toEqual([{ success: true }])
        })

        it('throws for a disallowed migration', async () => {
            await expect(DatabaseService.executeMigration('DROP TABLE users')).rejects.toThrow('Migration not allowed')
            expect(APIUtility.post).not.toHaveBeenCalled()
        })

        it('throws when the API returns an error', async () => {
            APIUtility.post.mockResolvedValue({
                json: { error: 'Server error' },
                res: { ok: false }
            })

            await expect(DatabaseService.executeMigration(ALLOWED_SQL)).rejects.toThrow('Server error')
        })
    })

    describe('tableExists', () => {
        it('returns true when the API confirms existence', async () => {
            APIUtility.post.mockResolvedValue({
                json: { exists: true },
                res: { ok: true }
            })

            expect(await DatabaseService.tableExists('mixers')).toBe(true)
            expect(APIUtility.post).toHaveBeenCalledWith('/database-service/table-exists', { tableName: 'mixers' })
        })

        it('returns false when the API says no', async () => {
            APIUtility.post.mockResolvedValue({
                json: { exists: false },
                res: { ok: true }
            })

            expect(await DatabaseService.tableExists('mixers')).toBe(false)
        })

        it('returns false on API failure', async () => {
            APIUtility.post.mockResolvedValue({
                json: {},
                res: { ok: false }
            })

            expect(await DatabaseService.tableExists('mixers')).toBe(false)
        })

        it('throws for disallowed table names', async () => {
            await expect(DatabaseService.tableExists('evil_table')).rejects.toThrow('Invalid or disallowed table name')
        })

        it('throws for SQL-injection-style table names', async () => {
            await expect(DatabaseService.tableExists('users; DROP TABLE users--')).rejects.toThrow(
                'Invalid or disallowed table name'
            )
        })
    })

    describe('getAllRecords', () => {
        it('returns data from an allowlisted table', async () => {
            const mockData = [{ id: 1, name: 'Mixer A' }]
            APIUtility.post.mockResolvedValue({
                json: { data: mockData },
                res: { ok: true }
            })

            const result = await DatabaseService.getAllRecords('mixers')
            expect(result).toEqual(mockData)
        })

        it('returns empty array on API failure', async () => {
            APIUtility.post.mockResolvedValue({
                json: {},
                res: { ok: false }
            })

            expect(await DatabaseService.getAllRecords('mixers')).toEqual([])
        })

        it('throws for disallowed table', async () => {
            await expect(DatabaseService.getAllRecords('secret_data')).rejects.toThrow(
                'Invalid or disallowed table name'
            )
        })
    })
})

describe('getDatabaseErrorDetails', () => {
    it('returns "Unknown error" for falsy input', () => {
        expect(getDatabaseErrorDetails(null)).toBe('Unknown error')
        expect(getDatabaseErrorDetails(undefined)).toBe('Unknown error')
    })

    it('returns just the message when no extra details', () => {
        expect(getDatabaseErrorDetails({ message: 'Something broke' })).toBe('Something broke')
    })

    it('includes details, hint, and code when present', () => {
        const result = getDatabaseErrorDetails({
            code: '23505',
            details: 'Key already exists',
            hint: 'Check constraints',
            message: 'Duplicate key'
        })
        expect(result).toContain('Duplicate key')
        expect(result).toContain('Key already exists')
        expect(result).toContain('Check constraints')
        expect(result).toContain('23505')
    })

    it('stringifies non-Error objects', () => {
        expect(getDatabaseErrorDetails({ foo: 'bar' })).toBe('{"foo":"bar"}')
    })
})

describe('logDatabaseError', () => {
    it('logs context and error details to console.error', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation()
        logDatabaseError('fetchMixers', { message: 'timeout' })
        expect(spy).toHaveBeenCalledTimes(2)
        expect(spy).toHaveBeenCalledWith('Database error in fetchMixers:', { message: 'timeout' })
        spy.mockRestore()
    })
})
