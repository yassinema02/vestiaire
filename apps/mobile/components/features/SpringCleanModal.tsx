/**
 * SpringCleanModal
 * Story 13.4: Guided declutter flow for neglected wardrobe items.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeItem } from '../../services/items';
import { formatNeglectedLabel, getDaysSinceWorn } from '../../utils/neglectedItems';
import { getCPWResult } from '../../utils/cpwCalculator';

export interface SpringCleanResult {
    kept: string[];
    selling: string[];
    donating: string[];
}

interface SpringCleanModalProps {
    visible: boolean;
    items: WardrobeItem[];
    onDismiss: () => void;
    onComplete: (results: SpringCleanResult) => void;
}

type Step = 'overview' | 'review' | 'summary';
type Decision = 'keep' | 'sell' | 'donate';

export default function SpringCleanModal({ visible, items, onDismiss, onComplete }: SpringCleanModalProps) {
    const [step, setStep] = useState<Step>('overview');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [decisions, setDecisions] = useState<Record<string, Decision>>({});

    // Sort by most neglected first
    const sortedItems = useMemo(() =>
        [...items].sort((a, b) => {
            const daysA = getDaysSinceWorn(a) ?? Infinity;
            const daysB = getDaysSinceWorn(b) ?? Infinity;
            return daysB - daysA;
        }),
    [items]);

    const currentItem = sortedItems[currentIndex];

    const results: SpringCleanResult = useMemo(() => {
        const kept: string[] = [];
        const selling: string[] = [];
        const donating: string[] = [];
        for (const [id, decision] of Object.entries(decisions)) {
            if (decision === 'keep') kept.push(id);
            else if (decision === 'sell') selling.push(id);
            else donating.push(id);
        }
        return { kept, selling, donating };
    }, [decisions]);

    const handleDecision = (decision: Decision) => {
        setDecisions(prev => ({ ...prev, [currentItem.id]: decision }));
        if (currentIndex < sortedItems.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setStep('summary');
        }
    };

    const handleComplete = () => {
        onComplete(results);
        // Reset state for next open
        setStep('overview');
        setCurrentIndex(0);
        setDecisions({});
    };

    const handleDismiss = () => {
        onDismiss();
        setStep('overview');
        setCurrentIndex(0);
        setDecisions({});
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleDismiss}>
                        <Ionicons name="close" size={24} color="#5D4E37" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Spring Clean</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Step indicator */}
                <View style={styles.stepIndicator}>
                    {['overview', 'review', 'summary'].map((s, i) => (
                        <View
                            key={s}
                            style={[
                                styles.stepDot,
                                (step === s || (step === 'review' && i <= 1) || step === 'summary') && styles.stepDotActive,
                            ]}
                        />
                    ))}
                </View>

                {/* Step 1: Overview */}
                {step === 'overview' && (
                    <View style={styles.stepContent}>
                        <Ionicons name="sparkles" size={48} color="#6366f1" />
                        <Text style={styles.overviewTitle}>Time for a Spring Clean!</Text>
                        <Text style={styles.overviewSubtitle}>
                            You have {sortedItems.length} neglected item{sortedItems.length !== 1 ? 's' : ''}.{'\n'}
                            Let's review them one by one.
                        </Text>
                        <Text style={styles.overviewHint}>
                            For each item, choose to Keep, Sell, or Donate.
                        </Text>
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => setStep('review')}
                        >
                            <Text style={styles.startButtonText}>Let's Go</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 2: Item Review */}
                {step === 'review' && currentItem && (
                    <View style={styles.stepContent}>
                        {/* Progress */}
                        <Text style={styles.progressText}>
                            {currentIndex + 1} of {sortedItems.length}
                        </Text>

                        {/* Item card */}
                        <Image
                            source={{ uri: currentItem.processed_image_url || currentItem.image_url }}
                            style={styles.itemImage}
                        />
                        <Text style={styles.itemName}>
                            {currentItem.name || currentItem.category || 'Item'}
                        </Text>
                        {currentItem.brand && (
                            <Text style={styles.itemBrand}>{currentItem.brand}</Text>
                        )}

                        {/* Item stats */}
                        <View style={styles.statsRow}>
                            <View style={styles.statChip}>
                                <Ionicons name="time-outline" size={14} color="#6b7280" />
                                <Text style={styles.statText}>{formatNeglectedLabel(currentItem)}</Text>
                            </View>
                            {currentItem.purchase_price != null && (
                                <View style={styles.statChip}>
                                    <Ionicons name="cash-outline" size={14} color="#6b7280" />
                                    <Text style={styles.statText}>
                                        {getCPWResult(currentItem.purchase_price, currentItem.wear_count).formatted}/w
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Action buttons */}
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={styles.keepButton}
                                onPress={() => handleDecision('keep')}
                            >
                                <Text style={styles.keepText}>Keep</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.sellButton}
                                onPress={() => handleDecision('sell')}
                            >
                                <Ionicons name="pricetag" size={14} color="#fff" />
                                <Text style={styles.sellText}>Sell</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.donateButton}
                                onPress={() => handleDecision('donate')}
                            >
                                <Ionicons name="heart" size={14} color="#fff" />
                                <Text style={styles.donateText}>Donate</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Step 3: Summary */}
                {step === 'summary' && (
                    <View style={styles.stepContent}>
                        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                        <Text style={styles.summaryTitle}>Spring Clean Complete!</Text>
                        <Text style={styles.summarySubtitle}>Here's what you decided:</Text>

                        <View style={styles.summaryStats}>
                            {results.selling.length > 0 && (
                                <View style={styles.summaryRow}>
                                    <Ionicons name="pricetag" size={16} color="#22c55e" />
                                    <Text style={styles.summaryText}>
                                        Sell {results.selling.length} item{results.selling.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            )}
                            {results.donating.length > 0 && (
                                <View style={styles.summaryRow}>
                                    <Ionicons name="heart" size={16} color="#f59e0b" />
                                    <Text style={styles.summaryText}>
                                        Donate {results.donating.length} item{results.donating.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            )}
                            {results.kept.length > 0 && (
                                <View style={styles.summaryRow}>
                                    <Ionicons name="checkmark" size={16} color="#6b7280" />
                                    <Text style={styles.summaryText}>
                                        Keep {results.kept.length} item{results.kept.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.doneButton}
                            onPress={handleComplete}
                        >
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#5D4E37',
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#e5e7eb',
    },
    stepDotActive: {
        backgroundColor: '#6366f1',
    },
    stepContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    // Overview
    overviewTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginTop: 16,
        textAlign: 'center',
    },
    overviewSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
    },
    overviewHint: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 16,
    },
    startButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 48,
        marginTop: 32,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // Review
    progressText: {
        fontSize: 14,
        color: '#9ca3af',
        fontWeight: '500',
        marginBottom: 16,
    },
    itemImage: {
        width: 180,
        height: 180,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        marginBottom: 16,
    },
    itemName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'center',
    },
    itemBrand: {
        fontSize: 15,
        color: '#6b7280',
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
        marginBottom: 32,
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statText: {
        fontSize: 12,
        color: '#6b7280',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    keepButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
        alignItems: 'center',
    },
    keepText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6b7280',
    },
    sellButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#22c55e',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    sellText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    donateButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f59e0b',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    donateText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    // Summary
    summaryTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginTop: 16,
    },
    summarySubtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 8,
    },
    summaryStats: {
        marginTop: 24,
        gap: 12,
        width: '100%',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#f9fafb',
        padding: 14,
        borderRadius: 12,
    },
    summaryText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
    },
    doneButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 48,
        marginTop: 32,
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
