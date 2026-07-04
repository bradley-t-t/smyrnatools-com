// @ts-ignore
import { getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'

// This function was a duplicate of auth-service with weak password hashing
// and no rate limiting. It is permanently disabled. All authentication flows
// must go through auth-service.

Deno.serve((req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const headers = getCorsHeaders(origin)
    return jsonResponse({ error: 'Endpoint permanently disabled. Use auth-service.' }, headers, 410)
})
