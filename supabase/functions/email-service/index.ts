// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";
// @ts-ignore
import {envOrDefault, buildThemeConfig} from "../_shared/auth-helpers.ts";

const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";
const DEFAULT_FROM_NAME = "Smyrna Tools";
const DEFAULT_LOGO_URL = "https://smyrnatools.com/static/media/SmyrnaLogo.d7f873f3da1747602db3.png";
const DEFAULT_FRONTEND_URL = "https://smyrnatools.com";

/**
 * Parses comma-separated whitelist from env var into a normalized Set.
 * Returns null when debug mode is off (no filtering needed).
 */
function getDebugWhitelist(debugMode: boolean): Set<string> | null {
    if (!debugMode) return null;
    const raw = Deno.env.get("EMAIL_DEBUG_WHITELIST") || "";
    const entries = raw.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    return new Set(entries);
}

/** Filters a recipient array against the whitelist. Returns only whitelisted addresses. */
function filterRecipients(
    recipients: Array<{ email: string; name?: string }>,
    whitelist: Set<string> | null
): Array<{ email: string; name?: string }> {
    if (!whitelist) return recipients;
    return recipients.filter(r => whitelist.has(r.email.trim().toLowerCase()));
}

/** Validates that a string looks like an email address. */
function isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Normalizes recipient input — accepts strings or {email, name} objects. */
function normalizeRecipients(input: unknown): Array<{ email: string; name?: string }> {
    if (!Array.isArray(input)) return [];
    return input
        .map(entry => {
            if (typeof entry === "string") return {email: entry.trim()};
            if (entry && typeof entry.email === "string") return {email: entry.email.trim(), ...(entry.name ? {name: entry.name} : {})};
            return null;
        })
        .filter((r): r is { email: string; name?: string } => r !== null && isEmail(r.email));
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);

    const url = new URL(req.url);
    const endpoint = url.pathname.split("/").pop();

    switch (endpoint) {

        /**
         * POST /email-service/send
         *
         * Sends an email using a pre-built template payload.
         * Supports to/cc/bcc arrays, custom sender, and debug mode
         * that restricts all recipients to an env-var whitelist.
         *
         * Body: {
         *   subject:   string,
         *   html:      string,
         *   text?:     string,
         *   from?:     { email: string, name?: string },
         *   to:        Array<string | { email: string, name?: string }>,
         *   cc?:       Array<string | { email: string, name?: string }>,
         *   bcc?:      Array<string | { email: string, name?: string }>,
         *   debug?:    boolean
         * }
         */
        case "send": {
            const body = await req.json().catch(() => null);
            if (!body) return errorResponse("Invalid request body", headers, 400);

            const {subject, html, text, from, to, cc, bcc, debug} = body;
            if (!subject || !html) return errorResponse("subject and html are required", headers, 400);

            const mailerSendToken = Deno.env.get("MAILERSEND_API_TOKEN");
            const defaultFromEmail = Deno.env.get("MAILERSEND_FROM_EMAIL");
            if (!mailerSendToken || !defaultFromEmail) {
                return errorResponse("Email service is not configured", headers, 500);
            }

            // Resolve sender — allow override but fall back to env defaults
            const sender = {
                email: from?.email || defaultFromEmail,
                name: from?.name || envOrDefault("MAILERSEND_FROM_NAME", DEFAULT_FROM_NAME)
            };

            // Normalize all recipient lists
            let toList = normalizeRecipients(to);
            let ccList = normalizeRecipients(cc);
            let bccList = normalizeRecipients(bcc);

            // Debug mode: filter all recipients through the whitelist
            const debugMode = debug === true;
            const whitelist = getDebugWhitelist(debugMode);
            if (whitelist) {
                toList = filterRecipients(toList, whitelist);
                ccList = filterRecipients(ccList, whitelist);
                bccList = filterRecipients(bccList, whitelist);
            }

            if (toList.length === 0) {
                return jsonResponse({
                    success: false,
                    sent: false,
                    reason: debugMode
                        ? "All recipients filtered out by debug whitelist"
                        : "No valid recipients in 'to' field"
                }, headers, 200);
            }

            // Build MailerSend payload
            const payload: Record<string, unknown> = {
                from: sender,
                to: toList,
                subject,
                html,
                ...(text ? {text} : {}),
                ...(ccList.length > 0 ? {cc: ccList} : {}),
                ...(bccList.length > 0 ? {bcc: bccList} : {})
            };

            try {
                const response = await fetch(MAILERSEND_API_URL, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${mailerSendToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorBody = await response.text().catch(() => "Unknown error");
                    console.error(`MailerSend error (${response.status}):`, errorBody);
                    return errorResponse("Failed to send email", headers, 502, {
                        mailerStatus: response.status
                    });
                }

                return jsonResponse({
                    success: true,
                    sent: true,
                    recipients: {
                        to: toList.length,
                        cc: ccList.length,
                        bcc: bccList.length
                    },
                    debug: debugMode
                }, headers);
            } catch (err) {
                console.error("Email send failed:", err);
                return errorResponse("Email delivery failed", headers, 502);
            }
        }

        /**
         * POST /email-service/template-context
         *
         * Returns shared template context (theme, logo, frontend URL)
         * so client-side template builders can produce consistent emails.
         */
        case "template-context": {
            return jsonResponse({
                theme: buildThemeConfig(),
                logoUrl: envOrDefault("LOGO_URL", DEFAULT_LOGO_URL),
                frontendUrl: envOrDefault("FRONTEND_URL", DEFAULT_FRONTEND_URL),
                fromName: envOrDefault("MAILERSEND_FROM_NAME", DEFAULT_FROM_NAME)
            }, headers);
        }

        default:
            return errorResponse("Invalid endpoint", headers, 404);
    }
});
