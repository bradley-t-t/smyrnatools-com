// ==UserScript==
// @name         Smyrna Dispatch Sync
// @namespace    smyrna-tools
// @version      2.15.1
// @description  Syncs today + next 7 days of DailyOrder, per-plant DetailOrderAnalysis, and per-plant DetailDriver reports to Supabase storage every 5 minutes during the active dispatch window (Central 00:00–17:30), triggers dispatch-import to parse uploads into dispatch_data, backfills missing files for the current year, force re-uploads every (report × plant × date) for the current year once daily at 18:00 CT, exposes manual devtools triggers under window.smyrnaSync, and auto re-authenticates when the dispatch session expires
// @match        http://srm-c03.aujs.local:8181/*
// @match        http://srm-h.aujs.local:8181/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      srm-c03.aujs.local
// @connect      srm-h.aujs.local
// @connect      db.smyrnatools.com
// @run-at       document-start
// ==/UserScript==

;(function () {
    'use strict'

    // ============================================================
    // CONFIG
    // ============================================================
    // Secrets are NOT hardcoded. Set them once per install via the browser
    // console: GM_setValue('SUPABASE_SERVICE_KEY', '...') etc. — or use the
    // Tampermonkey storage editor. They never live in source control.
    const SUPABASE_URL = GM_getValue('SUPABASE_URL', 'https://db.smyrnatools.com')
    const SUPABASE_SERVICE_KEY = GM_getValue('SUPABASE_SERVICE_KEY', '')
    const BUCKET = 'dispatch-reports'
    const INTERVAL_MS = 5 * 60 * 1000
    // Active sync window in America/Chicago (Central Time, handles CST/CDT
    // automatically). Ticks fired outside this window no-op so the dispatch
    // server isn't hit after operations close for the day.
    // Window: 00:00 inclusive → 17:30 exclusive (midnight through 5:30pm CT).
    const SYNC_WINDOW_END_MINUTES = 17 * 60 + 30
    // Concurrent workers in the task pool. The dispatch server runs locally
    // on the same workstation as this script, so it tolerates a handful of
    // simultaneous report generations comfortably. Tune down if the server
    // ever starts dropping requests.
    const WORKER_CONCURRENCY = 10

    // Daily full re-upload: once per Central day at this hour, the bridge
    // force re-pulls EVERY (report × plant × date) combo from Jan 1 → today
    // and overwrites whatever is in the bucket, regardless of whether the
    // file already exists. This catches dispatcher corrections made to old
    // records that the missing-file backfill (which skips existing files)
    // would never re-fetch. Fires independent of the 00:00–17:30 rolling
    // sync window so dispatchers can run it after close — long-running
    // (~1–2h) and resource-heavy, by design.
    const DAILY_FULL_REFRESH_HOUR_CT = 18 // 6 PM Central
    const DAILY_FULL_REFRESH_KEY = 'smyrna_sync_last_full_refresh_date'

    // The dispatch UI runs on :8181 and the API on :8484 on the SAME box.
    // Hostname differs between deployments (srm-c03, srm-h, etc.), so we
    // pull it from the page we're sitting on instead of hardcoding it —
    // that way the script auto-targets the right backend on every server.
    const DISPATCH_HOST =
        (typeof window !== 'undefined' && window.location && window.location.hostname) || 'srm-h.aujs.local'
    const API_BASE = `http://${DISPATCH_HOST}:8484`
    const UI_ORIGIN = `http://${DISPATCH_HOST}:8181`
    const FORM_ID = '1001000'

    // Dispatch server auth. The seat_token / connection_id pair is bound to
    // a user account on the server side via POST /token (OAuth2-style
    // client_credentials grant). Seats expire after ~12h of inactivity,
    // which is why we keep credentials here — when the API starts rejecting
    // calls with 401/403, the script re-runs /token with these creds and a
    // freshly minted seat_token, then resumes sync without any human touch.
    const DATABASE = GM_getValue('DISPATCH_DATABASE', 'SmyrnaTX')
    const LOGIN_CLIENT_ID = GM_getValue('DISPATCH_CLIENT_ID', '')
    const LOGIN_CLIENT_SECRET = GM_getValue('DISPATCH_CLIENT_SECRET', '')

    // Plants we care about. DailyOrder takes a comma-joined list in one call;
    // DetailOrderAnalysis only accepts a single plant per request, so we fan out.
    // Baytown uses both 403 and 404 (one physical location, two dispatch codes);
    // Conroe uses both 408 and 409 the same way. Trucks freely load from either
    // sibling, so we MUST fetch both halves to get a complete ticket picture.
    const PLANT_IDS = ['401', '402', '403', '404', '405', '406', '407', '408', '409', '410', '453', '455', '461', '468']

    // Report definitions. Each report knows how to build its POST body, where
    // the rendered HTML lands on the dispatch server, and how to name the file
    // in Supabase storage. perPlant reports are run once per plant per date.
    const REPORTS = [
        {
            name: 'DailyOrder',
            reportId: 'DailyOrder',
            storagePrefix: '',
            perPlant: false,
            // DailyOrder is the schedule itself, so we re-pull the full
            // rolling window (today + the next 7 days) every cycle to catch
            // edits dispatchers make to upcoming days.
            daysAhead: 7,
            buildBody(date) {
                return {
                    object: 'customReportRequest',
                    reportId: 'DailyOrder',
                    reportType: 'HTML',
                    reportAction: 0,
                    requestType: 'REPORT',
                    parameters: [
                        { id: 'SystemTypeId', value: '1' },
                        { id: 'OrderDate', value: date },
                        { id: 'IncludeOtherProducts', value: '0' },
                        { id: 'ExcludeCancelledOrders', value: '0' },
                        { id: 'FobOption', value: '0' },
                        { id: 'OrderTypeOption', value: '2' },
                        { id: 'PlantId', value: PLANT_IDS.join(',') }
                    ],
                    filename: 'DailyOrder.HTML'
                }
            },
            storagePath(date) {
                return `${date}.html`
            }
        },
        {
            name: 'DetailOrderAnalysis',
            reportId: 'DetailOrderAnalysis',
            storagePrefix: 'detail/',
            perPlant: true,
            // No historic backfill — live truck loads only.
            backfillEnabled: false,
            // DetailOrderAnalysis only changes as trucks load through the
            // current day. Future dates have no tickets yet, and past dates
            // are immutable once dispatch closes them out — so the rolling
            // window is just today; older missing files are picked up by
            // backfill (one-shot per file).
            daysAhead: 0,
            buildBody(date, plantId) {
                return {
                    object: 'customReportRequest',
                    reportId: 'DetailOrderAnalysis',
                    reportType: 'HTML',
                    reportAction: 0,
                    requestType: 'REPORT',
                    parameters: [
                        { id: 'intSystemTypeId', value: '1' },
                        { id: 'dtOrderDate', value: date },
                        { id: 'intPumperId', value: '0' },
                        { id: 'OrderType', value: '2' },
                        { id: 'FobOption', value: '0' },
                        { id: 'intPlantId', value: plantId }
                    ],
                    filename: 'DetailOrderAnalysis.HTML'
                }
            },
            storagePath(date, plantId) {
                return `detail/${date}_${plantId}.html`
            }
        },
        {
            name: 'DetailDriver',
            reportId: 'DetailDriver',
            storagePrefix: 'driver/',
            perPlant: true,
            // Fills in cross-plant ticket data: every truck loaded BY a
            // driver based at this plant, regardless of the order's home
            // plant — exactly the slice DetailOrderAnalysis misses.
            daysAhead: 0,
            buildBody(date, plantId) {
                // The dispatch UI sends DetailDriver with no plant param —
                // it relies on the seat's session-level plant context. We
                // include `intPlantId` speculatively; the report engine
                // either honors it (per-plant data, what we want) or
                // ignores it (we get whatever plant the seat is on; bridge
                // operator picks one plant in the dispatch UI). Either way
                // the request shape is acceptable.
                return {
                    object: 'customReportRequest',
                    reportId: 'DetailDriver',
                    reportType: 'HTML',
                    reportAction: 0,
                    requestType: 'REPORT',
                    parameters: [
                        { id: 'SystemTypeId', value: '1' },
                        { id: 'DateFrom', value: date },
                        { id: 'DriverId', value: 'NULL' },
                        { id: 'FobOption', value: '0' },
                        { id: 'intPlantId', value: plantId }
                    ],
                    filename: 'DetailDriver.HTML'
                }
            },
            storagePath(date, plantId) {
                return `driver/${date}_${plantId}.html`
            }
        }
    ]

    // ============================================================
    // STATE
    // ============================================================
    let seatToken = null // captured from the UI's own API calls, or minted by reauthenticate()
    // The dispatch UI does not send an Authorization header — only seat_token.
    // We still capture Authorization in case a future server build requires it,
    // but the sync flow does NOT gate on it.
    let authToken = null
    let lastSync = null
    let syncing = false
    let fullRefreshing = false
    let earlyKickScheduled = false
    // Singleton promise so parallel workers that all hit 401 share one /token
    // round-trip instead of stampeding the server with a fresh login each.
    let reauthInFlight = null
    let lastReauthFailureAt = 0
    // Minimum gap between FAILED reauth attempts. Successful reauths don't
    // count — if a fresh seat just got minted and the very next call still
    // 401s (e.g. server-side cache lag), we want to be free to mint another
    // one immediately. Only back off when /token itself is rejecting us
    // (bad creds, server down) so we don't storm the login endpoint.
    const REAUTH_FAILURE_BACKOFF_MS = 15_000
    // Last-resort recovery: if /token keeps rejecting us, reload the page so
    // the dispatch UI's own bootstrap allocates a fresh seat (which our
    // interceptor will catch) and — on /security/login — auto-fill creds.
    const RELOAD_SENTINEL_KEY = 'smyrna_sync_last_reload_at'
    const RELOAD_COOLDOWN_MS = 5 * 60 * 1000

    // Kicks an immediate sync the first time we capture a seat_token, so the
    // user doesn't have to wait the next 5-minute tick after install.
    function kickSyncSoon() {
        if (earlyKickScheduled) return
        earlyKickScheduled = true
        setTimeout(() => {
            earlyKickScheduled = false
            try {
                runSync()
            } catch (e) {
                log('Early sync error:', e?.message || e)
            }
        }, 250)
    }

    const log = (...args) => console.log('[Smyrna Sync]', ...args)
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

    // Current minute-of-day in America/Chicago (CST/CDT). Uses Intl rather
    // than Date arithmetic so DST shifts are handled by the platform.
    function getCentralMinutesOfDay() {
        const parts = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            hourCycle: 'h23',
            minute: '2-digit',
            timeZone: 'America/Chicago'
        }).formatToParts(new Date())
        const hour = Number(parts.find((p) => p.type === 'hour')?.value)
        const minute = Number(parts.find((p) => p.type === 'minute')?.value)
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0
        return (hour % 24) * 60 + minute
    }

    function isWithinSyncWindow() {
        return getCentralMinutesOfDay() < SYNC_WINDOW_END_MINUTES
    }

    // Today's date in America/Chicago as YYYY-MM-DD. Used as the marker
    // key for "did the daily full refresh already run today?" — Central
    // is the authoritative timezone for dispatch operations.
    function getCentralDateString() {
        const parts = new Intl.DateTimeFormat('en-CA', {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'America/Chicago',
            year: 'numeric'
        }).formatToParts(new Date())
        const year = parts.find((p) => p.type === 'year')?.value
        const month = parts.find((p) => p.type === 'month')?.value
        const day = parts.find((p) => p.type === 'day')?.value
        return `${year}-${month}-${day}`
    }

    function hasDailyFullRefreshRunToday() {
        try {
            return localStorage.getItem(DAILY_FULL_REFRESH_KEY) === getCentralDateString()
        } catch {
            return false
        }
    }

    // Marker is written at the START of the refresh, not the end, so a
    // failed run doesn't immediately re-trigger on the next 1-min tick
    // (which would otherwise produce a hot loop hammering a struggling
    // dispatch server). To force a manual retry today, clear the key
    // from devtools: `localStorage.removeItem('smyrna_sync_last_full_refresh_date')`.
    function markDailyFullRefreshRan() {
        try {
            localStorage.setItem(DAILY_FULL_REFRESH_KEY, getCentralDateString())
        } catch {
            // localStorage unavailable (private mode, etc.) — refresh will
            // re-fire on the next tick. Acceptable; the bucket just gets
            // re-uploaded again.
        }
    }

    function isPastDailyFullRefreshTime() {
        return getCentralMinutesOfDay() >= DAILY_FULL_REFRESH_HOUR_CT * 60
    }

    // RFC4122 v4 UUID. Prefers crypto.randomUUID when present (modern browsers),
    // falls back to crypto.getRandomValues, then Math.random as a last resort
    // (Tampermonkey on legacy WebViews / file:// pages occasionally lacks the
    // newer APIs).
    function randomUuid() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID()
        }
        const bytes = new Uint8Array(16)
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
            crypto.getRandomValues(bytes)
        } else {
            for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
        }
        bytes[6] = (bytes[6] & 0x0f) | 0x40
        bytes[8] = (bytes[8] & 0x3f) | 0x80
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
        return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
    }

    // ============================================================
    // TOKEN INTERCEPTION
    // The UI sends seat_token with every API call. We monkey-patch XHR
    // and fetch so we can steal the current token as the UI uses it.
    // Declared (not IIFE) because Prettier strips the trailing semicolon
    // from the previous statement; an IIFE starting with `(` would be
    // parsed as a call against `sleep` and the interceptor would never
    // install.
    // ============================================================
    function installTokenInterceptor() {
        // XHR interception
        const origSetHeader = XMLHttpRequest.prototype.setRequestHeader
        XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
            if (name && value) {
                const lname = name.toLowerCase()
                if (lname === 'seat_token' && seatToken !== value) {
                    const wasUnset = !seatToken
                    seatToken = value
                    log('Captured seat_token from XHR')
                    if (wasUnset) kickSyncSoon()
                } else if (lname === 'authorization' && authToken !== value) {
                    authToken = value
                    log('Captured Authorization from XHR')
                }
            }
            return origSetHeader.apply(this, arguments)
        }

        // fetch interception (in case UI uses fetch)
        const origFetch = window.fetch
        window.fetch = function (input, init) {
            try {
                const headers = init && init.headers
                if (headers) {
                    const readHeader = (key) => {
                        if (headers instanceof Headers) return headers.get(key)
                        if (Array.isArray(headers)) {
                            const h = headers.find((x) => x[0] && x[0].toLowerCase() === key.toLowerCase())
                            return h ? h[1] : null
                        }
                        if (typeof headers === 'object') {
                            for (const k in headers) {
                                if (k.toLowerCase() === key.toLowerCase()) return headers[k]
                            }
                        }
                        return null
                    }
                    const st = readHeader('seat_token')
                    if (st && seatToken !== st) {
                        const wasUnset = !seatToken
                        seatToken = st
                        log('Captured seat_token from fetch')
                        if (wasUnset) kickSyncSoon()
                    }
                    const at = readHeader('authorization')
                    if (at && authToken !== at) {
                        authToken = at
                        log('Captured Authorization from fetch')
                    }
                }
            } catch (e) {
                // ignore
            }
            return origFetch.apply(this, arguments)
        }
    }
    installTokenInterceptor()

    // ============================================================
    // DISPATCH API CALLS (via GM_xmlhttpRequest to bypass CORS)
    // ============================================================
    function buildDispatchHeaders(extra = {}) {
        // The UI sends seat_token + form_id + database (empty); Authorization
        // is not part of normal traffic. We only include Authorization when
        // we've actually captured one, otherwise GM_xmlhttpRequest may emit a
        // literal "null" / "undefined" header value that the server rejects.
        const headers = {
            Accept: 'application/json, text/plain, */*',
            database: '',
            form_id: FORM_ID,
            seat_token: seatToken,
            Origin: UI_ORIGIN,
            Referer: `${UI_ORIGIN}/`,
            ...extra
        }
        if (authToken) headers.Authorization = authToken
        return headers
    }

    // Status codes that mean "your seat is dead, log back in." We treat 401
    // and 403 the same — both have been seen across different IIS / Web API
    // builds of the dispatch server for an expired or unbound seat. The
    // dispatch server ALSO frequently 302s an unauthenticated request to
    // /security/login and serves the login HTML with a 200, so the body
    // sniffers below catch that case too.
    function isAuthFailureStatus(status) {
        return status === 401 || status === 403
    }

    // Heuristics for "this 2xx response is actually the login page in
    // disguise." When the seat dies, the dispatch server transparently
    // redirects API calls to /security/login and returns the login HTML
    // with a 200 status. GM_xmlhttpRequest follows the redirect for us,
    // so by the time we see the response the status looks healthy but
    // the body is HTML form markup instead of the JSON / report we asked
    // for. Detecting that here is what makes the auto-reauth actually
    // trigger in production — pure 401 sniffing isn't enough.
    function isLoginPageBody(body) {
        if (!body || typeof body !== 'string') return false
        const sample = body.slice(0, 4096).toLowerCase()
        if (!sample.includes('<')) return false
        return (
            sample.includes('/security/login') ||
            sample.includes('name="client_id"') ||
            sample.includes("name='client_id'") ||
            sample.includes('type="password"') ||
            sample.includes("type='password'") ||
            sample.includes('grant_type=client_credentials')
        )
    }

    function isLoginPageRedirect(res) {
        const finalUrl = res && (res.finalUrl || res.responseURL)
        if (!finalUrl || typeof finalUrl !== 'string') return false
        return /\/security\/login(\b|\/|\?)/i.test(finalUrl) || /\/login(\b|\/|\?)/i.test(finalUrl)
    }

    // Builds an Error that withReauthRetry will treat as a 401 even when
    // the wire status was 200. Keeping a single factory means the retry
    // logic only has to check `err.status`.
    function makeAuthFailureError(path, res, reason) {
        const err = new Error(`${path} auth-failure (${reason}); status=${res && res.status}`)
        err.status = 401
        err.authFailureReason = reason
        return err
    }

    // Re-runs the OAuth2 client_credentials grant the dispatch UI uses on
    // its login page. Mints a fresh seat_token + connection_id, POSTs them
    // to /token along with the hardcoded service-account credentials, and
    // — on success — replaces the module-level seatToken so all subsequent
    // GM_xmlhttpRequest calls carry a live seat.
    function reauthenticate() {
        if (reauthInFlight) return reauthInFlight
        const sinceLastFailure = Date.now() - lastReauthFailureAt
        if (lastReauthFailureAt > 0 && sinceLastFailure < REAUTH_FAILURE_BACKOFF_MS) {
            return Promise.reject(
                new Error(`Reauth backoff (last failure ${Math.round(sinceLastFailure / 1000)}s ago)`)
            )
        }
        reauthInFlight = doReauthenticate()
            .then(() => {
                lastReauthFailureAt = 0
            })
            .catch((err) => {
                lastReauthFailureAt = Date.now()
                throw err
            })
            .finally(() => {
                reauthInFlight = null
            })
        return reauthInFlight
    }

    // Posts /token with the given seat + freshly minted connection_id.
    // Resolves on 2xx, rejects with an Error whose message includes status
    // + body so the caller can decide whether to try another strategy.
    function postTokenWith(seat) {
        const conn = randomUuid()
        const body = [
            `client_id=${encodeURIComponent(LOGIN_CLIENT_ID)}`,
            `client_secret=${encodeURIComponent(LOGIN_CLIENT_SECRET)}`,
            'grant_type=client_credentials'
        ].join('&')
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${API_BASE}/token`,
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Origin: UI_ORIGIN,
                    Referer: `${UI_ORIGIN}/`,
                    database: DATABASE,
                    connection_id: conn,
                    seat_token: seat
                },
                data: body,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        try {
                            const parsed = JSON.parse(res.responseText)
                            if (parsed && parsed.access_token) authToken = `Bearer ${parsed.access_token}`
                        } catch {
                            // /token returned 2xx but non-JSON — still safe to use this seat
                        }
                        resolve()
                    } else {
                        reject(new Error(`${res.status} ${res.responseText}`))
                    }
                },
                onerror: (e) => reject(new Error(`network error: ${e && e.error}`))
            })
        })
    }

    // Multi-strategy reauth. The dispatch server is picky about which
    // seat_tokens it accepts on /token (it rejects fresh UUIDs with
    // "Invalid seat token provided"), so we try the captured seat first,
    // then a fresh UUID as a long-shot, then fall back to reloading the
    // page to let the dispatch UI's own bootstrap allocate a seat — and,
    // on /security/login, auto-fill the credentials and submit.
    async function doReauthenticate() {
        log('Re-authenticating with dispatch server...')
        updateBadge('reauth')

        // Strategy 1: reuse the seat the UI is already using. This is the
        // happy path — POST /token rebinds that seat to our credentials
        // and we're back in business.
        if (seatToken) {
            try {
                const captured = seatToken
                await postTokenWith(captured)
                seatToken = captured
                log('Re-auth OK with captured seat')
                return
            } catch (err) {
                log(`Reauth with captured seat failed: ${err.message}`)
            }
        }

        // Strategy 2: try a freshly minted UUID. Usually rejected, but
        // cheap to try — covers the case where the server's policy has
        // been relaxed or we lost the captured seat somehow.
        try {
            const fresh = randomUuid()
            await postTokenWith(fresh)
            seatToken = fresh
            log('Re-auth OK with fresh seat')
            return
        } catch (err) {
            log(`Reauth with fresh seat failed: ${err.message}`)
        }

        // Strategy 3: reload the page. The dispatch UI's bootstrap
        // allocates a seat the server knows about; our interceptor catches
        // it and the next /token call succeeds. On /security/login, the
        // auto-login routine that runs after reload fills credentials and
        // submits the form for us.
        if (triggerReloadForReauth()) {
            throw new Error('Reauth failed — page reload queued')
        }
        throw new Error('Reauth failed and reload cooldown is active')
    }

    function triggerReloadForReauth() {
        let lastReload = 0
        try {
            lastReload = Number(localStorage.getItem(RELOAD_SENTINEL_KEY) || '0')
        } catch {
            // localStorage unavailable (private mode, etc.) — just allow the reload
        }
        const sinceMs = Date.now() - lastReload
        if (lastReload > 0 && sinceMs < RELOAD_COOLDOWN_MS) {
            const sinceMin = Math.round(sinceMs / 60000)
            log(`Skipping reload — last reload was ${sinceMin}min ago, cooldown is ${RELOAD_COOLDOWN_MS / 60000}min`)
            return false
        }
        log('Reloading page to bootstrap a fresh seat...')
        try {
            localStorage.setItem(RELOAD_SENTINEL_KEY, String(Date.now()))
        } catch {
            // ignore
        }
        // Small delay so the log line flushes and any pending console output
        // makes it to the screen before the page tears down.
        setTimeout(() => window.location.reload(), 1500)
        return true
    }

    // ============================================================
    // AUTO-LOGIN ON /security/login
    // After a reload-for-reauth, we usually land on the dispatch UI's
    // login page. The page doesn't fire any captureable XHRs until a user
    // submits the form, so the script would otherwise stall here forever.
    // We fill the credentials and click submit ourselves.
    // ============================================================
    function isOnLoginPage() {
        const path = (window.location && window.location.pathname) || ''
        return /security\/login/i.test(path) || /\/login(\b|\/|$)/i.test(path)
    }

    // Sets an input's value in a way that survives Angular / React change
    // detection. Setting `.value` directly bypasses the framework's
    // internal binding; using the native prototype setter + dispatching
    // input/change events triggers it properly.
    function setNativeInputValue(input, value) {
        const proto = Object.getPrototypeOf(input)
        const desc = proto && Object.getOwnPropertyDescriptor(proto, 'value')
        if (desc && desc.set) desc.set.call(input, value)
        else input.value = value
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
    }

    function findLoginFormParts() {
        const inputs = Array.from(document.querySelectorAll('input'))
        const visible = (el) => el && el.offsetParent !== null && !el.disabled
        const passInput = inputs.find((i) => i.type === 'password' && visible(i))
        if (!passInput) return null
        const userInput = inputs.find(
            (i) =>
                i !== passInput &&
                visible(i) &&
                (i.type === 'text' || i.type === 'email' || i.type === '' || i.type === 'tel')
        )
        if (!userInput) return null
        const form = passInput.closest('form') || userInput.closest('form')
        const submitBtn =
            (form && (form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]'))) ||
            document.querySelector('button[type="submit"], input[type="submit"]') ||
            (form && form.querySelector('button'))
        return { userInput, passInput, submitBtn, form }
    }

    function tryAutoLogin() {
        const parts = findLoginFormParts()
        if (!parts) return false
        log('Auto-filling login form')
        setNativeInputValue(parts.userInput, LOGIN_CLIENT_ID)
        setNativeInputValue(parts.passInput, LOGIN_CLIENT_SECRET)
        // Give the framework a tick to register the values before we submit.
        setTimeout(() => {
            if (parts.submitBtn) {
                parts.submitBtn.click()
                log('Login submit button clicked')
            } else if (parts.form) {
                if (typeof parts.form.requestSubmit === 'function') parts.form.requestSubmit()
                else parts.form.submit()
                log('Login form submitted')
            } else {
                log('No submit button or form found — credentials filled, manual submit needed')
            }
        }, 150)
        return true
    }

    function watchForLoginPageAndAutoSubmit() {
        if (!isOnLoginPage()) return
        log('On login page — will auto-fill credentials when the form renders')
        let attempted = false
        const attemptNow = () => {
            if (attempted) return
            if (tryAutoLogin()) attempted = true
        }
        attemptNow()
        if (attempted) return
        const observer = new MutationObserver(attemptNow)
        observer.observe(document.documentElement, { childList: true, subtree: true })
        // Stop watching after 60s. If the form never showed up by then,
        // something is wrong with the page and a human needs to look.
        setTimeout(() => {
            observer.disconnect()
            if (!attempted) log('Auto-login gave up — no login form detected after 60s')
        }, 60_000)
    }

    // Wraps a thunk that performs one GM_xmlhttpRequest. If the first run
    // surfaces an auth-failure status, we re-authenticate exactly once and
    // retry the thunk. A second 401/403 propagates so the caller surfaces
    // it instead of looping forever. Captures the seatToken in use at call
    // time so concurrent workers that all see a 401 don't each force a
    // separate reauth — if one of them already refreshed the seat by the
    // time we land here, we just retry with the new seat.
    async function withReauthRetry(thunk) {
        const seatBefore = seatToken
        try {
            return await thunk()
        } catch (err) {
            if (!isAuthFailureStatus(err && err.status)) throw err
            const reason = err.authFailureReason || `status ${err.status}`
            if (seatBefore !== seatToken) {
                log(`Auth fail (${reason}) — seat already refreshed by another worker, retrying`)
                return thunk()
            }
            log(`Auth fail (${reason}) — triggering reauth`)
            try {
                await reauthenticate()
            } catch (reauthErr) {
                log(`Reauth failed: ${reauthErr.message}`)
                throw reauthErr
            }
            return thunk()
        }
    }

    function apiPostRaw(path, bodyObj) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${API_BASE}${path}`,
                headers: buildDispatchHeaders({ 'Content-Type': 'application/json' }),
                data: JSON.stringify(bodyObj),
                onload: (res) => {
                    if (isAuthFailureStatus(res.status)) {
                        const err = new Error(`${path} returned ${res.status}: ${res.responseText}`)
                        err.status = res.status
                        return reject(err)
                    }
                    if (isLoginPageRedirect(res)) {
                        return reject(makeAuthFailureError(path, res, 'redirected-to-login'))
                    }
                    if (res.status >= 200 && res.status < 300) {
                        try {
                            return resolve(JSON.parse(res.responseText))
                        } catch (e) {
                            // Common failure mode: server returned the login
                            // HTML with status 200 instead of JSON. Treat as
                            // an auth failure so reauth fires.
                            if (isLoginPageBody(res.responseText)) {
                                return reject(makeAuthFailureError(path, res, 'login-html-as-json'))
                            }
                            return reject(new Error(`Bad JSON from ${path}: ${e.message}`))
                        }
                    }
                    const err = new Error(`${path} returned ${res.status}: ${res.responseText}`)
                    err.status = res.status
                    reject(err)
                },
                onerror: reject
            })
        })
    }

    function apiGetHtmlRaw(path) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${API_BASE}${path}`,
                headers: buildDispatchHeaders(),
                onload: (res) => {
                    if (isAuthFailureStatus(res.status)) {
                        const err = new Error(`${path} returned ${res.status}`)
                        err.status = res.status
                        return reject(err)
                    }
                    if (isLoginPageRedirect(res)) {
                        return reject(makeAuthFailureError(path, res, 'redirected-to-login'))
                    }
                    if (res.status >= 200 && res.status < 300) {
                        // The report static-file endpoint serves the login
                        // HTML with status 200 when the seat is dead — we
                        // detect that and treat it as an auth failure.
                        if (isLoginPageBody(res.responseText)) {
                            return reject(makeAuthFailureError(path, res, 'login-html-body'))
                        }
                        return resolve(res.responseText)
                    }
                    const err = new Error(`${path} returned ${res.status}`)
                    err.status = res.status
                    reject(err)
                },
                onerror: reject
            })
        })
    }

    const apiPost = (path, bodyObj) => withReauthRetry(() => apiPostRaw(path, bodyObj))
    const apiGetHtml = (path) => withReauthRetry(() => apiGetHtmlRaw(path))

    // Poll the static report URL until it exists. Report generation is async -
    // POST returns a reqId immediately but the file takes a few seconds to render,
    // longer for future-dated or data-heavy reports.
    async function waitForReportHtml(path, maxWaitMs = 30000) {
        const start = Date.now()
        let attempt = 0
        while (Date.now() - start < maxWaitMs) {
            try {
                return await apiGetHtml(path)
            } catch (err) {
                if (err.status !== 404) throw err
                attempt++
                await sleep(Math.min(500 + attempt * 500, 3000)) // 0.5s, 1s, 1.5s, ... capped at 3s
            }
        }
        throw new Error(`Timed out waiting for ${path}`)
    }

    // ============================================================
    // SUPABASE STORAGE
    // ============================================================
    // Lists every object under a prefix (paginated, 1000 per page). Supabase
    // storage list is non-recursive, so each prefix must be listed separately.
    // Returns a Set of full storage paths (prefix + name).
    async function listBucketFiles(prefix = '') {
        const existing = new Set()
        const pageSize = 1000
        let offset = 0
        while (true) {
            const page = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`,
                    headers: {
                        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                        apikey: SUPABASE_SERVICE_KEY,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        prefix,
                        limit: pageSize,
                        offset,
                        sortBy: { column: 'name', order: 'asc' }
                    }),
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) {
                            try {
                                resolve(JSON.parse(res.responseText))
                            } catch (e) {
                                reject(new Error(`Bad list JSON: ${e.message}`))
                            }
                        } else {
                            reject(new Error(`List ${res.status}: ${res.responseText}`))
                        }
                    },
                    onerror: reject
                })
            })
            if (!Array.isArray(page) || page.length === 0) break
            for (const obj of page) if (obj && obj.name) existing.add(`${prefix}${obj.name}`)
            if (page.length < pageSize) break
            offset += pageSize
        }
        return existing
    }

    function uploadToSupabase(html, filename) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`,
                headers: {
                    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                    apikey: SUPABASE_SERVICE_KEY,
                    'Content-Type': 'text/html',
                    'x-upsert': 'true',
                    'cache-control': 'no-cache'
                },
                data: html,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) resolve(res)
                    else reject(new Error(`Supabase ${res.status}: ${res.responseText}`))
                },
                onerror: reject
            })
        })
    }

    // Triggers the `dispatch-import` edge function for a given date. The
    // edge function downloads every report HTML we've uploaded for that
    // date, parses them, and upserts into the `dispatch_data` table — the
    // canonical source the web app reads from. Without this call, the
    // bucket fills up but `dispatch_data` stays frozen at whatever date
    // it was last refreshed for, which surfaces in the UI as the stale-
    // schedule banner ("Schedule hasn't been updated since…").
    function triggerDispatchImport(date) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${SUPABASE_URL}/functions/v1/dispatch-import`,
                headers: {
                    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                    apikey: SUPABASE_SERVICE_KEY,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({ date }),
                timeout: 120000,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        resolve({ ok: true, body: res.responseText })
                    } else {
                        resolve({ ok: false, error: `${res.status}: ${res.responseText}` })
                    }
                },
                onerror: (err) => resolve({ ok: false, error: err?.error || 'network' }),
                ontimeout: () => resolve({ ok: false, error: 'timeout' })
            })
        })
    }

    // ============================================================
    // SYNC FLOW
    // ============================================================
    function isoDate(d) {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }

    // Rolling window of dates a report should re-pull every cycle. Today is
    // always included; `daysAhead` extends the window into the future.
    function getRollingDatesForReport(report) {
        const dates = []
        const today = new Date()
        const daysAhead = Number.isFinite(report.daysAhead) ? report.daysAhead : 0
        for (let i = 0; i <= daysAhead; i++) {
            const d = new Date(today)
            d.setDate(today.getDate() + i)
            dates.push(isoDate(d))
        }
        return dates
    }

    // Every date from Jan 1 of the current year through today, inclusive.
    function getCurrentYearDatesThroughToday() {
        const dates = []
        const today = new Date()
        const year = today.getFullYear()
        const cursor = new Date(year, 0, 1)
        const end = new Date(year, today.getMonth(), today.getDate())
        while (cursor <= end) {
            dates.push(isoDate(cursor))
            cursor.setDate(cursor.getDate() + 1)
        }
        return dates
    }

    // A task is the unit of sync work: one report for one date (and one plant
    // when the report is per-plant). buildBody/storagePath are wired here so
    // the runner doesn't need to know report shapes.
    function buildTasksForDate(report, date) {
        if (report.perPlant) {
            return PLANT_IDS.map((plantId) => ({
                report,
                date,
                plantId,
                storagePath: report.storagePath(date, plantId),
                label: `${report.name} ${date} plant ${plantId}`
            }))
        }
        return [
            {
                report,
                date,
                plantId: null,
                storagePath: report.storagePath(date),
                label: `${report.name} ${date}`
            }
        ]
    }

    // Minimum size for a "real" report. A schedule with even one plant comes
    // out well over 5 KB once the FastReport boilerplate is included; anything
    // smaller is almost certainly a stub or error placeholder.
    const MIN_HTML_BYTES = 5000

    // FastReport HTML always ends with `</html>` (lowercase). If we GET the
    // file mid-write the closing tag is missing — uploading that partial
    // payload is what causes the schedule-cut-off issue we sometimes see.
    function isHtmlComplete(html) {
        if (!html) return false
        // Trim trailing whitespace/newlines and look for the closing tag.
        const tail = html.slice(-256).toLowerCase().trim()
        return tail.endsWith('</html>')
    }

    // Runs one task end-to-end: POST the report request, poll until the
    // rendered HTML is on the dispatch server, verify the payload is complete,
    // then upload it to Supabase.
    async function syncTask(task) {
        const { report, date, plantId, storagePath, label } = task
        const body = report.perPlant ? report.buildBody(date, plantId) : report.buildBody(date)

        const genRes = await apiPost('/api/v1/reports/custom', body)
        const reqId = genRes && genRes.data && genRes.data[0] && genRes.data[0].ReportRequestId
        if (!reqId) throw new Error(`No ReportRequestId in response for ${label}`)

        // Fetch + retry the GET if the HTML comes back truncated. The dispatch
        // server occasionally serves the file before FastReport has flushed
        // every page; a short wait is enough for the rest to land.
        const reportPath = `/static/reports/${report.reportId}_${reqId}.html`
        let html = await waitForReportHtml(reportPath, 30000)
        for (let attempt = 0; attempt < 4 && !isHtmlComplete(html); attempt++) {
            await sleep(750)
            try {
                html = await apiGetHtml(reportPath)
            } catch {
                // ignore — the next loop iteration will throw if still incomplete
            }
        }

        if (!html || html.length < MIN_HTML_BYTES) {
            throw new Error(`HTML too small for ${label}: ${html && html.length} bytes (min ${MIN_HTML_BYTES})`)
        }
        if (!isHtmlComplete(html)) {
            throw new Error(`HTML truncated for ${label}: ${html.length} bytes, missing </html> close`)
        }

        await uploadToSupabase(html, storagePath)
        log(`  uploaded ${storagePath} (${html.length} bytes)`)
    }

    // Builds backfill tasks for every (report, date[, plant]) combination
    // missing from storage for the current year through today. Each report's
    // own rolling window is excluded so we don't double-process today/future
    // dates the rolling pass already covers.
    async function buildBackfillTasks(rollingByReport) {
        const tasks = []
        // Backfill iterates newest → oldest so the most-recently-missing
        // files get filled first. A long stale gap (months back) doesn't
        // delay the dates a dispatcher actually cares about right now.
        const yearDates = getCurrentYearDatesThroughToday().slice().reverse()
        for (const report of REPORTS) {
            // Reports can opt out of historic backfill via
            // `backfillEnabled: false` (e.g. DetailOrderAnalysis, where
            // past-date data isn't useful for live dispatch).
            if (report.backfillEnabled === false) continue
            let existing
            try {
                existing = await listBucketFiles(report.storagePrefix)
            } catch (err) {
                log(`Backfill list failed for ${report.name}, skipping: ${err.message}`)
                continue
            }
            const rollingSet = rollingByReport.get(report) || new Set()
            for (const date of yearDates) {
                if (rollingSet.has(date)) continue
                for (const task of buildTasksForDate(report, date)) {
                    if (!existing.has(task.storagePath)) tasks.push(task)
                }
            }
        }
        return tasks
    }

    async function runSync() {
        if (syncing) {
            log('Already syncing, skipping tick')
            return
        }
        if (fullRefreshing) {
            log('Daily full refresh in progress, skipping rolling tick')
            return
        }
        if (!isWithinSyncWindow()) {
            log('Outside Central sync window (00:00–17:30), skipping tick')
            updateBadge('paused', 'outside 00:00–17:30 CT')
            return
        }
        // No seat yet? Mint one ourselves instead of stalling forever waiting
        // for the UI to make a call. This also covers the case where the user
        // is sitting on /security/login — the UI fires zero requests there.
        if (!seatToken) {
            try {
                await reauthenticate()
            } catch (err) {
                log('Cold-start reauth failed:', err.message)
                updateBadge('error', `Auth failed: ${err.message}`)
                return
            }
        }
        syncing = true

        // Each report has its own rolling window — DailyOrder pulls today + 7
        // future days every cycle, DetailOrderAnalysis pulls only today.
        const rollingByReport = new Map()
        const rollingTasks = []
        for (const report of REPORTS) {
            const rollingDates = getRollingDatesForReport(report)
            rollingByReport.set(report, new Set(rollingDates))
            for (const date of rollingDates) rollingTasks.push(...buildTasksForDate(report, date))
        }
        const backfillTasks = await buildBackfillTasks(rollingByReport)
        if (backfillTasks.length > 0) {
            log(`Backfill: ${backfillTasks.length} missing file(s) for current year`)
        }

        const tasks = [...rollingTasks, ...backfillTasks]
        const results = { ok: 0, fail: 0, total: tasks.length }
        updateBadge('syncing', `0/${results.total}`)

        // Worker-pool execution. Each worker pulls the next task from a
        // shared cursor and runs syncTask end-to-end. The dispatch server
        // tolerates several concurrent report generations, and crucially
        // the polling wait inside one task no longer blocks the next.
        let cursor = 0
        const runWorker = async () => {
            while (true) {
                const idx = cursor++
                if (idx >= tasks.length) return
                const task = tasks[idx]
                try {
                    await syncTask(task)
                    results.ok++
                } catch (err) {
                    log(`  FAILED ${task.label}:`, err.message)
                    results.fail++
                }
                updateBadge('syncing', `${results.ok + results.fail}/${results.total}`)
            }
        }
        const workerCount = Math.min(WORKER_CONCURRENCY, tasks.length)
        await Promise.all(Array.from({ length: workerCount }, runWorker))

        if (results.fail === 0) {
            lastSync = new Date()
            log(`Batch OK: ${results.ok}/${results.total} files synced at ${lastSync.toISOString()}`)
            updateBadge('ok')
        } else if (results.ok > 0) {
            lastSync = new Date()
            log(`Partial: ${results.ok} ok, ${results.fail} failed`)
            updateBadge('partial', `${results.ok}/${results.total}`)
        } else {
            log('Batch failed entirely')
            updateBadge('error', 'All files failed')
        }

        // Trigger `dispatch-import` once per unique date covered by this
        // batch — without this the bucket fills up but `dispatch_data`
        // stays stale and the web app shows the "schedule out of date"
        // banner. Runs sequentially so the dispatch server (downloads
        // every HTML once per call) isn't slammed in parallel.
        const importDates = Array.from(new Set(tasks.map((t) => t.date)))
        if (importDates.length > 0) {
            updateBadge('syncing', `importing ${importDates.length} date(s)`)
            let importOk = 0
            for (const date of importDates) {
                const result = await triggerDispatchImport(date)
                if (result.ok) {
                    importOk++
                    log(`  imported ${date}`)
                } else {
                    log(`  IMPORT FAILED ${date}: ${result.error}`)
                }
            }
            log(`Import: ${importOk}/${importDates.length} date(s) refreshed in dispatch_data`)
        }

        syncing = false
    }

    // Re-uploads EVERY (report × plant × date) combo from Jan 1 → today,
    // ignoring the bucket-existence gate that the rolling backfill uses.
    // Fires once per Central day at DAILY_FULL_REFRESH_HOUR_CT. After the
    // upload phase, `dispatch-import` is triggered once per covered date
    // so `dispatch_data` is refreshed for the entire year too. Total
    // runtime is typically 1–2 hours.
    async function runDailyFullRefresh() {
        if (fullRefreshing) {
            log('Daily full refresh already in progress, skipping trigger')
            return
        }
        if (syncing) {
            log('Rolling sync in progress, deferring full refresh to next minute tick')
            return
        }
        if (!seatToken) {
            try {
                await reauthenticate()
            } catch (err) {
                log('Daily full refresh: cold-start reauth failed:', err.message)
                updateBadge('error', `Auth failed: ${err.message}`)
                return
            }
        }
        fullRefreshing = true
        markDailyFullRefreshRan()
        log('Daily full refresh starting — every report × every plant × Jan 1 → today')

        const yearDates = getCurrentYearDatesThroughToday()
        const tasks = []
        for (const report of REPORTS) {
            for (const date of yearDates) {
                tasks.push(...buildTasksForDate(report, date))
            }
        }
        log(`Daily full refresh: ${tasks.length} task(s) across ${yearDates.length} date(s)`)

        const results = { fail: 0, ok: 0, total: tasks.length }
        updateBadge('syncing', `full 0/${results.total}`)

        let cursor = 0
        const runWorker = async () => {
            while (true) {
                const idx = cursor++
                if (idx >= tasks.length) return
                const task = tasks[idx]
                try {
                    await syncTask(task)
                    results.ok++
                } catch (err) {
                    log(`  FULL FAILED ${task.label}:`, err.message)
                    results.fail++
                }
                updateBadge('syncing', `full ${results.ok + results.fail}/${results.total}`)
            }
        }
        const workerCount = Math.min(WORKER_CONCURRENCY, tasks.length)
        await Promise.all(Array.from({ length: workerCount }, runWorker))

        log(`Daily full refresh upload phase: ${results.ok} ok, ${results.fail} failed`)

        // Refresh dispatch_data for every date covered. Sequential to
        // avoid hammering both the dispatch server (each call re-downloads
        // every HTML for that date) and the edge function in parallel.
        const importDates = Array.from(new Set(tasks.map((t) => t.date)))
        updateBadge('syncing', `full importing ${importDates.length} date(s)`)
        let importOk = 0
        for (const date of importDates) {
            const result = await triggerDispatchImport(date)
            if (result.ok) importOk++
            else log(`  FULL IMPORT FAILED ${date}: ${result.error}`)
        }
        log(`Daily full refresh import: ${importOk}/${importDates.length} date(s) refreshed in dispatch_data`)

        if (results.fail === 0) {
            lastSync = new Date()
            updateBadge('ok')
        } else if (results.ok > 0) {
            lastSync = new Date()
            updateBadge('partial', `full ${results.ok}/${results.total}`)
        } else {
            updateBadge('error', 'Full refresh failed entirely')
        }
        fullRefreshing = false
        log('Daily full refresh complete')
    }

    // Fired every minute. No-ops unless it's past the configured trigger
    // hour AND today's refresh hasn't already started. The marker is
    // written at the start of the refresh, so a failure won't re-trigger
    // on the next minute tick — see notes on markDailyFullRefreshRan.
    function tickFullRefreshTrigger() {
        if (fullRefreshing || syncing) return
        if (hasDailyFullRefreshRunToday()) return
        if (!isPastDailyFullRefreshTime()) return
        runDailyFullRefresh().catch((err) => {
            log('Daily full refresh error:', err.message)
            fullRefreshing = false
        })
    }

    // ============================================================
    // STATUS BADGE
    // ============================================================
    let badge
    function ensureBadge() {
        if (badge || !document.body) return
        badge = document.createElement('div')
        badge.style.cssText = `
      position: fixed; bottom: 12px; right: 12px; z-index: 999999;
      font-family: monospace; font-size: 12px; padding: 6px 10px;
      border-radius: 4px; color: #fff; background: #333;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3); pointer-events: none;
      max-width: 300px;
    `
        document.body.appendChild(badge)
    }

    function updateBadge(state, detail) {
        ensureBadge()
        if (!badge) return
        const ts = lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'
        const baseTitle = document.title.replace(/^\[SYNC.*?\]\s*/, '')
        if (state === 'syncing') {
            badge.style.background = '#555'
            badge.textContent = `SYNC ${detail || ''} | last ok ${ts}`
        } else if (state === 'waiting') {
            badge.style.background = '#666'
            badge.textContent = `SYNC waiting for token...`
        } else if (state === 'paused') {
            badge.style.background = '#444'
            badge.textContent = `SYNC paused — ${detail || 'outside window'} | last ok ${ts}`
        } else if (state === 'reauth') {
            badge.style.background = '#4a5fb0'
            badge.textContent = `SYNC re-authenticating...`
        } else if (state === 'ok') {
            badge.style.background = '#2d7a2d'
            badge.textContent = `SYNC OK ${ts}`
            document.title = `[SYNC OK ${ts}] ${baseTitle}`
        } else if (state === 'partial') {
            badge.style.background = '#b87a00'
            badge.textContent = `SYNC PARTIAL ${detail || ''} | ${ts}`
            document.title = `[SYNC PARTIAL] ${baseTitle}`
        } else if (state === 'error') {
            badge.style.background = '#a33'
            badge.textContent = `SYNC FAIL | last ok ${ts}`
            document.title = `[SYNC FAIL] ${baseTitle}`
            if (detail) badge.title = detail
        }
    }

    // ============================================================
    // KICKOFF
    // ============================================================
    log(
        `Smyrna Dispatch Sync v2.15.1 loaded - host ${DISPATCH_HOST}, ${WORKER_CONCURRENCY} parallel workers, ${PLANT_IDS.length} plants, active window 00:00–17:30 CT, daily full refresh at ${DAILY_FULL_REFRESH_HOUR_CT}:00 CT, completeness check + retry on truncated reports, current-year backfill, multi-strategy auto re-auth (captured seat → fresh seat → page reload + auto-login), manual triggers under smyrnaSync (unsafeWindow-attached)`
    )

    // Run the login-page auto-submit as soon as the DOM is available.
    // The userscript runs at document-start, so on a fresh load the body
    // may not exist yet — schedule it once DOMContentLoaded fires.
    function whenDomReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true })
        } else {
            fn()
        }
    }
    whenDomReady(watchForLoginPageAndAutoSubmit)

    setTimeout(() => {
        updateBadge('waiting')
        setTimeout(runSync, 10000) // first run after 10s (gives UI time to make a call so we capture token)
        setInterval(runSync, INTERVAL_MS)
        // Independent 1-min tick that fires the daily full refresh exactly
        // once per Central day at DAILY_FULL_REFRESH_HOUR_CT. Independent
        // of the rolling sync window — the full refresh runs even after
        // 17:30 CT when regular ticks have stopped.
        setInterval(tickFullRefreshTrigger, 60_000)
    }, 1000)

    // ============================================================
    // MANUAL DEVTOOLS TRIGGERS
    // Exposed so the bridge operator can test the full-refresh flow
    // without waiting for 18:00 CT. Bypasses time-of-day and "already
    // ran today" checks; still respects the concurrency locks.
    //
    // IMPORTANT: this assigns to `unsafeWindow`, not `window`. With any
    // @grant set (we have GM_xmlhttpRequest), Tampermonkey runs the
    // script in a sandboxed context where `window` is a wrapper —
    // `window.smyrnaSync = ...` would be invisible to the page's F12
    // console. `unsafeWindow` is Tampermonkey's escape hatch for the
    // real page window, which is what devtools sees.
    //
    // Usage from the dispatch UI tab's devtools console:
    //   smyrnaSync.fullRefreshNow()      — fire the daily full refresh
    //   smyrnaSync.runRollingSync()      — fire one rolling 5-min cycle
    //   smyrnaSync.clearFullRefreshMark()— clear today's "ran" marker so
    //                                      the 1-min tick re-fires it
    //   smyrnaSync.status()              — print current state snapshot
    // ============================================================
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window
    pageWindow.smyrnaSync = {
        clearFullRefreshMark() {
            try {
                localStorage.removeItem(DAILY_FULL_REFRESH_KEY)
                log('Manual: cleared daily-full-refresh marker — next minute tick will re-fire if past trigger hour')
                return true
            } catch (err) {
                log('Manual: failed to clear marker:', err && err.message)
                return false
            }
        },
        fullRefreshNow() {
            log('Manual trigger: starting daily full refresh now (bypassing time + marker checks)')
            return runDailyFullRefresh()
        },
        runRollingSync() {
            log('Manual trigger: running one rolling 5-min sync cycle now')
            return runSync()
        },
        status() {
            const snap = {
                centralDate: getCentralDateString(),
                centralMinutesOfDay: getCentralMinutesOfDay(),
                fullRefreshing,
                fullRefreshRanToday: hasDailyFullRefreshRunToday(),
                lastSync: lastSync ? lastSync.toISOString() : null,
                seatCaptured: !!seatToken,
                syncing,
                withinSyncWindow: isWithinSyncWindow()
            }
            log('Manual: status snapshot', snap)
            return snap
        }
    }
    log('Manual triggers ready — call smyrnaSync.fullRefreshNow() from devtools to test the daily full refresh')
})()
