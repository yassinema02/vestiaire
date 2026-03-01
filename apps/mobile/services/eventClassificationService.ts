/**
 * Event Classification Service
 * Two-tier classification: fast keyword-based + Gemini AI fallback
 * Story 12.2: Event Detection & Classification
 */

import Constants from 'expo-constants';
import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { detectOccasion, OccasionType } from '../utils/occasionDetector';
import { buildEventClassificationPrompt } from '../constants/prompts';
import { trackedGenerateContent } from './aiUsageLogger';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

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
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_api_key_here') {
        // Fallback if Gemini not configured
        return classifyByKeyword(title, location);
    }

    try {
        const prompt = buildEventClassificationPrompt(title, description, location);

        const result = await trackedGenerateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
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
     * Classify all unclassified events for a user in batch
     * Skips events that already have a type (preserves user corrections)
     */
    classifyUnclassified: async (
        userId?: string
    ): Promise<{ classified: number; error: Error | null }> => {
        try {
            const uid = userId || await requireUserId();

            // Get unclassified events
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

            for (const event of data) {
                // All-day events default to casual (AC 6)
                let result: ClassificationResult;
                if (event.is_all_day) {
                    result = {
                        type: 'casual',
                        formalityScore: 3,
                        confidence: 0.8,
                        source: 'keyword',
                    };
                } else {
                    result = await eventClassificationService.classifyEvent(
                        event.title,
                        event.description,
                        event.location
                    );
                }

                const { error: updateError } = await supabase
                    .from('calendar_events')
                    .update({
                        event_type: result.type,
                        formality_score: result.formalityScore,
                    })
                    .eq('id', event.id);

                if (!updateError) {
                    classified++;
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
        return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_api_key_here';
    },
};
