/**
 * Outfit Detail Screen
 * Shows full outfit details with items, favorite toggle, and delete
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useOutfitStore } from '../../../stores/outfitStore';
import { itemsService, WardrobeItem } from '../../../services/items';

export default function OutfitDetailScreen() {
    const router = useRouter();
    const { outfitId } = useLocalSearchParams<{ outfitId: string }>();
    const {
        currentOutfit,
        isLoading,
        fetchOutfit,
        toggleFavorite,
        deleteOutfit,
    } = useOutfitStore();
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);

    useEffect(() => {
        if (outfitId) {
            fetchOutfit(outfitId);
            itemsService.getItems().then(({ items }) => setWardrobeItems(items));
        }
    }, [outfitId]);

    const handleToggleFavorite = () => {
        if (currentOutfit) {
            toggleFavorite(currentOutfit.id);
        }
    };

    const handleEdit = () => {
        if (currentOutfit) {
            router.push(`/(tabs)/outfits/builder?outfitId=${currentOutfit.id}`);
        }
    };

    const handleDelete = () => {
        if (!currentOutfit) return;

        Alert.alert(
            'Delete Outfit',
            'Are you sure you want to delete this outfit? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { success } = await deleteOutfit(currentOutfit.id);
                        if (success) {
                            router.push('/(tabs)/outfits');
                        }
                    },
                },
            ]
        );
    };

    const getItemForOutfitItem = (itemId: string): WardrobeItem | undefined => {
        return wardrobeItems.find(wi => wi.id === itemId);
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (isLoading || !currentOutfit) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.push('/(tabs)/outfits')}
                >
                    <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {currentOutfit.name || 'Untitled Outfit'}
                </Text>
                <TouchableOpacity
                    style={styles.favoriteHeaderButton}
                    onPress={handleToggleFavorite}
                >
                    <Ionicons
                        name={currentOutfit.is_favorite ? 'heart' : 'heart-outline'}
                        size={24}
                        color={currentOutfit.is_favorite ? '#ef4444' : '#9ca3af'}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentInner}
                showsVerticalScrollIndicator={false}
            >
                {/* Metadata */}
                <View style={styles.metaRow}>
                    {currentOutfit.is_ai_generated && (
                        <View style={styles.aiBadge}>
                            <Ionicons name="sparkles" size={14} color="#6366f1" />
                            <Text style={styles.aiBadgeText}>AI Generated</Text>
                        </View>
                    )}
                    {currentOutfit.occasion && (
                        <View style={styles.occasionBadge}>
                            <Text style={styles.occasionBadgeText}>
                                {currentOutfit.occasion.charAt(0).toUpperCase() +
                                    currentOutfit.occasion.slice(1)}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.dateText}>
                        {formatDate(currentOutfit.created_at)}
                    </Text>
                </View>

                {/* Weather context */}
                {currentOutfit.weather_context && (
                    <View style={styles.weatherRow}>
                        <Ionicons name="partly-sunny-outline" size={16} color="#6b7280" />
                        <Text style={styles.weatherText}>
                            {currentOutfit.weather_context.temperature}° — {currentOutfit.weather_context.condition}
                        </Text>
                    </View>
                )}

                {/* Items Grid */}
                <Text style={styles.itemsSectionTitle}>
                    Items ({currentOutfit.items?.length || 0})
                </Text>
                <View style={styles.itemsGrid}>
                    {currentOutfit.items?.map((outfitItem) => {
                        const item = getItemForOutfitItem(outfitItem.item_id);
                        const imageUrl = item?.processed_image_url || item?.image_url;
                        return (
                            <View key={outfitItem.id} style={styles.itemCard}>
                                {imageUrl ? (
                                    <Image
                                        source={{ uri: imageUrl }}
                                        style={styles.itemImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.itemImagePlaceholder}>
                                        <Ionicons name="shirt-outline" size={32} color="#d1d5db" />
                                    </View>
                                )}
                                <View style={styles.itemCardInfo}>
                                    <Text style={styles.itemName} numberOfLines={1}>
                                        {item?.name || item?.category || 'Item'}
                                    </Text>
                                    <Text style={styles.itemPosition}>
                                        {outfitItem.position.charAt(0).toUpperCase() +
                                            outfitItem.position.slice(1)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.editActionButton} onPress={handleEdit}>
                        <Ionicons name="pencil" size={18} color="#5D4E37" />
                        <Text style={styles.editActionText}>Edit Outfit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                        <Ionicons name="trash-outline" size={18} color="#E53935" />
                        <Text style={styles.deleteButtonText}>Delete Outfit</Text>
                    </TouchableOpacity>
                </View>
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
        backgroundColor: '#F5F0E8',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },
    favoriteHeaderButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Content
    content: {
        flex: 1,
    },
    contentInner: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },

    // Meta
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    aiBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366f1',
    },
    occasionBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    occasionBadgeText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#92400e',
    },
    dateText: {
        fontSize: 13,
        color: '#6b7280',
    },

    // Weather
    weatherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 20,
    },
    weatherText: {
        fontSize: 13,
        color: '#6b7280',
    },

    // Items
    itemsSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
    },
    itemCard: {
        width: '47%',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    itemImage: {
        width: '100%',
        height: 160,
        backgroundColor: '#f3f4f6',
    },
    itemImagePlaceholder: {
        width: '100%',
        height: 160,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemCardInfo: {
        padding: 10,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    itemPosition: {
        fontSize: 12,
        color: '#6b7280',
    },

    // Actions
    actionsContainer: {
        gap: 12,
    },
    editActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    editActionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#5D4E37',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fef2f2',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    deleteButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#E53935',
    },
});
