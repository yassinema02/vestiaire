/**
 * ResaleHistoryCard
 * Story 13.5: Compact dashboard card for profile showing resale earnings + sustainability.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ResaleHistoryCardProps {
    totalListed: number;
    totalSold: number;
    totalRevenue: number;
}

export default function ResaleHistoryCard({ totalListed, totalSold, totalRevenue }: ResaleHistoryCardProps) {
    const router = useRouter();

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons name="cash-outline" size={18} color="#22c55e" />
                <Text style={styles.headerTitle}>Resale History</Text>
            </View>

            {/* Earnings */}
            <Text style={styles.earningsText}>
                You've earned £{totalRevenue.toFixed(0)} from resales
            </Text>
            <Text style={styles.statsLine}>
                {totalSold} item{totalSold !== 1 ? 's' : ''} sold · {totalListed} currently listed
            </Text>

            {/* Sustainability */}
            {totalSold > 0 && (
                <View style={styles.sustainRow}>
                    <Ionicons name="leaf-outline" size={16} color="#22c55e" />
                    <Text style={styles.sustainText}>
                        You kept {totalSold} item{totalSold !== 1 ? 's' : ''} out of landfills
                    </Text>
                </View>
            )}

            {/* View History link */}
            <TouchableOpacity
                style={styles.viewButton}
                onPress={() => router.push('/(tabs)/listing-history')}
            >
                <Text style={styles.viewText}>View Full History</Text>
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
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    earningsText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#22c55e',
        marginBottom: 4,
    },
    statsLine: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 12,
    },
    sustainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f0fdf4',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    sustainText: {
        fontSize: 13,
        color: '#16a34a',
        fontWeight: '500',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    viewText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
});
