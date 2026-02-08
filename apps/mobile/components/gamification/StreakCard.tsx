/**
 * StreakCard
 * Story 6.3: Reusable streak display for Home (compact) and Profile (full)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { STREAK_MILESTONES } from '@vestiaire/shared';
import { UserStats } from '../../services/gamificationService';

interface StreakCardProps {
    stats: UserStats;
    compact?: boolean;
}

function getNextMilestone(currentStreak: number): number | null {
    for (const m of STREAK_MILESTONES) {
        if (currentStreak < m) return m;
    }
    return null;
}

export default function StreakCard({ stats, compact }: StreakCardProps) {
    const router = useRouter();
    const today = new Date().toISOString().split('T')[0];
    const activeToday = stats.last_active_date === today;
    const freezeAvailable = (stats.streak_freezes_available ?? 0) > 0;
    const nextMilestone = getNextMilestone(stats.current_streak);

    if (compact) {
        return (
            <TouchableOpacity
                style={styles.compactCard}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.7}
            >
                <Ionicons
                    name="flame"
                    size={20}
                    color={activeToday ? '#f97316' : '#9ca3af'}
                />
                <Text style={[styles.compactCount, activeToday && styles.compactCountActive]}>
                    {stats.current_streak}
                </Text>
                <Text style={styles.compactLabel}>
                    day{stats.current_streak !== 1 ? 's' : ''} streak
                </Text>
                {freezeAvailable && (
                    <View style={styles.compactFreeze}>
                        <Ionicons name="snow-outline" size={12} color="#38bdf8" />
                    </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" style={styles.compactChevron} />
            </TouchableOpacity>
        );
    }

    // Full mode
    return (
        <View style={styles.fullCard}>
            {/* Current streak */}
            <View style={styles.fullTopRow}>
                <View style={styles.fullStreakWrap}>
                    <View style={[styles.flameCircle, activeToday && styles.flameCircleActive]}>
                        <Ionicons
                            name="flame"
                            size={24}
                            color={activeToday ? '#f97316' : '#9ca3af'}
                        />
                    </View>
                    <View>
                        <Text style={styles.fullCount}>{stats.current_streak}</Text>
                        <Text style={styles.fullCountLabel}>Current Streak</Text>
                    </View>
                </View>
                <View style={styles.fullLongestWrap}>
                    <Text style={styles.fullLongestCount}>{stats.longest_streak}</Text>
                    <Text style={styles.fullLongestLabel}>Longest</Text>
                </View>
            </View>

            {/* Freeze status + Milestone progress */}
            <View style={styles.fullBottomRow}>
                <View style={styles.freezeBadge}>
                    <Ionicons
                        name={freezeAvailable ? 'snow' : 'snow-outline'}
                        size={14}
                        color={freezeAvailable ? '#38bdf8' : '#9ca3af'}
                    />
                    <Text style={[styles.freezeText, freezeAvailable && styles.freezeTextActive]}>
                        {freezeAvailable ? '1 freeze available' : 'No freezes'}
                    </Text>
                </View>
                {nextMilestone && (
                    <View style={styles.milestoneBadge}>
                        <Ionicons name="trophy-outline" size={14} color="#eab308" />
                        <Text style={styles.milestoneText}>
                            {nextMilestone - stats.current_streak}d to {nextMilestone}-day milestone
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Compact mode
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    compactCount: {
        fontSize: 18,
        fontWeight: '800',
        color: '#9ca3af',
    },
    compactCountActive: {
        color: '#f97316',
    },
    compactLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    compactFreeze: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#f0f9ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 2,
    },
    compactChevron: {
        marginLeft: 'auto',
    },

    // Full mode
    fullCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    fullTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fullStreakWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    flameCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    flameCircleActive: {
        backgroundColor: '#fff7ed',
    },
    fullCount: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1f2937',
    },
    fullCountLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 1,
    },
    fullLongestWrap: {
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    fullLongestCount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#6b7280',
    },
    fullLongestLabel: {
        fontSize: 11,
        color: '#9ca3af',
    },

    // Bottom row
    fullBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    freezeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#f0f9ff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    freezeText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9ca3af',
    },
    freezeTextActive: {
        color: '#0284c7',
    },
    milestoneBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fefce8',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    milestoneText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#a16207',
    },
});
