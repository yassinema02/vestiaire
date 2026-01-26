/**
 * Onboarding Screen
 * Story 2.7: "First 5 Items" Challenge
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { onboardingService, OnboardingState } from '../services/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
    const router = useRouter();
    const [state, setState] = useState<OnboardingState | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

    // Animation refs
    const progressAnim = useRef(new Animated.Value(0)).current;
    const celebrationScale = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(
        Array(12).fill(0).map(() => ({
            translateY: new Animated.Value(0),
            translateX: new Animated.Value(0),
            opacity: new Animated.Value(1),
            rotate: new Animated.Value(0),
        }))
    ).current;

    const loadState = useCallback(async () => {
        const onboardingState = await onboardingService.getState();
        setState(onboardingState);

        // Animate progress bar
        Animated.spring(progressAnim, {
            toValue: onboardingState.progress,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
        }).start();

        // Check if just completed
        if (onboardingState.itemCount >= onboardingState.requiredItems && !onboardingState.isComplete) {
            triggerCelebration();
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadState();
        }, [loadState])
    );

    const triggerCelebration = async () => {
        setShowCelebration(true);

        // Scale up celebration
        Animated.spring(celebrationScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 5,
        }).start();

        // Confetti animation
        confettiAnims.forEach((anim, index) => {
            const angle = (index / 12) * Math.PI * 2;
            const distance = 150 + Math.random() * 100;

            Animated.parallel([
                Animated.timing(anim.translateX, {
                    toValue: Math.cos(angle) * distance,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.translateY, {
                    toValue: Math.sin(angle) * distance + 200,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    duration: 1000,
                    delay: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.rotate, {
                    toValue: Math.random() * 4 - 2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        // Mark as complete
        await onboardingService.markComplete();
    };

    const handleSkip = () => {
        Alert.alert(
            'Skip Onboarding?',
            'Adding 5 items unlocks AI outfit recommendations. You can continue adding items later from your wardrobe.',
            [
                { text: 'Keep Going', style: 'cancel' },
                {
                    text: 'Skip for Now',
                    style: 'destructive',
                    onPress: async () => {
                        await onboardingService.markSkipped();
                        router.replace('/(tabs)/wardrobe');
                    },
                },
            ]
        );
    };

    const handleAddItem = () => {
        router.push('/(tabs)/add');
    };

    const handleContinue = () => {
        router.replace('/(tabs)/wardrobe');
    };

    if (!state) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </View>
        );
    }

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    // Celebration screen
    if (showCelebration) {
        return (
            <View style={styles.container}>
                <View style={styles.celebrationContainer}>
                    {/* Confetti */}
                    {confettiAnims.map((anim, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.confetti,
                                {
                                    backgroundColor: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'][index % 5],
                                    transform: [
                                        { translateX: anim.translateX },
                                        { translateY: anim.translateY },
                                        {
                                            rotate: anim.rotate.interpolate({
                                                inputRange: [-2, 2],
                                                outputRange: ['-180deg', '180deg'],
                                            })
                                        },
                                    ],
                                    opacity: anim.opacity,
                                },
                            ]}
                        />
                    ))}

                    <Animated.View style={[styles.celebrationContent, { transform: [{ scale: celebrationScale }] }]}>
                        <View style={styles.celebrationIcon}>
                            <Ionicons name="sparkles" size={64} color="#f59e0b" />
                        </View>
                        <Text style={styles.celebrationTitle}>🎉 Amazing!</Text>
                        <Text style={styles.celebrationSubtitle}>You've added 5 items!</Text>
                        <Text style={styles.celebrationMessage}>
                            AI outfit recommendations are now unlocked. Get ready for personalized style suggestions!
                        </Text>
                        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                            <Text style={styles.continueButtonText}>View My Wardrobe</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Skip Button */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons name="shirt-outline" size={80} color="#6366f1" />
                </View>

                {/* Title */}
                <Text style={styles.title}>Build Your Wardrobe</Text>
                <Text style={styles.subtitle}>
                    Add 5 items to unlock AI-powered outfit recommendations
                </Text>

                {/* Progress */}
                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressCount}>
                            <Text style={styles.progressCurrent}>{state.itemCount}</Text>
                            <Text style={styles.progressDivider}> / </Text>
                            <Text style={styles.progressTotal}>{state.requiredItems}</Text>
                        </Text>
                    </View>
                    <View style={styles.progressBar}>
                        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                    </View>
                    <View style={styles.stepsContainer}>
                        {Array(state.requiredItems).fill(0).map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.stepDot,
                                    index < state.itemCount && styles.stepDotComplete,
                                    index === state.itemCount && styles.stepDotCurrent,
                                ]}
                            >
                                {index < state.itemCount && (
                                    <Ionicons name="checkmark" size={12} color="#fff" />
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Benefits */}
                <View style={styles.benefitsSection}>
                    <Text style={styles.benefitsTitle}>What you'll unlock:</Text>
                    <View style={styles.benefitItem}>
                        <Ionicons name="sparkles" size={20} color="#f59e0b" />
                        <Text style={styles.benefitText}>AI outfit suggestions</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="sunny" size={20} color="#f59e0b" />
                        <Text style={styles.benefitText}>Weather-based recommendations</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="calendar" size={20} color="#f59e0b" />
                        <Text style={styles.benefitText}>Occasion-perfect outfits</Text>
                    </View>
                </View>

                {/* Add Button */}
                <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
                    <Ionicons name="camera" size={24} color="#fff" />
                    <Text style={styles.addButtonText}>
                        Add Item {state.itemCount + 1}
                    </Text>
                </TouchableOpacity>

                {state.itemCount > 0 && (
                    <TouchableOpacity style={styles.viewWardrobeLink} onPress={handleContinue}>
                        <Text style={styles.viewWardrobeLinkText}>View my wardrobe</Text>
                    </TouchableOpacity>
                )}
            </View>
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
    },
    loadingText: {
        fontSize: 16,
        color: '#6b7280',
    },
    skipButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 20,
        right: 20,
        zIndex: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    skipButtonText: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '500',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 120 : 80,
        alignItems: 'center',
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    progressSection: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    progressCount: {
        fontSize: 16,
    },
    progressCurrent: {
        color: '#6366f1',
        fontWeight: '700',
        fontSize: 20,
    },
    progressDivider: {
        color: '#d1d5db',
    },
    progressTotal: {
        color: '#9ca3af',
        fontWeight: '500',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#6366f1',
        borderRadius: 4,
    },
    stepsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepDotComplete: {
        backgroundColor: '#6366f1',
    },
    stepDotCurrent: {
        backgroundColor: '#fff',
        borderWidth: 3,
        borderColor: '#6366f1',
    },
    benefitsSection: {
        width: '100%',
        marginBottom: 32,
    },
    benefitsTitle: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
        marginBottom: 12,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    benefitText: {
        fontSize: 15,
        color: '#1f2937',
        marginLeft: 12,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366f1',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    addButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 10,
    },
    viewWardrobeLink: {
        marginTop: 16,
        paddingVertical: 8,
    },
    viewWardrobeLinkText: {
        fontSize: 15,
        color: '#6366f1',
        fontWeight: '500',
    },
    // Celebration styles
    celebrationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    confetti: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 2,
    },
    celebrationContent: {
        alignItems: 'center',
    },
    celebrationIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#fef3c7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    celebrationTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    celebrationSubtitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#6366f1',
        marginBottom: 16,
    },
    celebrationMessage: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
        lineHeight: 24,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366f1',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
    },
    continueButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginRight: 10,
    },
});
