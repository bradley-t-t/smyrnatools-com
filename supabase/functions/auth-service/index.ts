// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.55.0'
import { buildForgotPasswordEmail } from '../../../scripts/emails/forgot-passwords-email.js'
// @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
// @ts-ignore
import {
    assignGuestRole,
    buildThemeConfig,
    envOrDefault,
    generateRandomPassword,
    isValidEmail,
    normalizeName,
    nowISO,
    sanitizeEmail,
    sanitizeString,
    scorePassword,
    strengthLabel,
    validatePasswordStrength
} from '../_shared/auth-helpers.ts'
// @ts-ignore
import { generateSalt, hashPassword, rehashAndUpdate, verifyPassword } from '../_shared/crypto-helpers.ts'
// @ts-ignore
import {
    buildClearSessionCookieHeaders,
    buildSessionCookieHeaders,
    readSessionCookies,
    respondWithCookies
} from '../_shared/cookies.ts'
// @ts-ignore
import { mintSessionJwt } from '../_shared/jwt.ts'
// @ts-ignore
import { requireAuthenticated, SESSION_EXPIRY_DAYS } from '../_shared/requireSession.ts'

const JWT_TTL_SECONDS = 3600

const USERS_TABLE = 'users'
const PROFILES_TABLE = 'users_profiles'
const PREFERENCES_TABLE = 'users_preferences'
const PROFILE_SELECT_FIELDS = 'first_name, last_name, plant_code'
const SESSION_RESTORE_TIMEOUT = 5000
const MAILERSEND_API_URL = 'https://api.mailersend.com/v1/email'
const DEFAULT_FRONTEND_URL = 'https://smyrnatools.com'
const DEFAULT_FROM_NAME = 'Smyrna Tools'
const DEFAULT_LOGO_URL = 'https://smyrnatools.com/static/media/SmyrnaLogo.d7f873f3da1747602db3.png'
const RESET_PASSWORD_MESSAGE = 'If an account exists for this email, a new password has been sent.'

const DEFAULT_BASE_FILTERS = { searchText: '', selectedPlant: '', statusFilter: '', viewMode: 'grid' }
const DEFAULT_ROLE_FILTERS = { roleFilter: '', searchText: '', selectedPlant: '', viewMode: 'grid' }

// ── Persistent rate limiting (database-backed) ──────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_ATTEMPTS = 5
const RATE_LIMIT_TABLE = 'rate_limits'

async function isRateLimited(key: string, supabase: any): Promise<boolean> {
    const now = new Date()
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString()
    try {
        // Clean up expired entries and count recent attempts in one flow
        await supabase.from(RATE_LIMIT_TABLE).delete().lt('expires_at', now.toISOString())
        const { count, error } = await supabase
            .from(RATE_LIMIT_TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('key', key)
            .gte('created_at', windowStart)
        if (error) return false // Fail open if database is unavailable
        const currentCount = count ?? 0
        if (currentCount >= RATE_LIMIT_MAX_ATTEMPTS) return true
        // Record this attempt
        await supabase.from(RATE_LIMIT_TABLE).insert({
            key,
            created_at: now.toISOString(),
            expires_at: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS).toISOString()
        })
        return false
    } catch {
        return false // Fail open on errors
    }
}

function getRateLimitKey(req: Request, identifier: string): string {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    return `${ip}:${identifier}`
}

// ── Session-based auth for protected operations ────────────────────────
const SESSIONS_TABLE = 'users_sessions'
const ELEVATED_WEIGHT_THRESHOLD = 75

/* Guest-login notification. When a user whose ONLY role is `Guest` signs in,
 * we ping a single inbox so the admin sees that someone with no real access
 * tried to use the app. The hardcoded recipient is the owner — override via
 * `GUEST_LOGIN_NOTIFY_EMAIL` env var if it needs to change without a redeploy.
 * Fire-and-forget — a notification failure must never block sign-in. */
const GUEST_LOGIN_NOTIFY_DEFAULT = 'trenton@taylorurl.com'
const GUEST_ROLE_NAME = 'Guest'

function buildGuestLoginHtml(args: {
    email: string
    firstName: string | null
    lastName: string | null
    plantCode: string | null
    browser: string | null
    os: string | null
    device: string | null
    sessionId: string
    when: string
}): string {
    const escape = (value: unknown) =>
        String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    const displayName = [args.firstName, args.lastName].filter(Boolean).join(' ').trim() || '—'
    const device = [args.browser, args.os, args.device].filter(Boolean).join(' · ') || '—'
    const row = (label: string, value: string) => `
        <tr>
            <td style="padding:6px 14px 6px 0;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;vertical-align:top;">${escape(label)}</td>
            <td style="padding:6px 0;font-size:14px;color:#0f172a;">${value}</td>
        </tr>`
    return `<!doctype html><html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Guest sign-in</div>
    <div style="margin-top:6px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.2;">A Guest user just signed in to Smyrna Tools</div>
    <table style="margin-top:20px;border-collapse:collapse;width:100%;">
        ${row('User', `<strong>${escape(displayName)}</strong><br><span style="color:#64748b;font-size:12px;">${escape(args.email)}</span>`)}
        ${row('Plant', escape(args.plantCode || '—'))}
        ${row('Device', escape(device))}
        ${row('Session', `<code style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#475569;">${escape(args.sessionId)}</code>`)}
        ${row('When', escape(args.when))}
    </table>
    <div style="margin-top:20px;font-size:12px;color:#94a3b8;line-height:1.5;">
        You're receiving this because the signed-in user has the Guest role. Guests cannot access regular Tools surfaces — they land on the locked overlay. This notification fires on every Guest sign-in.
    </div>
</div>
</body></html>`
}

async function notifyGuestLoginIfApplicable(
    supabase: any,
    args: {
        userId: string
        email: string
        sessionId: string
        profile: { first_name?: string | null; last_name?: string | null; plant_code?: string | null } | null
        browser: string | null
        os: string | null
        device: string | null
    }
): Promise<void> {
    try {
        const { data: roleLinks } = await supabase
            .from('users_permissions')
            .select('users_roles(name)')
            .eq('user_id', args.userId)
        const roleNames = (roleLinks ?? [])
            .map((r: any) => r?.users_roles?.name)
            .filter((n: any) => typeof n === 'string') as string[]
        if (!roleNames.length) return
        const isGuestOnly = roleNames.every((n) => n.toLowerCase() === GUEST_ROLE_NAME.toLowerCase())
        if (!isGuestOnly) return

        const baseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const internalToken = Deno.env.get('EDGE_INTERNAL_TOKEN') ?? ''
        const recipient = envOrDefault('GUEST_LOGIN_NOTIFY_EMAIL', GUEST_LOGIN_NOTIFY_DEFAULT)
        if (!baseUrl || !internalToken || !recipient) return

        const html = buildGuestLoginHtml({
            browser: args.browser,
            device: args.device,
            email: args.email,
            firstName: args.profile?.first_name ?? null,
            lastName: args.profile?.last_name ?? null,
            os: args.os,
            plantCode: args.profile?.plant_code ?? null,
            sessionId: args.sessionId,
            when: new Date().toUTCString()
        })

        fetch(`${baseUrl}/functions/v1/email-service/send`, {
            body: JSON.stringify({
                html,
                subject: `Guest sign-in — ${args.email}`,
                to: [{ email: recipient }]
            }),
            headers: {
                Authorization: `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
                'X-Internal-Token': internalToken
            },
            method: 'POST'
        }).catch(() => {})
    } catch {
        /* notification failure must never block sign-in */
    }
}

/**
 * Lightweight caller identity check for bootstrap-phase endpoints where
 * no session row exists yet (sign-in doesn't create one). Extracts the
 * caller's userId from cookies, headers, or body fallback fields and
 * returns it — or null if no identity signal is present. Does NOT
 * validate against the sessions table, so this is weaker than
 * requireAuthenticated — use only for endpoints that verify ownership
 * via other means (e.g. matching body.userId to the caller).
 */
function extractCallerUserId(req: Request, body?: any): string | null {
    const cookies = readSessionCookies(req)
    return cookies.userId || req.headers.get('x-user-id') || body?.__sessionUserId || null
}

async function requireElevatedCaller(supabase: any, req: Request, headers: any, body?: any): Promise<Response | null> {
    const auth = await requireAuthenticated(supabase, req, headers, body)
    if (auth instanceof Response) return auth
    const { data } = await supabase.from('users_permissions').select('role_id, users_roles(weight)').eq('user_id', auth)
    const isElevated = data?.some((p: any) => (p.users_roles?.weight ?? 0) > ELEVATED_WEIGHT_THRESHOLD)
    if (!isElevated) return errorResponse('Forbidden: insufficient privileges', headers, 403)
    return null
}

function createSupabaseClient(req: Request) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseKey) throw new Error('Server configuration error')
    return createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const headers = getCorsHeaders(origin)
    try {
        const url = new URL(req.url)
        const endpoint = url.pathname.split('/').pop()
        const supabase = createSupabaseClient(req)

        switch (endpoint) {
            // ── Authentication ────────────────────────────────────────

            case 'sign-in': {
                const { email, password, browser, os, device, userAgent } = await req.json()
                if (!email?.trim() || !password) return errorResponse('Email and password are required', headers, 400)
                const trimmedEmail = sanitizeEmail(email)
                if (!isValidEmail(trimmedEmail)) return errorResponse('Invalid email format', headers, 400)
                if (await isRateLimited(getRateLimitKey(req, `sign-in:${trimmedEmail}`), supabase))
                    return errorResponse('Too many login attempts. Please try again later.', headers, 429)

                const { data, error } = await supabase
                    .from(USERS_TABLE)
                    .select('id, email, password_hash, salt')
                    .eq('email', trimmedEmail)
                    .single()
                if (error || !data) return errorResponse('Invalid credentials', headers, 401)

                const { valid, needsRehash } = await verifyPassword(password, data.salt, data.password_hash)
                if (!valid) return errorResponse('Invalid credentials', headers, 401)

                if (needsRehash) {
                    rehashAndUpdate(supabase, data.id, password, USERS_TABLE).catch(() => {})
                }

                supabase
                    .from(USERS_TABLE)
                    .update({ last_login_at: new Date().toISOString().split('T')[0] })
                    .eq('id', data.id)
                    .then(() => {})
                    .catch(() => {})

                const now = nowISO()
                const sessionId = crypto.randomUUID()
                await supabase.from(SESSIONS_TABLE).insert({
                    id: sessionId,
                    user_id: data.id,
                    browser: browser || null,
                    os: os || null,
                    device: device || null,
                    user_agent: userAgent || null,
                    created_at: now,
                    last_active: now
                })

                const { data: profile } = await supabase
                    .from(PROFILES_TABLE)
                    .select(PROFILE_SELECT_FIELDS)
                    .eq('id', data.id)
                    .single()

                /* Fire-and-forget guest-login notification. Sends a single
                 * email to the configured inbox when the signing-in user
                 * holds only the Guest role. See `notifyGuestLoginIfApplicable`
                 * above for the role check + email body. */
                notifyGuestLoginIfApplicable(supabase, {
                    browser: browser || null,
                    device: device || null,
                    email: data.email,
                    os: os || null,
                    profile: profile ?? null,
                    sessionId,
                    userId: data.id
                }).catch(() => {})

                let jwt: string | null = null
                let expiresIn: number | null = null
                const jwtSecret = (Deno.env.get('SUPABASE_JWT_SECRET') ?? Deno.env.get('JWT_SECRET'))
                if (jwtSecret) {
                    jwt = await mintSessionJwt(data.id, sessionId, jwtSecret, JWT_TTL_SECONDS)
                    expiresIn = JWT_TTL_SECONDS
                }

                const responseBody = {
                    id: data.id,
                    email: data.email,
                    profile: profile ?? {},
                    sessionId,
                    jwt,
                    expiresIn
                }
                return respondWithCookies(
                    responseBody,
                    headers,
                    buildSessionCookieHeaders(data.id, sessionId)
                )
            }

            case 'sign-up': {
                const { email, password, firstName, lastName, browser, os, device, userAgent } = await req.json()
                if (!email || !password || !firstName || !lastName)
                    return errorResponse('All fields are required', headers, 400)
                const trimmedEmail = sanitizeEmail(email)
                if (!isValidEmail(trimmedEmail)) return errorResponse('Invalid email format', headers, 400)
                if (await isRateLimited(getRateLimitKey(req, `sign-up:${trimmedEmail}`), supabase))
                    return errorResponse('Too many sign-up attempts. Please try again later.', headers, 429)
                if (validatePasswordStrength(password).value === 'weak')
                    return errorResponse('Password is too weak', headers, 400)

                const normFirst = normalizeName(firstName)
                const normLast = normalizeName(lastName)
                if (!normFirst || !normLast) return errorResponse('Invalid name format', headers, 400)

                const { data: existingUsers } = await supabase.from(USERS_TABLE).select('id').eq('email', trimmedEmail)
                if (existingUsers?.length) return errorResponse('Email already registered', headers, 409)

                const userId = crypto.randomUUID()
                const now = nowISO()
                const salt = generateSalt()
                const passwordHash = await hashPassword(password, salt)

                const { error: userError } = await supabase.from(USERS_TABLE).insert({
                    id: userId,
                    email: trimmedEmail,
                    password_hash: passwordHash,
                    salt,
                    created_at: now,
                    updated_at: now
                })
                if (userError) return errorResponse('User creation failed', headers, 500)

                const profile = {
                    id: userId,
                    first_name: normFirst,
                    last_name: normLast,
                    plant_code: '',
                    created_at: now,
                    updated_at: now
                }
                const { error: profileError } = await supabase.from(PROFILES_TABLE).insert(profile)
                if (profileError) {
                    await supabase.from(USERS_TABLE).delete().eq('id', userId)
                    return errorResponse('Profile creation failed', headers, 500)
                }

                /* Side effects — non-fatal. Earlier, this was a single
                 * `Promise.all` that threw on any failure; a schema drift
                 * in `users_preferences` (e.g. a column missing from the
                 * upsert payload that doesn't exist in the table yet) would
                 * 500 the entire sign-up after the user row was already
                 * inserted, leaving an orphaned account and a generic
                 * "Internal server error" on the client. Switching to
                 * `Promise.allSettled` lets the user creation succeed; the
                 * preference row is auto-created on first save by the
                 * PreferencesContext, and the Guest role can be assigned
                 * by an admin if it didn't land here. Failures are logged
                 * so they show up in the function dashboard, and surface
                 * as a non-blocking `warnings` array on the response so
                 * the client can flag them later. */
                const sideEffectResults = await Promise.allSettled([
                    supabase
                        .from(PREFERENCES_TABLE)
                        .upsert(
                            {
                                user_id: userId,
                                default_view_mode: null,
                                equipment_filters: DEFAULT_BASE_FILTERS,
                                mixer_filters: DEFAULT_BASE_FILTERS,
                                operator_filters: DEFAULT_BASE_FILTERS,
                                tractor_filters: DEFAULT_BASE_FILTERS,
                                trailer_filters: DEFAULT_BASE_FILTERS,
                                manager_filters: DEFAULT_ROLE_FILTERS,
                                last_viewed_filters: null,
                                selected_region: null,
                                region_overlay_minimized: true,
                                created_at: now,
                                updated_at: now
                            },
                            { onConflict: 'user_id' }
                        )
                        .then(({ error: prefError }) => {
                            if (prefError) throw prefError
                        }),
                    assignGuestRole(supabase, userId, now)
                ])
                const warnings: string[] = []
                if (sideEffectResults[0].status === 'rejected') {
                    const r = sideEffectResults[0].reason
                    console.error('[sign-up] preferences upsert failed:', r?.message || r)
                    warnings.push(`preferences:${r?.code || r?.message || 'unknown'}`)
                }
                if (sideEffectResults[1].status === 'rejected') {
                    const r = sideEffectResults[1].reason
                    console.error('[sign-up] guest role assign failed:', r?.message || r)
                    warnings.push(`role:${r?.code || r?.message || 'unknown'}`)
                }

                const signUpSessionId = crypto.randomUUID()
                await supabase.from(SESSIONS_TABLE).insert({
                    id: signUpSessionId,
                    user_id: userId,
                    browser: browser || null,
                    os: os || null,
                    device: device || null,
                    user_agent: userAgent || null,
                    created_at: now,
                    last_active: now
                })

                let signUpJwt: string | null = null
                let signUpExpiresIn: number | null = null
                const signUpJwtSecret = (Deno.env.get('SUPABASE_JWT_SECRET') ?? Deno.env.get('JWT_SECRET'))
                if (signUpJwtSecret) {
                    signUpJwt = await mintSessionJwt(userId, signUpSessionId, signUpJwtSecret, JWT_TTL_SECONDS)
                    signUpExpiresIn = JWT_TTL_SECONDS
                }

                return respondWithCookies(
                    {
                        id: userId,
                        email: trimmedEmail,
                        profile,
                        sessionId: signUpSessionId,
                        jwt: signUpJwt,
                        expiresIn: signUpExpiresIn,
                        ...(warnings.length > 0 ? { warnings } : {})
                    },
                    headers,
                    buildSessionCookieHeaders(userId, signUpSessionId)
                )
            }

            case 'sign-out': {
                const signOutBody = await req.json().catch(() => ({}))
                const signOutSessionId = signOutBody?.sessionId
                const signOutCookies = readSessionCookies(req)
                const signOutUserId = signOutCookies.userId || req.headers.get('x-user-id')
                const sessToDelete = signOutSessionId || signOutCookies.sessionId
                if (sessToDelete && signOutUserId) {
                    await supabase
                        .from(SESSIONS_TABLE)
                        .delete()
                        .eq('id', sessToDelete)
                        .eq('user_id', signOutUserId)
                        .then(() => {})
                        .catch(() => {})
                }
                return respondWithCookies(
                    { success: true },
                    headers,
                    buildClearSessionCookieHeaders()
                )
            }

            // ── Session Management ────────────────────────────────────

            case 'restore-session': {
                const body = await req.json()
                const cookies = readSessionCookies(req)
                const userId = body.userId || cookies.userId || req.headers.get('x-user-id')
                if (!userId) return jsonResponse({ success: false }, headers)

                const sessionId =
                    body.sessionId ||
                    body.__sessionId ||
                    cookies.sessionId ||
                    req.headers.get('x-session-id')

                if (sessionId) {
                    const { data: sessionData } = await supabase
                        .from(SESSIONS_TABLE)
                        .select('id, last_active')
                        .eq('id', sessionId)
                        .eq('user_id', userId)
                        .maybeSingle()
                    if (!sessionData) return jsonResponse({ success: false }, headers)
                    const lastActive = new Date(sessionData.last_active)
                    const expiry = new Date()
                    expiry.setDate(expiry.getDate() - SESSION_EXPIRY_DAYS)
                    if (lastActive < expiry) return jsonResponse({ success: false }, headers)
                }

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session restore timed out')), SESSION_RESTORE_TIMEOUT)
                )
                try {
                    const { data, error } = await Promise.race([
                        supabase.from(USERS_TABLE).select('id, email').eq('id', userId).single(),
                        timeoutPromise
                    ] as const)
                    if ((error as unknown as Error) || !data) return jsonResponse({ success: false }, headers)

                    const { data: profile } = await supabase
                        .from(PROFILES_TABLE)
                        .select(PROFILE_SELECT_FIELDS)
                        .eq('id', data.id)
                        .single()

                    let jwt: string | null = null
                    let expiresIn: number | null = null
                    if (sessionId) {
                        const jwtSecret = (Deno.env.get('SUPABASE_JWT_SECRET') ?? Deno.env.get('JWT_SECRET'))
                        if (jwtSecret) {
                            jwt = await mintSessionJwt(data.id, sessionId, jwtSecret, JWT_TTL_SECONDS)
                            expiresIn = JWT_TTL_SECONDS
                        }
                    }
                    return jsonResponse(
                        {
                            success: true,
                            user: { id: data.id, email: data.email, profile: profile ?? {} },
                            jwt,
                            expiresIn
                        },
                        headers
                    )
                } catch {
                    return jsonResponse({ success: false }, headers)
                }
            }

            // ── Profile ───────────────────────────────────────────────

            case 'load-profile': {
                const body = await req.json()
                const { userId } = body
                if (!userId) return errorResponse('User ID required', headers, 400)
                const callerUserId = extractCallerUserId(req, body)
                if (!callerUserId || callerUserId !== userId)
                    return errorResponse('Unauthorized', headers, 401)

                const { data: profileData, error } = await supabase
                    .from(PROFILES_TABLE)
                    .select(PROFILE_SELECT_FIELDS)
                    .eq('id', userId)
                    .single()
                if (error) return errorResponse('Failed to load profile', headers, 500)
                return jsonResponse({ profile: profileData ?? {} }, headers)
            }

            case 'update-profile': {
                const body = await req.json()
                const { userId, firstName, lastName, plantCode } = body
                if (!userId || !firstName || !lastName)
                    return errorResponse('User ID, first name, and last name required', headers, 400)
                const authProfile = await requireAuthenticated(supabase, req, headers, body)
                if (authProfile instanceof Response) return authProfile
                if (authProfile !== userId) return errorResponse('Forbidden', headers, 403)
                const normFirst = normalizeName(firstName)
                const normLast = normalizeName(lastName)
                if (!normFirst || !normLast) return errorResponse('Invalid name format', headers, 400)
                const { error } = await supabase
                    .from(PROFILES_TABLE)
                    .update({
                        first_name: normFirst,
                        last_name: normLast,
                        plant_code: sanitizeString(plantCode) || '',
                        updated_at: nowISO()
                    })
                    .eq('id', userId)
                if (error) return errorResponse('Failed to update profile', headers, 500)
                return jsonResponse(
                    {
                        success: true,
                        profile: { first_name: normFirst, last_name: normLast, plant_code: plantCode || '' }
                    },
                    headers
                )
            }

            // ── Credential Updates ────────────────────────────────────

            case 'update-email': {
                const body = await req.json()
                const { email, userId } = body
                if (!userId) return errorResponse('No authenticated user', headers, 401)
                const authEmail = await requireAuthenticated(supabase, req, headers, body)
                if (authEmail instanceof Response) return authEmail
                if (authEmail !== userId) return errorResponse('Forbidden', headers, 403)
                if (!isValidEmail(email)) return errorResponse('Invalid email', headers, 400)
                const trimmedEmail = sanitizeEmail(email)
                const { data: existingUser } = await supabase
                    .from(USERS_TABLE)
                    .select('id')
                    .eq('email', trimmedEmail)
                    .neq('id', userId)
                    .single()
                if (existingUser) return errorResponse('Email already registered', headers, 409)
                const { error } = await supabase
                    .from(USERS_TABLE)
                    .update({ email: trimmedEmail, updated_at: nowISO() })
                    .eq('id', userId)
                if (error) return errorResponse('Failed to update email', headers, 500)
                return jsonResponse({ success: true }, headers)
            }

            case 'update-password': {
                const body = await req.json()
                const { password, userId } = body
                if (!userId) return errorResponse('No authenticated user', headers, 401)
                const authPwd = await requireAuthenticated(supabase, req, headers, body)
                if (authPwd instanceof Response) return authPwd
                if (authPwd !== userId) return errorResponse('Forbidden', headers, 403)
                if (validatePasswordStrength(password).value === 'weak')
                    return errorResponse('Weak password', headers, 400)
                const salt = generateSalt()
                const passwordHash = await hashPassword(password, salt)
                const { error } = await supabase
                    .from(USERS_TABLE)
                    .update({ password_hash: passwordHash, salt, updated_at: nowISO() })
                    .eq('id', userId)
                if (error) return errorResponse('Failed to update password', headers, 500)
                // Invalidate all other active sessions for this user (keep current session)
                const currentSessionId = body.__sessionId || req.headers.get('x-session-id')
                if (currentSessionId) {
                    await supabase
                        .from(SESSIONS_TABLE)
                        .delete()
                        .eq('user_id', userId)
                        .neq('id', currentSessionId)
                        .then(() => {})
                        .catch(() => {})
                }
                return jsonResponse({ success: true }, headers)
            }

            case 'verify-password': {
                const body = await req.json()
                const { userId, currentPassword } = body
                if (!userId || !currentPassword)
                    return errorResponse('User ID and current password are required', headers, 400)
                const authVerify = await requireAuthenticated(supabase, req, headers, body)
                if (authVerify instanceof Response) return authVerify
                if (authVerify !== userId) return errorResponse('Forbidden', headers, 403)
                const { data, error } = await supabase
                    .from(USERS_TABLE)
                    .select('id, password_hash, salt')
                    .eq('id', userId)
                    .single()
                if (error || !data) return errorResponse('User not found', headers, 404)
                const { valid } = await verifyPassword(currentPassword, data.salt, data.password_hash)
                if (!valid) return errorResponse('Current password is incorrect', headers, 401)
                return jsonResponse({ success: true }, headers)
            }

            // ── Password Reset ────────────────────────────────────────

            case 'reset-password': {
                const { email } = await req.json()
                const genericResponse = jsonResponse({ message: RESET_PASSWORD_MESSAGE }, headers)
                if (!isValidEmail(email)) return genericResponse
                const trimmedEmail = sanitizeEmail(email)
                if (await isRateLimited(getRateLimitKey(req, `reset:${trimmedEmail}`), supabase)) return genericResponse
                const { data: user, error: userErr } = await supabase
                    .from(USERS_TABLE)
                    .select('id')
                    .eq('email', trimmedEmail)
                    .single()
                if (userErr || !user) return genericResponse

                const newPassword = generateRandomPassword()
                if (validatePasswordStrength(newPassword).value === 'weak') return genericResponse
                const salt = generateSalt()
                const passwordHash = await hashPassword(newPassword, salt)
                const { error: updateError } = await supabase
                    .from(USERS_TABLE)
                    .update({
                        password_hash: passwordHash,
                        salt,
                        updated_at: nowISO()
                    })
                    .eq('id', user.id)
                if (updateError) return genericResponse
                // Invalidate all active sessions for this user after password reset
                await supabase
                    .from(SESSIONS_TABLE)
                    .delete()
                    .eq('user_id', user.id)
                    .then(() => {})
                    .catch(() => {})

                const mailerSendToken = Deno.env.get('MAILERSEND_API_TOKEN')
                const fromEmail = Deno.env.get('MAILERSEND_FROM_EMAIL')
                if (!mailerSendToken || !fromEmail) return genericResponse

                const loginUrl = `${envOrDefault('FRONTEND_URL', DEFAULT_FRONTEND_URL)}/login`
                const { subject, text, html } = buildForgotPasswordEmail({
                    newPassword,
                    loginUrl,
                    theme: buildThemeConfig(),
                    logoUrl: envOrDefault('LOGO_URL', DEFAULT_LOGO_URL)
                })
                try {
                    const response = await fetch(MAILERSEND_API_URL, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${mailerSendToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            from: { email: fromEmail, name: envOrDefault('MAILERSEND_FROM_NAME', DEFAULT_FROM_NAME) },
                            to: [{ email: trimmedEmail }],
                            subject,
                            text,
                            html
                        })
                    })
                    if (!response.ok) return genericResponse
                } catch {
                    return genericResponse
                }
                return genericResponse
            }

            // ── Auth Utilities ────────────────────────────────────────

            case 'password-strength': {
                const { password } = await req.json()
                if (!password || password.length < 10) return jsonResponse({ value: 'weak' }, headers)
                return jsonResponse({ value: strengthLabel(scorePassword(password)) }, headers)
            }

            case 'email-is-valid': {
                const { email } = await req.json()
                if (!email) return errorResponse('Email is required', headers, 400)
                return jsonResponse({ isValid: isValidEmail(email) }, headers)
            }

            case 'normalize-name': {
                const { name } = await req.json()
                if (!name) return errorResponse('Name is required', headers, 400)
                return jsonResponse({ normalizedName: normalizeName(name) }, headers)
            }

            // ── Admin Operations ─────────────────────────────────────

            case 'admin-update-password': {
                const body = await req.json()
                const authErr = await requireElevatedCaller(supabase, req, headers, body)
                if (authErr) return authErr
                const { userId, password } = body
                if (!userId || !password) return errorResponse('User ID and password are required', headers, 400)
                if (validatePasswordStrength(password).value === 'weak')
                    return errorResponse('Password is too weak', headers, 400)
                const salt = generateSalt()
                const passwordHash = await hashPassword(password, salt)
                const { error } = await supabase
                    .from(USERS_TABLE)
                    .update({ password_hash: passwordHash, salt, updated_at: nowISO() })
                    .eq('id', userId)
                if (error) return errorResponse('Failed to update password', headers, 500)
                // Invalidate all active sessions for the target user
                await supabase
                    .from(SESSIONS_TABLE)
                    .delete()
                    .eq('user_id', userId)
                    .then(() => {})
                    .catch(() => {})
                return jsonResponse({ success: true }, headers)
            }

            // ── Session Management ────────────────────────────────────

            case 'create-session': {
                const body = await req.json()
                const { userId, sessionId, browser, os, device, userAgent } = body
                if (!userId || !sessionId) return errorResponse('userId and sessionId are required', headers, 400)
                const callerCreate = extractCallerUserId(req, body)
                if (!callerCreate || callerCreate !== userId)
                    return errorResponse('Unauthorized', headers, 401)
                const now = nowISO()
                const { error } = await supabase.from('users_sessions').upsert(
                    {
                        id: sessionId,
                        user_id: userId,
                        browser: browser || null,
                        os: os || null,
                        device: device || null,
                        user_agent: userAgent || null,
                        created_at: now,
                        last_active: now
                    },
                    { onConflict: 'id' }
                )
                if (error) return errorResponse('Failed to create session', headers, 500)
                /* JWT minting is optional: this project moved to Supabase's
                 * asymmetric (JWKS) auth, so a JWT signed with
                 * SUPABASE_JWT_SECRET isn't accepted by PostgREST anyway
                 * (see migrations/20260504_rollback_jwt_lockdown.sql).
                 * Session auth runs entirely off the users_sessions row
                 * via X-User-Id / X-Session-Id headers. If the secret is
                 * configured we still mint a JWT for forward-compatibility,
                 * but its absence is no longer a hard failure. */
                const jwtSecret = (Deno.env.get('SUPABASE_JWT_SECRET') ?? Deno.env.get('JWT_SECRET'))
                if (!jwtSecret) return jsonResponse({ success: true }, headers)
                const jwt = await mintSessionJwt(userId, sessionId, jwtSecret, JWT_TTL_SECONDS)
                return jsonResponse({ success: true, jwt, expiresIn: JWT_TTL_SECONDS }, headers)
            }

            case 'refresh-token': {
                const { userId, sessionId } = await req.json()
                if (!userId || !sessionId) return errorResponse('userId and sessionId required', headers, 401)
                const { data, error } = await supabase
                    .from('users_sessions')
                    .select('id, last_active')
                    .eq('id', sessionId)
                    .eq('user_id', userId)
                    .maybeSingle()
                if (error || !data) return errorResponse('Unauthorized', headers, 401)
                if (data.last_active) {
                    const lastActive = new Date(data.last_active)
                    const expiry = new Date()
                    expiry.setDate(expiry.getDate() - SESSION_EXPIRY_DAYS)
                    if (lastActive < expiry) return errorResponse('Session expired', headers, 401)
                }
                supabase
                    .from('users_sessions')
                    .update({ last_active: nowISO() })
                    .eq('id', sessionId)
                    .then(() => {})
                    .catch(() => {})
                /* Optional JWT mint — see notes on create-session. */
                const jwtSecret = (Deno.env.get('SUPABASE_JWT_SECRET') ?? Deno.env.get('JWT_SECRET'))
                if (!jwtSecret) return jsonResponse({ success: true }, headers)
                const jwt = await mintSessionJwt(userId, sessionId, jwtSecret, JWT_TTL_SECONDS)
                return jsonResponse({ jwt, expiresIn: JWT_TTL_SECONDS }, headers)
            }

            case 'delete-session': {
                const body = await req.json()
                const { sessionId } = body
                if (!sessionId) return errorResponse('sessionId is required', headers, 400)
                const callerDelete = extractCallerUserId(req, body)
                if (!callerDelete) return errorResponse('Unauthorized', headers, 401)
                await supabase
                    .from(SESSIONS_TABLE)
                    .delete()
                    .eq('id', sessionId)
                    .eq('user_id', callerDelete)
                return jsonResponse({ success: true }, headers)
            }

            case 'validate-session': {
                const { userId, sessionId } = await req.json()
                if (!userId || !sessionId) return jsonResponse({ valid: false }, headers)
                const { data, error } = await supabase
                    .from('users_sessions')
                    .select('id, last_active')
                    .eq('id', sessionId)
                    .eq('user_id', userId)
                    .maybeSingle()
                if (error || !data) return jsonResponse({ valid: false }, headers)
                // Refresh last_active (fire-and-forget)
                supabase
                    .from('users_sessions')
                    .update({ last_active: nowISO() })
                    .eq('id', sessionId)
                    .then(() => {})
                    .catch(() => {})
                return jsonResponse({ valid: true, lastActive: data.last_active }, headers)
            }

            case 'whoami': {
                const cookies = readSessionCookies(req)
                const userId = cookies.userId || req.headers.get('x-user-id')
                if (!userId) return errorResponse('Not authenticated', headers, 401)
                const sessionId = cookies.sessionId || req.headers.get('x-session-id')
                if (sessionId) {
                    const { data: sess } = await supabase
                        .from(SESSIONS_TABLE)
                        .select('id, last_active')
                        .eq('id', sessionId)
                        .eq('user_id', userId)
                        .maybeSingle()
                    if (!sess) return errorResponse('Not authenticated', headers, 401)
                    const lastActive = new Date(sess.last_active)
                    const expiry = new Date()
                    expiry.setDate(expiry.getDate() - SESSION_EXPIRY_DAYS)
                    if (lastActive < expiry) return errorResponse('Session expired', headers, 401)
                    /* Sliding window — bump server-side last_active AND
                     * re-issue the cookies with a fresh Max-Age. The
                     * AuthContext visibility probe hits this endpoint
                     * every time the tab regains focus (throttled to once
                     * per 5 minutes), so an active user's cookies are
                     * effectively immortal. Without the cookie re-issue
                     * the cookies would expire 30 days after sign-in
                     * regardless of how often the user came back. */
                    supabase
                        .from(SESSIONS_TABLE)
                        .update({ last_active: nowISO() })
                        .eq('id', sessionId)
                        .then(() => {})
                        .catch(() => {})
                    return respondWithCookies({ userId }, headers, buildSessionCookieHeaders(userId, sessionId))
                }
                return jsonResponse({ userId }, headers)
            }

            default:
                return errorResponse('Invalid endpoint', headers, 404, { path: url.pathname })
        }
    } catch (error) {
        /* Surface the actual error message + code so the client (and the
         * dashboard logs) can see WHICH step failed instead of the generic
         * "Internal server error". The error fields exposed here are
         * already produced by our own code paths or by Supabase / pg —
         * no untrusted user input is reflected back. */
        const err = error as { message?: string; code?: string; details?: string }
        console.error('[auth-service] unhandled error:', err?.message || error, err?.code || '', err?.details || '')
        return errorResponse(err?.message || 'Internal server error', headers, 500, {
            code: err?.code || 'UNKNOWN',
            details: err?.details || null
        })
    }
})
