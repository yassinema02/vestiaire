/**
 * AI Proxy Edge Function
 * Proxies Gemini generateContent requests, keeping the API key and usage logging server-side.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://vestiaire.app';

const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COST_TABLE: Record<string, { input: number; output: number }> = {
    'gemini-2.5-flash': { input: 0.10, output: 0.40 },
    'gemini-2.5-flash-image': { input: 0.10, output: 0.40 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
};

function estimateCost(
    model: string,
    tokensInput: number | null,
    tokensOutput: number | null
): number | null {
    const rates = COST_TABLE[model];
    if (!rates || tokensInput == null || tokensOutput == null) return null;
    return (tokensInput * rates.input + tokensOutput * rates.output) / 1_000_000;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Verify authenticated user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const startMs = Date.now();

        // Parse request body
        const body = await req.json();
        const feature = typeof body?.feature === 'string' ? body.feature : 'unknown';
        const requestedModel = typeof body?.model === 'string' ? body.model : 'gemini-2.5-flash';
        const allowedModels = Object.keys(COST_TABLE);
        const model = allowedModels.includes(requestedModel) ? requestedModel : 'gemini-2.5-flash';
        const contents = body?.contents;
        const legacyPrompt = typeof body?.prompt === 'string' ? body.prompt : null;
        const legacyImage = typeof body?.image === 'string' ? body.image : null;

        const normalizedContents = contents ?? (
            legacyPrompt
                ? [{
                    role: 'user',
                    parts: [
                        { text: legacyPrompt },
                        ...(legacyImage
                            ? [{ inlineData: { mimeType: 'image/jpeg', data: legacyImage } }]
                            : []),
                    ],
                }]
                : null
        );

        if (!normalizedContents) {
            return new Response(
                JSON.stringify({ error: 'Missing AI request contents' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const geminiResponse = await fetch(`${geminiUrl}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: normalizedContents }),
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Gemini API error:', geminiResponse.status, errorText);
            supabase
                .from('ai_usage_log')
                .insert({
                    user_id: user.id,
                    feature,
                    model_used: model,
                    tokens_input: null,
                    tokens_output: null,
                    latency_ms: Date.now() - startMs,
                    cost_usd: null,
                    success: false,
                    error_message: `AI service error: ${geminiResponse.status}`,
                })
                .then(() => { });
            return new Response(
                JSON.stringify({ error: `AI service error: ${geminiResponse.status}`, detail: errorText }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const geminiResult = await geminiResponse.json();
        const usage = geminiResult?.usageMetadata;
        const tokensInput = usage?.promptTokenCount ?? null;
        const tokensOutput = usage?.candidatesTokenCount ?? null;
        const text = geminiResult?.candidates?.[0]?.content?.parts?.find((part: Record<string, unknown>) => typeof part?.text === 'string')?.text ?? null;
        const responseBody = {
            text,
            candidates: geminiResult?.candidates ?? [],
            usageMetadata: geminiResult?.usageMetadata ?? null,
        };

        supabase
            .from('ai_usage_log')
            .insert({
                user_id: user.id,
                feature,
                model_used: model,
                tokens_input: tokensInput,
                tokens_output: tokensOutput,
                latency_ms: Date.now() - startMs,
                cost_usd: estimateCost(model, tokensInput, tokensOutput),
                success: true,
                error_message: null,
            })
            .then(() => { });

        return new Response(
            JSON.stringify(responseBody),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        console.error('AI proxy error:', err);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
