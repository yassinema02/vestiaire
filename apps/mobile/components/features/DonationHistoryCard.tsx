/**
 * DonationHistoryCard
 * Story 13.6: Profile card showing donation stats + sustainability impact.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DonationStats } from '../../services/donationService';

interface DonationHistoryCardProps {
    stats: DonationStats;
}

export default function DonationHistoryCard({ stats }: DonationHistoryCardProps) {
    const router = useRouter();

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons name="gift-outline" size={18} color="#f59e0b" />
                <Text style={styles.headerTitle}>Donation History</Text>
            </View>

            {/* Count */}
            <Text style={styles.countText}>
                You've donated {stats.totalDonated} item{stats.totalDonated !== 1 ? 's' : ''}
            </Text>

            {/* Weight metric */}
            <View style={styles.metricRow}>
                <Ionicons name="leaf-outline" size={16} color="#22c55e" />
                <Text style={styles.metricText}>
                    You donated ~{stats.estimatedWeight.toFixed(1)}kg of clothing
                </Text>
            </View>

            {/* Tax deduction (conditional) */}
            {stats.thisYearValue > 0 && (
                <View style={styles.metricRow}>
                    <Ionicons name="cash-outline" size={16} color="#6366f1" />
                    <Text style={styles.metricText}>
                        £{stats.thisYearValue.toFixed(0)} donated this year (tax est.)
                    </Text>
                </View>
            )}

            {/* View History link */}
            <TouchableOpacity
                style={styles.viewButton}
                onPress={() => router.push('/(tabs)/donation-history')}
            >
                <Text style={styles.viewText}>View Donation History</Text>
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
    countText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#f59e0b',
        marginBottom: 12,
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    metricText: {
        fontSize: 13,
        color: '#4b5563',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    viewText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
});
