/**
 * SwipeableOutfitCard Component
 * Outfit card with swipe gestures for save/dismiss actions
 */

import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { OutfitSuggestion } from '../../services/aiOutfitService';
import { WardrobeItem } from '../../services/items';
import { OccasionType } from '../../utils/occasionDetector';
import { Text } from '../ui/Typography';
import { appTheme } from '../../theme/tokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;
const SWIPE_UP_THRESHOLD = 80;

interface SwipeableOutfitCardProps {
    suggestion: OutfitSuggestion;
    wardrobeItems: WardrobeItem[];
    onSwipeRight: () => void;
    onSwipeLeft: () => void;
    onSwipeUp: () => void;
    isTopCard: boolean;
}

const OCCASION_COLORS: Record<OccasionType, string> = {
    casual: '#87A96B',
    work: '#475569',
    formal: '#1F2937',
    sport: '#CEB186',
    social: '#C2847A',
};

export const SwipeableOutfitCard: React.FC<SwipeableOutfitCardProps> = ({
    suggestion,
    wardrobeItems,
    onSwipeRight,
    onSwipeLeft,
    onSwipeUp,
    isTopCard,
}) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const rotation = useSharedValue(0);

    // Get outfit items
    const outfitItems = suggestion.items
        .map(itemId => wardrobeItems.find(i => i.id === itemId))
        .filter((item): item is WardrobeItem => item !== undefined);

    const occasionColor = OCCASION_COLORS[suggestion.occasion] || '#6b7280';

    const gesture = Gesture.Pan()
        .enabled(isTopCard)
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY;
            rotation.value = interpolate(
                event.translationX,
                [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
                [-15, 0, 15],
                Extrapolation.CLAMP
            );
        })
        .onEnd((event) => {
            // Check for swipe up first
            if (event.translationY < -SWIPE_UP_THRESHOLD && Math.abs(event.translationX) < SWIPE_THRESHOLD) {
                runOnJS(onSwipeUp)();
                translateY.value = withSpring(0);
                translateX.value = withSpring(0);
                rotation.value = withSpring(0);
                return;
            }

            // Swipe right (save)
            if (event.translationX > SWIPE_THRESHOLD) {
                translateX.value = withTiming(SCREEN_WIDTH + 100, { duration: 300 });
                runOnJS(onSwipeRight)();
                return;
            }

            // Swipe left (dismiss)
            if (event.translationX < -SWIPE_THRESHOLD) {
                translateX.value = withTiming(-SCREEN_WIDTH - 100, { duration: 300 });
                runOnJS(onSwipeLeft)();
                return;
            }

            // Return to center
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
            rotation.value = withSpring(0);
        });

    const cardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    const likeOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD],
            [0, 1],
            Extrapolation.CLAMP
        ),
    }));

    const nopeOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [-SWIPE_THRESHOLD, 0],
            [1, 0],
            Extrapolation.CLAMP
        ),
    }));

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.card, cardStyle] as any}>
                {/* Like indicator */}
                <Animated.View style={[styles.actionIndicator, styles.likeIndicator, likeOpacity] as any}>
                    <Ionicons name="heart" size={48} color="#10b981" />
                    <Text style={styles.likeText}>SAVE</Text>
                </Animated.View>

                {/* Nope indicator */}
                <Animated.View style={[styles.actionIndicator, styles.nopeIndicator, nopeOpacity] as any}>
                    <Ionicons name="close" size={48} color="#ef4444" />
                    <Text style={styles.nopeText}>SKIP</Text>
                </Animated.View>

                {/* Card content */}
                <View style={styles.header}>
                    <Text style={styles.outfitName}>{suggestion.name}</Text>
                    <View style={[styles.occasionBadge, { backgroundColor: `${occasionColor}20` }]}>
                        <Text style={[styles.occasionText, { color: occasionColor }]}>
                            {suggestion.occasion}
                        </Text>
                    </View>
                </View>

                {/* Items grid */}
                <View style={styles.itemsContainer}>
                    {outfitItems.slice(0, 4).map((item, index) => (
                        <View key={item.id} style={styles.itemCard}>
                            <Image
                                source={{ uri: item.processed_image_url || item.image_url }}
                                style={styles.itemImage}
                                resizeMode="cover"
                            />
                        </View>
                    ))}
                </View>

                {/* Rationale */}
                <View style={styles.rationaleSection}>
                    <View style={styles.rationaleHeader}>
                        <Ionicons name="sparkles" size={16} color="#87A96B" />
                        <Text style={styles.rationaleTitle}>Why this outfit?</Text>
                    </View>
                    <Text style={styles.rationaleText} numberOfLines={3}>
                        {suggestion.rationale}
                    </Text>
                </View>

                {/* Swipe hint */}
                <View style={styles.swipeHint}>
                    <Text style={styles.swipeHintText}>← Skip • Swipe • Save →</Text>
                </View>
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    card: {
        position: 'absolute',
        width: SCREEN_WIDTH - 40,
        height: SCREEN_HEIGHT * 0.65,
        backgroundColor: appTheme.palette.surfaceRaised,
        borderRadius: 20,
        padding: 20,
        ...appTheme.shadows.float,
    },
    actionIndicator: {
        position: 'absolute',
        top: 30,
        zIndex: 10,
        alignItems: 'center',
        borderWidth: 4,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    likeIndicator: {
        right: 20,
        borderColor: '#10b981',
        transform: [{ rotate: '15deg' }],
    },
    nopeIndicator: {
        left: 20,
        borderColor: '#ef4444',
        transform: [{ rotate: '-15deg' }],
    },
    likeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#10b981',
    },
    nopeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ef4444',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    outfitName: {
        fontSize: 22,
        fontWeight: '700',
        color: appTheme.palette.text,
        flex: 1,
    },
    occasionBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    occasionText: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    itemsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        flex: 1,
        marginBottom: 16,
    },
    itemCard: {
        width: '47%',
        aspectRatio: 0.85,
        backgroundColor: appTheme.palette.canvas,
        borderRadius: 12,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: '100%',
        backgroundColor: appTheme.palette.surfaceInverse,
    },
    rationaleSection: {
        backgroundColor: appTheme.palette.canvas,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(181, 150, 120, 0.16)',
    },
    rationaleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    rationaleTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: appTheme.palette.accent,
    },
    rationaleText: {
        fontSize: 13,
        color: appTheme.palette.textSoft,
        lineHeight: 18,
    },
    swipeHint: {
        alignItems: 'center',
    },
    swipeHintText: {
        fontSize: 13,
        color: appTheme.palette.textMuted,
    },
});
