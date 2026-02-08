/**
 * LevelUpModal
 * Story 6.2: Celebration modal when user reaches a new level
 */

import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LEVELS } from '@vestiaire/shared';

interface LevelUpModalProps {
    visible: boolean;
    newLevel: number;
    onDismiss: () => void;
}

export default function LevelUpModal({ visible, newLevel, onDismiss }: LevelUpModalProps) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const starRotate = useSharedValue(0);

    const levelInfo = LEVELS.find(l => l.level === newLevel);
    const levelTitle = levelInfo?.title ?? 'Style Master';

    useEffect(() => {
        if (visible) {
            scale.value = 0;
            opacity.value = 0;
            starRotate.value = 0;

            opacity.value = withTiming(1, { duration: 200 });
            scale.value = withSpring(1, { damping: 12, stiffness: 150 });
            starRotate.value = withDelay(
                200,
                withSpring(360, { damping: 8, stiffness: 80 })
            );

            // Auto-dismiss after 5s
            const timer = setTimeout(onDismiss, 5000);
            return () => clearTimeout(timer);
        } else {
            scale.value = 0;
            opacity.value = 0;
        }
    }, [visible]);

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const starStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${starRotate.value}deg` }],
    }));

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <Animated.View style={[styles.card, cardStyle]}>
                    <Animated.View style={[styles.starContainer, starStyle]}>
                        <Ionicons name="star" size={56} color="#eab308" />
                    </Animated.View>

                    <Text style={styles.heading}>Level Up!</Text>
                    <Text style={styles.subtitle}>
                        You are now a{'\n'}
                        <Text style={styles.levelName}>{levelTitle}</Text>
                    </Text>
                    <Text style={styles.levelBadge}>Level {newLevel}</Text>

                    <View style={styles.unlockRow}>
                        <Ionicons name="ribbon-outline" size={18} color="#6366f1" />
                        <Text style={styles.unlockText}>New badge unlocked!</Text>
                    </View>

                    <TouchableOpacity style={styles.button} onPress={onDismiss}>
                        <Text style={styles.buttonText}>Awesome!</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
    starContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fefce8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heading: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    levelName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#6366f1',
    },
    levelBadge: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 12,
        overflow: 'hidden',
    },
    unlockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    unlockText: {
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '500',
    },
    button: {
        marginTop: 24,
        backgroundColor: '#6366f1',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 48,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
