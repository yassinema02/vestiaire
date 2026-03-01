/**
 * ResaleSuccessCard
 * Story 13.3: Displays resale earnings and activity stats on analytics screen.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ResaleSuccessCardProps {
    totalListed: number;
    totalSold: number;
    totalRevenue: number;
}

export default function ResaleSuccessCard({ totalListed, totalSold, totalRevenue }: ResaleSuccessCardProps) {
    const router = useRouter();

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons name="cash-outline" size={18} color="#22c55e" />
                <Text style={styles.headerTitle}>Resale Success</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsSection}>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total earned</Text>
                    <Text style={styles.revenueText}>£{totalRevenue.toFixed(0)}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Items sold</Text>
                    <Text style={styles.statValue}>{totalSold}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Items listed</Text>
                    <Text style={styles.statValue}>{totalListed}</Text>
                </View>
            </View>

            {/* View History link */}
            <TouchableOpacity
                style={styles.viewHistoryButton}
                onPress={() => router.push('/(tabs)/profile')}
            >
                <Text style={styles.viewHistoryText}>View Listing History</Text>
                <Ionicons name="chevron-forward" size={16} color="#6366f1" />
            </TouchableOpacity>
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
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    statsSection: {
        gap: 10,
        marginBottom: 16,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    revenueText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#22c55e',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    viewHistoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    viewHistoryText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
});
