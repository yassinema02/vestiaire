/**
 * ActivityFeed
 * Story 6.7: Displays the last 5 point history events with relative times.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { gamificationService, PointHistoryEntry } from '../../services/gamificationService';

const ACTION_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    upload_item: { label: 'Uploaded item', icon: 'shirt-outline', color: '#3b82f6' },
    wear_log: { label: 'Logged outfit', icon: 'checkmark-circle-outline', color: '#22c55e' },
    streak_bonus: { label: 'Streak bonus', icon: 'flame-outline', color: '#f97316' },
    streak_milestone: { label: 'Streak milestone', icon: 'medal-outline', color: '#f97316' },
    first_of_day: { label: 'First of the day', icon: 'star-outline', color: '#eab308' },
    challenge_complete: { label: 'Challenge complete', icon: 'trophy-outline', color: '#8b5cf6' },
};

function getActionConfig(actionType: string) {
    return ACTION_CONFIG[actionType] || { label: actionType.replace(/_/g, ' '), icon: 'ellipse-outline' as const, color: '#9ca3af' };
}

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ActivityFeed() {
    const [entries, setEntries] = useState<PointHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const load = async () => {
                setIsLoading(true);
                const { entries: data } = await gamificationService.getPointsHistory(5);
                setEntries(data);
                setIsLoading(false);
            };
            load();
        }, [])
    );

    if (isLoading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#6366f1" />
            </View>
        );
    }

    if (entries.length === 0) {
        return (
            <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={32} color="#d1d5db" />
                <Text style={styles.emptyText}>No activity yet</Text>
                <Text style={styles.emptySubtext}>Upload items and log outfits to see your activity here</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {entries.map((entry, index) => {
                const config = getActionConfig(entry.action_type);
                return (
                    <View
                        key={entry.id}
                        style={[styles.entryRow, index < entries.length - 1 && styles.entryBorder]}
                    >
                        <View style={[styles.entryIcon, { backgroundColor: config.color + '15' }]}>
                            <Ionicons name={config.icon} size={16} color={config.color} />
                        </View>
                        <View style={styles.entryInfo}>
                            <Text style={styles.entryLabel}>{config.label}</Text>
                            <Text style={styles.entryTime}>{formatRelativeTime(entry.created_at)}</Text>
                        </View>
                        <Text style={styles.entryPoints}>+{entry.points} pts</Text>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    loadingWrap: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
    },
    emptyState: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9ca3af',
        marginTop: 8,
    },
    emptySubtext: {
        fontSize: 12,
        color: '#d1d5db',
        textAlign: 'center',
        marginTop: 4,
    },
    entryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
    },
    entryBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    entryIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    entryInfo: {
        flex: 1,
    },
    entryLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    entryTime: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 1,
    },
    entryPoints: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6366f1',
    },
});
