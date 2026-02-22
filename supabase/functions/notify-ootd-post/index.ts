/**
 * Edge Function: notify-ootd-post
 * Triggered via Supabase Database Webhook on INSERT to ootd_posts.
 * Sends push notifications to squad members via Expo Push API.
 * Story 9.6: OOTD Notifications
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    try {
        const { record } = await req.json();

        if (!record) {
            return new Response(JSON.stringify({ error: 'No record provided' }), { status: 400 });
        }

        const postId = record.id;
        const authorId = record.user_id;
        const squadId = record.squad_id;

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // 1. Get author display name
        const { data: author } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', authorId)
            .single();

        const authorName = author?.display_name || 'Someone';

        // 2. Get squad members (excluding author)
        const { data: members } = await supabase
            .from('squad_memberships')
            .select('user_id')
            .eq('squad_id', squadId)
            .neq('user_id', authorId);

        if (!members || members.length === 0) {
            return new Response(JSON.stringify({ sent: 0, reason: 'no members' }), { status: 200 });
        }

        // 3. Get push tokens for members
        const userIds = members.map((m) => m.user_id);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('push_token')
            .in('id', userIds)
            .not('push_token', 'is', null);

        const tokens = (profiles || []).map((p) => p.push_token).filter(Boolean);

        if (tokens.length === 0) {
            return new Response(JSON.stringify({ sent: 0, reason: 'no tokens' }), { status: 200 });
        }

        // 4. Send via Expo Push Notification API
        const messages = tokens.map((token) => ({
            to: token,
            title: 'Style Squad',
            body: `${authorName} just posted their OOTD! 📸`,
            data: { postId, squadId, type: 'ootd_post' },
            sound: 'default',
        }));

        const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const pushResult = await pushResponse.json();

        return new Response(
            JSON.stringify({ sent: tokens.length, result: pushResult }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('notify-ootd-post error:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500 }
        );
    }
});
