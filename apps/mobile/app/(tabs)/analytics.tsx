/**
 * Analytics Screen
 * Story 5.5: Most Worn Items Leaderboard
 * Story 5.6: Wardrobe Analytics Dashboard
 * Story 6.5: Sustainability Score
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
import {
    wearLogService,
    MostWornItem,
    DateRangeFilter,
    getCurrentSeasonName,
} from '../../services/wearLogService';
import {
    analyticsService,
    WardrobeStats,
    CategoryBreakdown,
    DailyWearCount,
    SustainabilityScore,
} from '../../services/analyticsService';
import SustainabilityCard from '../../components/features/SustainabilityCard';
import ResaleCandidatesCard from '../../components/features/ResaleCandidatesCard';
import { resaleService, ResaleCandidate } from '../../services/resaleService';
import { itemsService } from '../../services/items';

const CATEGORIES = [
    { id: null, label: 'All' },
    { id: 'tops', label: 'Tops' },
    { id: 'bottoms', label: 'Bottoms' },
    { id: 'dresses', label: 'Dresses' },
    { id: 'outerwear', label: 'Outerwear' },
    { id: 'shoes', label: 'Shoes' },
    { id: 'accessories', label: 'Accessories' },
];

const TIME_FILTERS: { id: DateRangeFilter; label: string }[] = [
    { id: 'all_time', label: 'All Time' },
    { id: 'this_month', label: 'This Month' },
    { id: 'this_season', label: `This Season` },
];

const MEDAL_COLORS = {
    gold: '#fbbf24',
    silver: '#9ca3af',
    bronze: '#d97706',
};

export default function AnalyticsScreen() {
    const router = useRouter();

    // Dashboard state
    const [stats, setStats] = useState<WardrobeStats | null>(null);
    const [isDashboardLoading, setIsDashboardLoading] = useState(true);
    const [sustainability, setSustainability] = useState<SustainabilityScore | null>(null);
    const [resaleCandidates, setResaleCandidates] = useState<ResaleCandidate[]>([]);

    // Leaderboard state
    const [mostWorn, setMostWorn] = useState<MostWornItem[]>([]);
    const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState<DateRangeFilter>('all_time');

    const loadDashboard = useCallback(async () => {
        setIsDashboardLoading(true);
        const [wardrobeResult, sustainResult, itemsResult] = await Promise.all([
            analyticsService.getWardrobeStats(),
            analyticsService.getSustainabilityScore(),
            itemsService.getItems(),
        ]);
        setStats(wardrobeResult.stats);
        setSustainability(sustainResult.score);
        setResaleCandidates(resaleService.getResaleCandidates(itemsResult.items));
        setIsDashboardLoading(false);
    }, []);

    const loadLeaderboard = useCallback(async () => {
        setIsLeaderboardLoading(true);
        const { items } = await wearLogService.getMostWornItems({
            limit: 10,
            category: selectedCategory || undefined,
            dateRange: timeFilter,
        });
        setMostWorn(items);
        setIsLeaderboardLoading(false);
    }, [selectedCategory, timeFilter]);

    useFocusEffect(
        useCallback(() => {
            loadDashboard();
            loadLeaderboard();
        }, [loadDashboard, loadLeaderboard])
    );

    const top3 = mostWorn.slice(0, 3);
    const rest = mostWorn.slice(3);
    const mvp = mostWorn[0];
    const seasonName = getCurrentSeasonName();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Wardrobe Analytics</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ===== DASHBOARD SECTION ===== */}
                {isDashboardLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6366f1" />
                    </View>
                ) : stats && (
                    <>
                        {/* Summary Stats */}
                        <View style={styles.statsRow}>
                            <StatCard
                                label="Items"
                                value={String(stats.totalItems)}
                                icon="shirt-outline"
                                color="#3b82f6"
                            />
                            <StatCard
                                label="Value"
                                value={`$${formatCompact(stats.totalValue)}`}
                                icon="cash-outline"
                                color="#22c55e"
                            />
                            <StatCard
                                label="Avg CPW"
                                value={stats.averageCPW > 0 ? `$${stats.averageCPW.toFixed(0)}` : '—'}
                                icon="trending-down-outline"
                                color="#f97316"
                            />
                        </View>

                        {/* Category Distribution */}
                        {stats.categoryBreakdown.length > 0 && (
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionCardTitle}>Category Distribution</Text>
                                <CategoryChart breakdown={stats.categoryBreakdown} />
                            </View>
                        )}

                        {/* Wear Frequency */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionCardTitle}>Wear Frequency (30 days)</Text>
                            <WearFrequencyChart data={stats.wearFrequency} />
                        </View>

                        {/* Insights */}
                        {stats.insights.length > 0 && (
                            <View style={styles.sectionCard}>
                                <View style={styles.insightsHeader}>
                                    <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
                                    <Text style={styles.sectionCardTitle}>Insights</Text>
                                </View>
                                {stats.insights.map((insight, i) => (
                                    <View key={i} style={styles.insightRow}>
                                        <Text style={styles.insightBullet}>•</Text>
                                        <Text style={styles.insightText}>
                                            {renderBoldText(insight)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Wear Calendar */}
                        <TouchableOpacity
                            style={styles.calendarCard}
                            onPress={() => router.push('/(tabs)/wear-calendar')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.calendarIconWrap}>
                                <Ionicons name="calendar-outline" size={20} color="#fff" />
                            </View>
                            <View style={styles.calendarContent}>
                                <Text style={styles.calendarTitle}>Wear Calendar</Text>
                                <Text style={styles.calendarSubtitle}>View your outfit history by day</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#6366f1" />
                        </TouchableOpacity>

                        {/* Neglected Items */}
                        {stats.neglectedCount > 0 && (
                            <TouchableOpacity
                                style={styles.neglectedCard}
                                onPress={() => router.push('/(tabs)/wardrobe')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.neglectedIconWrap}>
                                    <Ionicons name="moon-outline" size={20} color="#fff" />
                                </View>
                                <View style={styles.neglectedContent}>
                                    <Text style={styles.neglectedTitle}>
                                        {stats.neglectedCount} Neglected Item{stats.neglectedCount !== 1 ? 's' : ''}
                                    </Text>
                                    <Text style={styles.neglectedSubtitle}>Not worn in 2+ months</Text>
                                </View>
                                <Text style={styles.neglectedAction}>View</Text>
                                <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
                            </TouchableOpacity>
                        )}

                        {/* Sustainability Score */}
                        {sustainability && (
                            <View style={styles.sustainabilityWrap}>
                                <SustainabilityCard data={sustainability} />
                            </View>
                        )}

                        {/* Ready to Sell */}
                        {resaleCandidates.length > 0 && (
                            <View style={styles.resaleWrap}>
                                <ResaleCandidatesCard candidates={resaleCandidates} />
                            </View>
                        )}

                        {/* Listing History */}
                        <TouchableOpacity
                            style={styles.listingsCard}
                            onPress={() => router.push('/(tabs)/listing-history')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.listingsIconWrap}>
                                <Ionicons name="pricetags-outline" size={20} color="#fff" />
                            </View>
                            <View style={styles.listingsContent}>
                                <Text style={styles.listingsTitle}>My Listings</Text>
                                <Text style={styles.listingsSubtitle}>Track your resale activity</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#22c55e" />
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider} />
                    </>
                )}

                {/* ===== LEADERBOARD SECTION (Story 5.5) ===== */}
                <Text style={styles.leaderboardHeading}>Most Worn Items</Text>

                {/* Time Filter */}
                <View style={styles.timeFilterRow}>
                    {TIME_FILTERS.map(f => (
                        <TouchableOpacity
                            key={f.id}
                            style={[styles.timeChip, timeFilter === f.id && styles.timeChipActive]}
                            onPress={() => setTimeFilter(f.id)}
                        >
                            <Text style={[
                                styles.timeChipText,
                                timeFilter === f.id && styles.timeChipTextActive,
                            ]}>
                                {f.id === 'this_season' ? seasonName : f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Category Filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                    style={styles.categoryRow}
                >
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.id || 'all'}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat.id && styles.categoryChipActive,
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Text style={[
                                styles.categoryChipText,
                                selectedCategory === cat.id && styles.categoryChipTextActive,
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {isLeaderboardLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6366f1" />
                    </View>
                ) : mostWorn.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="trophy-outline" size={64} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>No wear data yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Start logging outfits to see your most-worn items
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* MVP Insight */}
                        {mvp && (
                            <View style={styles.mvpCard}>
                                <Text style={styles.mvpEmoji}>🏆</Text>
                                <Text style={styles.mvpText}>
                                    Your <Text style={styles.mvpItemName}>
                                        {mvp.item.name || mvp.item.sub_category || mvp.item.category || 'top item'}
                                    </Text> is your wardrobe MVP!
                                </Text>
                                <Text style={styles.mvpCount}>
                                    Worn {mvp.wearCount} time{mvp.wearCount !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        )}

                        {/* Podium — Top 3 */}
                        {top3.length >= 2 && (
                            <View style={styles.podiumContainer}>
                                <Text style={styles.sectionTitle}>Top Worn</Text>
                                <View style={styles.podiumRow}>
                                    {top3[1] && (
                                        <View style={styles.podiumSlot}>
                                            <PodiumItem entry={top3[1]} rank={2} color={MEDAL_COLORS.silver} height={90} router={router} />
                                        </View>
                                    )}
                                    <View style={styles.podiumSlot}>
                                        <PodiumItem entry={top3[0]} rank={1} color={MEDAL_COLORS.gold} height={120} router={router} />
                                    </View>
                                    {top3[2] ? (
                                        <View style={styles.podiumSlot}>
                                            <PodiumItem entry={top3[2]} rank={3} color={MEDAL_COLORS.bronze} height={70} router={router} />
                                        </View>
                                    ) : (
                                        <View style={styles.podiumSlot} />
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Ranked List 4-10 */}
                        {rest.length > 0 && (
                            <View style={styles.listContainer}>
                                {rest.map((entry, index) => (
                                    <TouchableOpacity
                                        key={entry.item.id}
                                        style={styles.listRow}
                                        onPress={() => router.push({
                                            pathname: '/(tabs)/item-detail',
                                            params: { itemId: entry.item.id },
                                        })}
                                    >
                                        <Text style={styles.listRank}>{index + 4}</Text>
                                        <Image
                                            source={{ uri: entry.item.processed_image_url || entry.item.image_url }}
                                            style={styles.listImage}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.listInfo}>
                                            <Text style={styles.listName} numberOfLines={1}>
                                                {entry.item.name || entry.item.sub_category || entry.item.category || 'Item'}
                                            </Text>
                                            <Text style={styles.listCategory}>
                                                {entry.item.category || ''}
                                            </Text>
                                        </View>
                                        <View style={styles.listCountBadge}>
                                            <Text style={styles.listCountText}>{entry.wearCount}</Text>
                                            <Text style={styles.listCountLabel}>wears</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

// ─── Helper Components ───────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function CategoryChart({ breakdown }: { breakdown: CategoryBreakdown[] }) {
    const total = breakdown.reduce((sum, b) => sum + b.count, 0);
    if (total === 0) return null;

    return (
        <View>
            {/* Stacked bar */}
            <View style={styles.stackedBar}>
                {breakdown.map((b) => (
                    <View
                        key={b.category}
                        style={{
                            flex: b.count,
                            height: 14,
                            backgroundColor: b.color,
                        }}
                    />
                ))}
            </View>
            {/* Legend */}
            <View style={styles.legendGrid}>
                {breakdown.map((b) => (
                    <View key={b.category} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: b.color }]} />
                        <Text style={styles.legendLabel} numberOfLines={1}>
                            {capitalize(b.category)}
                        </Text>
                        <Text style={styles.legendValue}>{b.percentage}%</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

function WearFrequencyChart({ data }: { data: DailyWearCount[] }) {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const BAR_MAX_HEIGHT = 80;

    return (
        <View>
            <View style={styles.barChart}>
                {data.map((d, i) => {
                    const barHeight = Math.max((d.count / maxCount) * BAR_MAX_HEIGHT, 2);
                    const isToday = i === data.length - 1;
                    return (
                        <View key={d.date} style={styles.barCol}>
                            <View
                                style={[
                                    styles.bar,
                                    {
                                        height: barHeight,
                                        backgroundColor: isToday ? '#6366f1' : d.count > 0 ? '#a5b4fc' : '#e5e7eb',
                                    },
                                ]}
                            />
                        </View>
                    );
                })}
            </View>
            <View style={styles.barLabels}>
                <Text style={styles.barLabel}>30d ago</Text>
                <Text style={styles.barLabel}>Today</Text>
            </View>
        </View>
    );
}

function PodiumItem({
    entry, rank, color, height, router,
}: {
    entry: MostWornItem;
    rank: number;
    color: string;
    height: number;
    router: ReturnType<typeof useRouter>;
}) {
    const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';

    return (
        <TouchableOpacity
            style={styles.podiumItemContainer}
            onPress={() => router.push({
                pathname: '/(tabs)/item-detail',
                params: { itemId: entry.item.id },
            })}
        >
            <Image
                source={{ uri: entry.item.processed_image_url || entry.item.image_url }}
                style={styles.podiumImage}
                resizeMode="cover"
            />
            <Text style={styles.podiumMedal}>{medalEmoji}</Text>
            <View style={[styles.podiumBase, { height, backgroundColor: color + '25', borderColor: color }]}>
                <Text style={[styles.podiumRank, { color }]}>{rank}</Text>
                <Text style={styles.podiumCount}>{entry.wearCount}x</Text>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>
                {entry.item.name || entry.item.sub_category || 'Item'}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatCompact(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(Math.round(n));
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Renders text with **bold** markdown-style markup */
function renderBoldText(text: string): React.ReactNode {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
        i % 2 === 1 ? (
            <Text key={i} style={{ fontWeight: '700' }}>{part}</Text>
        ) : (
            <Text key={i}>{part}</Text>
        )
    );
}

// ─── Styles ──────────────────────────────────────────────────────

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
    loadingContainer: {
        paddingTop: 60,
        alignItems: 'center',
    },

    // ── Summary Stats ──
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
    statIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },
    statLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },

    // ── Section Card ──
    sectionCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    sectionCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },

    // ── Category Chart ──
    stackedBar: {
        flexDirection: 'row',
        borderRadius: 7,
        overflow: 'hidden',
        marginBottom: 12,
    },
    legendGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 2,
        paddingHorizontal: 8,
        backgroundColor: '#f9fafb',
        borderRadius: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    legendValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },

    // ── Wear Frequency ──
    barChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 80,
        gap: 2,
    },
    barCol: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    bar: {
        width: '100%',
        borderRadius: 2,
        minHeight: 2,
    },
    barLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    barLabel: {
        fontSize: 10,
        color: '#9ca3af',
    },

    // ── Insights ──
    insightsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    insightRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingRight: 8,
    },
    insightBullet: {
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '700',
        marginRight: 8,
        lineHeight: 20,
    },
    insightText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        flex: 1,
    },

    // ── Wear Calendar ──
    calendarCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#eef2ff',
        borderRadius: 14,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    calendarIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarContent: {
        flex: 1,
    },
    calendarTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#312e81',
    },
    calendarSubtitle: {
        fontSize: 12,
        color: '#6366f1',
        marginTop: 1,
    },

    // ── Neglected ──
    neglectedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#fffbeb',
        borderRadius: 14,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    neglectedIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f59e0b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    neglectedContent: {
        flex: 1,
    },
    neglectedTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400e',
    },
    neglectedSubtitle: {
        fontSize: 12,
        color: '#b45309',
        marginTop: 1,
    },
    neglectedAction: {
        fontSize: 13,
        fontWeight: '600',
        color: '#f59e0b',
    },

    // ── Sustainability ──
    sustainabilityWrap: {
        marginHorizontal: 16,
        marginBottom: 16,
    },

    // ── Resale ──
    resaleWrap: {
        marginHorizontal: 16,
        marginBottom: 16,
    },

    // ── Listings ──
    listingsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#f0fdf4',
        borderRadius: 14,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    listingsIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#22c55e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listingsContent: {
        flex: 1,
    },
    listingsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#14532d',
    },
    listingsSubtitle: {
        fontSize: 12,
        color: '#16a34a',
        marginTop: 1,
    },

    // ── Divider ──
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginHorizontal: 16,
        marginBottom: 20,
    },

    // ── Leaderboard Heading ──
    leaderboardHeading: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1f2937',
        marginHorizontal: 16,
        marginBottom: 12,
    },

    // ── Time Filter ──
    timeFilterRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 12,
        gap: 8,
    },
    timeChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    timeChipActive: {
        backgroundColor: '#6366f1',
    },
    timeChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    timeChipTextActive: {
        color: '#fff',
    },

    // ── Category ──
    categoryRow: {
        marginBottom: 16,
        minHeight: 36,
    },
    categoryScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        height: 34,
        justifyContent: 'center',
    },
    categoryChipActive: {
        backgroundColor: '#5D4E37',
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#5D4E37',
    },
    categoryChipTextActive: {
        color: '#fff',
    },

    // ── Empty ──
    emptyState: {
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 40,
        paddingBottom: 20,
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
    },

    // ── MVP Card ──
    mvpCard: {
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: '#fffbeb',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    mvpEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    mvpText: {
        fontSize: 15,
        color: '#92400e',
        textAlign: 'center',
        lineHeight: 22,
    },
    mvpItemName: {
        fontWeight: '700',
    },
    mvpCount: {
        fontSize: 13,
        color: '#b45309',
        marginTop: 4,
    },

    // ── Podium ──
    podiumContainer: {
        marginHorizontal: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 16,
    },
    podiumRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    podiumSlot: {
        flex: 1,
        alignItems: 'center',
    },
    podiumItemContainer: {
        alignItems: 'center',
        width: '100%',
    },
    podiumImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        marginBottom: 6,
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    podiumMedal: {
        fontSize: 20,
        marginBottom: 4,
    },
    podiumBase: {
        width: '85%',
        borderRadius: 10,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
    podiumRank: {
        fontSize: 22,
        fontWeight: '800',
    },
    podiumCount: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
        marginTop: 2,
    },
    podiumName: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 6,
        textAlign: 'center',
        maxWidth: 90,
    },

    // ── Ranked List ──
    listContainer: {
        marginHorizontal: 16,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        gap: 12,
    },
    listRank: {
        fontSize: 16,
        fontWeight: '700',
        color: '#9ca3af',
        width: 24,
        textAlign: 'center',
    },
    listImage: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#f9fafb',
    },
    listInfo: {
        flex: 1,
    },
    listName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    listCategory: {
        fontSize: 12,
        color: '#9ca3af',
        textTransform: 'capitalize',
        marginTop: 2,
    },
    listCountBadge: {
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    listCountText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6366f1',
    },
    listCountLabel: {
        fontSize: 10,
        color: '#9ca3af',
    },
});
