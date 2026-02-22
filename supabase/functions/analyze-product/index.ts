/**
 * Analyze Product Edge Function
 * Accepts a product image URL, calls Gemini to extract product details.
 * Story 8.1: Screenshot Product Analysis
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate that a URL is safe to fetch (no SSRF).
 */
function isUrlSafe(urlStr: string): { safe: boolean; reason?: string } {
    let parsed: URL;
    try {
        parsed = new URL(urlStr);
    } catch {
        return { safe: false, reason: 'Invalid URL' };
    }

    if (parsed.protocol !== 'https:') {
        return { safe: false, reason: 'Only HTTPS URLs are allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
        return { safe: false, reason: 'Localhost URLs are not allowed' };
    }

    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
        const [, a, b] = ipv4Match.map(Number);
        if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 169) {
            return { safe: false, reason: 'Private/internal IPs are not allowed' };
        }
        if (a === 0 || a >= 224) {
            return { safe: false, reason: 'Reserved IP range' };
        }
    }

    if (hostname === '169.254.169.254' || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
        return { safe: false, reason: 'Metadata/internal endpoints are not allowed' };
    }

    return { safe: true };
}

const ANALYSIS_PROMPT = `You are a fashion product analyst. Analyze this product image and extract detailed information.

Return ONLY valid JSON in this exact format, no other text:
{
  "product_name": "Short descriptive name of the product",
  "product_brand": "Brand name if visible, or null",
  "category": "One of: tops, bottoms, dresses, outerwear, shoes, accessories",
  "color": "Primary color name (e.g. Black, Navy, Red)",
  "secondary_colors": ["Array of other colors if multi-colored, empty if solid"],
  "style": "One of: casual, formal, smart-casual, sporty, bohemian, streetwear, classic, minimalist",
  "material": "Best guess of material (e.g. cotton, denim, leather, polyester, silk, wool) or null",
  "pattern": "One of: solid, striped, plaid, floral, polka-dot, checkered, geometric, abstract, animal-print, camo, tie-dye",
  "season": ["Array of suitable seasons: spring, summer, autumn, winter"],
  "formality": 5,
  "confidence": 0.9,
  "items_detected": 1
}

Rules:
- "formality" is 1-10 where 1=very casual, 10=black-tie formal
- "confidence" is 0.0-1.0 for how confident you are in the analysis
- "items_detected" is how many distinct clothing items you see in the image
- If you detect multiple items, analyze the most prominent one
- Focus on the PRODUCT, not the model wearing it or background
- If the image is not a clothing/fashion item, set confidence to 0 and return reasonable defaults`;

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

        // Parse request body
        const body = await req.json();
        const { image_url, image_base64 } = body;

        if (!image_url && !image_base64) {
            return new Response(
                JSON.stringify({ error: 'Missing image_url or image_base64' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Build image part for Gemini
        let imageData: string;
        let mimeType = 'image/jpeg';

        if (image_base64) {
            // Enforce size limit on base64 input
            if (image_base64.length > MAX_IMAGE_SIZE * 1.37) { // base64 overhead ~37%
                return new Response(
                    JSON.stringify({ error: 'Image too large (max 10MB)' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            imageData = image_base64;
        } else {
            // Validate URL to prevent SSRF
            const urlCheck = isUrlSafe(image_url);
            if (!urlCheck.safe) {
                return new Response(
                    JSON.stringify({ error: urlCheck.reason }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Fetch image from URL with timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const imageResponse = await fetch(image_url, {
                signal: controller.signal,
                redirect: 'error', // Prevent redirect-based SSRF
            });
            clearTimeout(timeout);

            if (!imageResponse.ok) {
                return new Response(
                    JSON.stringify({ error: 'Failed to fetch image from URL' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Validate content type is an image
            const contentType = imageResponse.headers.get('content-type');
            if (contentType && !contentType.startsWith('image/')) {
                return new Response(
                    JSON.stringify({ error: 'URL does not point to an image' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            if (contentType) mimeType = contentType;

            const imageBuffer = await imageResponse.arrayBuffer();

            // Enforce size limit
            if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
                return new Response(
                    JSON.stringify({ error: 'Image too large (max 10MB)' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Convert to base64
            const bytes = new Uint8Array(imageBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            imageData = btoa(binary);
        }

        // Call Gemini API with timeout
        const geminiController = new AbortController();
        const geminiTimeout = setTimeout(() => geminiController.abort(), 30000);

        const geminiResponse = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: ANALYSIS_PROMPT },
                        { inlineData: { mimeType, data: imageData } },
                    ],
                }],
            }),
            signal: geminiController.signal,
        });
        clearTimeout(geminiTimeout);

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Gemini API error:', geminiResponse.status, errorText);
            return new Response(
                JSON.stringify({ error: `AI service error: ${geminiResponse.status}` }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const geminiResult = await geminiResponse.json();
        const text = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return new Response(
                JSON.stringify({ error: 'No response from AI model' }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return new Response(
                JSON.stringify({ error: 'Failed to parse AI response' }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const analysis = JSON.parse(jsonMatch[0]);

        return new Response(
            JSON.stringify({ analysis }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        console.error('Analyze product error:', err);
        const message = err instanceof DOMException && err.name === 'AbortError'
            ? 'Request timed out'
            : 'Internal server error';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
