/**
 * BadgeGrid
 * Story 6.4: Displays all badges in a grid, earned + locked states
 * Supports showcase selection (up to 3 featured badges)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BADGES, BADGE_CATEGORY_LABELS, BadgeCategory, BadgeDefinition } from '@vestiaire/shared';
import { UserBadge, gamificationService } from '../../services/gamificationService';

interface BadgeGridProps {
    earnedBadges: UserBadge[];
    onBadgesChanged?: () => void;
}

const CATEGORY_ORDER: BadgeCategory[] = ['upload', 'engagement', 'sustainability', 'challenge', 'secret'];

export default function BadgeGrid({ earnedBadges, onBadgesChanged }: BadgeGridProps) {
    const [editShowcase, setEditShowcase] = useState(false);

    const earnedMap = new Map<string, UserBadge>();
    earnedBadges.forEach(ub => earnedMap.set(ub.badge_id, ub));

    const featuredBadges = earnedBadges.filter(ub => ub.is_featured);
    const featuredIds = new Set(featuredBadges.map(ub => ub.badge_id));

    const handleToggleFeatured = async (badge: BadgeDefinition) => {
        const userBadge = earnedMap.get(badge.id);
        if (!userBadge) return;

        const isCurrentlyFeatured = featuredIds.has(badge.id);

        if (!isCurrentlyFeatured && featuredBadges.length >= 3) {
            Alert.alert('Limit Reached', 'You can showcase up to 3 badges. Remove one first.');
            return;
        }

        const { error } = await gamificationService.toggleFeaturedBadge(
            userBadge.id,
            !isCurrentlyFeatured
        );
        if (!error) {
            onBadgesChanged?.();
        }
    };

    // Group badges by category
    const grouped = CATEGORY_ORDER.map(cat => ({
        category: cat,
        label: BADGE_CATEGORY_LABELS[cat],
        badges: BADGES.filter(b => b.category === cat),
    }));

    return (
        <View style={styles.container}>
            {/* Featured Showcase */}
            {featuredBadges.length > 0 && !editShowcase && (
                <View style={styles.showcaseSection}>
                    <View style={styles.showcaseHeader}>
                        <Text style={styles.showcaseTitle}>Showcase</Text>
                        <TouchableOpacity onPress={() => setEditShowcase(true)}>
                            <Text style={styles.editText}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.showcaseRow}>
                        {featuredBadges.map(ub => {
                            const def = BADGES.find(b => b.id === ub.badge_id);
                            if (!def) return null;
                            return (
                                <View key={ub.id} style={styles.showcaseBadge}>
                                    <View style={styles.showcaseIconWrap}>
                                        <Ionicons name={def.iconName as any} size={28} color="#6366f1" />
                                    </View>
                                    <Text style={styles.showcaseName} numberOfLines={1}>{def.name}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            {editShowcase && (
                <View style={styles.editBanner}>
                    <Text style={styles.editBannerText}>
                        Tap earned badges to feature them ({featuredBadges.length}/3)
                    </Text>
                    <TouchableOpacity onPress={() => setEditShowcase(false)}>
                        <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Badge Grid by Category */}
            {grouped.map(group => (
                <View key={group.category} style={styles.categorySection}>
                    <Text style={styles.categoryLabel}>{group.label}</Text>
                    <View style={styles.grid}>
                        {group.badges.map(badge => {
                            const earned = earnedMap.has(badge.id);
                            const isFeatured = featuredIds.has(badge.id);

                            return (
                                <TouchableOpacity
                                    key={badge.id}
                                    style={[
                                        styles.badgeCell,
                                        earned && styles.badgeCellEarned,
                                        isFeatured && editShowcase && styles.badgeCellFeatured,
                                    ]}
                                    onPress={() => {
                                        if (editShowcase && earned) {
                                            handleToggleFeatured(badge);
                                        }
                                    }}
                                    activeOpacity={editShowcase && earned ? 0.7 : 1}
                                    disabled={!editShowcase || !earned}
                                >
                                    <View style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
                                        <Ionicons
                                            name={earned ? badge.iconName as any : 'lock-closed'}
                                            size={24}
                                            color={earned ? '#6366f1' : '#d1d5db'}
                                        />
                                    </View>
                                    <Text
                                        style={[styles.badgeName, !earned && styles.badgeNameLocked]}
                                        numberOfLines={1}
                                    >
                                        {earned ? badge.name : '???'}
                                    </Text>
                                    {earned ? (
                                        <Text style={styles.badgeDesc} numberOfLines={1}>
                                            {badge.description}
                                        </Text>
                                    ) : (
                                        <Text style={styles.badgeHint} numberOfLines={1}>
                                            {badge.category === 'secret' ? '???' : badge.hint}
                                        </Text>
                                    )}
                                    {isFeatured && editShowcase && (
                                        <View style={styles.featuredStar}>
                                            <Ionicons name="star" size={12} color="#eab308" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ))}

            {!editShowcase && earnedBadges.length > 0 && (
                <TouchableOpacity
                    style={styles.editShowcaseButton}
                    onPress={() => setEditShowcase(true)}
                >
                    <Ionicons name="star-outline" size={16} color="#6366f1" />
                    <Text style={styles.editShowcaseText}>Edit Showcase</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {},
    // Showcase
    showcaseSection: {
        marginBottom: 20,
    },
    showcaseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    showcaseTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    editText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
    showcaseRow: {
        flexDirection: 'row',
        gap: 12,
    },
    showcaseBadge: {
        alignItems: 'center',
        width: 80,
    },
    showcaseIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        borderWidth: 2,
        borderColor: '#c7d2fe',
    },
    showcaseName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'center',
    },
    // Edit banner
    editBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#eef2ff',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 16,
    },
    editBannerText: {
        fontSize: 13,
        color: '#4338ca',
        flex: 1,
    },
    doneText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
        marginLeft: 12,
    },
    // Category
    categorySection: {
        marginBottom: 20,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    // Badge cell
    badgeCell: {
        width: '30%',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    badgeCellEarned: {
        borderColor: '#e0e7ff',
        backgroundColor: '#fafbff',
    },
    badgeCellFeatured: {
        borderColor: '#6366f1',
        borderWidth: 2,
    },
    badgeIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    badgeIconLocked: {
        backgroundColor: '#f3f4f6',
    },
    badgeName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 2,
    },
    badgeNameLocked: {
        color: '#d1d5db',
    },
    badgeDesc: {
        fontSize: 10,
        color: '#9ca3af',
        textAlign: 'center',
    },
    badgeHint: {
        fontSize: 10,
        color: '#d1d5db',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    featuredStar: {
        position: 'absolute',
        top: 6,
        right: 6,
    },
    // Edit showcase button
    editShowcaseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    editShowcaseText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
});
