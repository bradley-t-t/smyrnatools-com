// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const DOCUMENTS_TABLE = "documents";

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

async function requireAuthenticated(supabase: any, headers: any): Promise<{err: Response | null; userId: string | null}> {
    const {data, error} = await supabase.auth.getUser();
    if (error || !data?.user?.id) return {err: errorResponse("Unauthorized", headers, 401), userId: null};
    return {err: null, userId: data.user.id};
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {global: {headers: {Authorization: req.headers.get("Authorization") || ""}}});

        switch (endpoint) {
            case "insert-record": {
                const {err, userId} = await requireAuthenticated(supabase, headers);
                if (err) return err;
                const body = await parseBody(req);
                const {record} = body;
                if (!record) return errorResponse("Record is required", headers, 400);
                const safeRecord = {...record, uploaded_by: userId};
                const {data, error} = await supabase.from(DOCUMENTS_TABLE).insert(safeRecord).select().single();
                if (error) return errorResponse("Failed to insert document record", headers, 500);
                return jsonResponse(data, headers);
            }
            case "delete": {
                const {err} = await requireAuthenticated(supabase, headers);
                if (err) return err;
                const body = await parseBody(req);
                const docId = typeof body?.id === "string" ? body.id : null;
                if (!docId) return errorResponse("Document ID is required", headers, 400);
                const {error} = await supabase.from(DOCUMENTS_TABLE).delete().eq("id", docId);
                if (error) return errorResponse("Failed to delete document", headers, 500);
                return jsonResponse(true, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
