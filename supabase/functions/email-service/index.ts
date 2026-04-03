// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.55.0";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";
// @ts-ignore
import {envOrDefault, buildThemeConfig} from "../_shared/auth-helpers.ts";
// @ts-ignore
import {buildReportSubmittedEmail} from "../../../emails/report-submitted-email.js";
// @ts-ignore
import {buildCommentNotificationEmail} from "../../../emails/comment-notification-email.js";

const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";
const DEFAULT_FROM_NAME = "Smyrna Tools";
const DEFAULT_LOGO_URL = "https://smyrnatools.com/static/media/SmyrnaLogo.d7f873f3da1747602db3.png";
const DEFAULT_FRONTEND_URL = "https://smyrnatools.com";
const GM_ROLE_NAME = "General Manager";
const DM_ROLE_NAME = "District Manager";
const PM_ROLE_NAME = "Plant Manager";
const PM_EQUIP_ROLE_NAME = "Plant Manager & Equipment Manager";

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

/**
 * Fire-and-forget error report to the centralized error-reporting-service.
 * Used to log failures in notify-report-submitted that would otherwise go unnoticed.
 */
async function reportEmailError(reason: string, context: Record<string, unknown> = {}): Promise<void> {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return;

    const endpoint = `${supabaseUrl}/functions/v1/error-reporting-service/report-batch`;
    const contextSummary = Object.entries(context)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ");

    try {
        await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": anonKey,
                "Authorization": `Bearer ${anonKey}`
            },
            body: JSON.stringify({
                errors: [{
                    project: "smyrnatools.com",
                    error_message: `[email-service] notify-report-submitted failed: ${reason}`,
                    source_file: "supabase/functions/email-service/index.ts",
                    component_stack: contextSummary || null,
                    url: "https://smyrnatools.com/internal/email-service"
                }]
            })
        });
    } catch {
        // Best-effort — never let reporting itself cause a failure
    }
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

    // Debug redirect is handled upstream (notify-report-submitted) — no filtering here.

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

            console.log("[notify-report-submitted] START", {userId, reportTitle, hasAttachment: !!attachmentUrl});

            const supabase = createAdminClient();
            const debugMode = debug === true;

            try {
                // 1. Get submitter's profile and email
                const [{data: submitterProfile, error: profileErr}, {data: submitterUser, error: userErr}] = await Promise.all([
                    supabase.from("users_profiles").select("first_name, last_name, plant_code").eq("id", userId).maybeSingle(),
                    supabase.from("users").select("email").eq("id", userId).maybeSingle()
                ]);

                console.log("[notify-report-submitted] Step 1 - submitter lookup", {
                    plantCode: submitterProfile?.plant_code ?? null,
                    email: submitterUser?.email ?? null,
                    profileErr: profileErr?.message ?? null,
                    userErr: userErr?.message ?? null
                });

                if (!submitterProfile?.plant_code || !submitterUser?.email) {
                    console.error("[notify-report-submitted] STOP: submitter profile or plant missing");
                    await reportEmailError("Submitter profile or plant not found", {userId, reportTitle, profileErr: profileErr?.message, userErr: userErr?.message});
                    return jsonResponse({success: false, sent: false, reason: "Submitter profile or plant not found"}, headers);
                }

                const submitterName = [submitterProfile.first_name, submitterProfile.last_name].filter(Boolean).join(" ") || "A team member";
                const submitterEmail = submitterUser.email;

                // 2. Resolve submitter's plant → region
                const {data: regionLink, error: regionLinkErr} = await supabase
                    .from("regions_plants")
                    .select("region_id")
                    .eq("plant_code", submitterProfile.plant_code)
                    .limit(1)
                    .maybeSingle();

                console.log("[notify-report-submitted] Step 2 - region link lookup", {
                    plantCode: submitterProfile.plant_code,
                    regionId: regionLink?.region_id ?? null,
                    err: regionLinkErr?.message ?? null
                });

                if (!regionLink?.region_id) {
                    console.error("[notify-report-submitted] STOP: plant not linked to any region");
                    await reportEmailError("No region found for submitter's plant", {userId, plantCode: submitterProfile.plant_code, regionLinkErr: regionLinkErr?.message});
                    return jsonResponse({success: false, sent: false, reason: "No region found for submitter's plant"}, headers);
                }

                const {data: region, error: regionErr} = await supabase
                    .from("regions")
                    .select("region_code, region_name")
                    .eq("id", regionLink.region_id)
                    .maybeSingle();

                console.log("[notify-report-submitted] Step 2b - region record lookup", {
                    regionName: region?.region_name ?? null,
                    err: regionErr?.message ?? null
                });

                if (!region) {
                    console.error("[notify-report-submitted] STOP: region record not found");
                    await reportEmailError("Region record not found", {userId, regionId: regionLink.region_id, regionErr: regionErr?.message});
                    return jsonResponse({success: false, sent: false, reason: "Region not found"}, headers);
                }

                // 3. Get all plant codes in this region
                const {data: regionPlants, error: regionPlantsErr} = await supabase
                    .from("regions_plants")
                    .select("plant_code")
                    .eq("region_id", regionLink.region_id);

                const regionPlantCodes = new Set((regionPlants || []).map(rp => rp.plant_code));
                console.log("[notify-report-submitted] Step 3 - region plant codes", {
                    count: regionPlantCodes.size,
                    codes: [...regionPlantCodes],
                    err: regionPlantsErr?.message ?? null
                });

                // 4. Find the General Manager role
                const {data: gmRole, error: gmRoleErr} = await supabase
                    .from("users_roles")
                    .select("id")
                    .eq("name", GM_ROLE_NAME)
                    .maybeSingle();

                console.log("[notify-report-submitted] Step 4 - GM role lookup", {
                    gmRoleId: gmRole?.id ?? null,
                    err: gmRoleErr?.message ?? null
                });

                if (!gmRole) {
                    console.error("[notify-report-submitted] STOP: General Manager role not found in users_roles");
                    await reportEmailError("General Manager role not found in users_roles", {userId, gmRoleErr: gmRoleErr?.message});
                    return jsonResponse({success: false, sent: false, reason: "General Manager role not found"}, headers);
                }

                // 5. Get all users with the GM role
                const {data: gmPermissions, error: gmPermsErr} = await supabase
                    .from("users_permissions")
                    .select("user_id")
                    .eq("role_id", gmRole.id);

                const gmUserIds = (gmPermissions || []).map(p => p.user_id);
                console.log("[notify-report-submitted] Step 5 - users with GM role", {
                    count: gmUserIds.length,
                    userIds: gmUserIds,
                    err: gmPermsErr?.message ?? null
                });

                if (gmUserIds.length === 0) {
                    console.error("[notify-report-submitted] STOP: no users have GM role");
                    await reportEmailError("No users assigned to General Manager role", {userId, gmRoleId: gmRole.id});
                    return jsonResponse({success: false, sent: false, reason: "No General Managers found"}, headers);
                }

                // 6. Filter GMs to those whose plant is in the submitter's region
                const {data: gmProfiles, error: gmProfilesErr} = await supabase
                    .from("users_profiles")
                    .select("id, first_name, last_name, plant_code")
                    .in("id", gmUserIds);

                console.log("[notify-report-submitted] Step 6 - GM profiles", {
                    total: (gmProfiles || []).length,
                    profiles: (gmProfiles || []).map(gm => ({id: gm.id, plant_code: gm.plant_code, inRegion: gm.plant_code ? regionPlantCodes.has(gm.plant_code) : false})),
                    err: gmProfilesErr?.message ?? null
                });

                const regionGmIds = (gmProfiles || [])
                    .filter(gm => gm.plant_code && regionPlantCodes.has(gm.plant_code))
                    .map(gm => gm.id);

                console.log("[notify-report-submitted] Step 6b - GMs in submitter's region", {count: regionGmIds.length, ids: regionGmIds});

                if (regionGmIds.length === 0) {
                    console.error("[notify-report-submitted] STOP: no GMs have a plant_code that matches the submitter's region");
                    await reportEmailError("No General Managers have a plant_code in submitter's region", {
                        userId,
                        submitterPlant: submitterProfile.plant_code,
                        regionId: regionLink.region_id,
                        regionPlantCodes: [...regionPlantCodes],
                        gmProfiles: (gmProfiles || []).map(gm => ({id: gm.id, plant_code: gm.plant_code}))
                    });
                    return jsonResponse({success: false, sent: false, reason: "No General Managers in submitter's region"}, headers);
                }

                // 7. Get GM emails
                const {data: gmUsers, error: gmUsersErr} = await supabase
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

                console.log("[notify-report-submitted] Step 7 - GM emails resolved", {
                    toCount: toRecipients.length,
                    toEmails: toRecipients.map(r => r.email),
                    err: gmUsersErr?.message ?? null
                });

                // 8. Find District Managers assigned to the submitter's plant.
                // district_manager_plants is the sole source of truth — no role cross-check needed.
                const {data: dmAssignments, error: dmAssignErr} = await supabase
                    .from("district_manager_plants")
                    .select("user_id")
                    .eq("plant_code", submitterProfile.plant_code);

                const dmUserIds = (dmAssignments || []).map((a: {user_id: string}) => a.user_id);
                console.log("[notify-report-submitted] Step 8 - DM assignments for plant", {
                    plant: submitterProfile.plant_code,
                    dmUserIds,
                    err: dmAssignErr?.message ?? null
                });

                let dmRecipients: Array<{email: string; name?: string}> = [];

                if (dmUserIds.length > 0) {
                    const [{data: dmProfiles, error: dmProfErr}, {data: dmUsers, error: dmUsersErr}] = await Promise.all([
                        supabase.from("users_profiles").select("id, first_name, last_name").in("id", dmUserIds),
                        supabase.from("users").select("id, email").in("id", dmUserIds)
                    ]);

                    const dmEmailMap = new Map((dmUsers || []).map((u: {id: string; email: string}) => [u.id, u.email]));
                    dmRecipients = (dmProfiles || [])
                        .filter((dm: {id: string}) => dmEmailMap.has(dm.id))
                        .map((dm: {id: string; first_name?: string; last_name?: string}) => ({
                            email: dmEmailMap.get(dm.id)!,
                            name: [dm.first_name, dm.last_name].filter(Boolean).join(" ") || undefined
                        }));

                    console.log("[notify-report-submitted] Step 8b - DM recipients resolved", {
                        dmEmails: dmRecipients.map(r => r.email),
                        dmProfErr: dmProfErr?.message ?? null,
                        dmUsersErr: dmUsersErr?.message ?? null
                    });
                } else {
                    console.log("[notify-report-submitted] Step 8 - no DMs assigned to this plant, skipping");
                }

                // 10. CC the district manager(s) and the submitter
                const ccRecipients = [
                    ...dmRecipients,
                    {email: submitterEmail, name: submitterName}
                ];

                console.log("[notify-report-submitted] Step 10 - final recipient lists", {
                    to: toRecipients.map(r => r.email),
                    cc: ccRecipients.map(r => r.email),
                    debugMode
                });

                // 11. In debug mode, redirect to the test address and capture real recipients for email annotation
                let finalToList = toRecipients;
                let finalCcList = ccRecipients;
                let debugInfo: {realTo: string; realCc: string} | undefined;

                if (debugMode) {
                    const debugEmail = Deno.env.get("EMAIL_DEBUG_WHITELIST")?.split(",")[0]?.trim();
                    if (!debugEmail) {
                        return jsonResponse({success: false, sent: false, reason: "EMAIL_DEBUG_WHITELIST not set"}, headers);
                    }
                    debugInfo = {
                        realTo: toRecipients.map(r => r.email).join(", "),
                        realCc: ccRecipients.map(r => r.email).join(", ")
                    };
                    finalToList = [{email: debugEmail}];
                    finalCcList = [];
                }

                // 9. Build email from template (after debug redirect so debugInfo is available)
                const {subject, html, text} = buildReportSubmittedEmail({
                    submitterName,
                    reportTitle,
                    weekLabel: weekLabel || "",
                    plantCode: submitterProfile.plant_code,
                    regionName: region.region_name || region.region_code,
                    reportFields: Array.isArray(reportFields) ? reportFields : [],
                    frontendUrl: envOrDefault("FRONTEND_URL", DEFAULT_FRONTEND_URL),
                    theme: buildThemeConfig(),
                    logoUrl: envOrDefault("LOGO_URL", DEFAULT_LOGO_URL),
                    debugInfo
                });

                // 12. Fetch and base64-encode the PDF attachment if provided
                const emailAttachments: Array<{content: string; filename: string; disposition: string}> = [];
                if (attachmentUrl && typeof attachmentUrl === "string") {
                    console.log("[notify-report-submitted] Step 12 - fetching PDF attachment", {attachmentUrl});
                    const base64Content = await fetchFileAsBase64(attachmentUrl);
                    if (base64Content) {
                        emailAttachments.push({content: base64Content, filename: "lost-load-writeup.pdf", disposition: "attachment"});
                        console.log("[notify-report-submitted] Step 12 - PDF attachment encoded successfully");
                    } else {
                        console.warn("[notify-report-submitted] Step 12 - PDF fetch returned null, sending without attachment");
                    }
                }

                console.log("[notify-report-submitted] Step 13 - calling sendEmail", {debugMode, finalTo: finalToList.map(r => r.email)});
                const result = await sendEmail({
                    subject, html, text,
                    toList: finalToList,
                    ccList: finalCcList,
                    attachments: emailAttachments
                });

                console.log("[notify-report-submitted] DONE", result);
                if (!result.success) {
                    await reportEmailError(`sendEmail returned failure: ${result.reason ?? "unknown"}`, {userId, toCount: toRecipients.length, debugMode});
                }
                return jsonResponse({
                    ...result,
                    debug: debugMode,
                    regionName: region.region_name,
                    intendedRecipients: toRecipients.length,
                    ...(debugMode && {
                        intendedTo: toRecipients.map(r => r.email),
                        intendedCc: ccRecipients.map(r => r.email)
                    })
                }, headers);

            } catch (err) {
                console.error("[notify-report-submitted] UNHANDLED ERROR:", err);
                await reportEmailError(`Unhandled exception: ${(err as Error)?.message ?? String(err)}`, {userId, reportTitle});
                return errorResponse("Failed to send report notification", headers, 500);
            }
        }

        /**
         * POST /email-service/notify-comment-added
         *
         * Notifies Plant Managers and District Managers when a comment is added
         * to an asset at their plant. Excludes the commenter and users who
         * opted out via accept_comment_emails preference.
         *
         * ONLY sends to Plant Managers and District Managers. No other roles.
         */
        case "notify-comment-added": {
            const body = await req.json().catch(() => null);
            if (!body) return errorResponse("Invalid request body", headers, 400);

            const {commenterId, commenterName, commentText, assetType, assetNumber, plantCode, debug} = body;
            if (!commenterId || !plantCode || !commentText) {
                return jsonResponse({success: false, sent: false, reason: "Missing required fields"}, headers);
            }

            const supabase = createAdminClient();
            const debugMode = debug === true;

            try {
                // 1. Find Plant Manager role IDs
                const {data: pmRoles} = await supabase
                    .from("users_roles")
                    .select("id")
                    .in("name", [PM_ROLE_NAME, PM_EQUIP_ROLE_NAME]);

                const pmRoleIds = (pmRoles || []).map((r: {id: string}) => r.id);

                // 2. Find District Manager role ID
                const {data: dmRole} = await supabase
                    .from("users_roles")
                    .select("id")
                    .eq("name", DM_ROLE_NAME)
                    .maybeSingle();

                // 3. Get Plant Managers for this plant
                let pmRecipients: Array<{email: string; name?: string}> = [];
                if (pmRoleIds.length > 0) {
                    // Get users with PM roles
                    const {data: pmPerms} = await supabase
                        .from("users_permissions")
                        .select("user_id")
                        .in("role_id", pmRoleIds);
                    const pmUserIds = (pmPerms || []).map((p: {user_id: string}) => p.user_id);

                    if (pmUserIds.length > 0) {
                        // Filter to those assigned to this plant (primary or additional)
                        const {data: pmProfiles} = await supabase
                            .from("users_profiles")
                            .select("id, first_name, last_name, plant_code, additional_assigned_plants")
                            .in("id", pmUserIds);

                        const matchingPmIds = (pmProfiles || [])
                            .filter((p: any) => {
                                if (p.id === commenterId) return false;
                                if (p.plant_code === plantCode) return true;
                                const additional = Array.isArray(p.additional_assigned_plants) ? p.additional_assigned_plants : [];
                                return additional.includes(plantCode);
                            })
                            .map((p: any) => p.id);

                        if (matchingPmIds.length > 0) {
                            // Check preferences — exclude those who opted out
                            const {data: prefs} = await supabase
                                .from("users_preferences")
                                .select("user_id, accept_comment_emails")
                                .in("user_id", matchingPmIds);
                            const optedOut = new Set(
                                (prefs || []).filter((p: any) => p.accept_comment_emails === false).map((p: any) => p.user_id)
                            );
                            const eligiblePmIds = matchingPmIds.filter((id: string) => !optedOut.has(id));

                            if (eligiblePmIds.length > 0) {
                                const [{data: profiles}, {data: users}] = await Promise.all([
                                    supabase.from("users_profiles").select("id, first_name, last_name").in("id", eligiblePmIds),
                                    supabase.from("users").select("id, email").in("id", eligiblePmIds)
                                ]);
                                const emailMap = new Map((users || []).map((u: any) => [u.id, u.email]));
                                pmRecipients = (profiles || [])
                                    .filter((p: any) => emailMap.has(p.id))
                                    .map((p: any) => ({
                                        email: emailMap.get(p.id)!,
                                        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || undefined
                                    }));
                            }
                        }
                    }
                }

                // 4. Get District Managers for this plant
                let dmRecipients: Array<{email: string; name?: string}> = [];
                if (dmRole) {
                    const {data: dmAssignments} = await supabase
                        .from("district_manager_plants")
                        .select("user_id")
                        .eq("plant_code", plantCode);

                    const dmUserIds = (dmAssignments || [])
                        .map((a: any) => a.user_id)
                        .filter((id: string) => id !== commenterId);

                    if (dmUserIds.length > 0) {
                        // Verify DM role
                        const {data: dmPerms} = await supabase
                            .from("users_permissions")
                            .select("user_id")
                            .eq("role_id", dmRole.id)
                            .in("user_id", dmUserIds);
                        const verifiedDmIds = (dmPerms || []).map((p: any) => p.user_id);

                        if (verifiedDmIds.length > 0) {
                            // Check preferences
                            const {data: prefs} = await supabase
                                .from("users_preferences")
                                .select("user_id, accept_comment_emails")
                                .in("user_id", verifiedDmIds);
                            const optedOut = new Set(
                                (prefs || []).filter((p: any) => p.accept_comment_emails === false).map((p: any) => p.user_id)
                            );
                            const eligibleDmIds = verifiedDmIds.filter((id: string) => !optedOut.has(id));

                            if (eligibleDmIds.length > 0) {
                                const [{data: profiles}, {data: users}] = await Promise.all([
                                    supabase.from("users_profiles").select("id, first_name, last_name").in("id", eligibleDmIds),
                                    supabase.from("users").select("id, email").in("id", eligibleDmIds)
                                ]);
                                const emailMap = new Map((users || []).map((u: any) => [u.id, u.email]));
                                dmRecipients = (profiles || [])
                                    .filter((p: any) => emailMap.has(p.id))
                                    .map((p: any) => ({
                                        email: emailMap.get(p.id)!,
                                        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || undefined
                                    }));
                            }
                        }
                    }
                }

                // 5. Combine and deduplicate
                const allRecipients = [...pmRecipients, ...dmRecipients];
                const seen = new Set<string>();
                const uniqueRecipients = allRecipients.filter(r => {
                    const key = r.email.toLowerCase();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                if (uniqueRecipients.length === 0) {
                    return jsonResponse({success: true, sent: false, reason: "No eligible recipients"}, headers);
                }

                // 6. Build and send email
                const {subject, html, text} = buildCommentNotificationEmail({
                    commenterName: commenterName || "A team member",
                    commentText,
                    assetType: assetType || "Asset",
                    assetNumber: assetNumber || "",
                    plantCode,
                    frontendUrl: envOrDefault("FRONTEND_URL", DEFAULT_FRONTEND_URL),
                    theme: buildThemeConfig(),
                    logoUrl: envOrDefault("LOGO_URL", DEFAULT_LOGO_URL)
                });

                console.log('[email-service] Sending comment-added notifications', { recipientCount: uniqueRecipients.length });

                const result = await sendEmail({
                    subject, html, text,
                    toList: uniqueRecipients,
                    debugMode
                });

                return jsonResponse({...result, debug: debugMode, recipientCount: uniqueRecipients.length}, headers);

            } catch (err) {
                console.error("notify-comment-added failed:", err);
                return errorResponse("Failed to send comment notification", headers, 500);
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
