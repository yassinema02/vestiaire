/**
 * Listing History Screen
 * Story 7.4: Listing History Tracking
 * Displays resale listings with status management, filters, and stats.
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
    Alert,
    TextInput,
    Modal,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
    listingService,
    ResaleListing,
    ListingStatus,
} from '../../services/listingService';
import ListingGeneratorModal from '../../components/features/ListingGeneratorModal';
import { WardrobeItem } from '../../services/items';

const STATUS_FILTERS: { id: ListingStatus | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'listed', label: 'Listed' },
    { id: 'sold', label: 'Sold' },
    { id: 'cancelled', label: 'Cancelled' },
];

const STATUS_CONFIG: Record<ListingStatus, { color: string; bg: string; icon: string }> = {
    listed: { color: '#2563eb', bg: '#eff6ff', icon: 'pricetag' },
    sold: { color: '#16a34a', bg: '#f0fdf4', icon: 'checkmark-circle' },
    cancelled: { color: '#9ca3af', bg: '#f3f4f6', icon: 'close-circle' },
};

export default function ListingHistoryScreen() {
    const router = useRouter();
    const [listings, setListings] = useState<ResaleListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all');
    const [stats, setStats] = useState({ totalListed: 0, totalSold: 0, totalRevenue: 0 });

    // Sold price modal
    const [showSoldModal, setShowSoldModal] = useState(false);
    const [soldPriceInput, setSoldPriceInput] = useState('');
    const [pendingSoldListingId, setPendingSoldListingId] = useState<string | null>(null);

    // Re-generate modal
    const [showRegenerateModal, setShowRegenerateModal] = useState(false);
    const [regenerateItem, setRegenerateItem] = useState<WardrobeItem | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        const filter = statusFilter === 'all' ? undefined : statusFilter;
        const [historyResult, statsResult] = await Promise.all([
            listingService.getHistory(filter),
            listingService.getResaleStats(),
        ]);
        setListings(historyResult.listings);
        setStats({
            totalListed: statsResult.totalListed,
            totalSold: statsResult.totalSold,
            totalRevenue: statsResult.totalRevenue,
        });
        setIsLoading(false);
    }, [statusFilter]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleMarkSold = (listingId: string) => {
        setPendingSoldListingId(listingId);
        setSoldPriceInput('');
        setShowSoldModal(true);
    };

    const confirmMarkSold = async () => {
        if (!pendingSoldListingId) return;
        const price = soldPriceInput ? parseFloat(soldPriceInput) : undefined;
        setShowSoldModal(false);
        const { error } = await listingService.updateStatus(pendingSoldListingId, 'sold', price);
        if (error) {
            Alert.alert('Error', error);
        }
        loadData();
    };

    const handleCancel = (listingId: string) => {
        Alert.alert(
            'Cancel Listing',
            'Are you sure you want to cancel this listing?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await listingService.updateStatus(listingId, 'cancelled');
                        if (error) Alert.alert('Error', error);
                        loadData();
                    },
                },
            ]
        );
    };

    const handleRegenerate = (item: WardrobeItem) => {
        setRegenerateItem(item);
        setShowRegenerateModal(true);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Listings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.totalListed}</Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.totalSold}</Text>
                        <Text style={styles.statLabel}>Sold</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#6366f1' }]}>
                            {stats.totalRevenue > 0 ? `$${stats.totalRevenue.toFixed(0)}` : '$0'}
                        </Text>
                        <Text style={styles.statLabel}>Revenue</Text>
                    </View>
                </View>

                {/* Filter Chips */}
                <View style={styles.filterRow}>
                    {STATUS_FILTERS.map((f) => (
                        <TouchableOpacity
                            key={f.id}
                            style={[styles.filterChip, statusFilter === f.id && styles.filterChipActive]}
                            onPress={() => setStatusFilter(f.id)}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    statusFilter === f.id && styles.filterChipTextActive,
                                ]}
                            >
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Content */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6366f1" />
                    </View>
                ) : listings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="pricetags-outline" size={64} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>No listings yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Generate listings from your wardrobe items to start selling
                        </Text>
                    </View>
                ) : (
                    listings.map((listing) => (
                        <ListingCard
                            key={listing.id}
                            listing={listing}
                            onMarkSold={handleMarkSold}
                            onCancel={handleCancel}
                            onRegenerate={handleRegenerate}
                            onViewItem={(itemId) =>
                                router.push({
                                    pathname: '/(tabs)/item-detail',
                                    params: { itemId },
                                })
                            }
                            formatDate={formatDate}
                        />
                    ))
                )}
            </ScrollView>

            {/* Sold Price Modal */}
            <Modal visible={showSoldModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Mark as Sold</Text>
                        <Text style={styles.modalSubtitle}>
                            Enter the sold price to track your revenue (optional)
                        </Text>
                        <TextInput
                            style={styles.priceInput}
                            placeholder="Sold price (e.g. 25)"
                            placeholderTextColor="#9ca3af"
                            keyboardType="decimal-pad"
                            value={soldPriceInput}
                            onChangeText={setSoldPriceInput}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowSoldModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmMarkSold}>
                                <Ionicons name="checkmark" size={18} color="#fff" />
                                <Text style={styles.modalConfirmText}>Mark Sold</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Re-generate Modal */}
            {regenerateItem && (
                <ListingGeneratorModal
                    visible={showRegenerateModal}
                    item={regenerateItem}
                    onDismiss={() => {
                        setShowRegenerateModal(false);
                        setRegenerateItem(null);
                    }}
                />
            )}
        </View>
    );
}

// ─── Listing Card Component ─────────────────────────────────────

function ListingCard({
    listing,
    onMarkSold,
    onCancel,
    onRegenerate,
    onViewItem,
    formatDate,
}: {
    listing: ResaleListing;
    onMarkSold: (id: string) => void;
    onCancel: (id: string) => void;
    onRegenerate: (item: WardrobeItem) => void;
    onViewItem: (itemId: string) => void;
    formatDate: (d: string) => string;
}) {
    const config = STATUS_CONFIG[listing.status];
    const item = listing.item;
    const imageUrl = item?.processed_image_url || item?.image_url;

    return (
        <View style={styles.card}>
            <TouchableOpacity
                style={styles.cardTop}
                onPress={() => onViewItem(listing.item_id)}
                activeOpacity={0.7}
            >
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                        <Ionicons name="shirt-outline" size={24} color="#d1d5db" />
                    </View>
                )}
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {listing.title}
                    </Text>
                    <Text style={styles.cardDescription} numberOfLines={2}>
                        {listing.description}
                    </Text>
                    <View style={styles.cardMeta}>
                        <Text style={styles.cardDate}>{formatDate(listing.created_at)}</Text>
                        {listing.sold_price != null && listing.status === 'sold' && (
                            <Text style={styles.cardSoldPrice}>${listing.sold_price.toFixed(0)}</Text>
                        )}
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon as any} size={12} color={config.color} />
                    <Text style={[styles.statusText, { color: config.color }]}>
                        {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Action buttons for active listings */}
            {listing.status === 'listed' && (
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onMarkSold(listing.id)}
                    >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                        <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>Mark Sold</Text>
                    </TouchableOpacity>
                    {item && (
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => onRegenerate(item)}
                        >
                            <Ionicons name="refresh-outline" size={16} color="#6366f1" />
                            <Text style={[styles.actionBtnText, { color: '#6366f1' }]}>Re-generate</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onCancel(listing.id)}
                    >
                        <Ionicons name="close-circle-outline" size={16} color="#9ca3af" />
                        <Text style={[styles.actionBtnText, { color: '#9ca3af' }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────

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
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1f2937',
    },
    statLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    // Filters
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 16,
    },
    filterChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    filterChipActive: {
        backgroundColor: '#6366f1',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    filterChipTextActive: {
        color: '#fff',
    },
    // Loading
    loadingContainer: {
        paddingTop: 60,
        alignItems: 'center',
    },
    // Empty
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 20,
    },
    // Card
    card: {
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    cardTop: {
        flexDirection: 'row',
        padding: 14,
        gap: 12,
    },
    cardImage: {
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: '#f9fafb',
    },
    cardImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    cardDescription: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
        marginBottom: 4,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardDate: {
        fontSize: 12,
        color: '#9ca3af',
    },
    cardSoldPrice: {
        fontSize: 13,
        fontWeight: '700',
        color: '#16a34a',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        height: 26,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    // Card actions
    cardActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
        lineHeight: 20,
    },
    priceInput: {
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1f2937',
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6b7280',
    },
    modalConfirmBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#16a34a',
    },
    modalConfirmText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});
