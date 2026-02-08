/**
 * TrialUnlockedModal
 * Story 7.7: Premium Onboarding Reward
 * Celebration modal shown when user completes Closet Safari (25+ items)
 * and unlocks 30 days of free Premium.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrialUnlockedModalProps {
    visible: boolean;
    onDismiss: () => void;
}

const TRIAL_BENEFITS = [
    { icon: 'sparkles', label: 'Unlimited AI outfit suggestions' },
    { icon: 'pricetags', label: 'Unlimited resale listings' },
    { icon: 'analytics', label: 'Advanced wardrobe analytics' },
    { icon: 'diamond', label: 'All premium features' },
];

export default function TrialUnlockedModal({ visible, onDismiss }: TrialUnlockedModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Celebration icon */}
                    <View style={styles.iconWrap}>
                        <Text style={styles.emoji}>🎉</Text>
                    </View>

                    <Text style={styles.title}>Congratulations!</Text>
                    <Text style={styles.subtitle}>
                        You've unlocked Premium for 30 days!
                    </Text>

                    {/* Context */}
                    <View style={styles.contextBadge}>
                        <Ionicons name="trophy" size={14} color="#f59e0b" />
                        <Text style={styles.contextText}>
                            Closet Safari complete — 25+ items added
                        </Text>
                    </View>

                    {/* Benefits */}
                    <Text style={styles.enjoyLabel}>Enjoy unlimited:</Text>
                    <View style={styles.benefitsList}>
                        {TRIAL_BENEFITS.map((b, i) => (
                            <View key={i} style={styles.benefitRow}>
                                <View style={styles.benefitCheck}>
                                    <Ionicons name={b.icon as any} size={16} color="#6366f1" />
                                </View>
                                <Text style={styles.benefitText}>{b.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* CTA */}
                    <TouchableOpacity style={styles.ctaButton} onPress={onDismiss}>
                        <Text style={styles.ctaButtonText}>Start Exploring</Text>
                    </TouchableOpacity>

                    {/* Fine print */}
                    <Text style={styles.finePrint}>
                        No credit card required. Trial ends automatically.
                    </Text>
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
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: '#fefce8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emoji: {
        fontSize: 36,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 16,
        color: '#6366f1',
        fontWeight: '600',
        marginBottom: 16,
    },
    contextBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fffbeb',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fde68a',
        marginBottom: 20,
    },
    contextText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#92400e',
    },
    enjoyLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    benefitsList: {
        width: '100%',
        marginBottom: 24,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
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
    ctaButton: {
        width: '100%',
        backgroundColor: '#6366f1',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    finePrint: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
    },
});
