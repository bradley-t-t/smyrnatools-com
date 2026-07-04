// @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'

function resolveEndpoint(url: URL): string {
    const segments = url.pathname.split('/').filter((s) => s)
    const serviceIndex = segments.findIndex((s) => s === 'error-reporting-service')
    return serviceIndex >= 0 && segments[serviceIndex + 1] ? segments[serviceIndex + 1] : segments[segments.length - 1]
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const headers = getCorsHeaders(origin)
    try {
        const url = new URL(req.url)
        const endpoint = resolveEndpoint(url)

        switch (endpoint) {
            case 'report-batch': {
                let body: any = {}
                try {
                    body = await req.json()
                } catch {}
                const errors: any[] = Array.isArray(body?.errors) ? body.errors : []
                for (const err of errors) {
                    console.error(
                        `[client-error] project=${err.project} browser=${err.browser} os=${err.os} url=${err.url}`,
                        err.error_message,
                        err.component_stack ?? err.source_file ?? ''
                    )
                }
                return jsonResponse({ received: errors.length }, headers)
            }
            default:
                return errorResponse('Invalid endpoint', headers, 404)
        }
    } catch {
        return errorResponse('Internal server error', headers, 500)
    }
})
