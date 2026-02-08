/**
 * BadgeUnlockModal
 * Story 6.4: Celebration modal when user earns a badge
 */

import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BadgeDefinition, BADGE_CATEGORY_LABELS } from '@vestiaire/shared';

interface BadgeUnlockModalProps {
    visible: boolean;
    badge: BadgeDefinition | null;
    onDismiss: () => void;
}

export default function BadgeUnlockModal({ visible, badge, onDismiss }: BadgeUnlockModalProps) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const iconRotate = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            scale.value = 0;
            opacity.value = 0;
            iconRotate.value = 0;

            opacity.value = withTiming(1, { duration: 200 });
            scale.value = withSpring(1, { damping: 12, stiffness: 150 });
            iconRotate.value = withDelay(
                200,
                withSpring(360, { damping: 8, stiffness: 80 })
            );

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

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${iconRotate.value}deg` }],
    }));

    if (!badge) return null;

    const categoryLabel = BADGE_CATEGORY_LABELS[badge.category];

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <Animated.View style={[styles.card, cardStyle]}>
                    <Animated.View style={[styles.iconContainer, iconStyle]}>
                        <Ionicons
                            name={badge.iconName as any}
                            size={48}
                            color="#6366f1"
                        />
                    </Animated.View>

                    <Text style={styles.heading}>Badge Unlocked!</Text>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.description}>{badge.description}</Text>

                    <View style={styles.categoryPill}>
                        <Text style={styles.categoryText}>{categoryLabel}</Text>
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
    iconContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heading: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#6366f1',
        marginBottom: 6,
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    categoryPill: {
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 6,
        marginTop: 14,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
