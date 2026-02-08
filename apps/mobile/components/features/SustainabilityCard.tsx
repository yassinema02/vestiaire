/**
 * SustainabilityCard
 * Story 6.5: Displays sustainability score with visual ring, tier, and tip
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SustainabilityScore } from '../../services/analyticsService';

interface SustainabilityCardProps {
    data: SustainabilityScore;
}

function getScoreColor(score: number): string {
    if (score >= 70) return '#22c55e'; // green
    if (score >= 40) return '#f59e0b'; // yellow/amber
    return '#ef4444'; // red
}

function getScoreBg(score: number): string {
    if (score >= 70) return '#f0fdf4';
    if (score >= 40) return '#fffbeb';
    return '#fef2f2';
}

function getScoreBorder(score: number): string {
    if (score >= 70) return '#bbf7d0';
    if (score >= 40) return '#fde68a';
    return '#fecaca';
}

export default function SustainabilityCard({ data }: SustainabilityCardProps) {
    const color = getScoreColor(data.score);
    const bg = getScoreBg(data.score);
    const border = getScoreBorder(data.score);

    return (
        <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
            {/* Top: Icon + Score + Tier */}
            <View style={styles.topRow}>
                <View style={[styles.scoreRing, { borderColor: color }]}>
                    <Ionicons name="leaf" size={20} color={color} />
                    <Text style={[styles.scoreNumber, { color }]}>{data.score}</Text>
                </View>
                <View style={styles.topInfo}>
                    <Text style={styles.title}>Sustainability Score</Text>
                    <Text style={[styles.tier, { color }]}>{data.tier}</Text>
                </View>
            </View>

            {/* Breakdown bars */}
            <View style={styles.breakdownSection}>
                <BreakdownRow label="Utilization" value={data.utilization} color={color} />
                <BreakdownRow label="Wear Depth" value={data.wearDepth} color={color} />
                <BreakdownRow label="Value Efficiency" value={data.valueEfficiency} color={color} />
            </View>

            {/* Tip */}
            {data.tip ? (
                <View style={styles.tipRow}>
                    <Ionicons name="bulb-outline" size={14} color="#f59e0b" />
                    <Text style={styles.tipText}>{data.tip}</Text>
                </View>
            ) : null}
        </View>
    );
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{label}</Text>
            <View style={styles.breakdownBarBg}>
                <View
                    style={[
                        styles.breakdownBarFill,
                        { width: `${Math.min(value, 100)}%`, backgroundColor: color },
                    ]}
                />
            </View>
            <Text style={styles.breakdownValue}>{value}%</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 16,
    },
    scoreRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    scoreNumber: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 1,
    },
    topInfo: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 3,
    },
    tier: {
        fontSize: 13,
        fontWeight: '600',
    },
    breakdownSection: {
        gap: 10,
        marginBottom: 14,
    },
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    breakdownLabel: {
        fontSize: 12,
        color: '#6b7280',
        width: 100,
    },
    breakdownBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    breakdownBarFill: {
        height: 6,
        borderRadius: 3,
    },
    breakdownValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        width: 36,
        textAlign: 'right',
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    tipText: {
        fontSize: 12,
        color: '#6b7280',
        flex: 1,
        lineHeight: 17,
    },
});
