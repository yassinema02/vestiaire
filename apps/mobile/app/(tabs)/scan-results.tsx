/**
 * Scan Results Screen
 * Displays compatibility score and matching wardrobe items
 * Story 8.1: Screenshot Product Analysis
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useShoppingStore } from '../../stores/shoppingStore';
import { getCompatibilityRating } from '../../types/shopping';
import { shoppingService } from '../../services/shoppingService';
import { WardrobeItem } from '../../services/items';

const CATEGORY_ORDER = ['outerwear', 'tops', 'bottoms', 'dresses', 'shoes', 'accessories'];

const CATEGORY_ICONS: Record<string, string> = {
    outerwear: 'jacket-outline',
    tops: 'shirt-outline',
    bottoms: 'cut-outline',
    dresses: 'body-outline',
    shoes: 'footsteps-outline',
    accessories: 'watch-outline',
};

const NO_MATCH_SUGGESTIONS: Record<string, string> = {
    tops: 'Add bottoms or shoes to complete outfits',
    bottoms: 'Add tops or shoes to complete this look',
    dresses: 'Add shoes or accessories to style this piece',
    outerwear: 'Add clothing items to layer with this',
    shoes: 'Add clothing items to see outfit ideas',
    accessories: 'Add clothing items to accessorize',
};

function MatchingItemCard({
    item,
    reason,
    onPress,
}: {
    item: WardrobeItem;
    reason: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.matchCard} onPress={onPress} activeOpacity={0.7}>
            <Image source={{ uri: item.image_url }} style={styles.matchImage} />
            <Text style={styles.matchName} numberOfLines={1}>
                {item.name || item.category || 'Item'}
            </Text>
            <View style={styles.reasonBadge}>
                <Text style={styles.reasonText}>{reason}</Text>
            </View>
        </TouchableOpacity>
    );
}

export default function ScanResultsScreen() {
    const router = useRouter();
    const { currentScan, currentAnalysis, scrapedImageUrl, matchingItems, scoreExplanation, clearScan, toggleWishlist, rateScan } = useShoppingStore();

    const score = currentScan?.compatibility_score ?? 0;
    const rating = getCompatibilityRating(score);

    const [showAllMatches, setShowAllMatches] = useState(false);
    const [wishlistToast, setWishlistToast] = useState<string | null>(null);
    const [ratingDismissed, setRatingDismissed] = useState(false);
    const [ratingToast, setRatingToast] = useState<string | null>(null);

    const isWishlisted = currentScan?.is_wishlisted ?? false;
    const showRatingPrompt = currentScan?.id != null && currentScan.user_rating == null && !ratingDismissed;

    const handleRate = useCallback(async (stars: number) => {
        if (!currentScan?.id) return;
        const { success } = await rateScan(currentScan.id, stars);
        if (success) {
            setRatingToast('Thanks for your feedback!');
            setTimeout(() => setRatingToast(null), 2000);
        }
    }, [currentScan?.id, rateScan]);

    // Animated heart scale for feedback
    const heartScale = useSharedValue(1);
    const heartAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    const handleToggleWishlist = useCallback(async () => {
        if (!currentScan?.id) return;
        heartScale.value = withSequence(
            withTiming(1.3, { duration: 150 }),
            withTiming(1, { duration: 150 })
        );
        const { success } = await toggleWishlist(currentScan.id);
        if (success) {
            const msg = !isWishlisted ? 'Saved to wishlist' : 'Removed from wishlist';
            setWishlistToast(msg);
            setTimeout(() => setWishlistToast(null), 2000);
        }
    }, [currentScan?.id, isWishlisted, toggleWishlist]);

    // Animated progress bar
    const progressWidth = useSharedValue(0);
    useEffect(() => {
        progressWidth.value = withTiming(score, { duration: 800 });
    }, [score]);
    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    // Group matching items by category
    const groupedItems = useMemo(() => {
        const groups: { category: string; items: { item: WardrobeItem; reason: string }[] }[] = [];
        const byCategory = new Map<string, { item: WardrobeItem; reason: string }[]>();

        for (const item of matchingItems) {
            const cat = item.category || 'other';
            const reason = currentAnalysis
                ? shoppingService.getMatchReason(currentAnalysis, item)
                : 'Complete the look';
            if (!byCategory.has(cat)) byCategory.set(cat, []);
            byCategory.get(cat)!.push({ item, reason });
        }

        // Sort by defined category order
        for (const cat of CATEGORY_ORDER) {
            const items = byCategory.get(cat);
            if (items) groups.push({ category: cat, items });
        }
        // Append any categories not in the predefined order
        for (const [cat, items] of byCategory) {
            if (!CATEGORY_ORDER.includes(cat)) {
                groups.push({ category: cat, items });
            }
        }
        return groups;
    }, [matchingItems, currentAnalysis]);

    if (!currentScan && !currentAnalysis) {
        return (
            <View style={[styles.container, styles.emptyContainer]}>
                <Text style={styles.emptyText}>No scan results available.</Text>
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => router.replace('/(tabs)/shopping')}
                >
                    <Text style={styles.emptyButtonText}>Scan a Product</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const insights = currentScan?.ai_insights ?? [];
    const isEmptyWardrobe = score === 50 && insights.some((i) => i.text.includes('Add more items'));
    const displayLimit = 5;
    const hasMore = matchingItems.length > displayLimit;

    const productName = currentScan?.product_name ?? currentAnalysis?.product_name ?? 'Product';
    const productBrand = currentScan?.product_brand ?? currentAnalysis?.product_brand;
    const productCategory = currentScan?.category ?? currentAnalysis?.category;
    const productColor = currentScan?.color ?? currentAnalysis?.color;
    const productStyle = currentScan?.style ?? currentAnalysis?.style;
    const productImageUrl = currentScan?.product_image_url || scrapedImageUrl;
    const productPrice = currentScan?.price_amount;
    const productCurrency = currentScan?.price_currency;

    const handleScanAnother = () => {
        clearScan();
        router.replace('/(tabs)/shopping');
    };

    const handleGoHome = () => {
        clearScan();
        router.replace('/(tabs)');
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleGoHome}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Results</Text>
                {currentScan?.id ? (
                    <Animated.View style={heartAnimStyle}>
                        <TouchableOpacity
                            style={styles.wishlistButton}
                            onPress={handleToggleWishlist}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isWishlisted ? 'heart' : 'heart-outline'}
                                size={24}
                                color={isWishlisted ? '#ef4444' : '#6b7280'}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {/* Wishlist Toast */}
            {wishlistToast && (
                <View style={styles.wishlistToast}>
                    <Ionicons
                        name={isWishlisted ? 'heart' : 'heart-outline'}
                        size={16}
                        color={isWishlisted ? '#ef4444' : '#6b7280'}
                    />
                    <Text style={styles.wishlistToastText}>{wishlistToast}</Text>
                </View>
            )}

            {/* Product Image */}
            {productImageUrl && (
                <View style={styles.imageSection}>
                    <Image source={{ uri: productImageUrl }} style={styles.productImage} />
                </View>
            )}

            {/* Score Card */}
            <View style={[styles.scoreCard, { backgroundColor: rating.bgColor }]}>
                {isEmptyWardrobe ? (
                    <View style={styles.emptyScoreSection}>
                        <View style={[styles.scoreBadge, { backgroundColor: '#e5e7eb' }]}>
                            <Ionicons name="help-outline" size={36} color="#9ca3af" />
                        </View>
                        <Text style={styles.emptyScoreText}>
                            Add items to your wardrobe for personalized scoring
                        </Text>
                        <TouchableOpacity
                            style={styles.addItemsCta}
                            onPress={() => router.push('/(tabs)/add')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add-circle-outline" size={18} color="#6366f1" />
                            <Text style={styles.addItemsCtaText}>Add Items</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={[styles.scoreBadge, { backgroundColor: rating.color + '15' }]}>
                            <Text style={[styles.scoreNumber, { color: rating.color }]}>{score}</Text>
                            <Text style={[styles.scoreLabel, { color: rating.color }]}>/ 100</Text>
                        </View>

                        {/* Progress bar */}
                        <View
                            style={styles.progressBarContainer}
                            accessibilityRole="progressbar"
                            accessibilityValue={{ min: 0, max: 100, now: score }}
                        >
                            <Animated.View
                                style={[styles.progressBarFill, { backgroundColor: rating.color }, progressStyle]}
                            />
                        </View>

                        <Text style={[styles.ratingText, { color: rating.color }]}>
                            {rating.emoji} {rating.label}
                        </Text>
                        {scoreExplanation && (
                            <Text style={styles.explanationText}>{scoreExplanation}</Text>
                        )}
                    </>
                )}

                <Text style={styles.productName}>{productName}</Text>
                {productBrand && (
                    <Text style={styles.productBrand}>{productBrand}</Text>
                )}
                {productPrice != null && (
                    <Text style={styles.productPrice}>
                        {productCurrency === 'GBP' ? '\u00A3' : productCurrency === 'EUR' ? '\u20AC' : productCurrency === 'USD' ? '$' : (productCurrency || '')}{productPrice.toFixed(2)}
                    </Text>
                )}
            </View>

            {/* Product Details */}
            <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>Product Details</Text>
                <View style={styles.detailsGrid}>
                    {productCategory && (
                        <View style={styles.detailItem}>
                            <Ionicons name="pricetag-outline" size={16} color="#6b7280" />
                            <Text style={styles.detailLabel}>Category</Text>
                            <Text style={styles.detailValue}>{productCategory}</Text>
                        </View>
                    )}
                    {productColor && (
                        <View style={styles.detailItem}>
                            <Ionicons name="color-palette-outline" size={16} color="#6b7280" />
                            <Text style={styles.detailLabel}>Color</Text>
                            <Text style={styles.detailValue}>{productColor}</Text>
                        </View>
                    )}
                    {productStyle && (
                        <View style={styles.detailItem}>
                            <Ionicons name="sparkles-outline" size={16} color="#6b7280" />
                            <Text style={styles.detailLabel}>Style</Text>
                            <Text style={styles.detailValue}>{productStyle}</Text>
                        </View>
                    )}
                    {currentAnalysis?.material && (
                        <View style={styles.detailItem}>
                            <Ionicons name="layers-outline" size={16} color="#6b7280" />
                            <Text style={styles.detailLabel}>Material</Text>
                            <Text style={styles.detailValue}>{currentAnalysis.material}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* AI Insights */}
            {insights.length > 0 && (
                <View style={styles.insightsCard}>
                    <Text style={styles.sectionTitle}>Why this score?</Text>
                    {insights.map((insight, index) => {
                        const iconMap: Record<string, string> = {
                            match: 'checkmark-circle',
                            gap: 'locate-outline',
                            tip: 'bulb-outline',
                            warning: 'alert-circle-outline',
                        };
                        const colorMap: Record<string, string> = {
                            match: '#10b981',
                            gap: '#8b5cf6',
                            tip: '#3b82f6',
                            warning: '#f97316',
                        };
                        const bgMap: Record<string, string> = {
                            match: '#ecfdf5',
                            gap: '#f5f3ff',
                            tip: '#eff6ff',
                            warning: '#fff7ed',
                        };
                        return (
                            <View
                                key={index}
                                style={[styles.insightRow, { backgroundColor: bgMap[insight.category] || '#f9fafb' }]}
                            >
                                <Ionicons
                                    name={(iconMap[insight.category] || 'information-circle') as any}
                                    size={18}
                                    color={colorMap[insight.category] || '#6b7280'}
                                />
                                <Text style={styles.insightText}>{insight.text}</Text>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Matching Wardrobe Items */}
            {matchingItems.length > 0 ? (
                <View style={styles.matchingCard}>
                    <Text style={styles.sectionTitle}>
                        Items from Your Wardrobe ({matchingItems.length})
                    </Text>

                    {!showAllMatches ? (
                        /* Collapsed: horizontal scroll, max 5 items */
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.matchingList}
                        >
                            {matchingItems.slice(0, displayLimit).map((item) => (
                                <MatchingItemCard
                                    key={item.id}
                                    item={item}
                                    reason={
                                        currentAnalysis
                                            ? shoppingService.getMatchReason(currentAnalysis, item)
                                            : 'Complete the look'
                                    }
                                    onPress={() =>
                                        router.push({
                                            pathname: '/(tabs)/item-detail',
                                            params: { itemId: item.id },
                                        })
                                    }
                                />
                            ))}
                        </ScrollView>
                    ) : (
                        /* Expanded: grouped by category in grid */
                        <View>
                            {groupedItems.map((group) => (
                                <View key={group.category} style={styles.categoryGroup}>
                                    <View style={styles.categoryHeader}>
                                        <Ionicons
                                            name={(CATEGORY_ICONS[group.category] || 'ellipse-outline') as any}
                                            size={16}
                                            color="#6b7280"
                                        />
                                        <Text style={styles.categoryLabel}>
                                            {group.category.charAt(0).toUpperCase() + group.category.slice(1)} ({group.items.length})
                                        </Text>
                                    </View>
                                    <View style={styles.matchGrid}>
                                        {group.items.map(({ item, reason }) => (
                                            <MatchingItemCard
                                                key={item.id}
                                                item={item}
                                                reason={reason}
                                                onPress={() =>
                                                    router.push({
                                                        pathname: '/(tabs)/item-detail',
                                                        params: { itemId: item.id },
                                                    })
                                                }
                                            />
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {hasMore && (
                        <TouchableOpacity
                            style={styles.seeAllButton}
                            onPress={() => setShowAllMatches((prev) => !prev)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.seeAllText}>
                                {showAllMatches ? 'Show Less' : `See All Matches (${matchingItems.length})`}
                            </Text>
                            <Ionicons
                                name={showAllMatches ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color="#6366f1"
                            />
                        </TouchableOpacity>
                    )}
                </View>
            ) : !isEmptyWardrobe ? (
                /* No matches state (but wardrobe is not empty) */
                <View style={styles.matchingCard}>
                    <Text style={styles.sectionTitle}>Items from Your Wardrobe</Text>
                    <View style={styles.noMatchesSection}>
                        <Ionicons name="shirt-outline" size={36} color="#d1d5db" />
                        <Text style={styles.noMatchesText}>No matching items found</Text>
                        <Text style={styles.noMatchesSuggestion}>
                            {NO_MATCH_SUGGESTIONS[productCategory || 'tops'] || 'Add more items to find matches'}
                        </Text>
                        <TouchableOpacity
                            style={styles.addItemsCta}
                            onPress={() => router.push('/(tabs)/add')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add-circle-outline" size={18} color="#6366f1" />
                            <Text style={styles.addItemsCtaText}>Add Items</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actionsSection}>
                <TouchableOpacity
                    style={styles.scanAnotherButton}
                    onPress={handleScanAnother}
                    activeOpacity={0.8}
                >
                    <Ionicons name="camera-outline" size={20} color="#fff" />
                    <Text style={styles.scanAnotherText}>Scan Another</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.homeButton}
                    onPress={handleGoHome}
                    activeOpacity={0.8}
                >
                    <Text style={styles.homeButtonText}>Back to Home</Text>
                </TouchableOpacity>
            </View>

            {/* Rating Prompt */}
            {showRatingPrompt && (
                <View style={styles.ratingCard}>
                    <Text style={styles.ratingTitle}>Was this scan helpful?</Text>
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                onPress={() => handleRate(star)}
                                activeOpacity={0.6}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                            >
                                <Ionicons name="star-outline" size={28} color="#eab308" />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity onPress={() => setRatingDismissed(true)}>
                        <Text style={styles.ratingDismiss}>Not now</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Rating Toast */}
            {ratingToast && (
                <View style={styles.wishlistToast}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.wishlistToastText}>{ratingToast}</Text>
                </View>
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
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 16,
    },
    emptyButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
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
    wishlistButton: {
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
    wishlistToast: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 12,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    wishlistToastText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    imageSection: {
        paddingHorizontal: 24,
        marginBottom: 20,
        alignItems: 'center',
    },
    productImage: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
    },
    scoreCard: {
        marginHorizontal: 24,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    scoreBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        marginBottom: 12,
    },
    scoreNumber: {
        fontSize: 48,
        fontWeight: '800',
    },
    scoreLabel: {
        fontSize: 18,
        fontWeight: '500',
        marginLeft: 4,
    },
    progressBarContainer: {
        width: '100%',
        height: 10,
        borderRadius: 5,
        backgroundColor: '#e5e7eb',
        marginBottom: 14,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    ratingText: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    explanationText: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 10,
    },
    emptyScoreSection: {
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyScoreText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 20,
    },
    addItemsCta: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 6,
        marginBottom: 8,
    },
    addItemsCtaText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
    productName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#4b5563',
    },
    productBrand: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#5D4E37',
        marginTop: 6,
    },
    detailsCard: {
        marginHorizontal: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
    },
    insightsCard: {
        marginHorizontal: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 8,
        borderRadius: 10,
        padding: 12,
    },
    insightText: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
        lineHeight: 20,
    },
    matchingCard: {
        marginHorizontal: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    matchingList: {
        gap: 12,
    },
    matchCard: {
        width: 100,
        alignItems: 'center',
    },
    matchImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#e5e7eb',
        marginBottom: 4,
    },
    matchName: {
        fontSize: 12,
        color: '#4b5563',
        textAlign: 'center',
        marginBottom: 4,
    },
    reasonBadge: {
        backgroundColor: '#eef2ff',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    reasonText: {
        fontSize: 10,
        color: '#6366f1',
        fontWeight: '500',
    },
    categoryGroup: {
        marginBottom: 16,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    categoryLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
    },
    matchGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 4,
        marginTop: 4,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
    noMatchesSection: {
        alignItems: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    noMatchesText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6b7280',
    },
    noMatchesSuggestion: {
        fontSize: 13,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 4,
    },
    actionsSection: {
        paddingHorizontal: 24,
        gap: 12,
    },
    scanAnotherButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366f1',
        borderRadius: 14,
        padding: 16,
        gap: 8,
    },
    scanAnotherText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    homeButton: {
        alignItems: 'center',
        padding: 14,
    },
    homeButtonText: {
        fontSize: 15,
        color: '#6b7280',
        fontWeight: '500',
    },
    ratingCard: {
        marginHorizontal: 24,
        marginTop: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    ratingTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    ratingDismiss: {
        fontSize: 13,
        color: '#9ca3af',
        fontWeight: '500',
    },
});
