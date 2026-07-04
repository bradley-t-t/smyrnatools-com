// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.45.4' // @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
// @ts-ignore
import { requireAuthenticated } from '../_shared/requireSession.ts'

const ISSUES_TABLE = 'quality_issues'
const HISTORY_TABLE = 'quality_issues_history'
const COMMENTS_TABLE = 'quality_issues_comments'

const ALLOWED_STATUSES = ['active', 'follow_up', 'holding', 'closed']
const ALLOWED_SEVERITIES = ['low', 'medium', 'high', 'critical']
const TRACKED_FIELDS = ['title', 'description', 'status', 'severity', 'plant_code', 'cost_to_close']

function createSupabaseClient() {
    return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
        auth: { autoRefreshToken: false, persistSession: false }
    })
}

async function parseBody(req: Request): Promise<any> {
    try {
        return await req.json()
    } catch {
        return {}
    }
}

function nowISO(): string {
    return new Date().toISOString()
}

function toString(v: any): string | null {
    if (v === null || v === undefined) return null
    return String(v)
}

function sanitizeString(value: any): string | null {
    if (value === null || value === undefined) return null
    const s = String(value).trim()
    return s.length > 0 ? s : null
}

function sanitizeStatus(value: any, fallback: string = 'active'): string {
    const s = sanitizeString(value)?.toLowerCase()
    return s && ALLOWED_STATUSES.includes(s) ? s : fallback
}

function sanitizeSeverity(value: any): string | null {
    const s = sanitizeString(value)?.toLowerCase()
    return s && ALLOWED_SEVERITIES.includes(s) ? s : null
}

function sanitizeCost(value: any): number | null {
    if (value === null || value === undefined || value === '') return null
    const n = Number(value)
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

/** Compute history rows for fields that actually changed between current
 *  and incoming row shapes. Skips noisy timestamp/audit columns. */
function computeDiffs(current: any, next: any, issueId: string, userId: string | null) {
    const rows: any[] = []
    const ts = nowISO()
    for (const field of TRACKED_FIELDS) {
        const before = current?.[field]
        const after = next?.[field]
        if ((before ?? null) === (after ?? null)) continue
        rows.push({
            changed_at: ts,
            changed_by: userId,
            field_name: field,
            issue_id: issueId,
            new_value: toString(after),
            old_value: toString(before)
        })
    }
    return rows
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const headers = getCorsHeaders(origin)
    try {
        const url = new URL(req.url)
        const endpoint = url.pathname.split('/').pop()

        const sessionAuth = await requireAuthenticated(null, req, headers)
        if (sessionAuth instanceof Response) return sessionAuth

        const supabase = createSupabaseClient()

        switch (endpoint) {
            // ── Reads ───────────────────────────────────────────────
            case 'list': {
                const body = await parseBody(req)
                const { regionCode, status, plantCode } = body || {}
                let q = supabase.from(ISSUES_TABLE).select('*').order('opened_at', { ascending: false })
                if (regionCode) q = q.eq('region_code', regionCode)
                if (status) {
                    if (Array.isArray(status)) q = q.in('status', status)
                    else q = q.eq('status', status)
                }
                if (plantCode) q = q.eq('plant_code', plantCode)
                const { data, error } = await q
                if (error) return errorResponse('Failed to load issues', headers, 400)
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'fetch-by-id': {
                const body = await parseBody(req)
                const id = body?.id
                if (!id) return errorResponse('Issue ID is required', headers, 400)
                const { data, error } = await supabase.from(ISSUES_TABLE).select('*').eq('id', id).maybeSingle()
                if (error) return errorResponse('Failed to load issue', headers, 400)
                return jsonResponse({ data }, headers)
            }
            case 'fetch-history': {
                const body = await parseBody(req)
                const issueId = body?.issueId
                if (!issueId) return errorResponse('Issue ID is required', headers, 400)
                const { data, error } = await supabase
                    .from(HISTORY_TABLE)
                    .select('*')
                    .eq('issue_id', issueId)
                    .order('changed_at', { ascending: false })
                if (error) return errorResponse('Failed to load history', headers, 400)
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'fetch-comments': {
                const body = await parseBody(req)
                const issueId = body?.issueId
                if (!issueId) return errorResponse('Issue ID is required', headers, 400)
                const { data, error } = await supabase
                    .from(COMMENTS_TABLE)
                    .select('*')
                    .eq('issue_id', issueId)
                    .order('created_at', { ascending: true })
                if (error) return errorResponse('Failed to load comments', headers, 400)
                return jsonResponse({ data: data ?? [] }, headers)
            }

            // ── Mutations ───────────────────────────────────────────
            case 'create': {
                const body = await parseBody(req)
                const { userId } = body || {}
                if (!userId) return errorResponse('User ID is required', headers, 400)
                const title = sanitizeString(body?.title)
                if (!title) return errorResponse('Title is required', headers, 400)
                const status = sanitizeStatus(body?.status, 'active')
                const ts = nowISO()
                const row: Record<string, any> = {
                    cost_to_close: status === 'closed' ? sanitizeCost(body?.cost_to_close) : null,
                    created_by: userId,
                    description: sanitizeString(body?.description),
                    opened_at: ts,
                    plant_code: sanitizeString(body?.plant_code),
                    region_code: sanitizeString(body?.region_code),
                    severity: sanitizeSeverity(body?.severity),
                    status,
                    title,
                    updated_at: ts,
                    updated_by: userId
                }
                if (status === 'closed') row.closed_at = ts
                const { data, error } = await supabase.from(ISSUES_TABLE).insert(row).select().single()
                if (error) return errorResponse('Failed to create issue', headers, 400)
                await supabase.from(HISTORY_TABLE).insert({
                    changed_at: ts,
                    changed_by: userId,
                    field_name: 'created',
                    issue_id: data.id,
                    new_value: status,
                    old_value: null
                })
                return jsonResponse({ data }, headers)
            }
            case 'update': {
                const body = await parseBody(req)
                const { id, userId } = body || {}
                if (!id) return errorResponse('Issue ID is required', headers, 400)
                if (!userId) return errorResponse('User ID is required', headers, 400)
                const { data: current, error: currentErr } = await supabase
                    .from(ISSUES_TABLE)
                    .select('*')
                    .eq('id', id)
                    .maybeSingle()
                if (currentErr || !current) return errorResponse('Issue not found', headers, 404)
                const nextStatus = 'status' in body ? sanitizeStatus(body.status, current.status) : current.status
                const nextRow: Record<string, any> = {
                    cost_to_close:
                        'cost_to_close' in body
                            ? sanitizeCost(body.cost_to_close)
                            : nextStatus === 'closed'
                              ? current.cost_to_close
                              : null,
                    description: 'description' in body ? sanitizeString(body.description) : current.description,
                    plant_code: 'plant_code' in body ? sanitizeString(body.plant_code) : current.plant_code,
                    severity: 'severity' in body ? sanitizeSeverity(body.severity) : current.severity,
                    status: nextStatus,
                    title: 'title' in body ? (sanitizeString(body.title) ?? current.title) : current.title,
                    updated_at: nowISO(),
                    updated_by: userId
                }
                // Auto-stamp closed_at when transitioning to/from closed.
                if (nextStatus === 'closed' && current.status !== 'closed') nextRow.closed_at = nowISO()
                if (nextStatus !== 'closed' && current.status === 'closed') nextRow.closed_at = null
                const diffs = computeDiffs(current, nextRow, id, userId)
                const { data, error } = await supabase.from(ISSUES_TABLE).update(nextRow).eq('id', id).select().single()
                if (error) return errorResponse('Failed to update issue', headers, 400)
                if (diffs.length) await supabase.from(HISTORY_TABLE).insert(diffs)
                return jsonResponse({ data }, headers)
            }
            case 'delete': {
                const body = await parseBody(req)
                const { id } = body || {}
                if (!id) return errorResponse('Issue ID is required', headers, 400)
                const { error } = await supabase.from(ISSUES_TABLE).delete().eq('id', id)
                if (error) return errorResponse('Failed to delete issue', headers, 400)
                return jsonResponse({ success: true }, headers)
            }
            case 'add-comment': {
                const body = await parseBody(req)
                const { issueId, userId, body: text } = body || {}
                if (!issueId || !userId) return errorResponse('Issue ID and user ID are required', headers, 400)
                const trimmed = sanitizeString(text)
                if (!trimmed) return errorResponse('Comment body is required', headers, 400)
                const { data, error } = await supabase
                    .from(COMMENTS_TABLE)
                    .insert({
                        body: trimmed,
                        created_at: nowISO(),
                        created_by: userId,
                        issue_id: issueId
                    })
                    .select()
                    .single()
                if (error) return errorResponse('Failed to add comment', headers, 400)
                return jsonResponse({ data }, headers)
            }
        }
        return errorResponse('Unknown endpoint', headers, 404)
    } catch (err) {
        return errorResponse((err as any)?.message || 'Unexpected error', headers, 500)
    }
})
