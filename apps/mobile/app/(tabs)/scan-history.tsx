/**
 * Scan History Screen
 * Browse past scans with filters, stats, and actions
 * Story 8.8: Scan History & Analytics
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useShoppingStore } from '../../stores/shoppingStore';
import {
    ShoppingScan,
    ScanHistoryFilters,
    ScanStatistics,
    getCompatibilityRating,
} from '../../types/shopping';

// --- Date helpers ---

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfWeek(): Date {
    const d = startOfToday();
    d.setDate(d.getDate() - d.getDay());
    return d;
}

function startOfMonth(): Date {
    const d = startOfToday();
    d.setDate(1);
    return d;
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

// --- Filter/Sort config ---

type DateRange = ScanHistoryFilters['dateRange'];
type ScoreFilter = 80 | 60 | null;
type TypeFilter = ScanHistoryFilters['type'];

const DATE_OPTIONS: { key: DateRange; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'month', label: 'This Month' },
    { key: 'week', label: 'This Week' },
    { key: 'today', label: 'Today' },
];

const SCORE_OPTIONS: { key: ScoreFilter; label: string }[] = [
    { key: null, label: 'All' },
    { key: 60, label: '60+' },
    { key: 80, label: '80+' },
];

// --- Stats calculation ---

function computeStats(scans: ShoppingScan[]): ScanStatistics {
    const scored = scans.filter((s) => s.compatibility_score != null);
    const avgScore = scored.length > 0
        ? Math.round(scored.reduce((sum, s) => sum + (s.compatibility_score ?? 0), 0) / scored.length)
        : 0;

    const wishlistedCount = scans.filter((s) => s.is_wishlisted).length;

    // Most common category
    const catCounts = new Map<string, number>();
    for (const s of scans) {
        if (s.category) {
            catCounts.set(s.category, (catCounts.get(s.category) || 0) + 1);
        }
    }
    let topCategory: string | null = null;
    let maxCount = 0;
    for (const [cat, count] of catCounts) {
        if (count > maxCount) {
            topCategory = cat;
            maxCount = count;
        }
    }

    return {
        totalScans: scans.length,
        avgScore,
        wishlistedCount,
        topCategory,
    };
}

// --- Scan Card ---

function ScanCard({
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
                    <Ionicons name="image-outline" size={24} color="#d1d5db" />
                </View>
            )}

            <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                    <Text style={styles.cardName} numberOfLines={1}>
                        {scan.product_name || 'Unknown Product'}
                    </Text>
                    {scan.is_wishlisted && (
                        <Ionicons name="heart" size={14} color="#ef4444" />
                    )}
                </View>
                {scan.product_brand && (
                    <Text style={styles.cardBrand} numberOfLines={1}>{scan.product_brand}</Text>
                )}
                <View style={styles.cardBottom}>
                    <View style={styles.cardMeta}>
                        <Ionicons
                            name={scan.scan_method === 'url' ? 'link-outline' : 'camera-outline'}
                            size={12}
                            color="#9ca3af"
                        />
                        <Text style={styles.cardDate}>{formatRelativeTime(scan.created_at)}</Text>
                    </View>
                    <View style={[styles.scorePill, { backgroundColor: rating.color + '18' }]}>
                        <Text style={[styles.scorePillText, { color: rating.color }]}>{score}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// --- Main Screen ---

export default function ScanHistoryScreen() {
    const router = useRouter();
    const { scanHistory, loadHistory, deleteScan, reAnalyzeScan } = useShoppingStore();

    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange>('all');
    const [minScore, setMinScore] = useState<ScoreFilter>(null);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [reAnalyzingId, setReAnalyzingId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;
            (async () => {
                await loadHistory(50);
                if (mounted) setIsLoading(false);
            })();
            return () => { mounted = false; };
        }, [])
    );

    // Client-side filtering
    const filteredScans = useMemo(() => {
        let scans = [...scanHistory];

        // Date filter
        if (dateRange !== 'all') {
            const cutoff = dateRange === 'today' ? startOfToday()
                : dateRange === 'week' ? startOfWeek()
                : startOfMonth();
            scans = scans.filter((s) => new Date(s.created_at) >= cutoff);
        }

        // Score filter
        if (minScore != null) {
            scans = scans.filter((s) => (s.compatibility_score ?? 0) >= minScore);
        }

        // Type filter
        if (typeFilter === 'wishlisted') {
            scans = scans.filter((s) => s.is_wishlisted);
        }

        return scans;
    }, [scanHistory, dateRange, minScore, typeFilter]);

    // Stats from filtered data
    const stats = useMemo(() => computeStats(filteredScans), [filteredScans]);

    const handleTapItem = useCallback((scan: ShoppingScan) => {
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
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Delete Scan',
                            'This will permanently remove this scan.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => deleteScan(scan.id),
                                },
                            ]
                        );
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    }, [reAnalyzeScan, deleteScan]);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centerContainer]}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    const hasActiveFilters = dateRange !== 'all' || minScore != null || typeFilter !== 'all';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan History</Text>
                <View style={{ width: 40 }} />
            </View>

            {scanHistory.length === 0 ? (
                /* Empty State */
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="time-outline" size={48} color="#d1d5db" />
                    </View>
                    <Text style={styles.emptyTitle}>No scans yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Scan a product to check how well it fits your wardrobe.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyCta}
                        onPress={() => router.push('/(tabs)/shopping')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="camera-outline" size={18} color="#fff" />
                        <Text style={styles.emptyCtaText}>Scan Now</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Stats Bar */}
                    <View style={styles.statsBar}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.totalScans}</Text>
                            <Text style={styles.statLabel}>scans</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.avgScore || '—'}</Text>
                            <Text style={styles.statLabel}>avg score</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.wishlistedCount}</Text>
                            <Text style={styles.statLabel}>saved</Text>
                        </View>
                        {stats.topCategory && (
                            <>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>
                                        {stats.topCategory.charAt(0).toUpperCase() + stats.topCategory.slice(1)}
                                    </Text>
                                    <Text style={styles.statLabel}>top category</Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Date Filter */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterRow}
                    >
                        {DATE_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.key}
                                style={[styles.chip, dateRange === option.key && styles.chipActive]}
                                onPress={() => setDateRange(option.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, dateRange === option.key && styles.chipTextActive]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Score + Type Filter */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterRow}
                    >
                        {SCORE_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={String(option.key)}
                                style={[styles.chip, minScore === option.key && styles.chipActive]}
                                onPress={() => setMinScore(option.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, minScore === option.key && styles.chipTextActive]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <View style={styles.filterSpacer} />
                        <TouchableOpacity
                            style={[styles.chip, typeFilter === 'wishlisted' && styles.chipSaved]}
                            onPress={() => setTypeFilter(typeFilter === 'wishlisted' ? 'all' : 'wishlisted')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={typeFilter === 'wishlisted' ? 'heart' : 'heart-outline'}
                                size={13}
                                color={typeFilter === 'wishlisted' ? '#ef4444' : '#6b7280'}
                            />
                            <Text style={[styles.chipText, typeFilter === 'wishlisted' && styles.chipTextSaved]}>
                                Saved
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Re-analyzing indicator */}
                    {reAnalyzingId && (
                        <View style={styles.reAnalyzingBanner}>
                            <ActivityIndicator size="small" color="#6366f1" />
                            <Text style={styles.reAnalyzingText}>Re-analyzing compatibility...</Text>
                        </View>
                    )}

                    {/* Scan List */}
                    {filteredScans.length > 0 ? (
                        <View style={styles.list}>
                            {filteredScans.map((scan) => (
                                <ScanCard
                                    key={scan.id}
                                    scan={scan}
                                    onPress={() => handleTapItem(scan)}
                                    onLongPress={() => handleLongPress(scan)}
                                />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.noResults}>
                            <Ionicons name="filter-outline" size={32} color="#d1d5db" />
                            <Text style={styles.noResultsText}>No scans match these filters</Text>
                            {hasActiveFilters && (
                                <TouchableOpacity
                                    onPress={() => { setDateRange('all'); setMinScore(null); setTypeFilter('all'); }}
                                >
                                    <Text style={styles.clearFilterText}>Clear all filters</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Hint */}
                    {filteredScans.length > 0 && (
                        <Text style={styles.hint}>Long-press a scan to re-analyze or delete</Text>
                    )}
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

    // Stats bar
    statsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 24,
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
    },
    statLabel: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#e5e7eb',
    },

    // Filters
    filterRow: {
        paddingHorizontal: 24,
        gap: 8,
        marginBottom: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 4,
    },
    chipActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    chipSaved: {
        backgroundColor: '#fef2f2',
        borderColor: '#fca5a5',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    chipTextActive: {
        color: '#fff',
    },
    chipTextSaved: {
        color: '#ef4444',
    },
    filterSpacer: {
        width: 8,
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

    // Scan list
    list: {
        paddingHorizontal: 24,
        gap: 10,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cardImage: {
        width: 72,
        height: 72,
        backgroundColor: '#f3f4f6',
    },
    cardImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        flex: 1,
    },
    cardBrand: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 1,
    },
    cardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardDate: {
        fontSize: 11,
        color: '#9ca3af',
    },
    scorePill: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    scorePillText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // No results
    noResults: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    noResultsText: {
        fontSize: 14,
        color: '#6b7280',
    },
    clearFilterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
        marginTop: 4,
    },

    // Hint
    hint: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 16,
    },
});
