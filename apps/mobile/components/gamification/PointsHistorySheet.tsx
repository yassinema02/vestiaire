/**
 * PointsHistorySheet
 * Story 6.1: Bottom sheet modal showing recent point history
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gamificationService, PointHistoryEntry } from '../../services/gamificationService';

interface PointsHistorySheetProps {
    visible: boolean;
    onClose: () => void;
}

const ACTION_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    upload_item: { label: 'Uploaded item', icon: 'shirt-outline', color: '#3b82f6' },
    wear_log: { label: 'Logged outfit', icon: 'checkmark-circle-outline', color: '#22c55e' },
    streak_bonus: { label: 'Streak bonus', icon: 'flame-outline', color: '#f97316' },
    first_of_day: { label: 'First of the day', icon: 'star-outline', color: '#eab308' },
    complete_challenge: { label: 'Challenge complete', icon: 'trophy-outline', color: '#8b5cf6' },
};

function getActionConfig(actionType: string) {
    return ACTION_CONFIG[actionType] || { label: actionType, icon: 'ellipse-outline' as const, color: '#9ca3af' };
}

function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const entryDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = today.getTime() - entryDay.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PointsHistorySheet({ visible, onClose }: PointsHistorySheetProps) {
    const [entries, setEntries] = useState<PointHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            loadHistory();
        }
    }, [visible]);

    const loadHistory = async () => {
        setIsLoading(true);
        const { entries: data } = await gamificationService.getPointsHistory(50);
        setEntries(data);
        setIsLoading(false);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Points History</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={22} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#6366f1" />
                        </View>
                    ) : entries.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="star-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyTitle}>No points yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Start uploading items and logging outfits to earn points!
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.content}
                        >
                            {entries.map(entry => {
                                const config = getActionConfig(entry.action_type);
                                return (
                                    <View key={entry.id} style={styles.entryRow}>
                                        <View style={[styles.entryIcon, { backgroundColor: config.color + '15' }]}>
                                            <Ionicons name={config.icon} size={18} color={config.color} />
                                        </View>
                                        <View style={styles.entryInfo}>
                                            <Text style={styles.entryLabel}>{config.label}</Text>
                                            <Text style={styles.entryDate}>
                                                {formatRelativeDate(entry.created_at)}
                                            </Text>
                                        </View>
                                        <View style={styles.pointsBadge}>
                                            <Text style={styles.pointsText}>+{entry.points}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        minHeight: 300,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1f2937',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 4,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    entryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 12,
    },
    entryIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
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
    entryDate: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 1,
    },
    pointsBadge: {
        backgroundColor: '#eef2ff',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    pointsText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6366f1',
    },
});
