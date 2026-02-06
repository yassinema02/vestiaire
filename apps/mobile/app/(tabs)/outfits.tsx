/**
 * Outfits Tab
 * Shows saved outfits with filters, favorites section, and discover button
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useOutfitStore } from '../../stores/outfitStore';
import { Outfit } from '../../types/outfit';
import { OccasionType } from '../../utils/occasionDetector';
import { itemsService, WardrobeItem } from '../../services/items';

type SourceFilter = 'all' | 'ai' | 'manual';
const OCCASION_OPTIONS: OccasionType[] = ['casual', 'work', 'formal', 'sport', 'social'];

export default function OutfitsScreen() {
    const router = useRouter();
    const { outfits, isLoading, fetchOutfits, toggleFavorite } = useOutfitStore();
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [occasionFilter, setOccasionFilter] = useState<OccasionType | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchOutfits({ refresh: true });
            itemsService.getItems().then(({ items }) => setWardrobeItems(items));
        }, [])
    );

    // Apply filters
    const filteredOutfits = useMemo(() => {
        let result = outfits;

        if (sourceFilter === 'ai') {
            result = result.filter(o => o.is_ai_generated);
        } else if (sourceFilter === 'manual') {
            result = result.filter(o => !o.is_ai_generated);
        }

        if (occasionFilter) {
            result = result.filter(o => o.occasion === occasionFilter);
        }

        return result;
    }, [outfits, sourceFilter, occasionFilter]);

    const favorites = useMemo(
        () => filteredOutfits.filter(o => o.is_favorite),
        [filteredOutfits]
    );

    const nonFavorites = useMemo(
        () => filteredOutfits.filter(o => !o.is_favorite),
        [filteredOutfits]
    );

    const handleDiscover = () => {
        router.push('/(tabs)/outfits/swipe');
    };

    const handleCreateOutfit = () => {
        router.push('/(tabs)/outfits/builder');
    };

    const handleOutfitPress = (outfitId: string) => {
        router.push(`/(tabs)/outfits/detail?outfitId=${outfitId}`);
    };

    const handleToggleFavorite = (id: string) => {
        toggleFavorite(id);
    };

    const getOutfitItemImages = (outfit: Outfit): string[] => {
        if (!outfit.items) return [];
        return outfit.items
            .map(oi => {
                const item = wardrobeItems.find(wi => wi.id === oi.item_id);
                return item?.processed_image_url || item?.image_url;
            })
            .filter((url): url is string => url !== undefined)
            .slice(0, 4);
    };

    const renderOutfitCard = (outfit: Outfit) => {
        const images = getOutfitItemImages(outfit);
        return (
            <TouchableOpacity
                key={outfit.id}
                style={styles.outfitCard}
                onPress={() => handleOutfitPress(outfit.id)}
                activeOpacity={0.7}
            >
                <View style={styles.outfitImages}>
                    {images.slice(0, 4).map((imageUrl, idx) => (
                        <Image
                            key={idx}
                            source={{ uri: imageUrl }}
                            style={styles.outfitThumb}
                        />
                    ))}
                    {images.length === 0 && (
                        <View style={styles.noImagePlaceholder}>
                            <Ionicons name="shirt-outline" size={24} color="#d1d5db" />
                        </View>
                    )}
                </View>
                <View style={styles.outfitInfo}>
                    <Text style={styles.outfitName} numberOfLines={1}>
                        {outfit.name || 'Untitled Outfit'}
                    </Text>
                    <View style={styles.outfitMeta}>
                        {outfit.is_ai_generated && (
                            <View style={styles.aiBadge}>
                                <Ionicons name="sparkles" size={12} color="#6366f1" />
                                <Text style={styles.aiBadgeText}>AI</Text>
                            </View>
                        )}
                        {outfit.occasion && (
                            <Text style={styles.occasionText}>
                                {outfit.occasion}
                            </Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => handleToggleFavorite(outfit.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons
                        name={outfit.is_favorite ? 'heart' : 'heart-outline'}
                        size={22}
                        color={outfit.is_favorite ? '#ef4444' : '#9ca3af'}
                    />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const renderFilterBar = () => (
        <View style={styles.filterContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
            >
                {/* Source filters */}
                {([
                    { key: 'all', label: 'All' },
                    { key: 'ai', label: 'AI-Generated' },
                    { key: 'manual', label: 'Manual' },
                ] as const).map(({ key, label }) => (
                    <TouchableOpacity
                        key={key}
                        style={[styles.filterChip, sourceFilter === key && styles.filterChipActive]}
                        onPress={() => setSourceFilter(key)}
                    >
                        <Text style={[styles.filterChipText, sourceFilter === key && styles.filterChipTextActive]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}

                <View style={styles.filterDivider} />

                {/* Occasion filters */}
                {OCCASION_OPTIONS.map((occasion) => (
                    <TouchableOpacity
                        key={occasion}
                        style={[styles.filterChip, occasionFilter === occasion && styles.filterChipActive]}
                        onPress={() => setOccasionFilter(occasionFilter === occasion ? null : occasion)}
                    >
                        <Text style={[styles.filterChipText, occasionFilter === occasion && styles.filterChipTextActive]}>
                            {occasion.charAt(0).toUpperCase() + occasion.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Outfits</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleCreateOutfit}>
                    <Ionicons name="add" size={22} color="#6366f1" />
                </TouchableOpacity>
            </View>

            {/* Discover Button */}
            <TouchableOpacity style={styles.discoverButton} onPress={handleDiscover}>
                <View style={styles.discoverIcon}>
                    <Ionicons name="sparkles" size={24} color="#fff" />
                </View>
                <View style={styles.discoverContent}>
                    <Text style={styles.discoverTitle}>Discover Outfits</Text>
                    <Text style={styles.discoverSubtitle}>
                        Swipe through AI-generated looks
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#6366f1" />
            </TouchableOpacity>

            {/* Filter Bar */}
            {renderFilterBar()}

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : filteredOutfits.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="layers-outline" size={64} color="#d1d5db" />
                    </View>
                    <Text style={styles.emptyTitle}>No saved outfits</Text>
                    <Text style={styles.emptySubtitle}>
                        {sourceFilter !== 'all' || occasionFilter
                            ? 'Try adjusting your filters'
                            : 'Discover and save outfits you love'}
                    </Text>
                    {sourceFilter === 'all' && !occasionFilter && (
                        <TouchableOpacity style={styles.emptyButton} onPress={handleDiscover}>
                            <Text style={styles.emptyButtonText}>Start Discovering</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <ScrollView
                    style={styles.outfitsList}
                    contentContainerStyle={styles.outfitsContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Favorites Section */}
                    {favorites.length > 0 && (
                        <>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="heart" size={16} color="#ef4444" />
                                <Text style={styles.sectionTitle}>Favorites</Text>
                                <Text style={styles.countBadge}>{favorites.length}</Text>
                            </View>
                            {favorites.map(renderOutfitCard)}
                        </>
                    )}

                    {/* All Outfits Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                            {favorites.length > 0 ? 'All Outfits' : 'Saved Outfits'}
                        </Text>
                        <Text style={styles.countBadge}>{nonFavorites.length}</Text>
                    </View>
                    {nonFavorites.map(renderOutfitCard)}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    discoverButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 24,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 16,
    },
    discoverIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    discoverContent: {
        flex: 1,
    },
    discoverTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    discoverSubtitle: {
        fontSize: 13,
        color: '#6b7280',
    },

    // Filters
    filterContainer: {
        marginBottom: 12,
    },
    filterScroll: {
        paddingHorizontal: 24,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    filterChipActive: {
        backgroundColor: '#5D4E37',
        borderColor: '#5D4E37',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    filterChipTextActive: {
        color: '#fff',
    },
    filterDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#e5e7eb',
        alignSelf: 'center',
    },

    // Sections
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 4,
        gap: 6,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    countBadge: {
        backgroundColor: '#eef2ff',
        color: '#6366f1',
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },

    // Loading / Empty
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyButton: {
        backgroundColor: '#6366f1',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },

    // Outfit list
    outfitsList: {
        flex: 1,
    },
    outfitsContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },

    // Outfit card
    outfitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    outfitImages: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 72,
        height: 72,
        gap: 2,
        marginRight: 12,
    },
    outfitThumb: {
        width: 34,
        height: 34,
        borderRadius: 6,
        backgroundColor: '#f3f4f6',
    },
    noImagePlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    outfitInfo: {
        flex: 1,
    },
    outfitName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    outfitMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    aiBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6366f1',
    },
    occasionText: {
        fontSize: 13,
        color: '#6b7280',
        textTransform: 'capitalize',
    },
    favoriteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
