/**
 * PaywallModal
 * Story 7.5: Freemium Tier Limits
 * Soft paywall shown when free-tier usage limits are reached.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface PaywallModalProps {
    visible: boolean;
    onDismiss: () => void;
    feature: 'ai_suggestions' | 'resale_listings';
    used: number;
    limit: number;
    resetAt: string | null;
}

function formatTimeUntilReset(resetAt: string | null): string {
    if (!resetAt) return '';
    const now = Date.now();
    const reset = new Date(resetAt).getTime();
    const diff = reset - now;
    if (diff <= 0) return 'Resets soon';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
        const days = Math.ceil(hours / 24);
        return `Resets in ${days} day${days !== 1 ? 's' : ''}`;
    }
    if (hours > 0) return `Resets in ${hours}h ${minutes}m`;
    return `Resets in ${minutes}m`;
}

const FEATURE_LABELS = {
    ai_suggestions: {
        title: 'AI Outfit Suggestions',
        unit: 'suggestions today',
    },
    resale_listings: {
        title: 'Resale Listings',
        unit: 'listings this month',
    },
};

const PREMIUM_BENEFITS = [
    { icon: 'sparkles', label: 'Unlimited AI outfit suggestions' },
    { icon: 'pricetags', label: 'Unlimited resale listings' },
    { icon: 'analytics', label: 'Advanced analytics' },
    { icon: 'shield-checkmark', label: 'Priority support' },
];

export default function PaywallModal({
    visible,
    onDismiss,
    feature,
    used,
    limit,
    resetAt,
}: PaywallModalProps) {
    const router = useRouter();
    const featureLabel = FEATURE_LABELS[feature];
    const resetText = formatTimeUntilReset(resetAt);

    const handleUpgrade = () => {
        onDismiss();
        router.push('/(tabs)/premium');
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Close */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onDismiss}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={24} color="#6b7280" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.iconWrap}>
                        <Ionicons name="rocket" size={32} color="#6366f1" />
                    </View>
                    <Text style={styles.title}>Upgrade to Premium</Text>
                    <Text style={styles.subtitle}>
                        You've reached your daily limit
                    </Text>

                    {/* Usage badge */}
                    <View style={styles.usageBadge}>
                        <Text style={styles.usageText}>
                            {used}/{limit} {featureLabel.unit}
                        </Text>
                    </View>

                    {/* Benefits */}
                    <View style={styles.benefitsList}>
                        {PREMIUM_BENEFITS.map((b, i) => (
                            <View key={i} style={styles.benefitRow}>
                                <View style={styles.benefitCheck}>
                                    <Ionicons name={b.icon as any} size={16} color="#6366f1" />
                                </View>
                                <Text style={styles.benefitText}>{b.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* CTA */}
                    <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
                        <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                        <Text style={styles.upgradePrice}>£4.99/month</Text>
                    </TouchableOpacity>

                    {/* Reset timer */}
                    {resetText ? (
                        <Text style={styles.resetText}>
                            <Ionicons name="time-outline" size={13} color="#9ca3af" />{' '}
                            {resetText}
                        </Text>
                    ) : null}

                    {/* Dismiss */}
                    <TouchableOpacity style={styles.dismissLink} onPress={onDismiss}>
                        <Text style={styles.dismissLinkText}>Maybe later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    sheet: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        color: '#6b7280',
        marginBottom: 12,
    },
    usageBadge: {
        backgroundColor: '#fef2f2',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    usageText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ef4444',
    },
    benefitsList: {
        width: '100%',
        marginBottom: 24,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    benefitCheck: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    benefitText: {
        fontSize: 15,
        color: '#374151',
        flex: 1,
    },
    upgradeButton: {
        width: '100%',
        backgroundColor: '#6366f1',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    upgradeButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    upgradePrice: {
        fontSize: 13,
        color: '#c7d2fe',
        marginTop: 2,
    },
    resetText: {
        fontSize: 13,
        color: '#9ca3af',
        marginBottom: 8,
    },
    dismissLink: {
        paddingVertical: 8,
    },
    dismissLinkText: {
        fontSize: 14,
        color: '#9ca3af',
        fontWeight: '500',
    },
});
