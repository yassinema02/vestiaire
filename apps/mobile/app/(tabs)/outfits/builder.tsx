/**
 * Manual Outfit Builder Screen
 * Allows users to create outfits by selecting items from their wardrobe
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { itemsService, WardrobeItem } from '../../../services/items';
import { outfitService } from '../../../services/outfitService';
import { OutfitPosition, CreateOutfitInput } from '../../../types/outfit';
import { OccasionType } from '../../../utils/occasionDetector';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - 60) / 3;

// Categories for filtering
const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'tops', label: 'Tops' },
    { id: 'bottoms', label: 'Bottoms' },
    { id: 'dresses', label: 'Dresses' },
    { id: 'outerwear', label: 'Outerwear' },
    { id: 'shoes', label: 'Shoes' },
    { id: 'accessories', label: 'Accessories' },
];

// Occasion options
const OCCASIONS: { id: OccasionType; label: string; icon: string }[] = [
    { id: 'casual', label: 'Casual', icon: 'cafe-outline' },
    { id: 'work', label: 'Work', icon: 'briefcase-outline' },
    { id: 'formal', label: 'Formal', icon: 'wine-outline' },
    { id: 'sport', label: 'Sport', icon: 'fitness-outline' },
    { id: 'social', label: 'Social', icon: 'people-outline' },
];

// Map item category to outfit position
function categoryToPosition(category: string): OutfitPosition {
    switch (category?.toLowerCase()) {
        case 'tops':
            return 'top';
        case 'bottoms':
            return 'bottom';
        case 'dresses':
            return 'dress';
        case 'outerwear':
            return 'outerwear';
        case 'shoes':
            return 'shoes';
        case 'accessories':
            return 'accessory';
        default:
            return 'accessory';
    }
}

export default function OutfitBuilderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ outfitId?: string }>();
    const isEditMode = !!params.outfitId;

    // State
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<Map<string, WardrobeItem>>(new Map());
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [outfitName, setOutfitName] = useState('');
    const [selectedOccasion, setSelectedOccasion] = useState<OccasionType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load wardrobe items and existing outfit if editing
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const { items } = await itemsService.getItems();
                setWardrobeItems(items.filter(i => i.status === 'complete'));

                // Load existing outfit if editing
                if (params.outfitId) {
                    const { outfit } = await outfitService.getOutfit(params.outfitId);
                    if (outfit) {
                        setOutfitName(outfit.name || '');
                        setSelectedOccasion(outfit.occasion);

                        // Pre-select items
                        const selectedMap = new Map<string, WardrobeItem>();
                        outfit.items?.forEach(oi => {
                            const item = items.find(i => i.id === oi.item_id);
                            if (item) {
                                selectedMap.set(item.id, item);
                            }
                        });
                        setSelectedItems(selectedMap);
                    }
                }
            } catch (error) {
                console.error('Failed to load items:', error);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [params.outfitId]);

    // Filter items by category
    const filteredItems = wardrobeItems.filter(item => {
        if (selectedCategory === 'all') return true;
        return item.category?.toLowerCase() === selectedCategory;
    });

    // Toggle item selection
    const toggleItemSelection = useCallback((item: WardrobeItem) => {
        setSelectedItems(prev => {
            const newMap = new Map(prev);
            if (newMap.has(item.id)) {
                newMap.delete(item.id);
            } else {
                // Max 6 items
                if (newMap.size >= 6) {
                    Alert.alert('Limit Reached', 'An outfit can have at most 6 items.');
                    return prev;
                }
                newMap.set(item.id, item);
            }
            return newMap;
        });
    }, []);

    // Save outfit
    const handleSave = async () => {
        if (selectedItems.size < 2) {
            Alert.alert('Not Enough Items', 'Please select at least 2 items for your outfit.');
            return;
        }

        setIsSaving(true);
        try {
            const items = Array.from(selectedItems.values()).map(item => ({
                item_id: item.id,
                position: categoryToPosition(item.category || ''),
            }));

            if (isEditMode && params.outfitId) {
                const { error } = await outfitService.updateOutfit(params.outfitId, {
                    name: outfitName || undefined,
                    occasion: selectedOccasion || undefined,
                    items,
                });
                if (error) throw error;
                Alert.alert('Success', 'Outfit updated!', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                const input: CreateOutfitInput = {
                    name: outfitName || undefined,
                    occasion: selectedOccasion || undefined,
                    is_ai_generated: false,
                    items,
                };
                const { error } = await outfitService.createOutfit(input);
                if (error) throw error;
                Alert.alert('Success', 'Outfit created!', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (error) {
            console.error('Save outfit error:', error);
            Alert.alert('Error', 'Failed to save outfit. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5D4E37" />
                <Text style={styles.loadingText}>Loading wardrobe...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="close" size={28} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>
                    {isEditMode ? 'Edit Outfit' : 'Create Outfit'}
                </Text>
                <TouchableOpacity
                    style={[styles.saveButton, selectedItems.size < 2 && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isSaving || selectedItems.size < 2}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Selected Items Preview */}
            <View style={styles.previewSection}>
                <Text style={styles.sectionLabel}>
                    Selected Items ({selectedItems.size}/6)
                </Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.previewScroll}
                >
                    {selectedItems.size === 0 ? (
                        <View style={styles.emptyPreview}>
                            <Ionicons name="shirt-outline" size={32} color="#d1d5db" />
                            <Text style={styles.emptyPreviewText}>
                                Tap items below to add
                            </Text>
                        </View>
                    ) : (
                        Array.from(selectedItems.values()).map(item => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.previewItem}
                                onPress={() => toggleItemSelection(item)}
                            >
                                <Image
                                    source={{ uri: item.processed_image_url || item.image_url }}
                                    style={styles.previewImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.removeIcon}>
                                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </View>

            {/* Outfit Details */}
            <View style={styles.detailsSection}>
                <TextInput
                    style={styles.nameInput}
                    placeholder="Outfit name (optional)"
                    placeholderTextColor="#9ca3af"
                    value={outfitName}
                    onChangeText={setOutfitName}
                />

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.occasionScroll}
                >
                    {OCCASIONS.map(occasion => (
                        <TouchableOpacity
                            key={occasion.id}
                            style={[
                                styles.occasionChip,
                                selectedOccasion === occasion.id && styles.occasionChipSelected,
                            ]}
                            onPress={() => setSelectedOccasion(
                                selectedOccasion === occasion.id ? null : occasion.id
                            )}
                        >
                            <Ionicons
                                name={occasion.icon as any}
                                size={16}
                                color={selectedOccasion === occasion.id ? '#fff' : '#5D4E37'}
                            />
                            <Text style={[
                                styles.occasionChipText,
                                selectedOccasion === occasion.id && styles.occasionChipTextSelected,
                            ]}>
                                {occasion.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Category Tabs */}
            <View style={styles.categoryContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                >
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryTab,
                                selectedCategory === cat.id && styles.categoryTabSelected,
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Text style={[
                                styles.categoryTabText,
                                selectedCategory === cat.id && styles.categoryTabTextSelected,
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Items Grid */}
            <ScrollView
                style={styles.itemsGrid}
                contentContainerStyle={styles.itemsGridContent}
            >
                {filteredItems.length === 0 ? (
                    <View style={styles.emptyCategory}>
                        <Ionicons name="shirt-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyCategoryText}>
                            No items in this category
                        </Text>
                    </View>
                ) : (
                    <View style={styles.gridContainer}>
                        {filteredItems.map(item => {
                            const isSelected = selectedItems.has(item.id);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.itemCard,
                                        isSelected && styles.itemCardSelected,
                                    ]}
                                    onPress={() => toggleItemSelection(item)}
                                    activeOpacity={0.7}
                                >
                                    <Image
                                        source={{ uri: item.processed_image_url || item.image_url }}
                                        style={styles.itemImage}
                                        resizeMode="cover"
                                    />
                                    {isSelected && (
                                        <View style={styles.selectedOverlay}>
                                            <Ionicons name="checkmark-circle" size={28} color="#7D9A78" />
                                        </View>
                                    )}
                                    <Text style={styles.itemLabel} numberOfLines={1}>
                                        {item.sub_category || item.category || 'Item'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F0E8',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    saveButton: {
        backgroundColor: '#7D9A78',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    saveButtonDisabled: {
        backgroundColor: '#d1d5db',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    previewSection: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 8,
    },
    previewScroll: {
        gap: 10,
    },
    emptyPreview: {
        width: SCREEN_WIDTH - 32,
        height: 80,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyPreviewText: {
        marginTop: 4,
        fontSize: 13,
        color: '#9ca3af',
    },
    previewItem: {
        position: 'relative',
    },
    previewImage: {
        width: 70,
        height: 70,
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    removeIcon: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    detailsSection: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    nameInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1f2937',
        marginBottom: 12,
    },
    occasionScroll: {
        gap: 8,
    },
    occasionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    occasionChipSelected: {
        backgroundColor: '#5D4E37',
        borderColor: '#5D4E37',
    },
    occasionChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#5D4E37',
    },
    occasionChipTextSelected: {
        color: '#fff',
    },
    categoryContainer: {
        height: 44,
        marginBottom: 8,
    },
    categoryScroll: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8,
    },
    categoryTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        height: 36,
        justifyContent: 'center',
    },
    categoryTabSelected: {
        backgroundColor: '#5D4E37',
    },
    categoryTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#5D4E37',
    },
    categoryTabTextSelected: {
        color: '#fff',
    },
    itemsGrid: {
        flex: 1,
    },
    itemsGridContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    itemCard: {
        width: ITEM_SIZE,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    itemCardSelected: {
        borderColor: '#7D9A78',
    },
    itemImage: {
        width: '100%',
        height: ITEM_SIZE,
        backgroundColor: '#f9fafb',
    },
    selectedOverlay: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#fff',
        borderRadius: 14,
    },
    itemLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#6b7280',
        textAlign: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    emptyCategory: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyCategoryText: {
        marginTop: 12,
        fontSize: 15,
        color: '#9ca3af',
    },
});
