// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const FORMS_TABLE = "maintenance_forms";
const FIELDS_TABLE = "maintenance_form_fields";
const SUBMISSIONS_TABLE = "maintenance_submissions";
const RESPONSES_TABLE = "maintenance_submission_responses";
const LOG_EQUIPMENT_TABLE = "maintenance_log_equipment";
const LOG_ENTRIES_TABLE = "maintenance_log_entries";

function createSupabaseClient(auth: string) {
    return createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {global: {headers: {Authorization: auth}}}
    );
}

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

function nowISO(): string {
    return new Date().toISOString();
}

function buildFieldRows(fields: any[], formId: string): any[] {
    const timestamp = nowISO();
    return fields.map((field: any, index: number) => ({
        created_at: timestamp,
        description: field.description || null,
        field_order: index,
        field_type: field.field_type,
        form_id: formId,
        image_required: field.image_required || false,
        is_required: field.is_required || false,
        label: field.label,
        options: field.options || null,
        updated_at: timestamp
    }));
}

function buildResponseRows(responses: any[], submissionId: string): any[] {
    const timestamp = nowISO();
    return responses.map((r: any) => ({
        checklist_comments: r.checklist_comments || null,
        checklist_images: r.checklist_images || null,
        checklist_values: r.checklist_values || null,
        created_at: timestamp,
        field_id: r.field_id,
        image_url: r.image_url || null,
        response_value: r.response_value || null,
        submission_id: submissionId,
        updated_at: timestamp
    }));
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const supabase = createSupabaseClient(req.headers.get("Authorization") || "");

        switch (endpoint) {
            // ── Form mutations ─────────────────────────────────────
            case "create-form": {
                const body = await parseBody(req);
                const userId = body?.userId;
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const {fields, plant_codes, ...formInfo} = body.formData || {};
                const timestamp = nowISO();
                const {data: form, error: formError} = await supabase.from(FORMS_TABLE)
                    .insert({...formInfo, created_at: timestamp, created_by: userId, plant_codes: plant_codes || [], updated_at: timestamp})
                    .select().single();
                if (formError) return errorResponse("Failed to create form", headers, 400);
                if (fields?.length) {
                    const {error: fieldsError} = await supabase.from(FIELDS_TABLE).insert(buildFieldRows(fields, form.id));
                    if (fieldsError) return errorResponse("Failed to insert fields", headers, 400);
                }
                const {data: fullForm} = await supabase.from(FORMS_TABLE)
                    .select("*, maintenance_form_fields(*)").eq("id", form.id).single();
                return jsonResponse({data: fullForm, success: true}, headers);
            }
            case "update-form": {
                const body = await parseBody(req);
                const formId = body?.formId;
                if (!formId) return errorResponse("Form ID is required", headers, 400);
                const {fields, plant_codes, ...formInfo} = body.formData || {};
                const {error: formError} = await supabase.from(FORMS_TABLE)
                    .update({...formInfo, plant_codes: plant_codes || [], updated_at: nowISO()}).eq("id", formId);
                if (formError) return errorResponse("Failed to update form", headers, 400);
                if (fields) {
                    await supabase.from(FIELDS_TABLE).delete().eq("form_id", formId);
                    if (fields.length) {
                        const {error: fieldsError} = await supabase.from(FIELDS_TABLE).insert(buildFieldRows(fields, formId));
                        if (fieldsError) return errorResponse("Failed to insert fields", headers, 400);
                    }
                }
                const {data: fullForm} = await supabase.from(FORMS_TABLE)
                    .select("*, maintenance_form_fields(*)").eq("id", formId).single();
                return jsonResponse({data: fullForm, success: true}, headers);
            }
            case "delete-form": {
                const body = await parseBody(req);
                const formId = body?.formId;
                if (!formId) return errorResponse("Form ID is required", headers, 400);
                const {error} = await supabase.from(FORMS_TABLE)
                    .update({is_active: false, updated_at: nowISO()}).eq("id", formId);
                if (error) return errorResponse("Failed to delete form", headers, 400);
                return jsonResponse({success: true}, headers);
            }

            // ── Submission mutations ───────────────────────────────
            case "submit-form": {
                const body = await parseBody(req);
                const {formId, dueDate, responses, plantCode, userId} = body;
                if (!formId || !dueDate || !userId) return errorResponse("Form ID, due date, and user ID are required", headers, 400);
                // Clean up existing draft
                const {data: existingDraft} = await supabase.from(SUBMISSIONS_TABLE)
                    .select("id").eq("form_id", formId).eq("due_date", dueDate)
                    .eq("submitted_by", userId).eq("status", "draft").maybeSingle();
                if (existingDraft) {
                    await supabase.from(RESPONSES_TABLE).delete().eq("submission_id", existingDraft.id);
                    await supabase.from(SUBMISSIONS_TABLE).delete().eq("id", existingDraft.id);
                }
                const timestamp = nowISO();
                const {data: submission, error: subError} = await supabase.from(SUBMISSIONS_TABLE)
                    .insert({
                        created_at: timestamp, due_date: dueDate, form_id: formId,
                        plant_code: plantCode || null, status: "submitted",
                        submitted_at: timestamp, submitted_by: userId, updated_at: timestamp
                    }).select().single();
                if (subError) return errorResponse("Failed to create submission", headers, 400);
                if (responses?.length) {
                    const {error: respError} = await supabase.from(RESPONSES_TABLE).insert(buildResponseRows(responses, submission.id));
                    if (respError) return errorResponse("Failed to insert responses", headers, 400);
                }
                return jsonResponse({data: submission, success: true}, headers);
            }
            case "update-submission": {
                const body = await parseBody(req);
                const {submissionId, responses, userId} = body;
                if (!submissionId || !userId) return errorResponse("Submission ID and user ID are required", headers, 400);
                const {error: updateError} = await supabase.from(SUBMISSIONS_TABLE)
                    .update({updated_at: nowISO()}).eq("id", submissionId).eq("submitted_by", userId);
                if (updateError) return errorResponse("Failed to update submission", headers, 400);
                await supabase.from(RESPONSES_TABLE).delete().eq("submission_id", submissionId);
                if (responses?.length) {
                    const {error: respError} = await supabase.from(RESPONSES_TABLE).insert(buildResponseRows(responses, submissionId));
                    if (respError) return errorResponse("Failed to insert responses", headers, 400);
                }
                return jsonResponse({success: true}, headers);
            }
            case "save-draft": {
                const body = await parseBody(req);
                const {formId, dueDate, responses, plantCode, userId, existingSubmissionId} = body;
                if (!formId || !dueDate || !userId) return errorResponse("Form ID, due date, and user ID are required", headers, 400);
                let submissionId = existingSubmissionId || null;
                if (!submissionId) {
                    const {data: existing} = await supabase.from(SUBMISSIONS_TABLE)
                        .select("id").eq("form_id", formId).eq("due_date", dueDate)
                        .eq("submitted_by", userId).eq("status", "draft").maybeSingle();
                    submissionId = existing?.id ?? null;
                }
                if (submissionId) {
                    const {error: updateError} = await supabase.from(SUBMISSIONS_TABLE)
                        .update({updated_at: nowISO()}).eq("id", submissionId);
                    if (updateError) return errorResponse("Failed to update draft", headers, 400);
                    await supabase.from(RESPONSES_TABLE).delete().eq("submission_id", submissionId);
                } else {
                    const timestamp = nowISO();
                    const {data: submission, error: subError} = await supabase.from(SUBMISSIONS_TABLE)
                        .insert({
                            created_at: timestamp, due_date: dueDate, form_id: formId,
                            plant_code: plantCode || null, status: "draft",
                            submitted_by: userId, updated_at: timestamp
                        }).select().single();
                    if (subError) return errorResponse("Failed to create draft", headers, 400);
                    submissionId = submission.id;
                }
                if (responses?.length) {
                    const {error: respError} = await supabase.from(RESPONSES_TABLE).insert(buildResponseRows(responses, submissionId));
                    if (respError) return errorResponse("Failed to insert responses", headers, 400);
                }
                return jsonResponse({submissionId, success: true}, headers);
            }
            case "review-submission": {
                const body = await parseBody(req);
                const {submissionId, status, notes, userId} = body;
                if (!submissionId || !status || !userId) return errorResponse("Submission ID, status, and user ID are required", headers, 400);
                const now = nowISO();
                const {data, error} = await supabase.from(SUBMISSIONS_TABLE)
                    .update({review_notes: notes || "", reviewed_at: now, reviewed_by: userId, status, updated_at: now})
                    .eq("id", submissionId).select().single();
                if (error) return errorResponse("Failed to review submission", headers, 400);
                return jsonResponse({data, success: true}, headers);
            }

            // ── Maintenance log equipment mutations ────────────────
            case "create-equipment": {
                const body = await parseBody(req);
                const {equipment, userId} = body;
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const {data, error} = await supabase.from(LOG_EQUIPMENT_TABLE)
                    .insert({...equipment, created_by: userId}).select().single();
                if (error) return errorResponse("Failed to create equipment", headers, 400);
                return jsonResponse({data, success: true}, headers);
            }
            case "delete-equipment": {
                const body = await parseBody(req);
                const id = body?.id;
                if (!id) return errorResponse("Equipment ID is required", headers, 400);
                const {error: entriesError} = await supabase.from(LOG_ENTRIES_TABLE).delete().eq("equipment_id", id);
                if (entriesError) return errorResponse("Failed to delete entries", headers, 400);
                const {error} = await supabase.from(LOG_EQUIPMENT_TABLE).delete().eq("id", id);
                if (error) return errorResponse("Failed to delete equipment", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "update-equipment": {
                const body = await parseBody(req);
                const {id, updates} = body;
                if (!id) return errorResponse("Equipment ID is required", headers, 400);
                const {data, error} = await supabase.from(LOG_EQUIPMENT_TABLE)
                    .update({...updates, updated_at: nowISO()}).eq("id", id).select().single();
                if (error) return errorResponse("Failed to update equipment", headers, 400);
                return jsonResponse({data, success: true}, headers);
            }
            case "create-entry": {
                const body = await parseBody(req);
                const {entry, userId, userName} = body;
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const {data, error} = await supabase.from(LOG_ENTRIES_TABLE)
                    .insert({
                        ...entry, performed_by: userId,
                        performed_by_name: entry?.performed_by_name || userName || `User ${userId.slice(0, 8)}`
                    }).select().single();
                if (error) return errorResponse("Failed to create entry", headers, 400);
                return jsonResponse({data, success: true}, headers);
            }
            case "update-entry": {
                const body = await parseBody(req);
                const {id, updates} = body;
                if (!id) return errorResponse("Entry ID is required", headers, 400);
                const {data, error} = await supabase.from(LOG_ENTRIES_TABLE)
                    .update({...updates, updated_at: nowISO()}).eq("id", id).select().single();
                if (error) return errorResponse("Failed to update entry", headers, 400);
                return jsonResponse({data, success: true}, headers);
            }

            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
