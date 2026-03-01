/**
 * Analytics Screen
 * Story 5.5: Most Worn Items Leaderboard
 * Story 5.6: Wardrobe Analytics Dashboard
 * Story 6.5: Sustainability Score
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Platform,
    Alert,
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
    BrandStats,
    BrandAnalytics,
} from '../../services/analyticsService';
import SustainabilityCard from '../../components/features/SustainabilityCard';
import ResaleCandidatesCard from '../../components/features/ResaleCandidatesCard';
import { resaleService, ResaleCandidate } from '../../services/resaleService';
import { itemsService, WardrobeItem } from '../../services/items';
import { gapAnalysisService } from '../../services/gapAnalysisService';
import { WardrobeGap, GapAnalysisResult } from '../../types/gapAnalysis';
import { seasonalReportService } from '../../services/seasonalReportService';
import { Season, SeasonalReportResult } from '../../types/seasonalReport';
import { heatmapService } from '../../services/heatmapService';
import { HeatmapData, HeatmapDay, HeatmapView } from '../../types/heatmap';
import HeatmapGrid from '../../components/features/HeatmapGrid';
import NeglectInsightsCard from '../../components/features/NeglectInsightsCard';
import ResaleSuccessCard from '../../components/features/ResaleSuccessCard';
import HealthScoreCard from '../../components/features/HealthScoreCard';
import SpringCleanModal from '../../components/features/SpringCleanModal';
import { neglectService, NeglectStats } from '../../services/neglectService';
import { listingService } from '../../services/listingService';
import { calculateHealthScore, HealthScore } from '../../services/analyticsService';
import { springCleanService, SpringCleanResult } from '../../services/springCleanService';

const CATEGORIES = [
    { id: null, label: 'All' },
    { id: 'tops', label: 'Tops' },
    { id: 'bottoms', label: 'Bottoms' },
    { id: 'dresses', label: 'Dresses' },
    { id: 'outerwear', label: 'Outerwear' },
    { id: 'shoes', label: 'Shoes' },
    { id: 'accessories', label: 'Accessories' },
];

const SEASON_TABS: { id: Season; emoji: string; label: string }[] = [
    { id: 'spring', emoji: '🌸', label: 'Spring' },
    { id: 'summer', emoji: '☀️', label: 'Summer' },
    { id: 'fall', emoji: '🍂', label: 'Fall' },
    { id: 'winter', emoji: '❄️', label: 'Winter' },
];

const BRAND_CATEGORIES = [
    { id: null, label: 'All' },
    { id: 'tops', label: 'Tops' },
    { id: 'bottoms', label: 'Bottoms' },
    { id: 'outerwear', label: 'Outerwear' },
    { id: 'shoes', label: 'Shoes' },
    { id: 'accessories', label: 'Accessories' },
    { id: 'dresses', label: 'Dresses' },
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

    // Neglect stats (Story 13.1)
    const [neglectStats, setNeglectStats] = useState<NeglectStats | null>(null);
    const [neglectThreshold, setNeglectThreshold] = useState(180);
    const [resaleStats, setResaleStats] = useState<{ totalListed: number; totalSold: number; totalRevenue: number } | null>(null);

    // Health score (Story 13.4)
    const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
    const [showSpringClean, setShowSpringClean] = useState(false);
    const [neglectedItems, setNeglectedItems] = useState<WardrobeItem[]>([]);

    // Leaderboard state
    const [mostWorn, setMostWorn] = useState<MostWornItem[]>([]);
    const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState<DateRangeFilter>('all_time');

    // Brand Value state (Story 11.1)
    const [brandAnalytics, setBrandAnalytics] = useState<BrandAnalytics | null>(null);
    const [isBrandLoading, setIsBrandLoading] = useState(true);
    const [brandCategoryFilter, setBrandCategoryFilter] = useState<string | null>(null);

    // Wardrobe Gaps state (Story 11.3)
    const [gapResult, setGapResult] = useState<GapAnalysisResult | null>(null);
    const [isGapLoading, setIsGapLoading] = useState(true);
    const [dismissedExpanded, setDismissedExpanded] = useState(false);

    // Seasonal Report state (Story 11.4)
    const [seasonalResult, setSeasonalResult] = useState<SeasonalReportResult | null>(null);
    const [isSeasonalLoading, setIsSeasonalLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
    const [neglectedExpanded, setNeglectedExpanded] = useState(false);

    // Heatmap state (Story 11.5)
    const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
    const [isHeatmapLoading, setIsHeatmapLoading] = useState(true);
    const [heatmapView, setHeatmapView] = useState<HeatmapView>('month');
    const [heatmapRef, setHeatmapRef] = useState<Date>(() => new Date());
    const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
    const [dayDetail, setDayDetail] = useState<{ date: string; itemNames: string[] } | null>(null);
    const [isDayDetailLoading, setIsDayDetailLoading] = useState(false);
    // Refs mirror heatmap state so loadHeatmap stays stable (no state deps)
    const heatmapViewRef = useRef<HeatmapView>('month');
    const heatmapRefDateRef = useRef<Date>(new Date());

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
        // Neglect stats (Story 13.1)
        const threshold = await neglectService.getNeglectThreshold();
        setNeglectThreshold(threshold);
        setNeglectStats(neglectService.getNeglectStats(itemsResult.items));
        // Resale stats (Story 13.3)
        listingService.getResaleStats().then(stats => {
            if (!stats.error) setResaleStats(stats);
        });
        // Health score (Story 13.4)
        setHealthScore(calculateHealthScore(itemsResult.items));
        setNeglectedItems(itemsResult.items.filter(i => i.neglect_status && i.status === 'complete'));
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

    const loadBrandAnalytics = useCallback(async () => {
        setIsBrandLoading(true);
        const { analytics } = await analyticsService.getBrandAnalytics(brandCategoryFilter || undefined);
        setBrandAnalytics(analytics);
        setIsBrandLoading(false);
    }, [brandCategoryFilter]);

    const loadGapAnalysis = useCallback(async () => {
        setIsGapLoading(true);
        const itemsResult = await itemsService.getItems();
        const { result } = await gapAnalysisService.analyzeWardrobe(itemsResult.items);
        setGapResult(result);
        setIsGapLoading(false);
    }, []);

    const loadSeasonalReport = useCallback(async (season?: Season) => {
        setIsSeasonalLoading(true);
        const { result } = await seasonalReportService.getSeasonalReport(season ?? selectedSeason ?? undefined);
        setSeasonalResult(result);
        if (!selectedSeason) setSelectedSeason(result.currentSeason);
        setIsSeasonalLoading(false);
    }, [selectedSeason]);

    // loadHeatmap reads view/ref from refs so it has no state dependencies and
    // never changes identity — preventing useFocusEffect from reloading the whole page.
    const loadHeatmap = useCallback(async (view?: HeatmapView, ref?: Date) => {
        const v = view ?? heatmapViewRef.current;
        const r = ref ?? heatmapRefDateRef.current;
        setIsHeatmapLoading(true);
        try {
            const data = await heatmapService.getHeatmapData(v, r);
            setHeatmapData(data);
        } catch {
            // Keep previous data on error
        }
        setIsHeatmapLoading(false);
    }, []); // stable — no state deps

    const handleDayPress = useCallback(async (day: HeatmapDay) => {
        setSelectedDay(day);
        setDayDetail(null);
        setIsDayDetailLoading(true);
        try {
            const detail = await heatmapService.getDayDetail(day.date);
            setDayDetail(detail);
        } catch {
            setDayDetail({ date: day.date, itemNames: [] });
        }
        setIsDayDetailLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDashboard();
            loadLeaderboard();
            loadBrandAnalytics();
            loadGapAnalysis();
            loadSeasonalReport();
            loadHeatmap();
        }, [loadDashboard, loadLeaderboard, loadBrandAnalytics, loadGapAnalysis, loadSeasonalReport, loadHeatmap])
    );

    const handleDismissGap = useCallback(async (gapId: string) => {
        await gapAnalysisService.dismissGap(gapId);
        setGapResult(prev => {
            if (!prev) return prev;
            const gaps = prev.gaps.map(g => g.id === gapId ? { ...g, dismissed: true } : g);
            const active = gaps.filter(g => !g.dismissed);
            return {
                ...prev,
                gaps,
                totalGaps: active.length,
                criticalCount: active.filter(g => g.severity === 'critical').length,
            };
        });
    }, []);

    const handleUndismissGap = useCallback(async (gapId: string) => {
        await gapAnalysisService.undismissGap(gapId);
        setGapResult(prev => {
            if (!prev) return prev;
            const gaps = prev.gaps.map(g => g.id === gapId ? { ...g, dismissed: false } : g);
            const active = gaps.filter(g => !g.dismissed);
            return {
                ...prev,
                gaps,
                totalGaps: active.length,
                criticalCount: active.filter(g => g.severity === 'critical').length,
            };
        });
    }, []);

    const top3 = mostWorn.slice(0, 3);
    const rest = mostWorn.slice(3);
    const mvp = mostWorn[0];
    const seasonName = getCurrentSeasonName();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/profile')}>
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

                        {/* Wardrobe Health Score (Story 13.4) */}
                        {healthScore && (
                            <View style={styles.resaleWrap}>
                                <HealthScoreCard
                                    healthScore={healthScore}
                                    onSpringClean={() => setShowSpringClean(true)}
                                />
                            </View>
                        )}

                        {/* Ready to Sell */}
                        {resaleCandidates.length > 0 && (
                            <View style={styles.resaleWrap}>
                                <ResaleCandidatesCard candidates={resaleCandidates} />
                            </View>
                        )}

                        {/* Neglect Insights (Story 13.1) */}
                        {neglectStats && (
                            <View style={styles.resaleWrap}>
                                <NeglectInsightsCard stats={neglectStats} thresholdDays={neglectThreshold} />
                            </View>
                        )}

                        {/* Resale Success (Story 13.3) */}
                        {resaleStats && (resaleStats.totalListed > 0 || resaleStats.totalSold > 0) && (
                            <View style={styles.resaleWrap}>
                                <ResaleSuccessCard
                                    totalListed={resaleStats.totalListed}
                                    totalSold={resaleStats.totalSold}
                                    totalRevenue={resaleStats.totalRevenue}
                                />
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

                        {/* ===== BRAND VALUE SECTION (Story 11.1) ===== */}
                        <View style={styles.sectionCard}>
                            {/* Header */}
                            <View style={styles.brandHeader}>
                                <Text style={styles.brandHeadingText}>💰 Brand Value</Text>
                            </View>

                            {/* Category filter chips */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.brandCategoryScroll}
                                style={styles.brandCategoryRow}
                            >
                                {BRAND_CATEGORIES.map(cat => (
                                    <TouchableOpacity
                                        key={cat.id || 'all'}
                                        style={[
                                            styles.categoryChip,
                                            brandCategoryFilter === cat.id && styles.categoryChipActive,
                                        ]}
                                        onPress={() => setBrandCategoryFilter(cat.id)}
                                    >
                                        <Text style={[
                                            styles.categoryChipText,
                                            brandCategoryFilter === cat.id && styles.categoryChipTextActive,
                                        ]}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {isBrandLoading ? (
                                <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 20 }} />
                            ) : !brandAnalytics || brandAnalytics.brands.length === 0 ? (
                                <View style={styles.brandEmptyState}>
                                    <Ionicons name="pricetag-outline" size={36} color="#d1d5db" />
                                    <Text style={styles.brandEmptyText}>
                                        Add brands and prices to your items to see value insights
                                    </Text>
                                    <Text style={styles.brandThresholdNote}>Brands with 3+ items shown</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Insight card */}
                                    <View style={styles.brandInsightCard}>
                                        <Text style={styles.brandInsightText}>🏆 {brandAnalytics.insight}</Text>
                                    </View>

                                    {/* Column headers */}
                                    <View style={styles.brandTableHeader}>
                                        <Text style={[styles.brandTableHeaderText, { flex: 2 }]}>Brand</Text>
                                        <Text style={[styles.brandTableHeaderText, { width: 52, textAlign: 'right' }]}>CPW</Text>
                                        <Text style={[styles.brandTableHeaderText, { width: 40, textAlign: 'right' }]}>Items</Text>
                                        <Text style={[styles.brandTableHeaderText, { width: 56, textAlign: 'right' }]}>Spent</Text>
                                    </View>

                                    {/* Brand rows */}
                                    {brandAnalytics.brands.map((brand, index) => (
                                        <BrandRow
                                            key={brand.brand}
                                            brand={brand}
                                            avgCPW={brandAnalytics.brands.reduce((s, b) => s + (isFinite(b.avgCPW) ? b.avgCPW : 0), 0) / Math.max(brandAnalytics.brands.filter(b => isFinite(b.avgCPW)).length, 1)}
                                            isLast={index === brandAnalytics.brands.length - 1}
                                        />
                                    ))}

                                    <Text style={styles.brandThresholdNote}>💡 Brands with 3+ items shown</Text>
                                </>
                            )}
                        </View>

                        {/* ===== WARDROBE GAPS SECTION (Story 11.3) ===== */}
                        <View style={styles.sectionCard}>
                            {/* Header */}
                            <View style={styles.gapSectionHeader}>
                                <Text style={styles.sectionCardTitle}>🔍 Wardrobe Gaps</Text>
                                {gapResult && (
                                    <Text style={styles.gapSubheader}>
                                        {gapResult.totalGaps === 0
                                            ? 'All covered!'
                                            : `${gapResult.totalGaps} gap${gapResult.totalGaps !== 1 ? 's' : ''}${gapResult.criticalCount > 0 ? ` (${gapResult.criticalCount} critical)` : ''}`}
                                    </Text>
                                )}
                            </View>

                            {isGapLoading ? (
                                <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 20 }} />
                            ) : !gapResult || gapResult.gaps.length === 0 ? (
                                <View style={styles.gapEmptyState}>
                                    <Text style={styles.gapEmptyEmoji}>🎉</Text>
                                    <Text style={styles.gapEmptyText}>No gaps found — your wardrobe is well-rounded!</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Active gaps */}
                                    {gapResult.gaps.filter(g => !g.dismissed).map(gap => (
                                        <GapCard
                                            key={gap.id}
                                            gap={gap}
                                            onDismiss={() => handleDismissGap(gap.id)}
                                            onShop={() => router.push('/(tabs)/shopping')}
                                        />
                                    ))}

                                    {/* Dismissed section */}
                                    {gapResult.gaps.filter(g => g.dismissed).length > 0 && (
                                        <View style={styles.dismissedSection}>
                                            <TouchableOpacity
                                                style={styles.dismissedToggle}
                                                onPress={() => setDismissedExpanded(v => !v)}
                                            >
                                                <Text style={styles.dismissedToggleText}>
                                                    {dismissedExpanded ? '▼' : '▶'} {gapResult.gaps.filter(g => g.dismissed).length} dismissed gap{gapResult.gaps.filter(g => g.dismissed).length !== 1 ? 's' : ''}
                                                </Text>
                                            </TouchableOpacity>
                                            {dismissedExpanded && gapResult.gaps.filter(g => g.dismissed).map(gap => (
                                                <TouchableOpacity
                                                    key={gap.id}
                                                    style={styles.dismissedGapRow}
                                                    onPress={() => handleUndismissGap(gap.id)}
                                                >
                                                    <Text style={styles.dismissedGapText} numberOfLines={1}>{gap.title}</Text>
                                                    <Text style={styles.undismissText}>Restore</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    {/* Last analyzed timestamp */}
                                    {gapResult.lastAnalyzedAt && (
                                        <Text style={styles.gapTimestamp}>
                                            Last analyzed: {formatRelativeTime(gapResult.lastAnalyzedAt)}
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>

                        {/* ===== SEASONAL REPORT SECTION (Story 11.4) ===== */}
                        <View style={styles.sectionCard}>
                            {/* Transition Alert Banner */}
                            {seasonalResult?.transitionAlert && (
                                <View style={styles.transitionAlert}>
                                    <Text style={styles.transitionAlertText}>{seasonalResult.transitionAlert}</Text>
                                </View>
                            )}

                            {/* Header */}
                            <Text style={styles.sectionCardTitle}>📅 Seasonal Report</Text>

                            {/* Season Selector */}
                            <View style={styles.seasonTabRow}>
                                {SEASON_TABS.map(tab => {
                                    const isSelected = (selectedSeason ?? seasonalResult?.currentSeason) === tab.id;
                                    const isCurrent = seasonalResult?.currentSeason === tab.id;
                                    return (
                                        <TouchableOpacity
                                            key={tab.id}
                                            style={[styles.seasonTab, isSelected && styles.seasonTabActive]}
                                            onPress={() => {
                                                setSelectedSeason(tab.id);
                                                loadSeasonalReport(tab.id);
                                            }}
                                        >
                                            <Text style={[styles.seasonTabEmoji]}>{tab.emoji}</Text>
                                            {isCurrent && (
                                                <View style={styles.currentBadge}>
                                                    <Text style={styles.currentBadgeText}>Now</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {isSeasonalLoading ? (
                                <ActivityIndicator size="small" color="#5D4E37" style={{ marginVertical: 24 }} />
                            ) : !seasonalResult || seasonalResult.currentReport.totalItemsForSeason === 0 ? (
                                <View style={styles.seasonEmptyState}>
                                    <Text style={styles.seasonEmptyEmoji}>🗂️</Text>
                                    <Text style={styles.seasonEmptyText}>
                                        {`Tag your items with "${(selectedSeason ?? seasonalResult?.currentSeason ?? 'this season')}" to unlock seasonal insights`}
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {/* Readiness Score */}
                                    {(() => {
                                        const report = seasonalResult.currentReport;
                                        const score = report.readinessScore;
                                        const seasonLabel = capitalize(report.season);
                                        const scoreColor = score >= 8 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444';
                                        return (
                                            <View style={styles.readinessWrap}>
                                                <Text style={styles.readinessLabel}>Your {seasonLabel} Wardrobe</Text>
                                                <View style={styles.starsRow}>
                                                    {Array.from({ length: 10 }, (_, i) => (
                                                        <Text key={i} style={[styles.starChar, { color: i < score ? scoreColor : '#e5e7eb' }]}>
                                                            ★
                                                        </Text>
                                                    ))}
                                                </View>
                                                <Text style={[styles.readinessScore, { color: scoreColor }]}>{score}/10</Text>
                                            </View>
                                        );
                                    })()}

                                    {/* Stats Row */}
                                    {(() => {
                                        const report = seasonalResult.currentReport;
                                        const activeCount = report.mostWornItems.length;
                                        const neglectedCount = report.neglectedItems.length;
                                        return (
                                            <View style={styles.seasonStatsRow}>
                                                <View style={styles.seasonStatCell}>
                                                    <Text style={styles.seasonStatValue}>{report.totalItemsForSeason}</Text>
                                                    <Text style={styles.seasonStatLabel}>Items</Text>
                                                </View>
                                                <View style={[styles.seasonStatCell, styles.seasonStatCellBorder]}>
                                                    <Text style={[styles.seasonStatValue, { color: '#22c55e' }]}>{activeCount}</Text>
                                                    <Text style={styles.seasonStatLabel}>Active</Text>
                                                </View>
                                                <View style={[styles.seasonStatCell, styles.seasonStatCellBorder]}>
                                                    <Text style={[styles.seasonStatValue, { color: neglectedCount > 0 ? '#f59e0b' : '#9ca3af' }]}>{neglectedCount}</Text>
                                                    <Text style={styles.seasonStatLabel}>Unused</Text>
                                                </View>
                                            </View>
                                        );
                                    })()}

                                    {/* Most Worn Items */}
                                    {seasonalResult.currentReport.mostWornItems.length > 0 && (
                                        <View style={styles.seasonSubSection}>
                                            <Text style={styles.seasonSubTitle}>🏆 Most Worn</Text>
                                            {seasonalResult.currentReport.mostWornItems.map((item, i) => (
                                                <View key={item.itemId} style={styles.seasonItemRow}>
                                                    <Text style={styles.seasonItemRank}>{i + 1}.</Text>
                                                    <Text style={styles.seasonItemName} numberOfLines={1}>{item.name}</Text>
                                                    <View style={styles.seasonWearBadge}>
                                                        <Text style={styles.seasonWearBadgeText}>{item.wearCount}x</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Neglected Items (collapsible) */}
                                    {seasonalResult.currentReport.neglectedItems.length > 0 && (
                                        <View style={styles.seasonSubSection}>
                                            <TouchableOpacity
                                                style={styles.neglectedToggle}
                                                onPress={() => setNeglectedExpanded(v => !v)}
                                            >
                                                <Text style={styles.neglectedToggleText}>
                                                    {neglectedExpanded ? '▼' : '▶'} {seasonalResult.currentReport.neglectedItems.length} unworn item{seasonalResult.currentReport.neglectedItems.length !== 1 ? 's' : ''}
                                                </Text>
                                            </TouchableOpacity>
                                            {neglectedExpanded && seasonalResult.currentReport.neglectedItems.slice(0, 8).map(item => (
                                                <Text key={item.itemId} style={styles.neglectedItemText} numberOfLines={1}>• {item.name}</Text>
                                            ))}
                                            {neglectedExpanded && seasonalResult.currentReport.neglectedItems.length > 8 && (
                                                <Text style={styles.neglectedMoreText}>+{seasonalResult.currentReport.neglectedItems.length - 8} more</Text>
                                            )}
                                        </View>
                                    )}

                                    {/* Historical Comparison */}
                                    {seasonalResult.comparisonText && (
                                        <View style={styles.comparisonRow}>
                                            <Text style={styles.comparisonLabel}>📊 vs Last {capitalize(seasonalResult.currentSeason)}</Text>
                                            <Text style={styles.comparisonDelta}>{seasonalResult.comparisonText}</Text>
                                        </View>
                                    )}

                                    {/* Recommendations */}
                                    {seasonalResult.currentReport.recommendations.length > 0 && (
                                        <View style={styles.seasonSubSection}>
                                            <Text style={styles.seasonSubTitle}>💡 Recommendations</Text>
                                            {seasonalResult.currentReport.recommendations.map((rec, i) => (
                                                <View key={i} style={styles.recRow}>
                                                    <Text style={styles.recBullet}>•</Text>
                                                    <Text style={styles.recText}>{rec}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </>
                            )}
                        </View>

                        {/* ===== WEAR HEATMAP SECTION (Story 11.5) ===== */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionCardTitle}>🗓️ Wear Heatmap</Text>

                            {/* View selector */}
                            <View style={styles.heatmapViewRow}>
                                {(['month', 'quarter', 'year'] as HeatmapView[]).map(v => (
                                    <TouchableOpacity
                                        key={v}
                                        style={[styles.heatmapViewTab, heatmapView === v && styles.heatmapViewTabActive]}
                                        onPress={() => {
                                            const newDate = new Date();
                                            heatmapViewRef.current = v;
                                            heatmapRefDateRef.current = newDate;
                                            setHeatmapView(v);
                                            setHeatmapRef(newDate);
                                            loadHeatmap(v, newDate);
                                        }}
                                    >
                                        <Text style={[styles.heatmapViewTabText, heatmapView === v && styles.heatmapViewTabTextActive]}>
                                            {capitalize(v)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Navigation arrows + period label */}
                            <View style={styles.heatmapNavRow}>
                                <TouchableOpacity
                                    style={styles.heatmapNavBtn}
                                    onPress={() => {
                                        const newRef = heatmapService.navigateDate(heatmapView, heatmapRef, -1);
                                        heatmapRefDateRef.current = newRef;
                                        setHeatmapRef(newRef);
                                        loadHeatmap(heatmapView, newRef);
                                    }}
                                >
                                    <Text style={styles.heatmapNavArrow}>‹</Text>
                                </TouchableOpacity>
                                <Text style={styles.heatmapPeriodLabel}>
                                    {heatmapService.getPeriodLabel(heatmapView, heatmapRef)}
                                </Text>
                                <TouchableOpacity
                                    style={styles.heatmapNavBtn}
                                    onPress={() => {
                                        const newRef = heatmapService.navigateDate(heatmapView, heatmapRef, 1);
                                        heatmapRefDateRef.current = newRef;
                                        setHeatmapRef(newRef);
                                        loadHeatmap(heatmapView, newRef);
                                    }}
                                >
                                    <Text style={styles.heatmapNavArrow}>›</Text>
                                </TouchableOpacity>
                            </View>

                            {isHeatmapLoading ? (
                                <ActivityIndicator size="small" color="#5D4E37" style={{ marginVertical: 24 }} />
                            ) : (
                                <>
                                    {/* Streak & insight stats */}
                                    {heatmapData && (
                                        <View style={styles.heatmapStatsRow}>
                                            <View style={styles.heatmapStat}>
                                                <Text style={styles.heatmapStatEmoji}>🔥</Text>
                                                <Text style={styles.heatmapStatText}>
                                                    <Text style={styles.heatmapStatBold}>{heatmapData.currentStreak}</Text> day streak
                                                </Text>
                                            </View>
                                            <View style={styles.heatmapStat}>
                                                <Text style={styles.heatmapStatEmoji}>🏆</Text>
                                                <Text style={styles.heatmapStatText}>
                                                    Best: <Text style={styles.heatmapStatBold}>{heatmapData.longestStreak}</Text>
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                    {heatmapData && (
                                        <Text style={styles.heatmapInsight}>📊 {heatmapData.insight}</Text>
                                    )}

                                    {/* Heatmap grid */}
                                    <HeatmapGrid
                                        days={heatmapData?.days ?? []}
                                        view={heatmapView}
                                        onDayPress={handleDayPress}
                                    />
                                </>
                            )}
                        </View>

                        {/* Day Detail Modal */}
                        {selectedDay && (
                            <TouchableOpacity
                                style={styles.dayDetailOverlay}
                                activeOpacity={1}
                                onPress={() => setSelectedDay(null)}
                            >
                                <View style={styles.dayDetailCard}>
                                    <Text style={styles.dayDetailDate}>
                                        {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', {
                                            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                                        })}
                                    </Text>
                                    {isDayDetailLoading ? (
                                        <ActivityIndicator size="small" color="#5D4E37" style={{ marginTop: 12 }} />
                                    ) : !dayDetail || dayDetail.itemNames.length === 0 ? (
                                        <Text style={styles.dayDetailEmpty}>No outfits logged this day</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.dayDetailCount}>{dayDetail.itemNames.length} item{dayDetail.itemNames.length !== 1 ? 's' : ''} logged</Text>
                                            {dayDetail.itemNames.map((name, i) => (
                                                <Text key={i} style={styles.dayDetailItem}>• {name}</Text>
                                            ))}
                                        </>
                                    )}
                                    <Text style={styles.dayDetailDismiss}>Tap anywhere to close</Text>
                                </View>
                            </TouchableOpacity>
                        )}

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

            {/* Spring Clean Modal (Story 13.4) */}
            <SpringCleanModal
                visible={showSpringClean}
                items={neglectedItems}
                onDismiss={() => setShowSpringClean(false)}
                onComplete={async (results) => {
                    setShowSpringClean(false);
                    await springCleanService.applySpringCleanResults(results);
                    // Refresh items and health score
                    const { items } = await itemsService.getItems();
                    setHealthScore(calculateHealthScore(items));
                    setNeglectedItems(items.filter(i => i.neglect_status && i.status === 'complete'));
                }}
            />
        </View>
    );
}

// ─── Helper Components ───────────────────────────────────────────

const GAP_SEVERITY_CONFIG = {
    critical: { emoji: '🔴', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
    important: { emoji: '🟡', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    optional: { emoji: '🟢', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
};

const GAP_TYPE_ICON: Record<string, string> = {
    category: '📂',
    formality: '👔',
    color: '🎨',
    weather: '🌦️',
};

function GapCard({ gap, onDismiss, onShop }: {
    gap: WardrobeGap;
    onDismiss: () => void;
    onShop: () => void;
}) {
    const cfg = GAP_SEVERITY_CONFIG[gap.severity];
    return (
        <View style={[styles.gapCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            {/* Badge row */}
            <View style={styles.gapBadgeRow}>
                <View style={styles.gapBadge}>
                    <Text style={styles.gapBadgeText}>{cfg.emoji} {gap.severity.charAt(0).toUpperCase() + gap.severity.slice(1)}</Text>
                </View>
                <View style={styles.gapTypeBadge}>
                    <Text style={styles.gapTypeBadgeText}>{GAP_TYPE_ICON[gap.type]} {gap.type.charAt(0).toUpperCase() + gap.type.slice(1)}</Text>
                </View>
                <TouchableOpacity style={styles.gapDismiss} onPress={onDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Text style={styles.gapDismissText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <Text style={[styles.gapTitle, { color: cfg.color }]}>{gap.title}</Text>
            <Text style={styles.gapDescription}>{gap.description}</Text>
            <Text style={styles.gapSuggestion}>{gap.suggestion}</Text>

            {/* Shopping link */}
            <TouchableOpacity style={styles.gapShopBtn} onPress={onShop}>
                <Text style={styles.gapShopBtnText}>🛍️ Find in Shopping</Text>
            </TouchableOpacity>
        </View>
    );
}

function BrandRow({ brand, avgCPW, isLast }: {
    brand: BrandStats;
    avgCPW: number;
    isLast: boolean;
}) {
    const cpwDisplay = !isFinite(brand.avgCPW) ? '—' : `£${brand.avgCPW.toFixed(2)}`;
    const spentDisplay = `£${formatCompact(brand.totalSpent)}`;

    let dotColor = '#22c55e'; // green — good
    if (!isFinite(brand.avgCPW)) {
        dotColor = '#9ca3af'; // grey — no wears
    } else if (brand.avgCPW > avgCPW * 2) {
        dotColor = '#ef4444'; // red — poor
    } else if (brand.avgCPW > avgCPW) {
        dotColor = '#f59e0b'; // amber — average
    }

    return (
        <View style={[styles.brandRow, isLast && styles.brandRowLast]}>
            <View style={styles.brandDotWrap}>
                <View style={[styles.brandDot, { backgroundColor: dotColor }]} />
            </View>
            <Text style={[styles.brandRowName, { flex: 2 }]} numberOfLines={1}>{brand.brand}</Text>
            <Text style={[styles.brandRowCPW, { width: 52, color: dotColor }]}>{cpwDisplay}</Text>
            <Text style={[styles.brandRowMeta, { width: 40 }]}>{brand.itemCount}</Text>
            <Text style={[styles.brandRowMeta, { width: 56 }]}>{spentDisplay}</Text>
        </View>
    );
}

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

function formatRelativeTime(isoString: string): string {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
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

    // ── Brand Value (Story 11.1) ──
    brandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    brandHeadingText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1f2937',
    },
    brandCategoryRow: {
        marginBottom: 12,
        minHeight: 34,
    },
    brandCategoryScroll: {
        gap: 8,
    },
    brandInsightCard: {
        backgroundColor: '#fef3c7',
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    brandInsightText: {
        fontSize: 13,
        color: '#92400e',
        fontWeight: '500',
        lineHeight: 18,
    },
    brandTableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingBottom: 6,
    },
    brandTableHeaderText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f9fafb',
        gap: 4,
    },
    brandRowLast: {
        borderBottomWidth: 0,
    },
    brandDotWrap: {
        width: 16,
        alignItems: 'center',
    },
    brandDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    brandRowName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    brandRowCPW: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'right',
    },
    brandRowMeta: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'right',
    },
    brandEmptyState: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 12,
        gap: 8,
    },
    brandEmptyText: {
        fontSize: 13,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 18,
    },
    brandThresholdNote: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 10,
    },

    // ── Wardrobe Gaps (Story 11.3) ──
    gapSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    gapSubheader: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    gapCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 10,
    },
    gapBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    gapBadge: {
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.06)',
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    gapBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
    },
    gapTypeBadge: {
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.06)',
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    gapTypeBadgeText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#6b7280',
    },
    gapDismiss: {
        marginLeft: 'auto',
        padding: 4,
    },
    gapDismissText: {
        fontSize: 14,
        color: '#9ca3af',
    },
    gapTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 3,
    },
    gapDescription: {
        fontSize: 13,
        color: '#4b5563',
        lineHeight: 18,
        marginBottom: 4,
    },
    gapSuggestion: {
        fontSize: 12,
        color: '#6b7280',
        fontStyle: 'italic',
        lineHeight: 17,
        marginBottom: 10,
    },
    gapShopBtn: {
        alignSelf: 'flex-start',
        backgroundColor: '#5D4E37',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    gapShopBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    gapEmptyState: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    gapEmptyEmoji: {
        fontSize: 32,
    },
    gapEmptyText: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
    },
    dismissedSection: {
        marginTop: 4,
    },
    dismissedToggle: {
        paddingVertical: 8,
    },
    dismissedToggleText: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: '500',
    },
    dismissedGapRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    dismissedGapText: {
        fontSize: 13,
        color: '#9ca3af',
        flex: 1,
        marginRight: 8,
    },
    undismissText: {
        fontSize: 12,
        color: '#6366f1',
        fontWeight: '600',
    },
    gapTimestamp: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 8,
    },

    // ── Seasonal Report (Story 11.4) ──
    transitionAlert: {
        backgroundColor: '#fff7ed',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#fed7aa',
    },
    transitionAlertText: {
        fontSize: 13,
        color: '#9a3412',
        lineHeight: 18,
    },
    seasonTabRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    seasonTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        position: 'relative',
    },
    seasonTabActive: {
        backgroundColor: '#5D4E37',
        borderColor: '#5D4E37',
    },
    seasonTabEmoji: {
        fontSize: 18,
    },
    currentBadge: {
        position: 'absolute',
        top: -6,
        right: -4,
        backgroundColor: '#6366f1',
        borderRadius: 6,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    currentBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: '#fff',
    },
    seasonEmptyState: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    seasonEmptyEmoji: {
        fontSize: 32,
    },
    seasonEmptyText: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 18,
    },
    readinessWrap: {
        alignItems: 'center',
        marginBottom: 16,
    },
    readinessLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 4,
    },
    starChar: {
        fontSize: 18,
    },
    readinessScore: {
        fontSize: 22,
        fontWeight: '700',
    },
    seasonStatsRow: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 16,
        overflow: 'hidden',
    },
    seasonStatCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    seasonStatCellBorder: {
        borderLeftWidth: 1,
        borderLeftColor: '#e5e7eb',
    },
    seasonStatValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },
    seasonStatLabel: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 2,
    },
    seasonSubSection: {
        marginBottom: 14,
    },
    seasonSubTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    seasonItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    seasonItemRank: {
        fontSize: 13,
        fontWeight: '700',
        color: '#9ca3af',
        width: 18,
    },
    seasonItemName: {
        flex: 1,
        fontSize: 13,
        color: '#374151',
    },
    seasonWearBadge: {
        backgroundColor: '#eef2ff',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    seasonWearBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366f1',
    },
    neglectedToggle: {
        paddingVertical: 6,
    },
    neglectedToggleText: {
        fontSize: 13,
        color: '#f59e0b',
        fontWeight: '500',
    },
    neglectedItemText: {
        fontSize: 12,
        color: '#6b7280',
        paddingVertical: 3,
        paddingLeft: 8,
    },
    neglectedMoreText: {
        fontSize: 11,
        color: '#9ca3af',
        paddingLeft: 8,
        paddingTop: 2,
    },
    comparisonRow: {
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        gap: 4,
    },
    comparisonLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    comparisonDelta: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1f2937',
    },
    recRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 6,
    },
    recBullet: {
        fontSize: 14,
        color: '#5D4E37',
        fontWeight: '700',
        lineHeight: 20,
    },
    recText: {
        flex: 1,
        fontSize: 13,
        color: '#4b5563',
        lineHeight: 20,
    },

    // ── Wear Heatmap (Story 11.5) ──
    heatmapViewRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    heatmapViewTab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#f9fafb',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    heatmapViewTabActive: {
        backgroundColor: '#5D4E37',
        borderColor: '#5D4E37',
    },
    heatmapViewTabText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    heatmapViewTabTextActive: {
        color: '#fff',
    },
    heatmapNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    heatmapNavBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    heatmapNavArrow: {
        fontSize: 20,
        color: '#374151',
        lineHeight: 24,
    },
    heatmapPeriodLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    heatmapStatsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 6,
    },
    heatmapStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    heatmapStatEmoji: {
        fontSize: 14,
    },
    heatmapStatText: {
        fontSize: 13,
        color: '#4b5563',
    },
    heatmapStatBold: {
        fontWeight: '700',
        color: '#1f2937',
    },
    heatmapInsight: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
    },
    dayDetailOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        marginHorizontal: -16,
    },
    dayDetailCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 32,
        minWidth: 260,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    dayDetailDate: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    dayDetailCount: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 8,
    },
    dayDetailItem: {
        fontSize: 14,
        color: '#374151',
        paddingVertical: 3,
    },
    dayDetailEmpty: {
        fontSize: 13,
        color: '#9ca3af',
        fontStyle: 'italic',
        marginTop: 4,
    },
    dayDetailDismiss: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 14,
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
