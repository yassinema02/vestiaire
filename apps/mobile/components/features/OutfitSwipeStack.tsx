/**
 * OutfitSwipeStack Component
 * Manages a stack of swipeable outfit cards
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SwipeableOutfitCard } from './SwipeableOutfitCard';
import { OutfitSuggestion } from '../../services/aiOutfitService';
import { WardrobeItem } from '../../services/items';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OutfitSwipeStackProps {
    suggestions: OutfitSuggestion[];
    wardrobeItems: WardrobeItem[];
    isLoading: boolean;
    onSave: (suggestion: OutfitSuggestion) => Promise<void>;
    onDismiss: (suggestion: OutfitSuggestion) => void;
    onViewDetails: (suggestion: OutfitSuggestion) => void;
    onRegenerate: () => void;
}

export const OutfitSwipeStack: React.FC<OutfitSwipeStackProps> = ({
    suggestions,
    wardrobeItems,
    isLoading,
    onSave,
    onDismiss,
    onViewDetails,
    onRegenerate,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [savedCount, setSavedCount] = useState(0);

    const handleSwipeRight = useCallback(async () => {
        const suggestion = suggestions[currentIndex];
        if (suggestion) {
            await onSave(suggestion);
            setSavedCount(prev => prev + 1);
        }
        setCurrentIndex(prev => prev + 1);
    }, [currentIndex, suggestions, onSave]);

    const handleSwipeLeft = useCallback(() => {
        const suggestion = suggestions[currentIndex];
        if (suggestion) {
            onDismiss(suggestion);
        }
        setCurrentIndex(prev => prev + 1);
    }, [currentIndex, suggestions, onDismiss]);

    const handleSwipeUp = useCallback(() => {
        const suggestion = suggestions[currentIndex];
        if (suggestion) {
            onViewDetails(suggestion);
        }
    }, [currentIndex, suggestions, onViewDetails]);

    const handleRegenerate = useCallback(() => {
        setCurrentIndex(0);
        setSavedCount(0);
        onRegenerate();
    }, [onRegenerate]);

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Finding your perfect outfits...</Text>
            </View>
        );
    }

    // All cards swiped
    if (currentIndex >= suggestions.length) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.emptyIcon}>
                    <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                </View>
                <Text style={styles.emptyTitle}>All done!</Text>
                <Text style={styles.emptySubtitle}>
                    You saved {savedCount} outfit{savedCount !== 1 ? 's' : ''} to your collection.
                </Text>
                <TouchableOpacity style={styles.regenerateButton} onPress={handleRegenerate}>
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.regenerateText}>Get More Suggestions</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // No suggestions
    if (suggestions.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.emptyIcon}>
                    <Ionicons name="shirt-outline" size={64} color="#d1d5db" />
                </View>
                <Text style={styles.emptyTitle}>No outfit suggestions</Text>
                <Text style={styles.emptySubtitle}>
                    Add more items to your wardrobe to get personalized suggestions.
                </Text>
            </View>
        );
    }

    // Render card stack (show current + 1 behind)
    const visibleCards = suggestions.slice(currentIndex, currentIndex + 2).reverse();

    return (
        <View style={styles.stackContainer}>
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                    {currentIndex + 1} of {suggestions.length}
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${((currentIndex + 1) / suggestions.length) * 100}%` },
                        ]}
                    />
                </View>
            </View>

            {/* Card stack */}
            <View style={styles.cardsContainer}>
                {visibleCards.map((suggestion, arrayIndex) => {
                    const actualIndex = currentIndex + (visibleCards.length - 1 - arrayIndex);
                    const isTopCard = actualIndex === currentIndex;

                    return (
                        <View
                            key={suggestion.items.join('-')}
                            style={[
                                styles.cardWrapper,
                                !isTopCard && styles.cardBehind,
                            ]}
                        >
                            <SwipeableOutfitCard
                                suggestion={suggestion}
                                wardrobeItems={wardrobeItems}
                                onSwipeRight={handleSwipeRight}
                                onSwipeLeft={handleSwipeLeft}
                                onSwipeUp={handleSwipeUp}
                                isTopCard={isTopCard}
                            />
                        </View>
                    );
                })}
            </View>

            {/* Action buttons */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.skipButton]}
                    onPress={handleSwipeLeft}
                >
                    <Ionicons name="close" size={28} color="#ef4444" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.detailsButton]}
                    onPress={() => handleSwipeUp()}
                >
                    <Ionicons name="information-circle-outline" size={24} color="#6366f1" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={handleSwipeRight}
                >
                    <Ionicons name="heart" size={28} color="#10b981" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    stackContainer: {
        flex: 1,
        alignItems: 'center',
    },
    progressContainer: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
    },
    progressText: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 8,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#e5e7eb',
        borderRadius: 2,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#6366f1',
        borderRadius: 2,
    },
    cardsContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 10,
        paddingHorizontal: 20,
    },
    cardWrapper: {
        position: 'absolute',
        width: SCREEN_WIDTH - 40,
        alignSelf: 'center',
    },
    cardBehind: {
        transform: [{ scale: 0.95 }],
        opacity: 0.7,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        paddingVertical: 20,
        paddingBottom: 40,
    },
    actionButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    skipButton: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#ef4444',
    },
    detailsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f5f3ff',
    },
    saveButton: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#10b981',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    loadingText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 16,
    },
    regenerateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#6366f1',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    regenerateText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});
