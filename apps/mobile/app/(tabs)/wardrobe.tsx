/**
 * Wardrobe Tab
 * Enhanced gallery with filters, search, and sort
 */

import { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Modal,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { itemsService, WardrobeItem } from '../../services/items';
import { CATEGORIES, COLORS } from '../../services/aiCategorization';
import { getCPWResult } from '../../utils/cpwCalculator';
import { isNeglected, countNeglected } from '../../utils/neglectedItems';
import { resaleService } from '../../services/resaleService';

// Filter constants
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'most_worn', label: 'Most Worn' },
    { value: 'least_worn', label: 'Least Worn' },
    { value: 'cpw_best', label: 'Best Cost/Wear' },
    { value: 'cpw_worst', label: 'Worst Cost/Wear' },
] as const;

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All-Season'];
const OCCASIONS = ['Casual', 'Work', 'Formal', 'Sport', 'Night Out'];

type SortOption = typeof SORT_OPTIONS[number]['value'];

export default function WardrobeScreen() {
    const router = useRouter();
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
    const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [showNeglectedOnly, setShowNeglectedOnly] = useState(false);
    const [showResaleOnly, setShowResaleOnly] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadItems();
        }, [])
    );

    const loadItems = async () => {
        try {
            setError(null);
            const { items: fetchedItems, error: fetchError } = await itemsService.getItems();
            if (fetchError) {
                setError('Failed to load items');
            } else {
                setItems(fetchedItems);
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadItems();
    };

    // Filter and sort items
    const filteredItems = useMemo(() => {
        let result = [...items];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (item) =>
                    item.name?.toLowerCase().includes(query) ||
                    item.brand?.toLowerCase().includes(query)
            );
        }

        // Category filter
        if (selectedCategory) {
            result = result.filter((item) => item.category === selectedCategory);
        }

        // Color filter
        if (selectedColors.length > 0) {
            result = result.filter((item) =>
                item.colors?.some((c) => selectedColors.includes(c))
            );
        }

        // Season filter
        if (selectedSeasons.length > 0) {
            result = result.filter((item) =>
                item.seasons?.some((s) => selectedSeasons.includes(s))
            );
        }

        // Occasion filter
        if (selectedOccasions.length > 0) {
            result = result.filter((item) =>
                item.occasions?.some((o) => selectedOccasions.includes(o))
            );
        }

        // Neglected filter
        if (showNeglectedOnly) {
            result = result.filter((item) => isNeglected(item));
        }

        // Resale candidates filter
        if (showResaleOnly) {
            result = result.filter((item) => resaleService.isResaleCandidate(item));
        }

        // Sort
        switch (sortBy) {
            case 'newest':
                result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
            case 'oldest':
                result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                break;
            case 'most_worn':
                result.sort((a, b) => (b.wear_count || 0) - (a.wear_count || 0));
                break;
            case 'least_worn':
                result.sort((a, b) => (a.wear_count || 0) - (b.wear_count || 0));
                break;
            case 'cpw_best': {
                const cpwA = (a: WardrobeItem) => a.purchase_price && a.wear_count > 0 ? a.purchase_price / a.wear_count : Infinity;
                result.sort((a, b) => cpwA(a) - cpwA(b));
                break;
            }
            case 'cpw_worst': {
                const cpwB = (a: WardrobeItem) => a.purchase_price && a.wear_count > 0 ? a.purchase_price / a.wear_count : -1;
                result.sort((a, b) => cpwB(b) - cpwB(a));
                break;
            }
        }

        return result;
    }, [items, searchQuery, selectedCategory, selectedColors, selectedSeasons, selectedOccasions, showNeglectedOnly, showResaleOnly, sortBy]);

    const neglectedCount = useMemo(() => countNeglected(items), [items]);
    const resaleCount = useMemo(() => items.filter(i => resaleService.isResaleCandidate(i)).length, [items]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedCategory) count++;
        if (selectedColors.length > 0) count++;
        if (selectedSeasons.length > 0) count++;
        if (selectedOccasions.length > 0) count++;
        if (showNeglectedOnly) count++;
        if (showResaleOnly) count++;
        return count;
    }, [selectedCategory, selectedColors, selectedSeasons, selectedOccasions, showNeglectedOnly, showResaleOnly]);

    const clearAllFilters = () => {
        setSelectedCategory(null);
        setSelectedColors([]);
        setSelectedSeasons([]);
        setSelectedOccasions([]);
        setShowNeglectedOnly(false);
        setShowResaleOnly(false);
        setSearchQuery('');
    };

    const toggleColor = (color: string) => {
        setSelectedColors((prev) =>
            prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
        );
    };

    const toggleSeason = (season: string) => {
        setSelectedSeasons((prev) =>
            prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]
        );
    };

    const toggleOccasion = (occasion: string) => {
        setSelectedOccasions((prev) =>
            prev.includes(occasion) ? prev.filter((o) => o !== occasion) : [...prev, occasion]
        );
    };

    const renderItem = ({ item }: { item: WardrobeItem }) => {
        const displayUrl = item.processed_image_url || item.image_url;
        const allItemIds = filteredItems.map(i => i.id);
        const cpw = getCPWResult(item.purchase_price, item.wear_count);
        const neglected = isNeglected(item);
        return (
            <TouchableOpacity
                style={styles.itemCard}
                onPress={() => router.push({
                    pathname: '/(tabs)/item-detail',
                    params: { itemId: item.id, itemIds: JSON.stringify(allItemIds) }
                })}
            >
                <Image source={{ uri: displayUrl }} style={styles.itemImage} resizeMode="cover" />
                {neglected && (
                    <View style={styles.neglectedOverlay}>
                        <View style={styles.neglectedBadge}>
                            <Ionicons name="moon-outline" size={12} color="#fff" />
                        </View>
                    </View>
                )}
                {item.category && (
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                )}
                {item.is_favorite && (
                    <View style={styles.favoriteBadge}>
                        <Ionicons name="heart" size={14} color="#ef4444" />
                    </View>
                )}
                {cpw.value !== null ? (
                    <View style={[styles.cpwBadge, { backgroundColor: cpw.color }]}>
                        <Text style={styles.cpwBadgeText}>{cpw.formatted}/w</Text>
                    </View>
                ) : item.purchase_price == null && (
                    <View style={[styles.cpwBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                        <Text style={styles.cpwBadgeText}>+ price</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.placeholderContainer}>
                <Ionicons name="shirt-outline" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.placeholderTitle}>
                {searchQuery || activeFilterCount > 0 ? 'No items found' : 'Your wardrobe is empty'}
            </Text>
            <Text style={styles.subtitle}>
                {searchQuery || activeFilterCount > 0
                    ? 'Try adjusting your filters'
                    : 'Add your first clothing item to get started'}
            </Text>
            {activeFilterCount > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={clearAllFilters}>
                    <Text style={styles.clearButtonText}>Clear Filters</Text>
                </TouchableOpacity>
            )}
            {!searchQuery && activeFilterCount === 0 && (
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push('/(tabs)/add')}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Add First Item</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Wardrobe</Text>
                    <Text style={styles.itemCount}>
                        {filteredItems.length} of {items.length} items
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => setShowSortModal(true)}>
                        <Ionicons name="swap-vertical" size={20} color="#1f2937" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconButton, activeFilterCount > 0 && styles.iconButtonActive]}
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Ionicons name="filter" size={20} color={activeFilterCount > 0 ? '#fff' : '#1f2937'} />
                        {activeFilterCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or brand..."
                    placeholderTextColor="#9ca3af"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Category Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs} contentContainerStyle={styles.categoryTabsContent}>
                <TouchableOpacity
                    style={[styles.categoryTab, !selectedCategory && styles.categoryTabActive]}
                    onPress={() => setSelectedCategory(null)}
                >
                    <Text style={[styles.categoryTabText, !selectedCategory && styles.categoryTabTextActive]}>All</Text>
                </TouchableOpacity>
                {Object.keys(CATEGORIES).map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.categoryTab, selectedCategory === cat && styles.categoryTabActive]}
                        onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    >
                        <Text style={[styles.categoryTabText, selectedCategory === cat && styles.categoryTabTextActive]}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Color Filter Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow} contentContainerStyle={styles.colorRowContent}>
                {COLORS.map((color) => (
                    <TouchableOpacity
                        key={color.name}
                        style={[
                            styles.colorDot,
                            { backgroundColor: color.hex },
                            selectedColors.includes(color.name) && styles.colorDotSelected,
                        ]}
                        onPress={() => toggleColor(color.name)}
                    >
                        {selectedColors.includes(color.name) && (
                            <Ionicons name="checkmark" size={14} color={['White', 'Cream', 'Yellow', 'Lavender', 'Beige', 'Tan', 'Light Blue', 'Pink'].includes(color.name) ? '#000' : '#fff'} />
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Special Filter Chips */}
            {(neglectedCount > 0 || resaleCount > 0) && (
                <View style={styles.specialFilterRow}>
                    {neglectedCount > 0 && (
                        <TouchableOpacity
                            style={[styles.neglectedChip, showNeglectedOnly && styles.neglectedChipActive]}
                            onPress={() => { setShowNeglectedOnly(!showNeglectedOnly); setShowResaleOnly(false); }}
                        >
                            <Ionicons
                                name="moon-outline"
                                size={14}
                                color={showNeglectedOnly ? '#fff' : '#f59e0b'}
                            />
                            <Text style={[styles.neglectedChipText, showNeglectedOnly && styles.neglectedChipTextActive]}>
                                Neglected ({neglectedCount})
                            </Text>
                        </TouchableOpacity>
                    )}
                    {resaleCount > 0 && (
                        <TouchableOpacity
                            style={[styles.resaleChip, showResaleOnly && styles.resaleChipActive]}
                            onPress={() => { setShowResaleOnly(!showResaleOnly); setShowNeglectedOnly(false); }}
                        >
                            <Ionicons
                                name="pricetag-outline"
                                size={14}
                                color={showResaleOnly ? '#fff' : '#22c55e'}
                            />
                            <Text style={[styles.resaleChipText, showResaleOnly && styles.resaleChipTextActive]}>
                                Resale ({resaleCount})
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : error ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                    <Text style={styles.placeholderTitle}>Something went wrong</Text>
                    <TouchableOpacity style={styles.clearButton} onPress={loadItems}>
                        <Text style={styles.clearButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.gridContainer}
                    columnWrapperStyle={styles.gridRow}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#6366f1" />}
                />
            )}

            {/* Filter Modal */}
            <Modal visible={showFilterModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filters</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={24} color="#1f2937" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.filterLabel}>Seasons</Text>
                            <View style={styles.chipWrap}>
                                {SEASONS.map((season) => (
                                    <TouchableOpacity
                                        key={season}
                                        style={[styles.chip, selectedSeasons.includes(season) && styles.chipSelected]}
                                        onPress={() => toggleSeason(season)}
                                    >
                                        <Text style={[styles.chipText, selectedSeasons.includes(season) && styles.chipTextSelected]}>{season}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.filterLabel}>Occasions</Text>
                            <View style={styles.chipWrap}>
                                {OCCASIONS.map((occasion) => (
                                    <TouchableOpacity
                                        key={occasion}
                                        style={[styles.chip, selectedOccasions.includes(occasion) && styles.chipSelected]}
                                        onPress={() => toggleOccasion(occasion)}
                                    >
                                        <Text style={[styles.chipText, selectedOccasions.includes(occasion) && styles.chipTextSelected]}>{occasion}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.modalClearBtn} onPress={clearAllFilters}>
                                <Text style={styles.modalClearText}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalApplyBtn} onPress={() => setShowFilterModal(false)}>
                                <Text style={styles.modalApplyText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Sort Modal */}
            <Modal visible={showSortModal} animationType="fade" transparent>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
                    <View style={styles.sortModalContent}>
                        <Text style={styles.sortModalTitle}>Sort By</Text>
                        {SORT_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={styles.sortOption}
                                onPress={() => { setSortBy(option.value); setShowSortModal(false); }}
                            >
                                <Text style={[styles.sortOptionText, sortBy === option.value && styles.sortOptionTextActive]}>
                                    {option.label}
                                </Text>
                                {sortBy === option.value && <Ionicons name="checkmark" size={20} color="#6366f1" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: Platform.OS === 'ios' ? 60 : 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#1f2937' },
    itemCount: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 8 },
    iconButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    iconButtonActive: { backgroundColor: '#6366f1' },
    filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 12 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 15, color: '#1f2937' },
    categoryTabs: { marginBottom: 12, minHeight: 44 },
    categoryTabsContent: { paddingHorizontal: 16, alignItems: 'center' },
    categoryTab: { paddingHorizontal: 16, paddingVertical: 12, marginRight: 8, borderRadius: 20, backgroundColor: '#fff', height: 40, justifyContent: 'center' },
    categoryTabActive: { backgroundColor: '#6366f1' },
    categoryTabText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
    categoryTabTextActive: { color: '#fff' },
    colorRow: { marginBottom: 16, minHeight: 40 },
    colorRowContent: { paddingHorizontal: 20, alignItems: 'center' },
    colorDot: { width: 32, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 2, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
    colorDotSelected: { borderColor: '#6366f1', borderWidth: 3 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    placeholderContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    placeholderTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
    clearButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
    clearButtonText: { color: '#6366f1', fontWeight: '500' },
    addButton: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#6366f1', borderRadius: 10 },
    addButtonText: { color: '#fff', fontWeight: '600' },
    gridContainer: { paddingHorizontal: 16, paddingBottom: 100 },
    gridRow: { justifyContent: 'space-between', marginBottom: 12 },
    itemCard: { width: '48%', aspectRatio: 3 / 4, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    itemImage: { width: '100%', height: '100%' },
    categoryBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    categoryText: { color: '#fff', fontSize: 10, fontWeight: '500', textTransform: 'capitalize' },
    favoriteBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    cpwBadge: { position: 'absolute', bottom: 8, right: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    cpwBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
    neglectedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.08)', zIndex: 1 },
    neglectedBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#f59e0b', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    specialFilterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10, gap: 8 },
    neglectedChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f59e0b' },
    neglectedChipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
    neglectedChipText: { fontSize: 13, fontWeight: '500', color: '#f59e0b' },
    neglectedChipTextActive: { color: '#fff' },
    resaleChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#22c55e' },
    resaleChipActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    resaleChipText: { fontSize: 13, fontWeight: '500', color: '#22c55e' },
    resaleChipTextActive: { color: '#fff' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    modalTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
    modalScroll: { padding: 20 },
    filterLabel: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 12, marginTop: 8 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
    chipSelected: { backgroundColor: '#6366f1' },
    chipText: { fontSize: 13, color: '#4b5563' },
    chipTextSelected: { color: '#fff', fontWeight: '500' },
    modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    modalClearBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
    modalClearText: { color: '#4b5563', fontWeight: '500' },
    modalApplyBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#6366f1', alignItems: 'center' },
    modalApplyText: { color: '#fff', fontWeight: '600' },
    sortModalContent: { backgroundColor: '#fff', margin: 20, borderRadius: 16, padding: 20 },
    sortModalTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 16 },
    sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    sortOptionText: { fontSize: 15, color: '#4b5563' },
    sortOptionTextActive: { color: '#6366f1', fontWeight: '500' },
});
