/**
 * HealthScoreCard
 * Story 13.4: Displays wardrobe health score with factor breakdown and recommendations.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HealthScore } from '../../services/analyticsService';

interface HealthScoreCardProps {
    healthScore: HealthScore;
    onSpringClean: () => void;
}

const TIER_LABELS: Record<string, string> = {
    excellent: 'Excellent — your wardrobe is thriving!',
    good: 'Good — some items need attention',
    poor: 'Needs work — time to declutter',
};

function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <View style={styles.factorRow}>
            <Text style={styles.factorLabel}>{label}</Text>
            <View style={styles.factorBarBg}>
                <View style={[styles.factorBarFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.factorValue}>{value}%</Text>
        </View>
    );
}

export default function HealthScoreCard({ healthScore, onSpringClean }: HealthScoreCardProps) {
    const { score, tier, color, utilizationFactor, cpwFactor, sizeRatioFactor, recommendation, comparisonLabel, declutterCount } = healthScore;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons name="fitness-outline" size={20} color={color} />
                <Text style={styles.headerTitle}>Wardrobe Health</Text>
                <Text style={[styles.scoreText, { color }]}>{score}/100</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${score}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.tierLabel, { color }]}>{TIER_LABELS[tier]}</Text>

            {/* Factor breakdown */}
            <View style={styles.factorsSection}>
                <FactorBar label="Utilization (90d)" value={utilizationFactor} color="#3b82f6" />
                <FactorBar label="Cost Efficiency" value={cpwFactor} color="#22c55e" />
                <FactorBar label="Size Ratio" value={sizeRatioFactor} color="#8b5cf6" />
            </View>

            {/* Recommendation */}
            <View style={styles.infoRow}>
                <Ionicons name="bulb-outline" size={16} color="#f59e0b" />
                <Text style={styles.infoText}>{recommendation}</Text>
            </View>

            {/* Comparison */}
            <View style={styles.infoRow}>
                <Ionicons name="bar-chart-outline" size={16} color="#6366f1" />
                <Text style={styles.infoText}>{comparisonLabel}</Text>
            </View>

            {/* Spring Clean button */}
            {declutterCount > 0 && (
                <TouchableOpacity style={styles.springCleanButton} onPress={onSpringClean} activeOpacity={0.8}>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={styles.springCleanText}>Start Spring Clean</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        flex: 1,
    },
    scoreText: {
        fontSize: 18,
        fontWeight: '700',
    },
    progressBg: {
        height: 10,
        backgroundColor: '#f3f4f6',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
    },
    tierLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 16,
    },
    factorsSection: {
        gap: 10,
        marginBottom: 16,
    },
    factorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    factorLabel: {
        fontSize: 12,
        color: '#6b7280',
        width: 110,
    },
    factorBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#f3f4f6',
        borderRadius: 3,
        overflow: 'hidden',
    },
    factorBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    factorValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4b5563',
        width: 36,
        textAlign: 'right',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 13,
        color: '#4b5563',
        flex: 1,
    },
    springCleanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#6366f1',
        borderRadius: 10,
        paddingVertical: 12,
        marginTop: 8,
    },
    springCleanText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
