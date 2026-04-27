/**
 * Event Classification Service
 * Two-tier classification: fast keyword-based + Gemini AI fallback
 * Story 12.2: Event Detection & Classification
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { detectOccasion, OccasionType } from '../utils/occasionDetector';
import { buildEventClassificationPrompt, buildBatchEventClassificationPrompt } from '../constants/prompts';
import { trackedGenerateContent, isGeminiConfigured } from './aiUsageLogger';

// Event type used in database (maps from OccasionType, with 'sport' → 'active')
export type EventType = 'work' | 'social' | 'active' | 'formal' | 'casual';

export interface ClassificationResult {
    type: EventType;
    formalityScore: number;
    confidence: number;
    source: 'keyword' | 'ai';
}

/**
 * Formality score defaults for keyword-detected types
 */
const FORMALITY_MAP: Record<EventType, number> = {
    formal: 9,
    work: 6,
    social: 4,
    casual: 3,
    active: 2,
};

/**
 * Map OccasionType to EventType (sport → active)
 */
function occasionToEventType(occasion: OccasionType): EventType {
    if (occasion === 'sport') return 'active';
    return occasion as EventType;
}

/**
 * Classify an event using keyword matching (fast path)
 * Returns high confidence if a specific keyword matched, low if defaulted to casual
 */
function classifyByKeyword(
    title: string,
    location?: string | null
): ClassificationResult {
    const occasion = detectOccasion(title, location);
    const eventType = occasionToEventType(occasion);
    // If detectOccasion returned 'casual' it might be a genuine casual event
    // or it might be ambiguous (no keyword match). We flag low confidence for the default.
    const isDefaultCasual = occasion === 'casual';

    return {
        type: eventType,
        formalityScore: FORMALITY_MAP[eventType],
        confidence: isDefaultCasual ? 0.3 : 0.9,
        source: 'keyword',
    };
}

/**
 * Classify an event using Gemini AI (for ambiguous events)
 */
async function classifyByAI(
    title: string,
    description?: string | null,
    location?: string | null
): Promise<ClassificationResult> {
    if (!isGeminiConfigured()) {
        // Fallback if Gemini not configured
        return classifyByKeyword(title, location);
    }

    try {
        const prompt = buildEventClassificationPrompt(title, description, location);

        const result = await trackedGenerateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }, 'event_classify');

        const text = result.text;
        if (!text) {
            throw new Error('No text response from Gemini');
        }

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const parsed = JSON.parse(jsonMatch[0]) as {
            type: string;
            formalityScore: number;
            confidence: number;
        };

        // Validate type
        const validTypes: EventType[] = ['work', 'social', 'active', 'formal', 'casual'];
        const type = validTypes.includes(parsed.type as EventType)
            ? (parsed.type as EventType)
            : 'casual';

        // Clamp formality score
        const formalityScore = Math.max(1, Math.min(10, Math.round(parsed.formalityScore || 3)));

        return {
            type,
            formalityScore,
            confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
            source: 'ai',
        };
    } catch (error) {
        console.error('Gemini classification error:', error);
        // Fallback to keyword
        return classifyByKeyword(title, location);
    }
}

/**
 * Classify a batch of events in a single AI call.
 * Returns classification results keyed by event ID.
 */
async function classifyBatchByAI(
    events: Array<{ id: string; title: string; description?: string | null; location?: string | null }>
): Promise<Array<{ id: string; type: EventType; formalityScore: number }>> {
    const validTypes: EventType[] = ['work', 'social', 'active', 'formal', 'casual'];

    try {
        const prompt = buildBatchEventClassificationPrompt(events);

        const result = await trackedGenerateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }, 'event_classify');

        const text = result.text;
        if (!text) throw new Error('No text response from Gemini');

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('Failed to parse batch AI response');

        const parsed = JSON.parse(jsonMatch[0]) as Array<{
            id: string;
            type: string;
            formalityScore: number;
        }>;

        return parsed.map((item) => ({
            id: item.id,
            type: validTypes.includes(item.type as EventType) ? (item.type as EventType) : 'casual',
            formalityScore: Math.max(1, Math.min(10, Math.round(item.formalityScore || 3))),
        }));
    } catch (error) {
        console.error('Batch AI classification error:', error);
        // Fallback: keyword-classify each event individually
        return events.map((e) => {
            const kw = classifyByKeyword(e.title, e.location);
            return { id: e.id, type: kw.type, formalityScore: kw.formalityScore };
        });
    }
}

export const eventClassificationService = {
    /**
     * Classify a single event (two-tier: keyword first, AI for ambiguous)
     */
    classifyEvent: async (
        title: string,
        description?: string | null,
        location?: string | null
    ): Promise<ClassificationResult> => {
        // Fast path: keyword-based
        const keywordResult = classifyByKeyword(title, location);

        // If keyword match is confident, use it
        if (keywordResult.confidence >= 0.7) {
            return keywordResult;
        }

        // AI path: for ambiguous events
        return classifyByAI(title, description, location);
    },

    /**
     * Classify all unclassified events for a user in batch.
     * Uses keyword fast-path first, then batches remaining ambiguous events
     * into a single AI call (~10 events per request) instead of N+1 calls.
     */
    classifyUnclassified: async (
        userId?: string
    ): Promise<{ classified: number; error: Error | null }> => {
        try {
            const uid = userId || await requireUserId();

            const { data, error } = await supabase
                .from('calendar_events')
                .select('id, title, description, location, is_all_day')
                .eq('user_id', uid)
                .is('event_type', null);

            if (error) throw error;
            if (!data || data.length === 0) {
                return { classified: 0, error: null };
            }

            let classified = 0;

            // Phase 1: Resolve all-day and high-confidence keyword matches locally
            const needsAI: typeof data = [];
            const localResults: Array<{ id: string; type: EventType; formalityScore: number }> = [];

            for (const event of data) {
                if (event.is_all_day) {
                    localResults.push({ id: event.id, type: 'casual', formalityScore: 3 });
                } else {
                    const kw = classifyByKeyword(event.title, event.location);
                    if (kw.confidence >= 0.7) {
                        localResults.push({ id: event.id, type: kw.type, formalityScore: kw.formalityScore });
                    } else {
                        needsAI.push(event);
                    }
                }
            }

            // Write local results in one batch
            for (const r of localResults) {
                const { error: updateError } = await supabase
                    .from('calendar_events')
                    .update({ event_type: r.type, formality_score: r.formalityScore })
                    .eq('id', r.id);
                if (!updateError) classified++;
            }

            // Phase 2: Batch AI classification (~10 events per call)
            if (needsAI.length > 0 && isGeminiConfigured()) {
                const BATCH_SIZE = 10;
                for (let i = 0; i < needsAI.length; i += BATCH_SIZE) {
                    const batch = needsAI.slice(i, i + BATCH_SIZE);
                    const aiResults = await classifyBatchByAI(batch);

                    for (const r of aiResults) {
                        const { error: updateError } = await supabase
                            .from('calendar_events')
                            .update({ event_type: r.type, formality_score: r.formalityScore })
                            .eq('id', r.id);
                        if (!updateError) classified++;
                    }
                }
            } else if (needsAI.length > 0) {
                // No AI available — default ambiguous events to casual
                for (const event of needsAI) {
                    const { error: updateError } = await supabase
                        .from('calendar_events')
                        .update({ event_type: 'casual', formality_score: 3 })
                        .eq('id', event.id);
                    if (!updateError) classified++;
                }
            }

            return { classified, error: null };
        } catch (error) {
            console.error('Batch classification error:', error);
            return { classified: 0, error: error as Error };
        }
    },

    /**
     * Re-classify a single event (user correction)
     */
    reclassifyEvent: async (
        eventId: string,
        newType: EventType
    ): Promise<{ error: Error | null }> => {
        try {
            const { error } = await supabase
                .from('calendar_events')
                .update({
                    event_type: newType,
                    formality_score: FORMALITY_MAP[newType],
                    user_corrected: true,
                })
                .eq('id', eventId);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error reclassifying event:', error);
            return { error: error as Error };
        }
    },

    /**
     * Get formality score for an event type
     */
    getFormalityScore: (type: EventType): number => {
        return FORMALITY_MAP[type];
    },

    /**
     * Check if AI classification is available
     */
    isAIConfigured: (): boolean => {
        return isGeminiConfigured();
    },
};
