/**
 * Outfits Tab
 * Shows saved outfits and discover button
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { itemsService, WardrobeItem } from '../../services/items';

export default function OutfitsScreen() {
    const router = useRouter();
    const { outfits, isLoading, fetchOutfits } = useOutfitStore();
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);

    // Load saved outfits and wardrobe items
    useFocusEffect(
        useCallback(() => {
            fetchOutfits({ refresh: true });
            itemsService.getItems().then(({ items }) => setWardrobeItems(items));
        }, [])
    );

    const handleDiscover = () => {
        router.push('/(tabs)/outfits/swipe');
    };

    const handleCreateOutfit = () => {
        // TODO: Navigate to manual outfit builder (Story 4.5)
        router.push('/(tabs)/outfits/swipe');
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

            {/* Saved Outfits */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Saved Outfits</Text>
                <Text style={styles.countBadge}>{outfits.length}</Text>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : outfits.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="layers-outline" size={64} color="#d1d5db" />
                    </View>
                    <Text style={styles.emptyTitle}>No saved outfits</Text>
                    <Text style={styles.emptySubtitle}>
                        Discover and save outfits you love
                    </Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={handleDiscover}>
                        <Text style={styles.emptyButtonText}>Start Discovering</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    style={styles.outfitsList}
                    contentContainerStyle={styles.outfitsContent}
                    showsVerticalScrollIndicator={false}
                >
                    {outfits.map((outfit) => {
                        const images = getOutfitItemImages(outfit);
                        return (
                            <TouchableOpacity
                                key={outfit.id}
                                style={styles.outfitCard}
                                onPress={() => {
                                    // TODO: Navigate to outfit detail
                                }}
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
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        );
                    })}
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
        marginBottom: 24,
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
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 12,
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
        marginLeft: 8,
        overflow: 'hidden',
    },
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
    outfitsList: {
        flex: 1,
    },
    outfitsContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
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
});
