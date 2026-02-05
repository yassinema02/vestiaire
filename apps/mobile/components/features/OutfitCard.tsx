/**
 * OutfitCard Component
 * Displays a single AI-generated outfit suggestion
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OutfitSuggestion } from '../../services/aiOutfitService';
import { WardrobeItem } from '../../services/items';
import { OccasionType } from '../../utils/occasionDetector';

interface OutfitCardProps {
    suggestion: OutfitSuggestion;
    wardrobeItems: WardrobeItem[];
    onSave?: () => void;
    onItemPress?: (itemId: string) => void;
    isSaving?: boolean;
    isSaved?: boolean;
}

const OCCASION_COLORS: Record<OccasionType, string> = {
    casual: '#10b981',
    work: '#3b82f6',
    formal: '#8b5cf6',
    sport: '#f59e0b',
    social: '#ec4899',
};

const OCCASION_LABELS: Record<OccasionType, string> = {
    casual: 'Casual',
    work: 'Work',
    formal: 'Formal',
    sport: 'Sport',
    social: 'Social',
};

export const OutfitCard: React.FC<OutfitCardProps> = ({
    suggestion,
    wardrobeItems,
    onSave,
    onItemPress,
    isSaving = false,
    isSaved = false,
}) => {
    // Get full item details for the outfit
    const outfitItems = suggestion.items
        .map(itemId => wardrobeItems.find(i => i.id === itemId))
        .filter((item): item is WardrobeItem => item !== undefined);

    const occasionColor = OCCASION_COLORS[suggestion.occasion] || '#6b7280';
    const occasionLabel = OCCASION_LABELS[suggestion.occasion] || 'Casual';

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.outfitName}>{suggestion.name}</Text>
                    <View style={[styles.occasionBadge, { backgroundColor: `${occasionColor}20` }]}>
                        <Text style={[styles.occasionText, { color: occasionColor }]}>
                            {occasionLabel}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Items Grid */}
            <View style={styles.itemsGrid}>
                {outfitItems.map((item, index) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.itemCard}
                        onPress={() => onItemPress?.(item.id)}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={{ uri: item.processed_image_url || item.image_url }}
                            style={styles.itemImage}
                            resizeMode="cover"
                        />
                        <Text style={styles.itemCategory} numberOfLines={1}>
                            {item.sub_category || item.category || 'Item'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Rationale */}
            <View style={styles.rationaleSection}>
                <View style={styles.rationaleHeader}>
                    <Ionicons name="sparkles" size={16} color="#6366f1" />
                    <Text style={styles.rationaleTitle}>Why this outfit?</Text>
                </View>
                <Text style={styles.rationaleText}>{suggestion.rationale}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        isSaved && styles.savedButton,
                    ]}
                    onPress={onSave}
                    disabled={isSaving || isSaved}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons
                                name={isSaved ? 'checkmark' : 'bookmark-outline'}
                                size={18}
                                color="#fff"
                            />
                            <Text style={styles.saveButtonText}>
                                {isSaved ? 'Saved' : 'Save Outfit'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    outfitName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        flex: 1,
    },
    occasionBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    occasionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    itemCard: {
        width: '30%',
        aspectRatio: 0.85,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: '75%',
        backgroundColor: '#f3f4f6',
    },
    itemCategory: {
        fontSize: 10,
        fontWeight: '500',
        color: '#6b7280',
        textAlign: 'center',
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    rationaleSection: {
        backgroundColor: '#f5f3ff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    rationaleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    rationaleTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366f1',
    },
    rationaleText: {
        fontSize: 13,
        color: '#4b5563',
        lineHeight: 19,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    saveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#6366f1',
        paddingVertical: 12,
        borderRadius: 12,
    },
    savedButton: {
        backgroundColor: '#10b981',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
