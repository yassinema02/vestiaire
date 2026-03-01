/**
 * Review Extracted Items Screen
 * Grid view with edit modal, batch actions, and import to wardrobe
 * Story 10.4: Review & Confirm Interface
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useExtractionStore } from '../../stores/extractionStore';
import { ReviewableItem } from '../../types/extraction';
import { CATEGORIES, COLORS } from '../../services/aiCategorization';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

const CATEGORY_LIST = Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>;

export default function ReviewItemsScreen() {
  const router = useRouter();
  const {
    reviewableItems,
    isImporting,
    importProgress,
    categorySummary,
    initReview,
    toggleItem,
    editItem,
    selectAll,
    deselectAll,
    deselectByCategory,
    getSelectedCount,
    importToWardrobe,
    reset,
  } = useExtractionStore();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [editColors, setEditColors] = useState<string[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  useEffect(() => {
    if (reviewableItems.length === 0) {
      initReview();
    }
  }, []);

  const selectedCount = getSelectedCount();
  const totalCount = reviewableItems.length;

  // Get unique categories present in items
  const presentCategories = [...new Set(
    reviewableItems.map((item) => item.editedCategory || item.category)
  )];

  const openEditModal = (index: number) => {
    const item = reviewableItems[index];
    setEditingIndex(index);
    setEditName(item.editedName || `${item.sub_category} - ${item.colors?.[0] || ''}`.trim());
    setEditCategory(item.editedCategory || item.category);
    setEditSubCategory(item.editedSubCategory || item.sub_category);
    setEditColors(item.editedColors || [...item.colors]);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    editItem(editingIndex, {
      editedName: editName,
      editedCategory: editCategory,
      editedSubCategory: editSubCategory,
      editedColors: editColors,
    });
    setEditingIndex(null);
  };

  const toggleEditColor = (colorName: string) => {
    if (editColors.includes(colorName)) {
      setEditColors(editColors.filter((c) => c !== colorName));
    } else if (editColors.length < 3) {
      setEditColors([...editColors, colorName]);
    }
  };

  const handleImport = async () => {
    const count = await importToWardrobe();
    setImportedCount(count);
    setImportComplete(true);
  };

  const handleDone = () => {
    reset();
    router.replace('/(tabs)/wardrobe');
  };

  // Import complete screen
  if (importComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.importCompleteContainer}>
          <Ionicons name="checkmark-circle" size={72} color="#22c55e" />
          <Text style={styles.importCompleteTitle}>
            {importedCount} item{importedCount !== 1 ? 's' : ''} added to your wardrobe!
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleDone}>
            <Ionicons name="shirt-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>View Wardrobe</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Import in progress overlay
  if (isImporting) {
    return (
      <View style={styles.container}>
        <View style={styles.importingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.importingTitle}>Adding items to wardrobe...</Text>
          {importProgress && (
            <Text style={styles.importingProgress}>
              Adding item {importProgress.done} of {importProgress.total}...
            </Text>
          )}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: importProgress
                    ? `${Math.round((importProgress.done / importProgress.total) * 100)}%`
                    : '0%',
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  const renderItemCard = useCallback(({ item, index }: { item: ReviewableItem; index: number }) => {
    const imageUrl = item.processed_image_url || item.photo_url;
    const displayCategory = item.editedCategory || item.category;
    const displaySubCategory = item.editedSubCategory || item.sub_category;
    const displayColors = item.editedColors || item.colors;
    const bgFailed = item.bg_removal_status === 'failed';
    const isVeryLow = item.confidence < 50;
    const isNeedsReview = item.needsReview && !isVeryLow; // 50-69

    return (
      <TouchableOpacity
        style={[styles.itemCard, !item.isSelected && styles.itemCardDeselected]}
        onPress={() => openEditModal(index)}
        onLongPress={() => toggleItem(index)}
        activeOpacity={0.7}
      >
        {/* Image */}
        <View style={styles.cardImageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
          {bgFailed && (
            <View style={styles.bgFailedBadge}>
              <Ionicons name="warning" size={12} color="#f59e0b" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardSubCategory} numberOfLines={1}>
            {displaySubCategory}
          </Text>
          <View style={styles.cardCategoryRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{displayCategory}</Text>
            </View>
            {isVeryLow && (
              <View style={styles.veryLowConfidenceBadge}>
                <Text style={styles.veryLowConfidenceText}>Low {item.confidence}%</Text>
              </View>
            )}
            {isNeedsReview && (
              <View style={styles.needsReviewBadge}>
                <Text style={styles.needsReviewText}>{item.confidence}%</Text>
              </View>
            )}
          </View>
          {displayColors.length > 0 && (
            <View style={styles.colorDotsRow}>
              {displayColors.slice(0, 3).map((color) => {
                const colorDef = COLORS.find(
                  (c) => c.name.toLowerCase() === color.toLowerCase()
                );
                return (
                  <View
                    key={color}
                    style={[
                      styles.colorDot,
                      { backgroundColor: colorDef?.hex || '#ccc' },
                    ]}
                  />
                );
              })}
            </View>
          )}
          {item.duplicateOf && (
            <View style={styles.duplicateBadge}>
              <Ionicons name="copy-outline" size={10} color="#f59e0b" />
              <Text style={styles.duplicateText}>Similar item exists</Text>
            </View>
          )}
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => toggleItem(index)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={item.isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={item.isSelected ? '#22c55e' : '#d1d5db'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [reviewableItems]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Items</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {totalCount} item{totalCount !== 1 ? 's' : ''} detected — tap to edit, check to keep
      </Text>

      {/* Grid */}
      <FlatList
        data={reviewableItems}
        keyExtractor={(_, i) => i.toString()}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.gridRow}
        renderItem={renderItemCard}
        showsVerticalScrollIndicator={false}
      />

      {/* Batch Action Bar */}
      <View style={styles.batchBar}>
        <View style={styles.batchButtons}>
          <TouchableOpacity style={styles.batchButton} onPress={selectAll}>
            <Ionicons name="checkmark-done" size={16} color="#6366f1" />
            <Text style={styles.batchButtonText}>Keep All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.batchButton} onPress={deselectAll}>
            <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
            <Text style={[styles.batchButtonText, { color: '#ef4444' }]}>Remove All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.batchButton}
            onPress={() => setShowCategoryFilter(!showCategoryFilter)}
          >
            <Ionicons name="funnel-outline" size={16} color="#6b7280" />
            <Text style={styles.batchButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.counterText}>
          {selectedCount} of {totalCount} selected
        </Text>
      </View>

      {/* Category Filter Dropdown */}
      {showCategoryFilter && (
        <View style={styles.filterDropdown}>
          <Text style={styles.filterTitle}>Remove all items in:</Text>
          {presentCategories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={styles.filterOption}
              onPress={() => {
                deselectByCategory(cat);
                setShowCategoryFilter(false);
              }}
            >
              <Text style={styles.filterOptionText}>{cat}</Text>
              <Text style={styles.filterOptionCount}>
                {reviewableItems.filter(
                  (i) => (i.editedCategory || i.category) === cat && i.isSelected
                ).length}{' '}
                items
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Confirmation Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, selectedCount === 0 && styles.primaryButtonDisabled]}
          onPress={handleImport}
          disabled={selectedCount === 0}
        >
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>
            Add {selectedCount} item{selectedCount !== 1 ? 's' : ''} to wardrobe
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editingIndex !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingIndex(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditingIndex(null)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Item</Text>
            <TouchableOpacity onPress={saveEdit}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Image Preview */}
            {editingIndex !== null && (
              <View style={styles.modalImageContainer}>
                <Image
                  source={{
                    uri:
                      reviewableItems[editingIndex]?.processed_image_url ||
                      reviewableItems[editingIndex]?.photo_url,
                  }}
                  style={styles.modalImage}
                />
              </View>
            )}

            {/* Name */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Item name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Category */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {CATEGORY_LIST.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chip,
                        editCategory.toLowerCase() === cat && styles.chipSelected,
                      ]}
                      onPress={() => {
                        setEditCategory(cat.charAt(0).toUpperCase() + cat.slice(1));
                        setEditSubCategory(CATEGORIES[cat][0]);
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          editCategory.toLowerCase() === cat && styles.chipTextSelected,
                        ]}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Sub-category */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Sub-category</Text>
              <TextInput
                style={styles.modalInput}
                value={editSubCategory}
                onChangeText={setEditSubCategory}
                placeholder="Sub-category"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Colors */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>
                Colors <Text style={styles.modalHint}>(up to 3)</Text>
              </Text>
              <View style={styles.colorGrid}>
                {COLORS.map((color) => (
                  <TouchableOpacity
                    key={color.name}
                    style={[
                      styles.colorChip,
                      { backgroundColor: color.hex },
                      editColors.includes(color.name) && styles.colorChipSelected,
                    ]}
                    onPress={() => toggleEditColor(color.name)}
                  >
                    {editColors.includes(color.name) && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={
                          ['White', 'Cream', 'Beige'].includes(color.name) ? '#000' : '#fff'
                        }
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  // Grid
  gridContainer: { paddingHorizontal: 20, paddingBottom: 180 },
  gridRow: { justifyContent: 'space-between', marginBottom: CARD_GAP },
  itemCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCardDeselected: {
    opacity: 0.5,
  },
  cardImageContainer: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: '#f3f4f6',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bgFailedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 2,
  },
  cardInfo: {
    padding: 8,
    gap: 4,
  },
  cardSubCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryBadge: {
    backgroundColor: '#eef2ff',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
  },
  needsReviewBadge: {
    backgroundColor: '#fffbeb',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  needsReviewText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '500',
  },
  veryLowConfidenceBadge: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  veryLowConfidenceText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
  },
  duplicateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fffbeb',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  duplicateText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '500',
  },
  colorDotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
  },

  // Batch bar
  batchBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  batchButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  batchButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6366f1',
  },
  counterText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Filter dropdown
  filterDropdown: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 170 : 150,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 10,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterOptionText: { fontSize: 14, color: '#4b5563' },
  filterOptionCount: { fontSize: 12, color: '#9ca3af' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    backgroundColor: '#F5F0E8',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366f1',
  },
  primaryButtonDisabled: {
    backgroundColor: '#c7c8cc',
  },
  primaryButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Import complete
  importCompleteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 20,
  },
  importCompleteTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },

  // Importing
  importingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  importingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  importingProgress: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBarBg: {
    width: 200,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },

  // Edit Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 16 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  modalCancel: { fontSize: 16, color: '#6b7280' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#1f2937' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#6366f1' },
  modalContent: { flex: 1, padding: 20 },
  modalImageContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  modalSection: { marginBottom: 20 },
  modalLabel: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  modalHint: { fontSize: 12, color: '#9ca3af', fontWeight: '400' },
  modalInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { fontSize: 13, color: '#4b5563', textTransform: 'capitalize' },
  chipTextSelected: { color: '#fff', fontWeight: '500' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorChipSelected: { borderColor: '#6366f1', borderWidth: 3 },
});
