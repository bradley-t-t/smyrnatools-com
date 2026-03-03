// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions} from "../_shared/cors.ts";

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const corsHeaders = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {global: {headers: {Authorization: req.headers.get("Authorization") || ""}}}
        );

        switch (endpoint) {
            case "get": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {userId} = body || {};
                if (typeof userId !== "string" || !userId) return new Response(JSON.stringify({error: "User ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {data, error} = await supabase
                    .from("users_preferences")
                    .select("*")
                    .eq("user_id", userId)
                    .maybeSingle();
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? null}), {headers: corsHeaders});
            }
            case "save-mixer-filters": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {userId, filters} = body || {};
                if (typeof userId !== "string" || !userId) return new Response(JSON.stringify({error: "User ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (filters == null) return new Response(JSON.stringify({error: "Filters are required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const now = new Date().toISOString();
                const {data: existing, error: selectError} = await supabase
                    .from("users_preferences")
                    .select("id")
                    .eq("user_id", userId);
                if (selectError) return new Response(JSON.stringify({error: selectError.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (existing && existing.length > 0) {
                    const {error} = await supabase
                        .from("users_preferences")
                        .update({mixer_filters: filters, updated_at: now})
                        .eq("user_id", userId);
                    if (error) return new Response(JSON.stringify({error: error.message}), {
                        status: 400,
                        headers: corsHeaders
                    });
                } else {
                    const {error} = await supabase
                        .from("users_preferences")
                        .insert({user_id: userId, mixer_filters: filters, created_at: now, updated_at: now});
                    if (error) return new Response(JSON.stringify({error: error.message}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            case "save-last-viewed-filters": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {userId, filters} = body || {};
                if (typeof userId !== "string" || !userId) return new Response(JSON.stringify({error: "User ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (filters == null) return new Response(JSON.stringify({error: "Filters are required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const now = new Date().toISOString();
                const {error} = await supabase
                    .from("users_preferences")
                    .upsert({
                        user_id: userId,
                        last_viewed_filters: filters,
                        updated_at: now,
                        created_at: now
                    }, {onConflict: "user_id"});
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            default:
                return new Response(JSON.stringify({error: "Invalid endpoint", path: url.pathname}), {
                    status: 404,
                    headers: corsHeaders
                });
        }
    } catch (error) {
        return new Response(JSON.stringify({
            error: "Internal server error",
            message: (error as Error).message
        }), {status: 500, headers: corsHeaders});
    }
});

