/**
 * ResaleCandidatesCard
 * Story 7.1: Horizontal scroll card showing resale candidate items on the analytics dashboard.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ResaleCandidate } from '../../services/resaleService';

interface ResaleCandidatesCardProps {
    candidates: ResaleCandidate[];
}

function getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#6366f1';
}

export default function ResaleCandidatesCard({ candidates }: ResaleCandidatesCardProps) {
    const router = useRouter();

    if (candidates.length === 0) return null;

    const handleCreateListing = (candidate: ResaleCandidate) => {
        router.push({
            pathname: '/(tabs)/item-detail',
            params: { itemId: candidate.item.id, openListing: '1' },
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="pricetag-outline" size={18} color="#22c55e" />
                    <Text style={styles.title}>Ready to Sell</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{candidates.length}</Text>
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {candidates.slice(0, 10).map((candidate) => {
                    const displayUrl = candidate.item.processed_image_url || candidate.item.image_url;
                    const scoreColor = getScoreColor(candidate.score);

                    return (
                        <TouchableOpacity
                            key={candidate.item.id}
                            style={styles.card}
                            onPress={() => router.push({
                                pathname: '/(tabs)/item-detail',
                                params: { itemId: candidate.item.id },
                            })}
                            activeOpacity={0.8}
                        >
                            <Image source={{ uri: displayUrl }} style={styles.image} resizeMode="cover" />

                            {/* Score badge */}
                            <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                                <Text style={styles.scoreText}>{candidate.score}</Text>
                            </View>

                            <View style={styles.cardContent}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {candidate.item.name || candidate.item.sub_category || candidate.item.category || 'Item'}
                                </Text>
                                <Text style={styles.itemReason} numberOfLines={1}>
                                    {candidate.reasons[0]}
                                </Text>
                                {candidate.item.purchase_price != null && (
                                    <Text style={styles.itemPrice}>
                                        ${candidate.item.purchase_price.toFixed(0)}
                                    </Text>
                                )}

                                <TouchableOpacity
                                    style={styles.listingButton}
                                    onPress={() => handleCreateListing(candidate)}
                                >
                                    <Text style={styles.listingButtonText}>Create Listing</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        paddingRight: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingRight: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
    },
    countBadge: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
    },
    countText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#16a34a',
    },
    scrollContent: {
        paddingRight: 16,
        gap: 12,
    },
    card: {
        width: 150,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    image: {
        width: '100%',
        height: 120,
        backgroundColor: '#e5e7eb',
    },
    scoreBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#fff',
    },
    cardContent: {
        padding: 10,
    },
    itemName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    itemReason: {
        fontSize: 11,
        color: '#9ca3af',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    listingButton: {
        backgroundColor: '#22c55e',
        borderRadius: 8,
        paddingVertical: 7,
        alignItems: 'center',
    },
    listingButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
});
