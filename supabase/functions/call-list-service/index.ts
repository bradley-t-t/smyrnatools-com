// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.45.4' // @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
// @ts-ignore
import { requireAuthenticated } from '../_shared/requireSession.ts'

const INTERACTIONS_TABLE = 'customer_interactions'
const CONTACTS_TABLE = 'customer_contacts'
const ACCOUNTS_TABLE = 'crm_accounts'
const PROFILES_TABLE = 'users_profiles'
const FOLLOWUPS_TABLE = 'customer_followups'
const OPPORTUNITIES_TABLE = 'customer_opportunities'
const NOTIFICATIONS_TABLE = 'notifications'
const PINS_TABLE = 'crm_pins'
const VALID_OUTCOMES = new Set(['no_answer', 'booked', 'not_interested', 'will_book_again', 'note'])
const VALID_TYPES = new Set(['call', 'site_visit', 'meeting', 'email', 'text', 'note'])
const VALID_LENSES = new Set(['sales', 'plant', 'dispatch', 'general'])
const VALID_STAGES = new Set(['prospect', 'customer', 'lost'])
const VALID_FOLLOWUP_STATUS = new Set(['open', 'done', 'snoozed', 'cancelled'])
const VALID_STAGES_OPP = new Set(['new', 'contacted', 'quoted', 'won', 'lost'])

/** Normalize a phone string to digits only and strip the US `1` country
 *  code from 11-digit numbers so this key matches `parsePhoneNumbers().key`
 *  on the frontend. That parity is what lets a manually-saved contact
 *  overlay onto the parsed dispatch entry it represents. */
function normalizePhoneDigits(input: unknown): string {
    if (typeof input !== 'string') return ''
    const digits = input.replace(/\D+/g, '')
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
    return digits
}

async function parseBody(req: Request): Promise<any> {
    try {
        return await req.json()
    } catch {
        return {}
    }
}

function getAdminClient(): any {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
}

async function lookupUserDisplayName(admin: any, userId: string): Promise<string | null> {
    // Display names live on `users_profiles`, not the bare `users` table.
    // The old select against `users.first_name` silently errored and
    // returned null for every call entry — leaving `created_by_name`
    // empty in the DB and Team Monitor falling back to "Unknown user".
    const { data, error } = await admin
        .from(PROFILES_TABLE)
        .select('first_name, last_name')
        .eq('id', userId)
        .maybeSingle()
    if (error || !data) return null
    const first = typeof data.first_name === 'string' ? data.first_name.trim() : ''
    const last = typeof data.last_name === 'string' ? data.last_name.trim() : ''
    const combined = [first, last].filter(Boolean).join(' ').trim()
    return combined || null
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const headers = getCorsHeaders(origin)
    try {
        const url = new URL(req.url)
        const endpoint = url.pathname.split('/').pop()
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } })

        switch (endpoint) {
            case 'roster': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const admin = getAdminClient()
                const scope = typeof body?.scope === 'string' ? body.scope : 'all'
                let plantCodes: string[] = []
                if (scope === 'my-plants') {
                    const { data: prof } = await admin.from(PROFILES_TABLE)
                        .select('plant_code, additional_assigned_plants').eq('id', auth).maybeSingle()
                    const extra = Array.isArray(prof?.additional_assigned_plants) ? prof.additional_assigned_plants : []
                    plantCodes = [prof?.plant_code, ...extra].filter((c: unknown): c is string => !!c)
                }
                const { data, error } = await admin.rpc('get_call_list_roster', {
                    include_active: body?.includeActive === true,
                    scope, p_user_id: auth, p_plant_codes: plantCodes
                })
                if (error) return errorResponse('Failed to load call list', headers, 400, { detail: error.message })
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'account': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const accountId = typeof body?.accountId === 'string' ? body.accountId : ''
                if (!accountId) return errorResponse('accountId is required', headers, 400)
                const admin = getAdminClient()
                const [acct, contacts, interactions] = await Promise.all([
                    admin.from(ACCOUNTS_TABLE).select('*').eq('id', accountId).maybeSingle(),
                    admin.from(CONTACTS_TABLE).select('*').eq('account_id', accountId)
                        .order('is_primary', { ascending: false }).order('updated_at', { ascending: false }),
                    admin.from(INTERACTIONS_TABLE).select('*').eq('account_id', accountId)
                        .order('occurred_at', { ascending: false }).limit(100)
                ])
                if (acct.error || !acct.data) return errorResponse('Account not found', headers, 404)
                return jsonResponse({ data: {
                    account: acct.data, contacts: contacts.data ?? [], interactions: interactions.data ?? []
                } }, headers)
            }
            case 'save-account': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const name = typeof body?.name === 'string' ? body.name.trim() : ''
                if (!name) return errorResponse('name is required', headers, 400)
                const stage = VALID_STAGES.has(body?.lifecycleStage) ? body.lifecycleStage : 'prospect'
                const admin = getAdminClient()
                const row: Record<string, unknown> = {
                    name, lifecycle_stage: stage, updated_by: auth,
                    tags: Array.isArray(body?.tags) ? body.tags : undefined,
                    phone: typeof body?.phone === 'string' ? body.phone : undefined,
                    notes: typeof body?.notes === 'string' ? body.notes : undefined,
                    sales_rep_user_id: typeof body?.salesRepUserId === 'string' ? body.salesRepUserId : undefined
                }
                Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
                let result
                if (typeof body?.id === 'string' && body.id) {
                    result = await admin.from(ACCOUNTS_TABLE).update(row).eq('id', body.id).select().maybeSingle()
                } else {
                    result = await admin.from(ACCOUNTS_TABLE)
                        .insert({ ...row, source: 'manual', created_by: auth }).select().maybeSingle()
                }
                if (result.error) return errorResponse('Failed to save account', headers, 400, { detail: result.error.message })
                return jsonResponse({ data: result.data }, headers)
            }
            case 'log-interaction': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const accountId = typeof body?.accountId === 'string' ? body.accountId : ''
                if (!accountId) return errorResponse('accountId is required', headers, 400)
                const type = VALID_TYPES.has(body?.interactionType) ? body.interactionType : 'note'
                const lens = VALID_LENSES.has(body?.roleLens) ? body.roleLens : 'general'
                const outcome = type === 'call' && VALID_OUTCOMES.has(body?.outcome) ? body.outcome : null
                const mentionUserIds = Array.isArray(body?.mentionUserIds) ? body.mentionUserIds : []
                const admin = getAdminClient()
                const interactionName = await lookupUserDisplayName(admin, auth)
                const { data: acct } = await admin.from(ACCOUNTS_TABLE).select('customer_num, name').eq('id', accountId).maybeSingle()
                const { data, error } = await admin.from(INTERACTIONS_TABLE).insert({
                    account_id: accountId, customer_num: acct?.customer_num ?? null,
                    interaction_type: type, role_lens: lens, outcome,
                    comment: typeof body?.comment === 'string' ? body.comment : null,
                    occurred_at: typeof body?.occurredAt === 'string' ? body.occurredAt : new Date().toISOString(),
                    created_by: auth, created_by_name: interactionName,
                    participant_user_ids: mentionUserIds
                }).select().maybeSingle()
                if (error) return errorResponse('Failed to log interaction', headers, 400, { detail: error.message })
                // Best-effort mention notifications — failure does not abort the response.
                const mentionTargets = mentionUserIds.filter((uid: string) => uid !== auth)
                if (mentionTargets.length > 0) {
                    const notificationRows = mentionTargets.map((uid: string) => ({
                        user_id: uid,
                        type: 'mention',
                        title: `${interactionName ?? 'Someone'} mentioned you`,
                        message: acct?.name ? `In a note on ${acct.name}` : 'In a CRM interaction note',
                        read: false,
                        created_at: new Date().toISOString()
                    }))
                    admin.from(NOTIFICATIONS_TABLE).insert(notificationRows).then(({ error: notifError }) => {
                        if (notifError) console.error('[call-list-service] mention notification insert failed', notifError.message)
                    })
                }
                // Best-effort auto-deal creation on positive interaction signals.
                // A meeting, site visit, or a call with a booking outcome triggers
                // deal creation when no open opportunity already exists for the account.
                const isPositiveSignal =
                    type === 'meeting' || type === 'site_visit' ||
                    (type === 'call' && (outcome === 'booked' || outcome === 'will_book_again'))
                // Awaited (not fire-and-forget): Deno may terminate the worker
                // right after the response returns, which would drop a detached
                // promise. The extra two queries are cheap for a logging action.
                if (isPositiveSignal) {
                    try {
                        const { data: existingOpp } = await admin
                            .from(OPPORTUNITIES_TABLE)
                            .select('id')
                            .eq('account_id', accountId)
                            .not('stage', 'in', '("won","lost")')
                            .limit(1)
                        if (!existingOpp?.length) {
                            const { data: acctDetail } = await admin
                                .from(ACCOUNTS_TABLE)
                                .select('name, sales_rep_user_id')
                                .eq('id', accountId)
                                .maybeSingle()
                            const acctName = acctDetail?.name ?? 'Unknown'
                            const dealStage = outcome === 'booked' ? 'quoted' : 'contacted'
                            await admin.from(OPPORTUNITIES_TABLE).insert({
                                account_id: accountId,
                                title: `Active deal — ${acctName}`,
                                stage: dealStage,
                                owner_user_id: acctDetail?.sales_rep_user_id ?? null,
                                source: 'activity',
                                created_by: auth
                            })
                        }
                    } catch (autoCreateError: unknown) {
                        const msg = autoCreateError instanceof Error ? autoCreateError.message : String(autoCreateError)
                        console.error('[call-list-service] auto-deal creation failed', msg)
                    }
                }
                return jsonResponse({ data }, headers)
            }
            case 'contacts': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const customerNum = typeof body?.customerNum === 'string' ? body.customerNum.trim() : ''
                if (!customerNum) return errorResponse('customerNum is required', headers, 400)
                const admin = getAdminClient()
                const { data, error } = await admin
                    .from(CONTACTS_TABLE)
                    .select('*')
                    .eq('customer_num', customerNum)
                    .order('is_primary', { ascending: false })
                    .order('updated_at', { ascending: false })
                if (error) return errorResponse('Failed to load contacts', headers, 400, { detail: error.message })
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'save-contact': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const userId = auth as string
                const customerNum = typeof body?.customerNum === 'string' ? body.customerNum.trim() : ''
                const rawDisplay = typeof body?.phoneDisplay === 'string' ? body.phoneDisplay.trim() : ''
                const digits = normalizePhoneDigits(body?.phoneDigits ?? body?.phoneDisplay ?? '')
                if (!customerNum) return errorResponse('customerNum is required', headers, 400)
                if (!digits) return errorResponse('A valid phone number is required', headers, 400)
                const phoneDisplay = rawDisplay || digits
                const label = typeof body?.label === 'string' && body.label.trim() ? body.label.trim() : null
                const contactName =
                    typeof body?.contactName === 'string' && body.contactName.trim() ? body.contactName.trim() : null
                const notes = typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
                const email = typeof body?.email === 'string' ? body.email : null
                const title = typeof body?.title === 'string' ? body.title : null
                const isPrimary = body?.isPrimary === true
                const isHidden = body?.isHidden === true
                const source = body?.source === 'dispatch' ? 'dispatch' : 'manual'
                const admin = getAdminClient()
                // Resolve account_id from customer_num when not supplied directly.
                let accountId: string | null = typeof body?.accountId === 'string' ? body.accountId : null
                if (!accountId && customerNum) {
                    const { data: acct } = await admin.from(ACCOUNTS_TABLE)
                        .select('id').eq('customer_num', customerNum).maybeSingle()
                    accountId = acct?.id ?? null
                }
                // Enforce a single visible primary per customer — clear the
                // flag on any other rows before upserting this one as primary.
                if (isPrimary && !isHidden) {
                    const { error: clearError } = await admin
                        .from(CONTACTS_TABLE)
                        .update({ is_primary: false, updated_by: userId })
                        .eq('customer_num', customerNum)
                        .neq('phone_digits', digits)
                    if (clearError) {
                        return errorResponse('Failed to update primary', headers, 400, { detail: clearError.message })
                    }
                }
                const { data, error } = await admin
                    .from(CONTACTS_TABLE)
                    .upsert(
                        {
                            customer_num: customerNum,
                            account_id: accountId,
                            phone_digits: digits,
                            phone_display: phoneDisplay,
                            label,
                            contact_name: contactName,
                            email,
                            title,
                            is_primary: isPrimary,
                            is_hidden: isHidden,
                            source,
                            notes,
                            created_by: userId,
                            updated_by: userId
                        },
                        { onConflict: 'customer_num,phone_digits' }
                    )
                    .select('*')
                    .single()
                if (error) return errorResponse('Failed to save contact', headers, 400, { detail: error.message })
                return jsonResponse({ data }, headers)
            }
            case 'delete-contact': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const userId = auth as string
                const customerNum = typeof body?.customerNum === 'string' ? body.customerNum.trim() : ''
                const digits = normalizePhoneDigits(body?.phoneDigits ?? body?.phoneDisplay ?? '')
                if (!customerNum) return errorResponse('customerNum is required', headers, 400)
                if (!digits) return errorResponse('phoneDigits is required', headers, 400)
                const admin = getAdminClient()
                // If the row was seeded from dispatch we soft-hide so the
                // dispatch HTML doesn't keep re-surfacing it. Manual rows
                // get a hard delete.
                const { data: existing } = await admin
                    .from(CONTACTS_TABLE)
                    .select('id, source')
                    .eq('customer_num', customerNum)
                    .eq('phone_digits', digits)
                    .maybeSingle()
                if (existing?.source === 'dispatch') {
                    const { data, error } = await admin
                        .from(CONTACTS_TABLE)
                        .update({ is_hidden: true, is_primary: false, updated_by: userId })
                        .eq('id', existing.id)
                        .select('*')
                        .single()
                    if (error) return errorResponse('Failed to hide contact', headers, 400, { detail: error.message })
                    return jsonResponse({ data, action: 'hidden' }, headers)
                }
                if (existing?.id) {
                    const { error } = await admin.from(CONTACTS_TABLE).delete().eq('id', existing.id)
                    if (error) return errorResponse('Failed to delete contact', headers, 400, { detail: error.message })
                    return jsonResponse({ success: true, action: 'deleted' }, headers)
                }
                // No row yet — caller is hiding an auto-populated dispatch
                // entry that's never been persisted. Insert a hidden stub.
                const phoneDisplay =
                    typeof body?.phoneDisplay === 'string' && body.phoneDisplay.trim() ? body.phoneDisplay.trim() : digits
                const { data, error } = await admin
                    .from(CONTACTS_TABLE)
                    .insert({
                        customer_num: customerNum,
                        phone_digits: digits,
                        phone_display: phoneDisplay,
                        is_hidden: true,
                        source: 'dispatch',
                        created_by: userId,
                        updated_by: userId
                    })
                    .select('*')
                    .single()
                if (error) return errorResponse('Failed to hide contact', headers, 400, { detail: error.message })
                return jsonResponse({ data, action: 'hidden' }, headers)
            }
            case 'history':
            case 'interactions': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const admin = getAdminClient()
                const limit = Number.isInteger(body?.limit) ? body.limit : 100
                let q = admin.from(INTERACTIONS_TABLE).select('*').order('occurred_at', { ascending: false }).limit(limit)
                if (typeof body?.accountId === 'string' && body.accountId) q = q.eq('account_id', body.accountId)
                else if (typeof body?.customerNum === 'string' && body.customerNum) q = q.eq('customer_num', body.customerNum)
                else return errorResponse('accountId or customerNum is required', headers, 400)
                const { data, error } = await q
                if (error) return errorResponse('Failed to load interactions', headers, 400, { detail: error.message })
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'leaderboard': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const daysWindow =
                    Number.isInteger(body?.daysWindow) && body.daysWindow > 0
                        ? Math.min(body.daysWindow, 365)
                        : 30
                const admin = getAdminClient()
                const { data, error } = await admin.rpc('get_call_list_leaderboard', {
                    days_window: daysWindow
                })
                if (error) return errorResponse('Failed to load leaderboard', headers, 400, { detail: error.message })
                return jsonResponse({ data: data ?? [], daysWindow }, headers)
            }
            case 'recent-activity': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const limit = Number.isInteger(body?.limit) && body.limit > 0 ? Math.min(body.limit, 500) : 200
                const admin = getAdminClient()
                const { data, error } = await admin
                    .from(INTERACTIONS_TABLE)
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(limit)
                if (error) return errorResponse('Failed to load activity', headers, 400)
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'log-call': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                if (!VALID_OUTCOMES.has(body?.outcome)) return errorResponse('valid outcome is required', headers, 400)
                const admin = getAdminClient()
                const customerNum = typeof body?.customerNum === 'string' ? body.customerNum : ''
                const { data: acct } = await admin.from(ACCOUNTS_TABLE).select('id').eq('customer_num', customerNum).maybeSingle()
                if (!acct) return errorResponse('Unknown customer', headers, 404)
                const name = await lookupUserDisplayName(admin, auth)
                const { data, error } = await admin.from(INTERACTIONS_TABLE).insert({
                    account_id: acct.id, customer_num: customerNum, interaction_type: 'call', role_lens: 'general',
                    outcome: body.outcome, comment: typeof body?.comment === 'string' ? body.comment : null,
                    occurred_at: new Date().toISOString(), created_by: auth, created_by_name: name
                }).select().maybeSingle()
                if (error) return errorResponse('Failed to save call', headers, 400, { detail: error.message })
                return jsonResponse({ data }, headers)
            }
            case 'delete-log': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const logId = typeof body?.logId === 'string' ? body.logId.trim() : ''
                if (!logId) return errorResponse('logId is required', headers, 400)
                const admin = getAdminClient()
                const { data, error } = await admin
                    .from(INTERACTIONS_TABLE)
                    .delete()
                    .eq('id', logId)
                    .eq('created_by', auth)
                    .select('id')
                if (error) return errorResponse('Failed to delete', headers, 400)
                if (!data?.length) return errorResponse('Entry not found or not yours to delete', headers, 404)
                return jsonResponse({ success: true }, headers)
            }
            case 'bulk-assign-sales-reps': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const assignments = Array.isArray(body?.assignments) ? body.assignments : []
                if (!assignments.length) return errorResponse('assignments array is required', headers, 400)
                const admin = getAdminClient()
                const matched: number[] = []
                const unmatched: unknown[] = []
                for (const assignment of assignments) {
                    const repUserId = typeof assignment?.repUserId === 'string' ? assignment.repUserId : null
                    if (!repUserId) { unmatched.push(assignment); continue }
                    let accountId: string | null = null
                    // Try exact customer_num match first.
                    if (typeof assignment?.customerNum === 'string' && assignment.customerNum) {
                        const { data: byNum } = await admin.from(ACCOUNTS_TABLE)
                            .select('id').eq('customer_num', assignment.customerNum).maybeSingle()
                        accountId = byNum?.id ?? null
                    }
                    // Fall back to case-insensitive name match.
                    if (!accountId && typeof assignment?.customerName === 'string' && assignment.customerName) {
                        const { data: byName } = await admin.from(ACCOUNTS_TABLE)
                            .select('id').ilike('name', assignment.customerName).maybeSingle()
                        accountId = byName?.id ?? null
                    }
                    if (!accountId) { unmatched.push(assignment); continue }
                    await admin.from(ACCOUNTS_TABLE).update({ sales_rep_user_id: repUserId, updated_by: auth }).eq('id', accountId)
                    matched.push(accountId as unknown as number)
                }
                return jsonResponse({ data: { matched: matched.length, unmatched } }, headers)
            }
            case 'followups-list': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const admin = getAdminClient()
                let q = admin.from(FOLLOWUPS_TABLE).select('*').order('due_at', { ascending: true, nullsFirst: false })
                if (body?.mineOnly === true) {
                    q = q.eq('assigned_to', auth)
                    // Default to open status when mineOnly is set and no explicit status given.
                    if (!body?.status) q = q.eq('status', 'open')
                } else if (typeof body?.assignedTo === 'string' && body.assignedTo) {
                    q = q.eq('assigned_to', body.assignedTo)
                }
                if (typeof body?.accountId === 'string' && body.accountId) q = q.eq('account_id', body.accountId)
                if (typeof body?.status === 'string' && body.status) q = q.eq('status', body.status)
                const { data, error } = await q
                if (error) return errorResponse('Failed to load followups', headers, 400, { detail: error.message })
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'save-followup': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const title = typeof body?.title === 'string' ? body.title.trim() : ''
                if (!title) return errorResponse('title is required', headers, 400)
                const status = VALID_FOLLOWUP_STATUS.has(body?.status) ? body.status : 'open'
                const admin = getAdminClient()
                const followupRow: Record<string, unknown> = {
                    title,
                    status,
                    details: typeof body?.details === 'string' ? body.details : undefined,
                    due_at: typeof body?.dueAt === 'string' ? body.dueAt : undefined,
                    assigned_to: typeof body?.assignedTo === 'string' ? body.assignedTo : undefined,
                    snooze_until: typeof body?.snoozeUntil === 'string' ? body.snoozeUntil : undefined,
                    source_interaction_id: typeof body?.sourceInteractionId === 'string' ? body.sourceInteractionId : undefined
                }
                Object.keys(followupRow).forEach((k) => followupRow[k] === undefined && delete followupRow[k])
                let result
                if (typeof body?.id === 'string' && body.id) {
                    result = await admin.from(FOLLOWUPS_TABLE).update({ ...followupRow, updated_at: new Date().toISOString() })
                        .eq('id', body.id).select().maybeSingle()
                } else {
                    const accountId = typeof body?.accountId === 'string' ? body.accountId : ''
                    if (!accountId) return errorResponse('accountId is required when creating a followup', headers, 400)
                    result = await admin.from(FOLLOWUPS_TABLE)
                        .insert({ ...followupRow, account_id: accountId, created_by: auth }).select().maybeSingle()
                }
                if (result.error) return errorResponse('Failed to save followup', headers, 400, { detail: result.error.message })
                // Notify the assignee when it's someone other than the creator.
                const assignedTo = typeof body?.assignedTo === 'string' ? body.assignedTo : null
                if (assignedTo && assignedTo !== auth) {
                    const assignerName = await lookupUserDisplayName(admin, auth)
                    admin.from(NOTIFICATIONS_TABLE).insert({
                        user_id: assignedTo,
                        type: 'followup_assigned',
                        title: `Follow-up assigned to you`,
                        message: `${assignerName ?? 'Someone'} assigned you: ${title}`,
                        read: false,
                        created_at: new Date().toISOString()
                    }).then(({ error: notifError }) => {
                        if (notifError) console.error('[call-list-service] followup notification insert failed', notifError.message)
                    })
                }
                return jsonResponse({ data: result.data }, headers)
            }
            case 'complete-followup': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const id = typeof body?.id === 'string' ? body.id.trim() : ''
                if (!id) return errorResponse('id is required', headers, 400)
                const admin = getAdminClient()
                const { data, error } = await admin.from(FOLLOWUPS_TABLE)
                    .update({ status: 'done', completed_at: new Date().toISOString(), completed_by: auth, updated_at: new Date().toISOString() })
                    .eq('id', id).select().maybeSingle()
                if (error) return errorResponse('Failed to complete followup', headers, 400, { detail: error.message })
                return jsonResponse({ data }, headers)
            }
            case 'delete-followup': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const id = typeof body?.id === 'string' ? body.id.trim() : ''
                if (!id) return errorResponse('id is required', headers, 400)
                const admin = getAdminClient()
                const { error } = await admin.from(FOLLOWUPS_TABLE).delete().eq('id', id)
                if (error) return errorResponse('Failed to delete followup', headers, 400, { detail: error.message })
                return jsonResponse({ success: true }, headers)
            }
            case 'my-desk': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const admin = getAdminClient()
                const [followupsResult, accountsResult, opportunitiesResult, recentActivityResult] = await Promise.all([
                    admin.from(FOLLOWUPS_TABLE).select('*')
                        .eq('assigned_to', auth).eq('status', 'open')
                        .order('due_at', { ascending: true, nullsFirst: false }).limit(50),
                    admin.from(ACCOUNTS_TABLE).select('*')
                        .eq('sales_rep_user_id', auth).limit(100),
                    admin.from(OPPORTUNITIES_TABLE).select('*')
                        .eq('owner_user_id', auth)
                        .not('stage', 'in', '("won","lost")')
                        .order('updated_at', { ascending: false }).limit(50),
                    admin.from(INTERACTIONS_TABLE).select('*')
                        .eq('created_by', auth)
                        .order('occurred_at', { ascending: false }).limit(25)
                ])
                return jsonResponse({
                    data: {
                        followups: followupsResult.data ?? [],
                        accounts: accountsResult.data ?? [],
                        opportunities: opportunitiesResult.data ?? [],
                        recentActivity: recentActivityResult.data ?? []
                    }
                }, headers)
            }
            case 'opportunities-list': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const admin = getAdminClient()
                const boardMode = body?.boardMode === true || body?.openOnly === true
                let q = admin.from(OPPORTUNITIES_TABLE).select('*').order('updated_at', { ascending: false })
                if (typeof body?.accountId === 'string' && body.accountId) q = q.eq('account_id', body.accountId)
                if (typeof body?.ownerUserId === 'string' && body.ownerUserId) q = q.eq('owner_user_id', body.ownerUserId)
                if (boardMode) q = q.not('stage', 'in', '("won","lost")')
                const { data: realOpps, error } = await q
                if (error) return errorResponse('Failed to load opportunities', headers, 400, { detail: error.message })
                // Non-board-mode (e.g. account detail panel): return real rows only.
                if (!boardMode) return jsonResponse({ data: realOpps ?? [] }, headers)
                // Board mode: append derived virtual suggestion cards.
                // Each derivation step is best-effort — a failure logs and yields
                // an empty list for that source, but never breaks the real-opp response.
                const openAccountIds = new Set((realOpps ?? []).map((o: any) => o.account_id).filter(Boolean))
                // Fetch account_ids that already have a source='order' won deal so we
                // don't re-surface an order-converted customer who was already celebrated.
                let orderWonAccountIds = new Set<string>()
                try {
                    const { data: wonRows } = await admin
                        .from(OPPORTUNITIES_TABLE)
                        .select('account_id')
                        .eq('source', 'order')
                        .eq('stage', 'won')
                    if (wonRows) {
                        orderWonAccountIds = new Set(wonRows.map((r: any) => r.account_id).filter(Boolean))
                    }
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err)
                    console.error('[call-list-service] opportunities-list: order-won lookup failed', msg)
                }
                // Prospect virtuals: one card per prospect account with no open opp.
                const prospectVirtuals: any[] = []
                try {
                    const { data: prospects, error: prospectError } = await admin
                        .from(ACCOUNTS_TABLE)
                        .select('id, name, sales_rep_user_id')
                        .eq('lifecycle_stage', 'prospect')
                    if (prospectError) throw new Error(prospectError.message)
                    for (const a of (prospects ?? [])) {
                        if (openAccountIds.has(a.id)) continue
                        prospectVirtuals.push({
                            id: `virtual:prospect:${a.id}`,
                            account_id: a.id,
                            account_name: a.name,
                            title: `Win ${a.name}`,
                            stage: 'new',
                            owner_user_id: a.sales_rep_user_id ?? null,
                            source: 'prospect',
                            virtual: true
                        })
                    }
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err)
                    console.error('[call-list-service] opportunities-list: prospect virtuals failed', msg)
                }
                // Dormant virtuals: customers flagged dormant in the call-list roster.
                const dormantVirtuals: any[] = []
                try {
                    const { data: rosterRows, error: rosterError } = await admin.rpc('get_call_list_roster', {
                        include_active: false,
                        scope: 'queue',
                        p_user_id: null,
                        p_plant_codes: []
                    })
                    if (rosterError) throw new Error(rosterError.message)
                    for (const row of (rosterRows ?? [])) {
                        if (row.lifecycle_stage !== 'customer') continue
                        if (row.pouring_status !== 'dormant') continue
                        if (openAccountIds.has(row.account_id)) continue
                        dormantVirtuals.push({
                            id: `virtual:dormant:${row.account_id}`,
                            account_id: row.account_id,
                            account_name: row.customer_name,
                            title: `Reactivate ${row.customer_name}`,
                            stage: 'new',
                            owner_user_id: row.sales_rep_user_id ?? null,
                            source: 'dormant',
                            virtual: true
                        })
                    }
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err)
                    console.error('[call-list-service] opportunities-list: dormant virtuals failed', msg)
                }
                // New-customer won virtuals: recently converted accounts without a won deal yet.
                const orderVirtuals: any[] = []
                try {
                    const { data: newCustomers, error: newCustError } = await admin.rpc('get_crm_new_customer_accounts', {
                        days_window: 90
                    })
                    if (newCustError) throw new Error(newCustError.message)
                    for (const row of (newCustomers ?? [])) {
                        if (openAccountIds.has(row.account_id)) continue
                        if (orderWonAccountIds.has(row.account_id)) continue
                        orderVirtuals.push({
                            id: `virtual:order:${row.account_id}`,
                            account_id: row.account_id,
                            account_name: row.name,
                            title: `New customer — ${row.name}`,
                            stage: 'won',
                            owner_user_id: row.sales_rep_user_id ?? null,
                            source: 'order',
                            virtual: true
                        })
                    }
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err)
                    console.error('[call-list-service] opportunities-list: new-customer virtuals failed', msg)
                }
                return jsonResponse({
                    data: [...(realOpps ?? []), ...prospectVirtuals, ...dormantVirtuals, ...orderVirtuals]
                }, headers)
            }
            case 'save-opportunity': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const title = typeof body?.title === 'string' ? body.title.trim() : ''
                if (!title) return errorResponse('title is required', headers, 400)
                const stage = VALID_STAGES_OPP.has(body?.stage) ? body.stage : 'new'
                const admin = getAdminClient()
                const oppRow: Record<string, unknown> = {
                    title, stage,
                    owner_user_id: typeof body?.ownerUserId === 'string' ? body.ownerUserId : undefined,
                    expected_close: typeof body?.expectedClose === 'string' ? body.expectedClose : undefined,
                    notes: typeof body?.notes === 'string' ? body.notes : undefined,
                    lost_reason: typeof body?.lostReason === 'string' ? body.lostReason : undefined
                }
                Object.keys(oppRow).forEach((k) => oppRow[k] === undefined && delete oppRow[k])
                let result
                if (typeof body?.id === 'string' && body.id) {
                    result = await admin.from(OPPORTUNITIES_TABLE).update({ ...oppRow, updated_at: new Date().toISOString() })
                        .eq('id', body.id).select().maybeSingle()
                } else {
                    const accountId = typeof body?.accountId === 'string' ? body.accountId : ''
                    if (!accountId) return errorResponse('accountId is required when creating an opportunity', headers, 400)
                    const createSource = typeof body?.source === 'string' ? body.source : 'manual'
                    result = await admin.from(OPPORTUNITIES_TABLE)
                        .insert({ ...oppRow, account_id: accountId, source: createSource, created_by: auth }).select().maybeSingle()
                }
                if (result.error) return errorResponse('Failed to save opportunity', headers, 400, { detail: result.error.message })
                return jsonResponse({ data: result.data }, headers)
            }
            case 'move-stage': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const id = typeof body?.id === 'string' ? body.id.trim() : ''
                if (!id) return errorResponse('id is required', headers, 400)
                if (!VALID_STAGES_OPP.has(body?.stage)) return errorResponse('valid stage is required', headers, 400)
                const stage: string = body.stage
                const admin = getAdminClient()
                const isClosedStage = stage === 'won' || stage === 'lost'
                const stageUpdate: Record<string, unknown> = {
                    stage,
                    updated_at: new Date().toISOString(),
                    closed_at: isClosedStage ? new Date().toISOString() : null
                }
                if (stage === 'lost' && typeof body?.lostReason === 'string') {
                    stageUpdate.lost_reason = body.lostReason
                }
                const { data: updatedOpp, error: updateError } = await admin.from(OPPORTUNITIES_TABLE)
                    .update(stageUpdate).eq('id', id).select().maybeSingle()
                if (updateError) return errorResponse('Failed to move stage', headers, 400, { detail: updateError.message })
                // Record a note interaction for the audit trail.
                const actorName = await lookupUserDisplayName(admin, auth)
                const opportunityAccountId = updatedOpp?.account_id ?? null
                if (opportunityAccountId) {
                    const { data: acct } = await admin.from(ACCOUNTS_TABLE).select('customer_num').eq('id', opportunityAccountId).maybeSingle()
                    admin.from(INTERACTIONS_TABLE).insert({
                        account_id: opportunityAccountId,
                        customer_num: acct?.customer_num ?? null,
                        interaction_type: 'note',
                        role_lens: 'sales',
                        outcome: null,
                        comment: `Opportunity moved to ${stage}`,
                        occurred_at: new Date().toISOString(),
                        created_by: auth,
                        created_by_name: actorName
                    }).then(({ error: noteError }) => {
                        if (noteError) console.error('[call-list-service] move-stage note insert failed', noteError.message)
                    })
                }
                return jsonResponse({ data: updatedOpp }, headers)
            }
            case 'delete-opportunity': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const id = typeof body?.id === 'string' ? body.id.trim() : ''
                if (!id) return errorResponse('id is required', headers, 400)
                const admin = getAdminClient()
                const { error } = await admin.from(OPPORTUNITIES_TABLE).delete().eq('id', id)
                if (error) return errorResponse('Failed to delete opportunity', headers, 400, { detail: error.message })
                return jsonResponse({ success: true }, headers)
            }
            case 'geocode-accounts': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const batchLimit = Number.isInteger(body?.limit)
                    ? Math.max(1, Math.min(body.limit, 25))
                    : 15
                const admin = getAdminClient()
                // Fetch accounts needing geocoding (lat is null, address present).
                const { data: accounts, error: fetchError } = await admin
                    .from(ACCOUNTS_TABLE)
                    .select('id, address, city, state')
                    .is('lat', null)
                    .not('address', 'is', null)
                    .neq('address', '')
                    .limit(batchLimit)
                if (fetchError) {
                    return errorResponse('Failed to fetch accounts', headers, 400, { detail: fetchError.message })
                }
                let geocoded = 0
                let failed = 0
                for (const account of (accounts ?? [])) {
                    try {
                        const queryParts = [account.address, account.city, account.state].filter(Boolean)
                        const query = queryParts.join(', ')
                        const censusUrl =
                            `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress` +
                            `?address=${encodeURIComponent(query)}` +
                            `&benchmark=Public_AR_Current&format=json`
                        const controller = new AbortController()
                        const timer = setTimeout(() => controller.abort(), 8000)
                        let censusRes: Response
                        try {
                            censusRes = await fetch(censusUrl, {
                                headers: { Accept: 'application/json' },
                                signal: controller.signal
                            })
                        } finally {
                            clearTimeout(timer)
                        }
                        if (!censusRes.ok) { failed++; continue }
                        const censusData = await censusRes.json()
                        const matches = Array.isArray(censusData?.result?.addressMatches)
                            ? censusData.result.addressMatches
                            : []
                        if (!matches.length) { failed++; continue }
                        const { x: lng, y: lat } = matches[0].coordinates ?? {}
                        const latNum = Number(lat)
                        const lngNum = Number(lng)
                        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) { failed++; continue }
                        const { error: updateError } = await admin
                            .from(ACCOUNTS_TABLE)
                            .update({ lat: latNum, lng: lngNum })
                            .eq('id', account.id)
                        if (updateError) { failed++; continue }
                        geocoded++
                    } catch {
                        failed++
                    }
                }
                // Count how many accounts still need geocoding after this batch.
                const { count: remainingCount } = await admin
                    .from(ACCOUNTS_TABLE)
                    .select('id', { count: 'exact', head: true })
                    .is('lat', null)
                    .not('address', 'is', null)
                    .neq('address', '')
                const remaining = remainingCount ?? 0
                return jsonResponse({ data: { geocoded, failed, remaining } }, headers)
            }
            case 'save-pin': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const lat = Number(body?.lat)
                const lng = Number(body?.lng)
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return errorResponse('lat and lng are required', headers, 400)
                const admin = getAdminClient()
                const name = await lookupUserDisplayName(admin, auth)
                const { data: row, error } = await admin.from(PINS_TABLE).insert({
                    lat, lng,
                    comment: typeof body?.comment === 'string' ? body.comment : null,
                    account_id: typeof body?.accountId === 'string' ? body.accountId : null,
                    label: typeof body?.label === 'string' ? body.label : null,
                    created_by: auth, created_by_name: name
                }).select().maybeSingle()
                if (error) return errorResponse('Failed to save pin', headers, 400, { detail: error.message })
                return jsonResponse({ data: row }, headers)
            }
            case 'pins-list': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const admin = getAdminClient()
                const limit = Number.isInteger(body?.limit) ? body.limit : 200
                let q = admin.from(PINS_TABLE).select('*').order('created_at', { ascending: false }).limit(limit)
                if (body?.mineOnly === true) q = q.eq('created_by', auth)
                const { data, error } = await q
                if (error) return errorResponse('Failed to load pins', headers, 400, { detail: error.message })
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'delete-pin': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(null, req, headers, body)
                if (auth instanceof Response) return auth
                const id = typeof body?.id === 'string' ? body.id : ''
                if (!id) return errorResponse('id is required', headers, 400)
                const admin = getAdminClient()
                const { error } = await admin.from(PINS_TABLE).delete().eq('id', id).eq('created_by', auth)
                if (error) return errorResponse('Failed to delete pin', headers, 400, { detail: error.message })
                return jsonResponse({ success: true }, headers)
            }
            default:
                return errorResponse('Invalid endpoint', headers, 404, { path: url.pathname })
        }
    } catch {
        return errorResponse('Internal server error', headers, 500)
    }
})
