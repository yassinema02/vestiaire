/**
 * Calendar Outfit Service
 * CRUD operations for scheduling outfits to dates or events
 * Story 12.4: Outfit Scheduling & Planning
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';

export interface CalendarOutfitRow {
    id: string;
    user_id: string;
    event_id: string | null;
    scheduled_date: string | null;
    outfit_id: string | null;
    item_ids: string[] | null;
    created_at: string;
}

/**
 * Schedule an outfit for a specific date (no event)
 */
async function scheduleOutfit(
    date: string,
    outfitId?: string,
    itemIds?: string[]
): Promise<{ scheduled: CalendarOutfitRow | null; error: string | null }> {
    try {
        const userId = await requireUserId();

        // Upsert: replace any existing outfit for this date
        const { data: existing } = await supabase
            .from('calendar_outfits')
            .select('id')
            .eq('user_id', userId)
            .eq('scheduled_date', date)
            .is('event_id', null)
            .maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('calendar_outfits')
                .update({
                    outfit_id: outfitId || null,
                    item_ids: itemIds || null,
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) return { scheduled: null, error: error.message };
            return { scheduled: data, error: null };
        }

        const { data, error } = await supabase
            .from('calendar_outfits')
            .insert({
                user_id: userId,
                scheduled_date: date,
                outfit_id: outfitId || null,
                item_ids: itemIds || null,
            })
            .select()
            .single();

        if (error) return { scheduled: null, error: error.message };
        return { scheduled: data, error: null };
    } catch (err: any) {
        return { scheduled: null, error: err.message };
    }
}

/**
 * Schedule an outfit for a specific event
 */
async function scheduleOutfitForEvent(
    eventId: string,
    outfitId?: string,
    itemIds?: string[]
): Promise<{ scheduled: CalendarOutfitRow | null; error: string | null }> {
    try {
        const userId = await requireUserId();

        // Upsert: replace any existing outfit for this event
        const { data: existing } = await supabase
            .from('calendar_outfits')
            .select('id')
            .eq('user_id', userId)
            .eq('event_id', eventId)
            .maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('calendar_outfits')
                .update({
                    outfit_id: outfitId || null,
                    item_ids: itemIds || null,
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) return { scheduled: null, error: error.message };
            return { scheduled: data, error: null };
        }

        const { data, error } = await supabase
            .from('calendar_outfits')
            .insert({
                user_id: userId,
                event_id: eventId,
                outfit_id: outfitId || null,
                item_ids: itemIds || null,
            })
            .select()
            .single();

        if (error) return { scheduled: null, error: error.message };
        return { scheduled: data, error: null };
    } catch (err: any) {
        return { scheduled: null, error: err.message };
    }
}

/**
 * Get all scheduled outfits in a date range
 */
async function getScheduledOutfits(
    startDate: string,
    endDate: string
): Promise<{ outfits: CalendarOutfitRow[]; error: string | null }> {
    try {
        const userId = await requireUserId();

        // Get date-based outfits
        const { data: dateOutfits, error: dateError } = await supabase
            .from('calendar_outfits')
            .select('*')
            .eq('user_id', userId)
            .not('scheduled_date', 'is', null)
            .gte('scheduled_date', startDate)
            .lte('scheduled_date', endDate);

        if (dateError) return { outfits: [], error: dateError.message };

        // Get event-based outfits (events in range)
        const { data: eventOutfits, error: eventError } = await supabase
            .from('calendar_outfits')
            .select('*, calendar_events!inner(start_time)')
            .eq('user_id', userId)
            .not('event_id', 'is', null)
            .gte('calendar_events.start_time', `${startDate}T00:00:00Z`)
            .lte('calendar_events.start_time', `${endDate}T23:59:59Z`);

        if (eventError) return { outfits: dateOutfits || [], error: eventError.message };

        // Strip the joined calendar_events data
        const cleanEventOutfits = (eventOutfits || []).map(({ calendar_events, ...rest }: any) => rest);

        return { outfits: [...(dateOutfits || []), ...cleanEventOutfits], error: null };
    } catch (err: any) {
        return { outfits: [], error: err.message };
    }
}

/**
 * Update an existing scheduled outfit
 */
async function updateScheduledOutfit(
    id: string,
    outfitId?: string,
    itemIds?: string[]
): Promise<{ error: string | null }> {
    try {
        const { error } = await supabase
            .from('calendar_outfits')
            .update({
                outfit_id: outfitId || null,
                item_ids: itemIds || null,
            })
            .eq('id', id);

        if (error) return { error: error.message };
        return { error: null };
    } catch (err: any) {
        return { error: err.message };
    }
}

/**
 * Remove a scheduled outfit
 */
async function removeScheduledOutfit(id: string): Promise<{ error: string | null }> {
    try {
        const { error } = await supabase
            .from('calendar_outfits')
            .delete()
            .eq('id', id);

        if (error) return { error: error.message };
        return { error: null };
    } catch (err: any) {
        return { error: err.message };
    }
}

/**
 * Get scheduled outfit for a specific date (for morning notification)
 */
async function getScheduledOutfitForDate(
    date: string
): Promise<{ outfit: CalendarOutfitRow | null; error: string | null }> {
    try {
        const userId = await requireUserId();

        // Check date-based outfit first
        const { data: dateOutfit } = await supabase
            .from('calendar_outfits')
            .select('*')
            .eq('user_id', userId)
            .eq('scheduled_date', date)
            .is('event_id', null)
            .maybeSingle();

        if (dateOutfit) return { outfit: dateOutfit, error: null };

        // Check event-based outfit for events on this date
        const { data: eventOutfit } = await supabase
            .from('calendar_outfits')
            .select('*, calendar_events!inner(start_time)')
            .eq('user_id', userId)
            .not('event_id', 'is', null)
            .gte('calendar_events.start_time', `${date}T00:00:00Z`)
            .lte('calendar_events.start_time', `${date}T23:59:59Z`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (eventOutfit) {
            const { calendar_events, ...clean } = eventOutfit as any;
            return { outfit: clean, error: null };
        }

        return { outfit: null, error: null };
    } catch (err: any) {
        return { outfit: null, error: err.message };
    }
}

/**
 * Get scheduled outfit for a specific event
 */
async function getScheduledOutfitForEvent(
    eventId: string
): Promise<{ outfit: CalendarOutfitRow | null; error: string | null }> {
    try {
        const userId = await requireUserId();

        const { data, error } = await supabase
            .from('calendar_outfits')
            .select('*')
            .eq('user_id', userId)
            .eq('event_id', eventId)
            .maybeSingle();

        if (error) return { outfit: null, error: error.message };
        return { outfit: data, error: null };
    } catch (err: any) {
        return { outfit: null, error: err.message };
    }
}

export const calendarOutfitService = {
    scheduleOutfit,
    scheduleOutfitForEvent,
    getScheduledOutfits,
    updateScheduledOutfit,
    removeScheduledOutfit,
    getScheduledOutfitForDate,
    getScheduledOutfitForEvent,
};
