/**
 * APIUtility reads REACT_APP_EDGE_FUNCTIONS_URL and REACT_APP_SUPABASE_ANON_KEY
 * at module load time, so we must set them BEFORE the import. Jest hoists
 * jest.mock calls but not env var assignments, so we use `beforeAll` +
 * `jest.resetModules` + dynamic `require` to re-evaluate the module with
 * the correct env vars.
 */

const MOCK_EDGE_URL = 'https://edge.example.com/functions/v1'
const MOCK_ANON_KEY = 'test-anon-key-123'

let APIUtility

beforeAll(() => {
    process.env.REACT_APP_EDGE_FUNCTIONS_URL = MOCK_EDGE_URL
    process.env.REACT_APP_SUPABASE_ANON_KEY = MOCK_ANON_KEY
    jest.resetModules()
    APIUtility = require('../APIUtility').APIUtility
})

describe('APIUtility.post', () => {
    let fetchSpy

    beforeEach(() => {
        fetchSpy = jest.spyOn(global, 'fetch')
        sessionStorage.clear()
    })

    afterEach(() => {
        fetchSpy.mockRestore()
        jest.restoreAllMocks()
    })

    it('sends a POST with JSON body and auth headers', async () => {
        const mockResponse = {
            json: () => Promise.resolve({ ok: true }),
            ok: true,
            status: 200
        }
        fetchSpy.mockResolvedValue(mockResponse)

        const { res, json } = await APIUtility.post('/test-endpoint', { key: 'value' }, { maxRetries: 0 })

        expect(res.ok).toBe(true)
        expect(json.ok).toBe(true)
        expect(fetchSpy).toHaveBeenCalledTimes(1)

        const [url, options] = fetchSpy.mock.calls[0]
        expect(url).toBe(`${MOCK_EDGE_URL}/test-endpoint`)
        expect(options.method).toBe('POST')
        expect(options.headers['Content-Type']).toBe('application/json')
        expect(options.headers.Authorization).toBe(`Bearer ${MOCK_ANON_KEY}`)

        const body = JSON.parse(options.body)
        expect(body.key).toBe('value')
    })

    it('includes session credentials from sessionStorage', async () => {
        sessionStorage.setItem('smyrna_session', 'user-123')
        sessionStorage.setItem('smyrna_session_id', 'session-456')

        fetchSpy.mockResolvedValue({
            json: () => Promise.resolve({}),
            ok: true
        })

        await APIUtility.post('/test', {}, { maxRetries: 0 })

        const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
        expect(body.__sessionUserId).toBe('user-123')
        expect(body.__sessionId).toBe('session-456')
    })

    it('returns error response on network failure after retries', async () => {
        fetchSpy.mockRejectedValue(new Error('Network error'))

        const { res, json } = await APIUtility.post('/fail', {}, { maxRetries: 0, retryDelay: 1 })

        expect(res.ok).toBe(false)
        expect(json.error).toMatch(/Network/)
    })

    it('returns timeout error message on AbortError', async () => {
        const abortError = new Error('Aborted')
        abortError.name = 'AbortError'
        fetchSpy.mockRejectedValue(abortError)

        const { res, json } = await APIUtility.post('/timeout', {}, { maxRetries: 0 })

        expect(res.ok).toBe(false)
        expect(json.error).toMatch(/timed out/)
    })

    it('retries on failure up to maxRetries', async () => {
        fetchSpy
            .mockRejectedValueOnce(new Error('fail 1'))
            .mockRejectedValueOnce(new Error('fail 2'))
            .mockResolvedValueOnce({
                json: () => Promise.resolve({ recovered: true }),
                ok: true
            })

        const { res, json } = await APIUtility.post('/retry', {}, { maxRetries: 2, retryDelay: 1 })

        expect(res.ok).toBe(true)
        expect(json.recovered).toBe(true)
        expect(fetchSpy).toHaveBeenCalledTimes(3)
    })

    it('handles JSON parse failure gracefully', async () => {
        fetchSpy.mockResolvedValue({
            json: () => Promise.reject(new Error('Bad JSON')),
            ok: true,
            status: 200
        })

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
        const { res, json } = await APIUtility.post('/bad-json', {}, { maxRetries: 0 })
        consoleSpy.mockRestore()

        expect(res.ok).toBe(true)
        expect(json).toEqual({})
    })
})
