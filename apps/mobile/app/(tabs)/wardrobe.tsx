/**
 * Wardrobe Tab
 * Enhanced gallery with filters, search, and sort
 */

import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator, RefreshControl, TextInput, Modal, Platform, ScrollView, Alert } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { itemsService, WardrobeItem } from '../../services/items';
import { CATEGORIES, COLORS } from '../../services/aiCategorization';
import { getCPWResult } from '../../utils/cpwCalculator';
import { isNeglectedFromDb } from '../../utils/neglectedItems';
import { resaleService } from '../../services/resaleService';
import { useExtractionStore } from '../../stores/extractionStore';
import { appTheme } from '../../theme/tokens';
import { useTabBarOnScroll } from '../../hooks/useTabBarOnScroll';

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

type SortOption = (typeof SORT_OPTIONS)[number]['value'];

export default function WardrobeScreen() {
  const router = useRouter();
  const extractionState = useExtractionStore();
  const tabBarScroll = useTabBarOnScroll();
  const isExtracting =
    extractionState.isUploading || extractionState.isProcessing || extractionState.isGeneratingPhotos;
  const extractionDone = extractionState.completionPending;

  const extractionBannerText = (() => {
    if (extractionDone) return 'Items ready to review!';
    if (extractionState.isUploading) {
      const pct = extractionState.uploadProgress?.percentage ?? 0;
      return `Uploading photos... ${pct}%`;
    }
    if (extractionState.isProcessing) {
      const p = extractionState.processingProgress;
      const pct = p && p.total > 0 ? Math.round((p.processed / p.total) * 100) : 0;
      return `Analyzing photos... ${pct}%`;
    }
    if (extractionState.isGeneratingPhotos) {
      const p = extractionState.photoGenProgress;
      const pct = p && p.total > 0 ? Math.round((p.processed / p.total) * 100) : 0;
      return `Generating product photos... ${pct}%`;
    }
    return null;
  })();

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
  const [showListedOnly, setShowListedOnly] = useState(false);
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
        item =>
          item.name?.toLowerCase().includes(query) || item.brand?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter(item => item.category === selectedCategory);
    }

    // Color filter
    if (selectedColors.length > 0) {
      result = result.filter(item => item.colors?.some(c => selectedColors.includes(c)));
    }

    // Season filter
    if (selectedSeasons.length > 0) {
      result = result.filter(item => item.seasons?.some(s => selectedSeasons.includes(s)));
    }

    // Occasion filter
    if (selectedOccasions.length > 0) {
      result = result.filter(item => item.occasions?.some(o => selectedOccasions.includes(o)));
    }

    // Neglected filter (uses DB column from Story 13.1)
    if (showNeglectedOnly) {
      result = result.filter(item => isNeglectedFromDb(item));
    }

    // Resale candidates filter
    if (showResaleOnly) {
      result = result.filter(item => resaleService.isResaleCandidate(item));
    }

    // Listed for resale filter (Story 13.3)
    if (showListedOnly) {
      result = result.filter(item => item.resale_status === 'listed');
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
        const cpwA = (a: WardrobeItem) =>
          a.purchase_price && a.wear_count > 0 ? a.purchase_price / a.wear_count : Infinity;
        result.sort((a, b) => cpwA(a) - cpwA(b));
        break;
      }
      case 'cpw_worst': {
        const cpwB = (a: WardrobeItem) =>
          a.purchase_price && a.wear_count > 0 ? a.purchase_price / a.wear_count : -1;
        result.sort((a, b) => cpwB(b) - cpwB(a));
        break;
      }
    }

    return result;
  }, [
    items,
    searchQuery,
    selectedCategory,
    selectedColors,
    selectedSeasons,
    selectedOccasions,
    showNeglectedOnly,
    showResaleOnly,
    showListedOnly,
    sortBy,
  ]);

  const neglectedCount = useMemo(() => items.filter(i => i.neglect_status).length, [items]);
  const resaleCount = useMemo(
    () => items.filter(i => resaleService.isResaleCandidate(i)).length,
    [items]
  );
  const listedCount = useMemo(
    () => items.filter(i => i.resale_status === 'listed').length,
    [items]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory) count++;
    if (selectedColors.length > 0) count++;
    if (selectedSeasons.length > 0) count++;
    if (selectedOccasions.length > 0) count++;
    if (showNeglectedOnly) count++;
    if (showResaleOnly) count++;
    if (showListedOnly) count++;
    return count;
  }, [
    selectedCategory,
    selectedColors,
    selectedSeasons,
    selectedOccasions,
    showNeglectedOnly,
    showResaleOnly,
    showListedOnly,
  ]);

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedColors([]);
    setSelectedSeasons([]);
    setSelectedOccasions([]);
    setShowNeglectedOnly(false);
    setShowResaleOnly(false);
    setShowListedOnly(false);
    setSearchQuery('');
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const toggleSeason = (season: string) => {
    setSelectedSeasons(prev =>
      prev.includes(season) ? prev.filter(s => s !== season) : [...prev, season]
    );
  };

  const toggleOccasion = (occasion: string) => {
    setSelectedOccasions(prev =>
      prev.includes(occasion) ? prev.filter(o => o !== occasion) : [...prev, occasion]
    );
  };

  const renderItem = ({ item }: { item: WardrobeItem }) => {
    const displayUrl = item.processed_image_url || item.image_url;
    const allItemIds = filteredItems.map(i => i.id);
    const cpw = getCPWResult(item.purchase_price, item.wear_count);
    const neglected = isNeglectedFromDb(item);
    const itemName = item.name || item.sub_category || item.category || 'Untitled piece';
    const itemMeta = [item.brand, item.category].filter(Boolean).join(' · ') || 'Wardrobe piece';
    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/item-detail',
            params: { itemId: item.id, itemIds: JSON.stringify(allItemIds) },
          })
        }
      >
        <View style={styles.itemVisual}>
          <Image source={{ uri: displayUrl }} style={styles.itemImage} resizeMode="cover" />
          {neglected && (
            <View style={styles.neglectedOverlay}>
              <View style={styles.neglectedBadge}>
                <Ionicons name="moon-outline" size={12} color="#fff" />
              </View>
            </View>
          )}
          {item.resale_status === 'listed' && (
            <View style={styles.listedBadge}>
              <Ionicons name="pricetag" size={10} color="#fff" />
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
          ) : (
            item.purchase_price == null && (
              <View style={[styles.cpwBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <Text style={styles.cpwBadgeText}>+ price</Text>
              </View>
            )
          )}
        </View>
        <View style={styles.itemFooter}>
          <Text style={styles.itemName} numberOfLines={1}>
            {itemName}
          </Text>
          <Text style={styles.itemMeta} numberOfLines={1}>
            {itemMeta}
          </Text>
          <View style={styles.itemFooterRow}>
            <Text style={styles.itemFooterText}>{item.wear_count || 0} wears</Text>
            <Text style={styles.itemFooterDot}>•</Text>
            <Text style={styles.itemFooterText}>
              {item.purchase_price ? `${item.purchase_price.toFixed(0)}` : 'Price n/a'}
            </Text>
          </View>
        </View>
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
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(tabs)/add')}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add First Item</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderWardrobeHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.pageTitle}>Wardrobe</Text>
          <Text style={styles.pageSubtitle}>{filteredItems.length} items</Text>
        </View>
        <TouchableOpacity
          style={styles.addIconBtn}
          onPress={() => {
            Alert.alert('Magic Import', 'How would you like to add items?', [
              { text: 'Upload from Gallery', onPress: () => router.push('/(tabs)/bulk-upload') },
              { text: 'Connect Instagram', onPress: () => Alert.alert('Coming Soon', 'Instagram import will be available in a future update.') },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
        >
          <Ionicons name="add" size={24} color={appTheme.palette.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={appTheme.palette.textSoft} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clothes..."
            placeholderTextColor={appTheme.palette.textSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={appTheme.palette.textSoft} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSortModal(true)}>
          <Ionicons name="swap-vertical" size={20} color={appTheme.palette.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, activeFilterCount > 0 && styles.iconBtnActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons
            name="options"
            size={20}
            color={activeFilterCount > 0 ? appTheme.palette.surface : appTheme.palette.text}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {(isExtracting || extractionDone) && extractionBannerText && (
        <TouchableOpacity
          style={[styles.extractionBanner, extractionDone && styles.extractionBannerDone]}
          onPress={() => router.push('/(tabs)/bulk-upload')}
        >
          <Ionicons
            name={extractionDone ? 'checkmark-circle' : 'sync'}
            size={16}
            color={extractionDone ? '#22c55e' : '#87A96B'}
          />
          <Text
            style={[
              styles.extractionBannerText,
              extractionDone && { color: appTheme.palette.success },
            ]}
          >
            {extractionBannerText}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={appTheme.palette.textSoft} />
        </TouchableOpacity>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabs}
        contentContainerStyle={styles.categoryTabsContent}
      >
        <TouchableOpacity
          style={[styles.categoryTab, !selectedCategory && styles.categoryTabActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryTabText, !selectedCategory && styles.categoryTabTextActive]}>All</Text>
        </TouchableOpacity>
        {Object.keys(CATEGORIES).map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryTab, selectedCategory === cat && styles.categoryTabActive]}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === cat && styles.categoryTabTextActive,
              ]}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {(neglectedCount > 0 || resaleCount > 0 || listedCount > 0) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.specialFilterRow}
          contentContainerStyle={styles.specialFilterContent}
        >
          {neglectedCount > 0 && (
            <TouchableOpacity
              style={[styles.neglectedChip, showNeglectedOnly && styles.neglectedChipActive]}
              onPress={() => {
                setShowNeglectedOnly(!showNeglectedOnly);
                setShowResaleOnly(false);
                setShowListedOnly(false);
              }}
            >
              <Ionicons name="moon-outline" size={14} color={showNeglectedOnly ? '#fff' : '#f59e0b'} />
              <Text style={[styles.neglectedChipText, showNeglectedOnly && styles.neglectedChipTextActive]}>
                Neglected ({neglectedCount})
              </Text>
            </TouchableOpacity>
          )}
          {resaleCount > 0 && (
            <TouchableOpacity
              style={[styles.resaleChip, showResaleOnly && styles.resaleChipActive]}
              onPress={() => {
                setShowResaleOnly(!showResaleOnly);
                setShowNeglectedOnly(false);
                setShowListedOnly(false);
              }}
            >
              <Ionicons name="pricetag-outline" size={14} color={showResaleOnly ? '#fff' : '#22c55e'} />
              <Text style={[styles.resaleChipText, showResaleOnly && styles.resaleChipTextActive]}>
                Resale ({resaleCount})
              </Text>
            </TouchableOpacity>
          )}
          {listedCount > 0 && (
            <TouchableOpacity
              style={[styles.resaleChip, showListedOnly && styles.resaleChipActive]}
              onPress={() => {
                setShowListedOnly(!showListedOnly);
                setShowNeglectedOnly(false);
                setShowResaleOnly(false);
              }}
            >
              <Ionicons name="pricetag" size={14} color={showListedOnly ? '#fff' : '#22c55e'} />
              <Text style={[styles.resaleChipText, showListedOnly && styles.resaleChipTextActive]}>
                Listed ({listedCount})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#87A96B" />
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
          keyExtractor={item => item.id}
          numColumns={2}
          ListHeaderComponent={renderWardrobeHeader}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          onScroll={tabBarScroll.onScroll}
          scrollEventThrottle={tabBarScroll.scrollEventThrottle}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#87A96B"
            />
          }
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
              <Text style={styles.filterLabel}>Colors</Text>
              <View style={styles.chipWrap}>
                {COLORS.map(color => (
                  <TouchableOpacity
                    key={color.name}
                    style={[
                      styles.colorChip,
                      selectedColors.includes(color.name) && styles.colorChipSelected,
                      { borderColor: selectedColors.includes(color.name) ? 'transparent' : 'rgba(181, 150, 120, 0.18)' }
                    ]}
                    onPress={() => toggleColor(color.name)}
                  >
                    <View style={[styles.colorModalDot, { backgroundColor: color.hex }]} />
                    <Text
                      style={[
                        styles.colorChipText,
                        selectedColors.includes(color.name) && styles.colorChipTextSelected,
                      ]}
                    >
                      {color.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.filterLabel}>Seasons</Text>
              <View style={styles.chipWrap}>
                {SEASONS.map(season => (
                  <TouchableOpacity
                    key={season}
                    style={[styles.chip, selectedSeasons.includes(season) && styles.chipSelected]}
                    onPress={() => toggleSeason(season)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedSeasons.includes(season) && styles.chipTextSelected,
                      ]}
                    >
                      {season}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.filterLabel}>Occasions</Text>
              <View style={styles.chipWrap}>
                {OCCASIONS.map(occasion => (
                  <TouchableOpacity
                    key={occasion}
                    style={[
                      styles.chip,
                      selectedOccasions.includes(occasion) && styles.chipSelected,
                    ]}
                    onPress={() => toggleOccasion(occasion)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedOccasions.includes(occasion) && styles.chipTextSelected,
                      ]}
                    >
                      {occasion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalClearBtn} onPress={clearAllFilters}>
                <Text style={styles.modalClearText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSortModal} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>Sort By</Text>
            {SORT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortOption}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.sortOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && <Ionicons name="checkmark" size={20} color="#87A96B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.palette.canvas,
    paddingTop: Platform.OS === 'ios' ? 28 : 20,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 32,
    fontFamily: appTheme.typography.display,
    color: appTheme.palette.text,
    lineHeight: 36,
  },
  pageSubtitle: {
    fontSize: 14,
    color: appTheme.palette.textSoft,
  },
  addIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: appTheme.palette.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...appTheme.shadows.float,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appTheme.palette.canvas,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, color: appTheme.palette.text },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: appTheme.palette.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
  },
  iconBtnActive: { backgroundColor: appTheme.palette.accent, borderColor: 'transparent' },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: appTheme.palette.gold,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  categoryTabs: { marginBottom: 12, minHeight: 40 },
  categoryTabsContent: { alignItems: 'center' },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: appTheme.palette.canvas,
    height: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.16)',
  },
  categoryTabActive: {
    backgroundColor: appTheme.palette.surfaceRaised,
    borderColor: 'transparent',
    ...appTheme.shadows.card,
  },
  categoryTabText: { fontSize: 14, color: appTheme.palette.textMuted, fontWeight: '600' },
  categoryTabTextActive: { color: appTheme.palette.text },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: appTheme.palette.canvas,
    borderWidth: 1,
    marginRight: 8,
  },
  colorChipSelected: {
    backgroundColor: appTheme.palette.surfaceInverse,
  },
  colorModalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorChipText: { fontSize: 13, color: appTheme.palette.textMuted },
  colorChipTextSelected: { color: '#fff', fontWeight: '500' },
  specialFilterContent: { paddingRight: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  placeholderContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: appTheme.palette.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.18)',
  },
  placeholderTitle: {
    fontSize: 22,
    fontFamily: appTheme.typography.display,
    color: appTheme.palette.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: appTheme.palette.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  clearButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: appTheme.palette.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
  },
  clearButtonText: { color: appTheme.palette.accent, fontWeight: '700' },
  addButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: appTheme.palette.accent,
    borderRadius: 12,
  },
  addButtonText: { color: appTheme.palette.surface, fontWeight: '700' },
  gridContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  itemCard: {
    width: '48%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: appTheme.palette.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.18)',
    ...appTheme.shadows.card,
  },
  itemVisual: { height: 220, position: 'relative' },
  itemImage: { width: '100%', height: '100%' },
  itemFooter: { padding: 12, gap: 4 },
  itemName: {
    fontSize: 16,
    lineHeight: 20,
    color: appTheme.palette.text,
    fontFamily: appTheme.typography.display,
  },
  itemMeta: { fontSize: 12, color: appTheme.palette.textMuted, textTransform: 'capitalize' },
  itemFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  itemFooterText: { fontSize: 12, color: appTheme.palette.textSoft, fontWeight: '600' },
  itemFooterDot: { fontSize: 11, color: appTheme.palette.textSoft },
  categoryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(36, 27, 23, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: { color: '#fff', fontSize: 10, fontWeight: '500', textTransform: 'capitalize' },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: appTheme.palette.surfaceRaised,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cpwBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cpwBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  neglectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 1,
  },
  neglectedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#f59e0b',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#22c55e',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  specialFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  neglectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: appTheme.palette.surfaceRaised,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  neglectedChipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  neglectedChipText: { fontSize: 13, fontWeight: '500', color: '#f59e0b' },
  neglectedChipTextActive: { color: '#fff' },
  resaleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: appTheme.palette.surfaceRaised,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  resaleChipActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  resaleChipText: { fontSize: 13, fontWeight: '500', color: '#22c55e' },
  resaleChipTextActive: { color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(36,27,23,0.40)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: appTheme.palette.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(181, 150, 120, 0.18)',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: appTheme.typography.display,
    color: appTheme.palette.text,
  },
  modalScroll: { padding: 20 },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: appTheme.palette.text,
    marginBottom: 12,
    marginTop: 8,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: appTheme.palette.canvas,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.18)',
  },
  chipSelected: { backgroundColor: appTheme.palette.surfaceInverse, borderColor: 'transparent' },
  chipText: { fontSize: 13, color: appTheme.palette.textMuted },
  chipTextSelected: { color: '#fff', fontWeight: '500' },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(181, 150, 120, 0.18)',
  },
  modalClearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: appTheme.palette.canvas,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.18)',
  },
  modalClearText: { color: appTheme.palette.textMuted, fontWeight: '700' },
  modalApplyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: appTheme.palette.accent,
    alignItems: 'center',
  },
  modalApplyText: { color: appTheme.palette.surface, fontWeight: '700' },
  sortModalContent: {
    backgroundColor: appTheme.palette.surfaceRaised,
    margin: 20,
    borderRadius: 18,
    padding: 20,
  },
  sortModalTitle: {
    fontSize: 22,
    fontFamily: appTheme.typography.display,
    color: appTheme.palette.text,
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(181, 150, 120, 0.18)',
  },
  sortOptionText: { fontSize: 15, color: appTheme.palette.textMuted },
  sortOptionTextActive: { color: appTheme.palette.accent, fontWeight: '700' },
  // Extraction banner (Story 10.6)
  extractionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: appTheme.palette.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
  },
  extractionBannerDone: {
    backgroundColor: 'rgba(63, 107, 87, 0.10)',
    borderColor: 'rgba(63, 107, 87, 0.20)',
  },
  extractionBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: appTheme.palette.accent,
  },
});
