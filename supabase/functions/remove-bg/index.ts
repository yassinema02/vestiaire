/**
 * Remove.bg Proxy Edge Function
 * Proxies requests to Remove.bg API, keeping the API key server-side.
 * Verifies the caller is an authenticated Supabase user.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REMOVE_BG_API_KEY = Deno.env.get('REMOVE_BG_API_KEY')!;
const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

Deno.serve(async (req) => {
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

        // Parse request
        const { image_url } = await req.json();
        if (!image_url) {
            return new Response(
                JSON.stringify({ error: 'Missing image_url' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Forward to Remove.bg
        const formData = new FormData();
        formData.append('image_url', image_url);
        formData.append('size', 'auto');
        formData.append('format', 'png');
        formData.append('type', 'product');

        const response = await fetch(REMOVE_BG_URL, {
            method: 'POST',
            headers: { 'X-Api-Key': REMOVE_BG_API_KEY },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Remove.bg API error:', response.status, errorText);
            return new Response(
                JSON.stringify({ error: `Remove.bg error: ${response.status}` }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const buffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);

        return new Response(
            JSON.stringify({ base64 }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        console.error('Remove.bg proxy error:', err);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
