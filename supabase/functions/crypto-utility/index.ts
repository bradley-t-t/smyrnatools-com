// @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
// @ts-ignore
import { bytesToHex, generateSalt as genSalt } from '../_shared/crypto-helpers.ts'

const HASH_TIMEOUT = 5000

async function sha256(data: unknown): Promise<string> {
    const buffer = new TextEncoder().encode(String(data))
    const hashPromise = crypto.subtle.digest('SHA-256', buffer)
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SHA-256 timed out')), HASH_TIMEOUT)
    )
    return bytesToHex(new Uint8Array((await Promise.race([hashPromise, timeoutPromise])) as ArrayBuffer))
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const headers = getCorsHeaders(origin)
    try {
        const url = new URL(req.url)
        const endpoint = url.pathname.split('/').pop()
        const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

        switch (endpoint) {
            case 'hash': {
                const data = (body as { data?: string }).data
                if (!data) return errorResponse('Data is required', headers, 400)
                return jsonResponse({ hash: await sha256(data) }, headers)
            }
            case 'uuid':
                return jsonResponse({ uuid: crypto.randomUUID() }, headers)
            case 'generate-salt':
                return jsonResponse({ salt: genSalt() }, headers)
            case 'batch-hash': {
                const items = (body as { items?: unknown[] }).items
                if (!Array.isArray(items)) return errorResponse('Items must be an array', headers, 400)
                const results = await Promise.all(
                    items.map(async (item) => ({ original: item, hash: await sha256(item) }))
                )
                return jsonResponse({ results }, headers)
            }
            default:
                return errorResponse('Invalid endpoint', headers, 404, { path: url.pathname })
        }
    } catch (error) {
        return errorResponse('Internal server error', headers, 500)
    }
})
