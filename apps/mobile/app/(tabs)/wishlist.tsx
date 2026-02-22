/**
 * Wishlist Screen
 * Browse, sort, filter, and manage saved shopping scans
 * Story 8.7: Shopping Wishlist
 */

import { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useShoppingStore } from '../../stores/shoppingStore';
import { ShoppingScan, getCompatibilityRating } from '../../types/shopping';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_GAP) / 2;

type SortOption = 'score' | 'recent' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
    { key: 'score', label: 'Best Match' },
    { key: 'recent', label: 'Recent' },
    { key: 'price_asc', label: 'Price \u2191' },
    { key: 'price_desc', label: 'Price \u2193' },
];

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

function formatPrice(amount: number | null, currency: string | null): string | null {
    if (amount == null) return null;
    const symbol = currency === 'GBP' ? '\u00A3' : currency === 'EUR' ? '\u20AC' : currency === 'USD' ? '$' : (currency || '');
    return `${symbol}${amount.toFixed(2)}`;
}

function WishlistCard({
    scan,
    onPress,
    onLongPress,
}: {
    scan: ShoppingScan;
    onPress: () => void;
    onLongPress: () => void;
}) {
    const score = scan.compatibility_score ?? 0;
    const rating = getCompatibilityRating(score);
    const price = formatPrice(scan.price_amount, scan.price_currency);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            delayLongPress={400}
        >
            {scan.product_image_url ? (
                <Image source={{ uri: scan.product_image_url }} style={styles.cardImage} />
            ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                    <Ionicons name="image-outline" size={32} color="#d1d5db" />
                </View>
            )}

            {/* Score badge */}
            <View style={[styles.scoreBadge, { backgroundColor: rating.color }]}>
                <Text style={styles.scoreBadgeText}>{score}</Text>
            </View>

            <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                    {scan.product_name || 'Unknown Product'}
                </Text>
                {scan.product_brand && (
                    <Text style={styles.cardBrand} numberOfLines={1}>
                        {scan.product_brand}
                    </Text>
                )}
                <View style={styles.cardMeta}>
                    {price && <Text style={styles.cardPrice}>{price}</Text>}
                    <Text style={styles.cardDate}>{formatRelativeTime(scan.created_at)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function WishlistScreen() {
    const router = useRouter();
    const { wishlistScans, loadWishlist, toggleWishlist, reAnalyzeScan } = useShoppingStore();

    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [reAnalyzingId, setReAnalyzingId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;
            (async () => {
                await loadWishlist();
                if (mounted) setIsLoading(false);
            })();
            return () => { mounted = false; };
        }, [])
    );

    // Dynamic category chips from wishlist data
    const categories = useMemo(() => {
        const cats = new Set<string>();
        for (const scan of wishlistScans) {
            if (scan.category) cats.add(scan.category);
        }
        return Array.from(cats).sort();
    }, [wishlistScans]);

    // Filter + sort
    const displayedScans = useMemo(() => {
        let scans = [...wishlistScans];

        // Filter
        if (filterCategory) {
            scans = scans.filter((s) => s.category === filterCategory);
        }

        // Sort
        switch (sortBy) {
            case 'score':
                scans.sort((a, b) => (b.compatibility_score ?? 0) - (a.compatibility_score ?? 0));
                break;
            case 'recent':
                scans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
            case 'price_asc':
                scans.sort((a, b) => (a.price_amount ?? Infinity) - (b.price_amount ?? Infinity));
                break;
            case 'price_desc':
                scans.sort((a, b) => (b.price_amount ?? 0) - (a.price_amount ?? 0));
                break;
        }

        return scans;
    }, [wishlistScans, sortBy, filterCategory]);

    const handleTapItem = useCallback((scan: ShoppingScan) => {
        // Restore scan data in store, then navigate to results
        useShoppingStore.setState({
            currentScan: scan,
            currentAnalysis: {
                product_name: scan.product_name || 'Unknown Product',
                product_brand: scan.product_brand,
                category: scan.category || 'tops',
                color: scan.color || 'Unknown',
                secondary_colors: scan.secondary_colors || [],
                style: scan.style || 'casual',
                material: scan.material,
                pattern: scan.pattern || 'solid',
                season: scan.season || [],
                formality: scan.formality ?? 5,
                confidence: 1,
            },
            matchingItems: [],
            scoreExplanation: null,
            analysisProgress: 'done',
        });
        router.push('/(tabs)/scan-results');
    }, [router]);

    const handleLongPress = useCallback((scan: ShoppingScan) => {
        Alert.alert(
            scan.product_name || 'Product',
            undefined,
            [
                {
                    text: 'Re-analyze',
                    onPress: async () => {
                        setReAnalyzingId(scan.id);
                        const { success } = await reAnalyzeScan(scan.id);
                        setReAnalyzingId(null);
                        if (success) {
                            Alert.alert('Updated', 'Compatibility score refreshed with your current wardrobe.');
                        } else {
                            Alert.alert('Error', 'Failed to re-analyze. Please try again.');
                        }
                    },
                },
                {
                    text: 'Remove from Wishlist',
                    style: 'destructive',
                    onPress: () => toggleWishlist(scan.id),
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    }, [reAnalyzeScan, toggleWishlist]);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centerContainer]}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    Wishlist{wishlistScans.length > 0 ? ` (${wishlistScans.length})` : ''}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {wishlistScans.length === 0 ? (
                /* Empty State */
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="heart-outline" size={48} color="#d1d5db" />
                    </View>
                    <Text style={styles.emptyTitle}>No saved items yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Scan products and tap the heart to save them here for later.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyCta}
                        onPress={() => router.push('/(tabs)/shopping')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="camera-outline" size={18} color="#fff" />
                        <Text style={styles.emptyCtaText}>Start Scanning</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Sort Chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.sortBar}
                    >
                        {SORT_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.key}
                                style={[styles.sortChip, sortBy === option.key && styles.sortChipActive]}
                                onPress={() => setSortBy(option.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.sortChipText, sortBy === option.key && styles.sortChipTextActive]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Category Filter Chips */}
                    {categories.length > 1 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterBar}
                        >
                            <TouchableOpacity
                                style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
                                onPress={() => setFilterCategory(null)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>
                                    All
                                </Text>
                            </TouchableOpacity>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
                                    onPress={() => setFilterCategory(filterCategory === cat ? null : cat)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {/* Re-analyzing indicator */}
                    {reAnalyzingId && (
                        <View style={styles.reAnalyzingBanner}>
                            <ActivityIndicator size="small" color="#6366f1" />
                            <Text style={styles.reAnalyzingText}>Re-analyzing compatibility...</Text>
                        </View>
                    )}

                    {/* Grid */}
                    {displayedScans.length > 0 ? (
                        <View style={styles.grid}>
                            {displayedScans.map((scan) => (
                                <WishlistCard
                                    key={scan.id}
                                    scan={scan}
                                    onPress={() => handleTapItem(scan)}
                                    onLongPress={() => handleLongPress(scan)}
                                />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.noResults}>
                            <Text style={styles.noResultsText}>No items match this filter</Text>
                            <TouchableOpacity onPress={() => setFilterCategory(null)}>
                                <Text style={styles.clearFilterText}>Clear filter</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Hint */}
                    <Text style={styles.hint}>Long-press an item to re-analyze or remove</Text>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    contentContainer: {
        paddingTop: 60,
        paddingBottom: 120,
    },
    centerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    emptyIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emptyCta: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        borderRadius: 14,
        paddingHorizontal: 24,
        paddingVertical: 14,
        gap: 8,
    },
    emptyCtaText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },

    // Sort bar
    sortBar: {
        paddingHorizontal: 24,
        gap: 8,
        marginBottom: 12,
    },
    sortChip: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sortChipActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    sortChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    sortChipTextActive: {
        color: '#fff',
    },

    // Filter bar
    filterBar: {
        paddingHorizontal: 24,
        gap: 8,
        marginBottom: 16,
    },
    filterChip: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    filterChipActive: {
        backgroundColor: '#eef2ff',
        borderColor: '#6366f1',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6b7280',
    },
    filterChipTextActive: {
        color: '#6366f1',
    },

    // Re-analyzing banner
    reAnalyzingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eef2ff',
        marginHorizontal: 24,
        borderRadius: 10,
        padding: 10,
        gap: 8,
        marginBottom: 12,
    },
    reAnalyzingText: {
        fontSize: 13,
        color: '#6366f1',
        fontWeight: '500',
    },

    // Grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        gap: CARD_GAP,
    },
    card: {
        width: CARD_WIDTH,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cardImage: {
        width: '100%',
        height: CARD_WIDTH * 1.1,
        backgroundColor: '#f3f4f6',
    },
    cardImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    scoreBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    cardInfo: {
        padding: 10,
    },
    cardName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    cardBrand: {
        fontSize: 11,
        color: '#6b7280',
        marginBottom: 4,
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardPrice: {
        fontSize: 13,
        fontWeight: '700',
        color: '#5D4E37',
    },
    cardDate: {
        fontSize: 11,
        color: '#9ca3af',
    },

    // No results
    noResults: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    noResultsText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    clearFilterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },

    // Hint
    hint: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 16,
    },
});
