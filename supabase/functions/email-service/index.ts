// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.55.0";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";
// @ts-ignore
import {envOrDefault, buildThemeConfig} from "../_shared/auth-helpers.ts";
// @ts-ignore
import {buildReportSubmittedEmail} from "../../../emails/report-submitted-email.js";

const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";
const DEFAULT_FROM_NAME = "Smyrna Tools";
const DEFAULT_LOGO_URL = "https://smyrnatools.com/static/media/SmyrnaLogo.d7f873f3da1747602db3.png";
const DEFAULT_FRONTEND_URL = "https://smyrnatools.com";
const GM_ROLE_NAME = "General Manager";
const DM_ROLE_NAME = "District Manager";

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

/** Creates a Supabase admin client using service role key. */
function createAdminClient() {
    return createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!
    );
}

/** Fetches a file from a URL and returns it as a base64-encoded string. */
async function fetchFileAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    } catch {
        console.error("Failed to fetch file for attachment:", url);
        return null;
    }
}

/** Sends an email via MailerSend, applying debug whitelist filtering. */
async function sendEmail({
    subject, html, text, toList, ccList = [] as Array<{email: string; name?: string}>,
    bccList = [] as Array<{email: string; name?: string}>, debugMode = false,
    attachments = [] as Array<{content: string; filename: string; disposition?: string}>
}: {
    subject: string; html: string; text?: string;
    toList: Array<{email: string; name?: string}>;
    ccList?: Array<{email: string; name?: string}>;
    bccList?: Array<{email: string; name?: string}>;
    debugMode?: boolean;
    attachments?: Array<{content: string; filename: string; disposition?: string}>;
}): Promise<{success: boolean; sent: boolean; reason?: string; recipients?: Record<string, number>}> {
    const mailerSendToken = Deno.env.get("MAILERSEND_API_TOKEN");
    const fromEmail = Deno.env.get("MAILERSEND_FROM_EMAIL");
    if (!mailerSendToken || !fromEmail) return {success: false, sent: false, reason: "Email service not configured"};

    const sender = {
        email: fromEmail,
        name: envOrDefault("MAILERSEND_FROM_NAME", DEFAULT_FROM_NAME)
    };

    const whitelist = getDebugWhitelist(debugMode);
    if (whitelist) {
        toList = filterRecipients(toList, whitelist);
        ccList = filterRecipients(ccList, whitelist);
        bccList = filterRecipients(bccList, whitelist);
    }

    // Deduplicate within and across all recipient lists (MailerSend rejects any duplicates)
    const dedup = (list: Array<{email: string; name?: string}>, seen: Set<string>) =>
        list.filter(r => {
            const key = r.email.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    const seen = new Set<string>();
    toList = dedup(toList, seen);
    ccList = dedup(ccList, seen);
    bccList = dedup(bccList, seen);

    if (toList.length === 0) {
        return {
            success: false, sent: false,
            reason: debugMode ? "All recipients filtered out by debug whitelist" : "No valid recipients"
        };
    }

    const payload: Record<string, unknown> = {
        from: sender, to: toList, subject, html,
        ...(text ? {text} : {}),
        ...(ccList.length > 0 ? {cc: ccList} : {}),
        ...(bccList.length > 0 ? {bcc: bccList} : {}),
        ...(attachments.length > 0 ? {attachments} : {})
    };

    const response = await fetch(MAILERSEND_API_URL, {
        method: "POST",
        headers: {Authorization: `Bearer ${mailerSendToken}`, "Content-Type": "application/json"},
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        console.error(`MailerSend error (${response.status}):`, errorBody);
        return {success: false, sent: false, reason: `MailerSend ${response.status}`};
    }

    return {success: true, sent: true, recipients: {to: toList.length, cc: ccList.length, bcc: bccList.length}};
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
         * Generic email send endpoint.
         * Body: { subject, html, text?, from?, to, cc?, bcc?, debug? }
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

            const sender = {
                email: from?.email || defaultFromEmail,
                name: from?.name || envOrDefault("MAILERSEND_FROM_NAME", DEFAULT_FROM_NAME)
            };

            let toList = normalizeRecipients(to);
            let ccList = normalizeRecipients(cc);
            let bccList = normalizeRecipients(bcc);

            const debugMode = debug === true;
            const whitelist = getDebugWhitelist(debugMode);
            if (whitelist) {
                toList = filterRecipients(toList, whitelist);
                ccList = filterRecipients(ccList, whitelist);
                bccList = filterRecipients(bccList, whitelist);
            }

            if (toList.length === 0) {
                return jsonResponse({
                    success: false, sent: false,
                    reason: debugMode ? "All recipients filtered out by debug whitelist" : "No valid recipients in 'to' field"
                }, headers, 200);
            }

            const payload: Record<string, unknown> = {
                from: sender, to: toList, subject, html,
                ...(text ? {text} : {}),
                ...(ccList.length > 0 ? {cc: ccList} : {}),
                ...(bccList.length > 0 ? {bcc: bccList} : {})
            };

            try {
                const response = await fetch(MAILERSEND_API_URL, {
                    method: "POST",
                    headers: {Authorization: `Bearer ${mailerSendToken}`, "Content-Type": "application/json"},
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorBody = await response.text().catch(() => "Unknown error");
                    console.error(`MailerSend error (${response.status}):`, errorBody);
                    return errorResponse("Failed to send email", headers, 502, {mailerStatus: response.status});
                }

                return jsonResponse({
                    success: true, sent: true,
                    recipients: {to: toList.length, cc: ccList.length, bcc: bccList.length},
                    debug: debugMode
                }, headers);
            } catch (err) {
                console.error("Email send failed:", err);
                return errorResponse("Email delivery failed", headers, 502);
            }
        }

        /**
         * POST /email-service/notify-report-submitted
         *
         * Notifies all General Managers in the submitter's region that a report was submitted.
         * CC's the submitter. Debug mode filters all recipients through the whitelist.
         *
         * Body: { userId, reportTitle, weekLabel, debug? }
         */
        case "notify-report-submitted": {
            const body = await req.json().catch(() => null);
            if (!body) return errorResponse("Invalid request body", headers, 400);

            const {userId, reportTitle, weekLabel, reportFields, attachmentUrl, debug} = body;
            if (!userId || !reportTitle) return errorResponse("userId and reportTitle are required", headers, 400);

            const supabase = createAdminClient();
            const debugMode = debug === true;

            try {
                // 1. Get submitter's profile and email
                const [{data: submitterProfile}, {data: submitterUser}] = await Promise.all([
                    supabase.from("users_profiles").select("first_name, last_name, plant_code").eq("id", userId).maybeSingle(),
                    supabase.from("users").select("email").eq("id", userId).maybeSingle()
                ]);

                if (!submitterProfile?.plant_code || !submitterUser?.email) {
                    return jsonResponse({success: false, sent: false, reason: "Submitter profile or plant not found"}, headers);
                }

                const submitterName = [submitterProfile.first_name, submitterProfile.last_name].filter(Boolean).join(" ") || "A team member";
                const submitterEmail = submitterUser.email;

                // 2. Resolve submitter's plant → region
                const {data: regionLink} = await supabase
                    .from("regions_plants")
                    .select("region_id")
                    .eq("plant_code", submitterProfile.plant_code)
                    .limit(1)
                    .maybeSingle();

                if (!regionLink?.region_id) {
                    return jsonResponse({success: false, sent: false, reason: "No region found for submitter's plant"}, headers);
                }

                const {data: region} = await supabase
                    .from("regions")
                    .select("region_code, region_name")
                    .eq("id", regionLink.region_id)
                    .maybeSingle();

                if (!region) {
                    return jsonResponse({success: false, sent: false, reason: "Region not found"}, headers);
                }

                // 3. Get all plant codes in this region
                const {data: regionPlants} = await supabase
                    .from("regions_plants")
                    .select("plant_code")
                    .eq("region_id", regionLink.region_id);

                const regionPlantCodes = new Set((regionPlants || []).map(rp => rp.plant_code));

                // 4. Find the General Manager role
                const {data: gmRole} = await supabase
                    .from("users_roles")
                    .select("id")
                    .eq("name", GM_ROLE_NAME)
                    .maybeSingle();

                if (!gmRole) {
                    return jsonResponse({success: false, sent: false, reason: "General Manager role not found"}, headers);
                }

                // 5. Get all users with the GM role
                const {data: gmPermissions} = await supabase
                    .from("users_permissions")
                    .select("user_id")
                    .eq("role_id", gmRole.id);

                const gmUserIds = (gmPermissions || []).map(p => p.user_id);
                if (gmUserIds.length === 0) {
                    return jsonResponse({success: false, sent: false, reason: "No General Managers found"}, headers);
                }

                // 6. Filter GMs to those whose plant is in the submitter's region
                const {data: gmProfiles} = await supabase
                    .from("users_profiles")
                    .select("id, first_name, last_name, plant_code")
                    .in("id", gmUserIds);

                const regionGmIds = (gmProfiles || [])
                    .filter(gm => gm.plant_code && regionPlantCodes.has(gm.plant_code))
                    .map(gm => gm.id);

                if (regionGmIds.length === 0) {
                    return jsonResponse({success: false, sent: false, reason: "No General Managers in submitter's region"}, headers);
                }

                // 7. Get GM emails
                const {data: gmUsers} = await supabase
                    .from("users")
                    .select("id, email")
                    .in("id", regionGmIds);

                const gmEmailMap = new Map((gmUsers || []).map(u => [u.id, u.email]));
                const toRecipients = (gmProfiles || [])
                    .filter(gm => regionGmIds.includes(gm.id) && gmEmailMap.has(gm.id))
                    .map(gm => ({
                        email: gmEmailMap.get(gm.id)!,
                        name: [gm.first_name, gm.last_name].filter(Boolean).join(" ") || undefined
                    }));

                // 8. Find District Managers whose assigned plants include the submitter's plant
                const {data: dmAssignments} = await supabase
                    .from("district_manager_plants")
                    .select("user_id")
                    .eq("plant_code", submitterProfile.plant_code);

                const dmUserIds = (dmAssignments || []).map(a => a.user_id);
                let dmRecipients: Array<{email: string; name?: string}> = [];

                if (dmUserIds.length > 0) {
                    // Verify they actually have the District Manager role
                    const {data: dmRole} = await supabase
                        .from("users_roles")
                        .select("id")
                        .eq("name", DM_ROLE_NAME)
                        .maybeSingle();

                    if (dmRole) {
                        const {data: dmPerms} = await supabase
                            .from("users_permissions")
                            .select("user_id")
                            .eq("role_id", dmRole.id)
                            .in("user_id", dmUserIds);

                        const verifiedDmIds = (dmPerms || []).map(p => p.user_id);

                        if (verifiedDmIds.length > 0) {
                            const [{data: dmProfiles}, {data: dmUsers}] = await Promise.all([
                                supabase.from("users_profiles").select("id, first_name, last_name").in("id", verifiedDmIds),
                                supabase.from("users").select("id, email").in("id", verifiedDmIds)
                            ]);

                            const dmEmailMap = new Map((dmUsers || []).map((u: {id: string; email: string}) => [u.id, u.email]));
                            dmRecipients = (dmProfiles || [])
                                .filter((dm: {id: string}) => dmEmailMap.has(dm.id))
                                .map((dm: {id: string; first_name?: string; last_name?: string}) => ({
                                    email: dmEmailMap.get(dm.id)!,
                                    name: [dm.first_name, dm.last_name].filter(Boolean).join(" ") || undefined
                                }));
                        }
                    }
                }

                // 9. Build email from template
                const {subject, html, text} = buildReportSubmittedEmail({
                    submitterName,
                    reportTitle,
                    weekLabel: weekLabel || "",
                    plantCode: submitterProfile.plant_code,
                    regionName: region.region_name || region.region_code,
                    reportFields: Array.isArray(reportFields) ? reportFields : [],
                    frontendUrl: envOrDefault("FRONTEND_URL", DEFAULT_FRONTEND_URL),
                    theme: buildThemeConfig(),
                    logoUrl: envOrDefault("LOGO_URL", DEFAULT_LOGO_URL)
                });

                // 9. CC the district manager(s) and the submitter (dedup handled by sendEmail)
                const ccRecipients = [
                    ...dmRecipients,
                    {email: submitterEmail, name: submitterName}
                ];

                // 10. Fetch and base64-encode the PDF attachment if provided
                const emailAttachments: Array<{content: string; filename: string; disposition: string}> = [];
                if (attachmentUrl && typeof attachmentUrl === "string") {
                    const base64Content = await fetchFileAsBase64(attachmentUrl);
                    if (base64Content) {
                        emailAttachments.push({
                            content: base64Content,
                            filename: "lost-load-writeup.pdf",
                            disposition: "attachment"
                        });
                    }
                }

                // Log intended recipients before debug whitelist filtering
                const intendedRecipients = {
                    to: toRecipients.map(r => ({email: r.email, name: r.name})),
                    cc: ccRecipients.map(r => ({email: r.email, name: r.name}))
                };
                console.log("[notify-report-submitted] Intended recipients:", JSON.stringify(intendedRecipients));

                const result = await sendEmail({
                    subject, html, text,
                    toList: toRecipients,
                    ccList: ccRecipients,
                    attachments: emailAttachments,
                    debugMode
                });

                return jsonResponse({...result, debug: debugMode, regionName: region.region_name, intendedRecipients}, headers);

            } catch (err) {
                console.error("notify-report-submitted failed:", err);
                return errorResponse("Failed to send report notification", headers, 500);
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
