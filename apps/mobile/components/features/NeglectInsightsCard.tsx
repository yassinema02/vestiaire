/**
 * NeglectInsightsCard
 * Story 13.1: Shows neglect analytics on the analytics screen.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { NeglectStats } from '../../services/neglectService';
import { formatNeglectedLabel } from '../../utils/neglectedItems';

interface NeglectInsightsCardProps {
    stats: NeglectStats;
    thresholdDays: number;
}

function getBarColor(percentage: number): string {
    if (percentage < 10) return '#22c55e';   // green
    if (percentage <= 25) return '#f59e0b';  // yellow/amber
    return '#ef4444';                         // red
}

export default function NeglectInsightsCard({ stats, thresholdDays }: NeglectInsightsCardProps) {
    const router = useRouter();
    const barColor = getBarColor(stats.percentage);

    if (stats.totalCount === 0) return null;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                <Text style={styles.headerTitle}>Wardrobe Neglect</Text>
            </View>

            {/* Stat line */}
            <Text style={styles.statLine}>
                {stats.neglectedCount === 0
                    ? 'No neglected items — great job!'
                    : `${stats.percentage}% neglected (${stats.neglectedCount} of ${stats.totalCount} items)`}
            </Text>

            {/* Progress bar */}
            <View style={styles.barBackground}>
                <View
                    style={[
                        styles.barFill,
                        { width: `${Math.min(stats.percentage, 100)}%`, backgroundColor: barColor },
                    ]}
                />
            </View>
            <Text style={styles.barLabel}>{stats.percentage}%</Text>

            {/* Top neglected items */}
            {stats.topNeglected.length > 0 && (
                <View style={styles.topSection}>
                    <Text style={styles.topTitle}>Most neglected:</Text>
                    {stats.topNeglected.map((item) => (
                        <View key={item.id} style={styles.topItem}>
                            <Image
                                source={{ uri: item.processed_image_url || item.image_url }}
                                style={styles.topItemImage}
                            />
                            <View style={styles.topItemInfo}>
                                <Text style={styles.topItemName} numberOfLines={1}>
                                    {item.name || item.category || 'Item'}
                                </Text>
                                <Text style={styles.topItemLabel}>
                                    {formatNeglectedLabel(item)}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Threshold info */}
            <Text style={styles.thresholdText}>
                Items not worn in {thresholdDays}+ days
            </Text>

            {/* View All link */}
            {stats.neglectedCount > 0 && (
                <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => router.push('/(tabs)/wardrobe')}
                >
                    <Text style={styles.viewAllText}>View All Neglected Items</Text>
                    <Ionicons name="chevron-forward" size={16} color="#6366f1" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    statLine: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 10,
    },
    barBackground: {
        height: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },
    barLabel: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'right',
        marginTop: 4,
        marginBottom: 12,
    },
    topSection: {
        marginBottom: 12,
    },
    topTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 8,
    },
    topItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    topItemImage: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    topItemInfo: {
        flex: 1,
    },
    topItemName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    topItemLabel: {
        fontSize: 12,
        color: '#f59e0b',
    },
    thresholdText: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 12,
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
});
