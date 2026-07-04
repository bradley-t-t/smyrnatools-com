// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
// @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
// @ts-ignore
import { requireAuthenticated } from '../_shared/requireSession.ts'

const READS_TABLE = 'notification_reads'

async function parseBody(req: Request): Promise<any> {
    try {
        return await req.json()
    } catch {
        return {}
    }
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const headers = getCorsHeaders(origin)
    try {
        const url = new URL(req.url)
        const endpoint = url.pathname.split('/').pop()
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } })
        const body = await parseBody(req)

        switch (endpoint) {
            case 'mark-read': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { dbId } = body
                if (!dbId) return errorResponse('dbId is required', headers, 400)
                const { error } = await supabase
                    .from(READS_TABLE)
                    .upsert(
                        { notification_id: dbId, read_at: new Date().toISOString(), user_id: auth },
                        { onConflict: 'notification_id,user_id' }
                    )
                if (error) return errorResponse('Failed to mark as read', headers, 500)
                return jsonResponse(true, headers)
            }
            case 'mark-all-read': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { dbIds } = body
                if (!Array.isArray(dbIds) || !dbIds.length)
                    return errorResponse('dbIds are required', headers, 400)
                const rows = dbIds.map((id: string) => ({
                    notification_id: id,
                    read_at: new Date().toISOString(),
                    user_id: auth
                }))
                const { error } = await supabase
                    .from(READS_TABLE)
                    .upsert(rows, { onConflict: 'notification_id,user_id' })
                if (error) return errorResponse('Failed to mark all as read', headers, 500)
                return jsonResponse(true, headers)
            }
            case 'delete-notification': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { dbId } = body
                if (!dbId) return errorResponse('dbId is required', headers, 400)
                const now = new Date().toISOString()
                const { error } = await supabase
                    .from(READS_TABLE)
                    .upsert(
                        { deleted_at: now, notification_id: dbId, read_at: now, user_id: auth },
                        { onConflict: 'notification_id,user_id' }
                    )
                if (error) return errorResponse('Failed to delete notification', headers, 500)
                return jsonResponse(true, headers)
            }
            default:
                return errorResponse('Invalid endpoint', headers, 404, { path: url.pathname })
        }
    } catch (error) {
        return errorResponse('Internal server error', headers, 500)
    }
})
