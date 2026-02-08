/**
 * Premium Upgrade Screen
 * Story 7.6: Premium Subscription Flow
 * Feature comparison, pricing, and subscribe CTA.
 */

import { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { subscriptionService, SubscriptionStatus } from '../../services/subscriptionService';

const FEATURES = [
    {
        icon: 'sparkles',
        title: 'Unlimited AI Outfit Suggestions',
        free: '3 per day',
        premium: 'Unlimited',
    },
    {
        icon: 'pricetags',
        title: 'Unlimited Resale Listings',
        free: '2 per month',
        premium: 'Unlimited',
    },
    {
        icon: 'analytics',
        title: 'Advanced Wardrobe Analytics',
        free: 'Basic',
        premium: 'Full insights',
    },
    {
        icon: 'leaf',
        title: 'Sustainability Tracking',
        free: 'Score only',
        premium: 'Full reports',
    },
    {
        icon: 'shield-checkmark',
        title: 'Priority Support',
        free: null,
        premium: 'Included',
    },
    {
        icon: 'flash',
        title: 'Early Access Features',
        free: null,
        premium: 'Included',
    },
];

export default function PremiumScreen() {
    const router = useRouter();
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const loadStatus = async () => {
                setIsLoading(true);
                const { status: s } = await subscriptionService.getStatus();
                setStatus(s);
                setIsLoading(false);
            };
            loadStatus();
        }, [])
    );

    const handlePurchase = async () => {
        setIsPurchasing(true);
        const { success, error } = await subscriptionService.purchasePremium();
        setIsPurchasing(false);

        if (success) {
            const { status: s } = await subscriptionService.getStatus();
            setStatus(s);
            Alert.alert(
                'Welcome to Premium!',
                'You now have unlimited access to all features.',
                [{ text: 'Awesome!' }]
            );
        } else {
            Alert.alert('Purchase Failed', error || 'Please try again.');
        }
    };

    const handleRestore = async () => {
        setIsRestoring(true);
        const { restored, error } = await subscriptionService.restorePurchases();
        setIsRestoring(false);

        if (restored) {
            const { status: s } = await subscriptionService.getStatus();
            setStatus(s);
            Alert.alert('Restored!', 'Your Premium subscription has been restored.');
        } else {
            Alert.alert('No Subscription Found', error || 'No active subscription found for this account.');
        }
    };

    const handleManageSubscription = () => {
        if (Platform.OS === 'ios') {
            Linking.openURL('https://apps.apple.com/account/subscriptions');
        } else {
            Linking.openURL('https://play.google.com/store/account/subscriptions');
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
            </View>

            {/* Hero */}
            <View style={styles.hero}>
                <View style={styles.heroIcon}>
                    <Ionicons name="diamond" size={40} color="#6366f1" />
                </View>
                <Text style={styles.heroTitle}>
                    {status?.isPremium ? 'You\'re Premium' : 'Upgrade to Premium'}
                </Text>
                <Text style={styles.heroSubtitle}>
                    {status?.isPremium
                        ? `Your subscription is active${status.daysRemaining ? ` (${status.daysRemaining} days remaining)` : ''}`
                        : 'Unlock unlimited access to all features'}
                </Text>
            </View>

            {/* Feature Comparison */}
            <View style={styles.comparisonCard}>
                <View style={styles.comparisonHeader}>
                    <View style={styles.comparisonHeaderLeft} />
                    <Text style={styles.comparisonHeaderFree}>Free</Text>
                    <Text style={styles.comparisonHeaderPremium}>Premium</Text>
                </View>

                {FEATURES.map((feature, i) => (
                    <View
                        key={i}
                        style={[
                            styles.featureRow,
                            i === FEATURES.length - 1 && styles.featureRowLast,
                        ]}
                    >
                        <View style={styles.featureInfo}>
                            <Ionicons
                                name={feature.icon as any}
                                size={18}
                                color="#6366f1"
                            />
                            <Text style={styles.featureTitle}>{feature.title}</Text>
                        </View>
                        <View style={styles.featureTiers}>
                            <View style={styles.featureFreeCol}>
                                {feature.free ? (
                                    <Text style={styles.featureFreeText}>{feature.free}</Text>
                                ) : (
                                    <Ionicons name="close" size={16} color="#d1d5db" />
                                )}
                            </View>
                            <View style={styles.featurePremiumCol}>
                                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                                <Text style={styles.featurePremiumText}>{feature.premium}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            {/* Pricing & CTA */}
            {status?.isPremium ? (
                <View style={styles.activeSection}>
                    <View style={styles.activeBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                        <Text style={styles.activeBadgeText}>Premium Active</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.manageButton}
                        onPress={handleManageSubscription}
                    >
                        <Text style={styles.manageButtonText}>Manage Subscription</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.ctaSection}>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>£4.99</Text>
                        <Text style={styles.priceUnit}>/month</Text>
                    </View>
                    <Text style={styles.cancelNote}>Cancel anytime</Text>

                    <TouchableOpacity
                        style={[styles.subscribeButton, isPurchasing && styles.subscribeButtonDisabled]}
                        onPress={handlePurchase}
                        disabled={isPurchasing}
                    >
                        {isPurchasing ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="diamond" size={20} color="#fff" />
                                <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.restoreButton}
                        onPress={handleRestore}
                        disabled={isRestoring}
                    >
                        {isRestoring ? (
                            <ActivityIndicator color="#6366f1" size="small" />
                        ) : (
                            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Legal */}
            <View style={styles.legalRow}>
                <TouchableOpacity>
                    <Text style={styles.legalLink}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.legalDot}>&middot;</Text>
                <TouchableOpacity>
                    <Text style={styles.legalLink}>Privacy Policy</Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    contentContainer: {
        paddingTop: 60,
        paddingBottom: 120,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#F5F0E8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    // Hero
    hero: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 28,
    },
    heroIcon: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    // Feature comparison
    comparisonCard: {
        marginHorizontal: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 28,
    },
    comparisonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    comparisonHeaderLeft: {
        flex: 1,
    },
    comparisonHeaderFree: {
        width: 60,
        fontSize: 12,
        fontWeight: '600',
        color: '#9ca3af',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    comparisonHeaderPremium: {
        width: 90,
        fontSize: 12,
        fontWeight: '700',
        color: '#6366f1',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    featureRow: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f9fafb',
    },
    featureRowLast: {
        borderBottomWidth: 0,
    },
    featureInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        flex: 1,
    },
    featureTiers: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    featureFreeCol: {
        width: 60,
        alignItems: 'center',
    },
    featureFreeText: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
    },
    featurePremiumCol: {
        width: 90,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    featurePremiumText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#22c55e',
    },
    // Active subscription
    activeSection: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        marginBottom: 16,
    },
    activeBadgeText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#16a34a',
    },
    manageButton: {
        paddingVertical: 12,
    },
    manageButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
    // CTA section
    ctaSection: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    price: {
        fontSize: 36,
        fontWeight: '800',
        color: '#1f2937',
    },
    priceUnit: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6b7280',
        marginLeft: 2,
    },
    cancelNote: {
        fontSize: 13,
        color: '#9ca3af',
        marginBottom: 20,
    },
    subscribeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        backgroundColor: '#6366f1',
        paddingVertical: 18,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    subscribeButtonDisabled: {
        opacity: 0.7,
    },
    subscribeButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    restoreButton: {
        paddingVertical: 12,
    },
    restoreButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
    // Legal
    legalRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    legalLink: {
        fontSize: 12,
        color: '#9ca3af',
    },
    legalDot: {
        fontSize: 12,
        color: '#d1d5db',
    },
});
