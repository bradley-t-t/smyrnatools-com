// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.55.0";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-4";
const DEFAULT_TEMPERATURE = 0.3;

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {global: {headers: {Authorization: req.headers.get("Authorization") || ""}}}
        );

        const {data: authData, error: authError} = await supabase.auth.getUser();
        if (authError || !authData?.user?.id) return errorResponse("Unauthorized", headers, 401);

        const grokApiKey = Deno.env.get("GROK_API_KEY");
        if (!grokApiKey) return errorResponse("AI service not configured", headers, 503);

        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();

        switch (endpoint) {
            case "generate": {
                const body = await req.json().catch(() => ({}));
                const {systemPrompt, messages, model, temperature} = body;

                if (!systemPrompt || !Array.isArray(messages)) {
                    return errorResponse("systemPrompt and messages are required", headers, 400);
                }

                const response = await fetch(GROK_API_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${grokApiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messages: [{role: "system", content: systemPrompt}, ...messages],
                        model: model || DEFAULT_MODEL,
                        stream: false,
                        temperature: temperature ?? DEFAULT_TEMPERATURE
                    })
                });

                if (response.status === 429) return errorResponse("Rate limited", headers, 429);
                if (!response.ok) {
                    const errorText = await response.text().catch(() => "Unknown error");
                    return errorResponse(errorText, headers, response.status);
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content ?? null;
                return jsonResponse({content}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500, {message: (error as Error).message});
    }
});
