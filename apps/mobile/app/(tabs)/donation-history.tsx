/**
 * Donation History Screen
 * Story 13.6: Displays donation log with stats and sustainability impact.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { donationService, DonationEntry, DonationStats } from '../../services/donationService';

export default function DonationHistoryScreen() {
    const router = useRouter();
    const [donations, setDonations] = useState<DonationEntry[]>([]);
    const [stats, setStats] = useState<DonationStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        const [historyResult, statsResult] = await Promise.all([
            donationService.getDonationHistory(),
            donationService.getDonationStats(),
        ]);
        setDonations(historyResult.donations);
        setStats(statsResult);
        setIsLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/profile')}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Donations</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Stats Summary */}
                {stats && stats.totalDonated > 0 && (
                    <View style={styles.statsCard}>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.totalDonated}</Text>
                                <Text style={styles.statLabel}>Donated</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#22c55e' }]}>
                                    {stats.estimatedWeight.toFixed(1)}kg
                                </Text>
                                <Text style={styles.statLabel}>Weight</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#6366f1' }]}>
                                    £{stats.totalEstimatedValue.toFixed(0)}
                                </Text>
                                <Text style={styles.statLabel}>Est. Value</Text>
                            </View>
                        </View>

                        {/* Sustainability */}
                        <View style={styles.sustainRow}>
                            <Ionicons name="leaf-outline" size={16} color="#22c55e" />
                            <Text style={styles.sustainText}>
                                You donated ~{stats.estimatedWeight.toFixed(1)}kg of clothing
                            </Text>
                        </View>

                        {stats.thisYearValue > 0 && (
                            <View style={styles.sustainRow}>
                                <Ionicons name="cash-outline" size={16} color="#6366f1" />
                                <Text style={styles.sustainText}>
                                    £{stats.thisYearValue.toFixed(0)} donated this year (tax est.)
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Content */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#f59e0b" />
                    </View>
                ) : donations.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="gift-outline" size={64} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>No donations yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Donate neglected items to get started
                        </Text>
                    </View>
                ) : (
                    donations.map((donation) => (
                        <TouchableOpacity
                            key={donation.id}
                            style={styles.donationCard}
                            onPress={() => router.push({
                                pathname: '/(tabs)/item-detail',
                                params: { itemId: donation.item_id },
                            })}
                            activeOpacity={0.7}
                        >
                            <Image
                                source={{ uri: donation.item?.processed_image_url || donation.item?.image_url || '' }}
                                style={styles.itemImage}
                            />
                            <View style={styles.cardInfo}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {donation.item?.name || donation.item?.category || 'Item'}
                                </Text>
                                {donation.charity && (
                                    <Text style={styles.charityText} numberOfLines={1}>
                                        To: {donation.charity}
                                    </Text>
                                )}
                                <Text style={styles.dateText}>{formatDate(donation.donated_at)}</Text>
                            </View>
                            {donation.estimated_value != null && donation.estimated_value > 0 && (
                                <Text style={styles.valueText}>£{donation.estimated_value.toFixed(0)}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f59e0b',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    sustainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f0fdf4',
        borderRadius: 8,
        padding: 8,
        marginBottom: 6,
    },
    sustainText: {
        fontSize: 13,
        color: '#16a34a',
        fontWeight: '500',
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#9ca3af',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#d1d5db',
        marginTop: 4,
    },
    donationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        gap: 12,
    },
    itemImage: {
        width: 48,
        height: 48,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
    },
    cardInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
    },
    charityText: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 1,
    },
    dateText: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    valueText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
});
