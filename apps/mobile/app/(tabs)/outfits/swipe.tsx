/**
 * Outfit Swipe Discovery Screen
 * Tinder-style swipe interface for outfit suggestions
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Image,
    Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { OutfitSwipeStack } from '../../../components/features/OutfitSwipeStack';
import { useOutfitGeneration } from '../../../hooks/useOutfitGeneration';
import { OutfitSuggestion } from '../../../services/aiOutfitService';
import { itemsService, WardrobeItem } from '../../../services/items';

export default function OutfitSwipeScreen() {
    const router = useRouter();
    const {
        suggestions,
        isLoading,
        error,
        generate,
        regenerate,
        saveSuggestion,
    } = useOutfitGeneration();

    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [detailSuggestion, setDetailSuggestion] = useState<OutfitSuggestion | null>(null);
    const hasInitialized = useRef(false);

    // Load wardrobe items and generate suggestions
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;
        const init = async () => {
            const { items } = await itemsService.getItems();
            setWardrobeItems(items);
            generate();
        };
        init();
    }, [generate]);

    const handleSave = useCallback(async (suggestion: OutfitSuggestion) => {
        const success = await saveSuggestion(suggestion);
        if (!success) {
            Alert.alert('Error', 'Failed to save outfit. Please try again.');
        }
    }, [saveSuggestion]);

    const handleDismiss = useCallback((suggestion: OutfitSuggestion) => {
        // Just swipe away, no action needed
        console.log('Dismissed:', suggestion.name);
    }, []);

    const handleViewDetails = useCallback((suggestion: OutfitSuggestion) => {
        setDetailSuggestion(suggestion);
    }, []);

    const handleRegenerate = useCallback(() => {
        regenerate();
    }, [regenerate]);

    const handleBack = () => {
        router.push('/(tabs)/outfits');
    };

    // Get full item details for detail modal
    const detailItems = detailSuggestion?.items
        .map(id => wardrobeItems.find(i => i.id === id))
        .filter((item): item is WardrobeItem => item !== undefined) || [];

    return (
        <GestureHandlerRootView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Discover Outfits</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Error message */}
            {error && (
                <View style={styles.errorBanner}>
                    <Ionicons name="warning-outline" size={18} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Swipe stack */}
            <OutfitSwipeStack
                suggestions={suggestions}
                wardrobeItems={wardrobeItems}
                isLoading={isLoading}
                onSave={handleSave}
                onDismiss={handleDismiss}
                onViewDetails={handleViewDetails}
                onRegenerate={handleRegenerate}
            />

            {/* Detail Modal */}
            <Modal
                visible={detailSuggestion !== null}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setDetailSuggestion(null)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setDetailSuggestion(null)}>
                            <Ionicons name="close" size={28} color="#1f2937" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Outfit Details</Text>
                        <View style={styles.placeholder} />
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {detailSuggestion && (
                            <>
                                <Text style={styles.outfitName}>{detailSuggestion.name}</Text>
                                <View style={styles.occasionRow}>
                                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                    <Text style={styles.occasionLabel}>
                                        Best for: {detailSuggestion.occasion}
                                    </Text>
                                </View>

                                <View style={styles.rationaleBox}>
                                    <View style={styles.rationaleHeader}>
                                        <Ionicons name="sparkles" size={18} color="#6366f1" />
                                        <Text style={styles.rationaleTitle}>Why this outfit?</Text>
                                    </View>
                                    <Text style={styles.rationaleText}>
                                        {detailSuggestion.rationale}
                                    </Text>
                                </View>

                                <Text style={styles.itemsTitle}>Items in this outfit</Text>
                                {detailItems.map((item) => (
                                    <View key={item.id} style={styles.itemRow}>
                                        <Image
                                            source={{ uri: item.processed_image_url || item.image_url }}
                                            style={styles.itemThumb}
                                        />
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName}>
                                                {item.name || item.sub_category || 'Item'}
                                            </Text>
                                            <Text style={styles.itemCategory}>
                                                {item.category}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.saveModalButton}
                            onPress={() => {
                                if (detailSuggestion) {
                                    handleSave(detailSuggestion);
                                    setDetailSuggestion(null);
                                }
                            }}
                        >
                            <Ionicons name="heart" size={20} color="#fff" />
                            <Text style={styles.saveModalText}>Save Outfit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 8,
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
    placeholder: {
        width: 44,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fef2f2',
        marginHorizontal: 16,
        padding: 12,
        borderRadius: 8,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 13,
        flex: 1,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    outfitName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    occasionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 20,
    },
    occasionLabel: {
        fontSize: 14,
        color: '#6b7280',
        textTransform: 'capitalize',
    },
    rationaleBox: {
        backgroundColor: '#f5f3ff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    rationaleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    rationaleTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6366f1',
    },
    rationaleText: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 22,
    },
    itemsTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    itemThumb: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#e5e7eb',
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: 2,
    },
    itemCategory: {
        fontSize: 13,
        color: '#6b7280',
        textTransform: 'capitalize',
    },
    modalActions: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    saveModalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 12,
    },
    saveModalText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
