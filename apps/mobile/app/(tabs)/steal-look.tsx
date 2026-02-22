/**
 * Steal This Look Screen
 * Shows AI-matched wardrobe items for recreating a friend's outfit.
 * Story 9.5: "Steal This Look"
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSocialStore } from '../../stores/socialStore';
import { supabase } from '../../services/supabase';
import { requireUserId } from '../../services/auth-helpers';
import { StealMatchResult } from '../../types/social';

const MATCH_COLORS = {
    exact: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', badge: '#10b981' },
    similar: { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', badge: '#f97316' },
    missing: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', badge: '#ef4444' },
};

const MATCH_LABELS = {
    exact: 'Exact Match',
    similar: 'Similar',
    missing: 'Missing',
};

export default function StealLookScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ postId: string; authorName: string; photoUrl: string }>();
    const { stealLookResult, isAnalyzingLook } = useSocialStore();
    const [isSaving, setIsSaving] = useState(false);

    const handleBack = () => {
        useSocialStore.getState().clearStealLook();
        router.push('/(tabs)/social');
    };

    const handleSaveOutfit = async () => {
        if (!stealLookResult) return;

        const matchedItemIds = stealLookResult.matches
            .filter((m) => m.matchType !== 'missing' && m.matchedItem)
            .map((m) => m.matchedItem!.id);

        if (matchedItemIds.length === 0) {
            Alert.alert('No matches', 'There are no matching items to save as an outfit.');
            return;
        }

        setIsSaving(true);
        try {
            const userId = await requireUserId();
            const authorName = params.authorName || 'a friend';
            const outfitName = `Inspired by ${authorName}'s OOTD`;

            const { data: outfit, error: outfitError } = await supabase
                .from('outfits')
                .insert({
                    user_id: userId,
                    name: outfitName,
                    occasion: 'casual',
                    is_ai_generated: true,
                })
                .select()
                .single();

            if (outfitError || !outfit) {
                Alert.alert('Error', 'Failed to save outfit. Please try again.');
                setIsSaving(false);
                return;
            }

            for (let i = 0; i < matchedItemIds.length; i++) {
                await supabase.from('outfit_items').insert({
                    outfit_id: outfit.id,
                    item_id: matchedItemIds[i],
                    position: i,
                });
            }

            Alert.alert('Saved!', `"${outfitName}" has been added to your outfits.`, [
                { text: 'OK', onPress: () => handleBack() },
            ]);
        } catch (err) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Loading state
    if (isAnalyzingLook) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Steal This Look</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Analyzing look...</Text>
                    <Text style={styles.loadingSubtext}>
                        Finding matches in your wardrobe
                    </Text>
                </View>
            </View>
        );
    }

    // No result (error or not loaded)
    if (!stealLookResult) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Steal This Look</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <View style={styles.loadingContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                    <Text style={styles.loadingText}>Could not analyze this look</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={handleBack}>
                        <Text style={styles.retryBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const matchedCount = stealLookResult.matches.filter((m) => m.matchType !== 'missing').length;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Steal This Look</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Original post preview */}
                {params.photoUrl && (
                    <View style={styles.originalPreview}>
                        <Image
                            source={{ uri: params.photoUrl }}
                            style={styles.originalPhoto}
                        />
                        <View style={styles.originalInfo}>
                            <Text style={styles.originalAuthor}>
                                {params.authorName || 'Friend'}'s OOTD
                            </Text>
                            <Text style={styles.originalCaption}>
                                {stealLookResult.matches.length} items tagged
                            </Text>
                        </View>
                    </View>
                )}

                {/* Overall score */}
                <View style={styles.scoreCard}>
                    <Text style={styles.scoreValue}>{stealLookResult.overallScore}%</Text>
                    <Text style={styles.scoreLabel}>
                        {stealLookResult.canRecreate
                            ? 'You can recreate this look!'
                            : `You can recreate ${stealLookResult.overallScore}% of this look`}
                    </Text>
                    <Text style={styles.scoreDetail}>
                        {matchedCount} of {stealLookResult.matches.length} items matched
                    </Text>
                </View>

                {/* Match results */}
                <Text style={styles.sectionTitle}>Match Results</Text>
                {stealLookResult.matches.map((match, index) => (
                    <MatchCard key={match.originalItem.id + '-' + index} match={match} />
                ))}

                {/* Save button */}
                {matchedCount > 0 && (
                    <TouchableOpacity
                        style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                        onPress={handleSaveOutfit}
                        disabled={isSaving}
                        activeOpacity={0.8}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="bookmark-outline" size={18} color="#fff" />
                                <Text style={styles.saveBtnText}>Save as My Outfit</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

function MatchCard({ match }: { match: StealMatchResult }) {
    const colors = MATCH_COLORS[match.matchType];
    const label = MATCH_LABELS[match.matchType];

    return (
        <View style={[styles.matchCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={styles.matchItems}>
                {/* Original item */}
                <View style={styles.matchItemCol}>
                    <Image
                        source={{ uri: match.originalItem.image_url }}
                        style={styles.matchItemImage}
                    />
                    <Text style={styles.matchItemName} numberOfLines={1}>
                        {match.originalItem.name || match.originalItem.category}
                    </Text>
                </View>

                {/* Arrow */}
                <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#9ca3af"
                    style={styles.matchArrow}
                />

                {/* Matched item or missing */}
                {match.matchedItem ? (
                    <View style={styles.matchItemCol}>
                        <Image
                            source={{ uri: match.matchedItem.image_url }}
                            style={styles.matchItemImage}
                        />
                        <Text style={styles.matchItemName} numberOfLines={1}>
                            {match.matchedItem.name || match.matchedItem.category}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.matchItemCol}>
                        <View style={[styles.matchItemImage, styles.missingPlaceholder]}>
                            <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </View>
                        <Text style={styles.matchItemName}>Missing</Text>
                    </View>
                )}
            </View>

            {/* Badge */}
            <View style={[styles.matchBadge, { backgroundColor: colors.badge }]}>
                <Text style={styles.matchBadgeText}>{label}</Text>
            </View>

            {/* Reason */}
            <Text style={[styles.matchReason, { color: colors.text }]}>
                {match.matchReason}
            </Text>

            {/* Missing item info */}
            {match.matchType === 'missing' && (
                <View style={styles.missingInfo}>
                    <Ionicons name="information-circle-outline" size={14} color="#6b7280" />
                    <Text style={styles.missingInfoText}>
                        You don't have this item in your wardrobe
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },

    // Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 16,
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    retryBtn: {
        marginTop: 16,
        backgroundColor: '#6366f1',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    retryBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },

    // Original preview
    originalPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    originalPhoto: {
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
    },
    originalInfo: {
        flex: 1,
        marginLeft: 12,
    },
    originalAuthor: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
    },
    originalCaption: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },

    // Score
    scoreCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
    },
    scoreValue: {
        fontSize: 36,
        fontWeight: '800',
        color: '#6366f1',
    },
    scoreLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 4,
        textAlign: 'center',
    },
    scoreDetail: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },

    // Section
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 12,
    },

    // Match card
    matchCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
    },
    matchItems: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    matchItemCol: {
        flex: 1,
        alignItems: 'center',
    },
    matchItemImage: {
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
        marginBottom: 4,
    },
    matchItemName: {
        fontSize: 11,
        color: '#4b5563',
        textAlign: 'center',
    },
    matchArrow: {
        marginHorizontal: 8,
    },
    missingPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
    },

    // Badge
    matchBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginBottom: 6,
    },
    matchBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },

    // Reason
    matchReason: {
        fontSize: 13,
        lineHeight: 18,
    },

    // Missing info
    missingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
    },
    missingInfoText: {
        fontSize: 12,
        color: '#6b7280',
        fontStyle: 'italic',
    },

    // Save button
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366f1',
        borderRadius: 14,
        paddingVertical: 16,
        marginTop: 8,
        gap: 8,
    },
    saveBtnDisabled: {
        opacity: 0.6,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
