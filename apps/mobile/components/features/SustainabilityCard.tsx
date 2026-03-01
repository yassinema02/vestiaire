/**
 * SustainabilityCard
 * Story 6.5: Displays sustainability score with visual ring, tier, and tip
 * Story 11.2: Enhanced with 5-factor breakdown, CO2 savings, Eco Warrior badge
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SustainabilityScore } from '../../services/analyticsService';

interface SustainabilityCardProps {
    data: SustainabilityScore;
}

function getScoreColor(score: number): string {
    if (score >= 80) return '#10b981'; // emerald
    if (score >= 60) return '#22c55e'; // green
    if (score >= 30) return '#f59e0b'; // amber
    return '#ef4444'; // red
}

function getScoreBg(score: number): string {
    if (score >= 80) return '#ecfdf5';
    if (score >= 60) return '#f0fdf4';
    if (score >= 30) return '#fffbeb';
    return '#fef2f2';
}

function getScoreBorder(score: number): string {
    if (score >= 80) return '#6ee7b7';
    if (score >= 60) return '#bbf7d0';
    if (score >= 30) return '#fde68a';
    return '#fecaca';
}

export default function SustainabilityCard({ data }: SustainabilityCardProps) {
    const color = getScoreColor(data.score);
    const bg = getScoreBg(data.score);
    const border = getScoreBorder(data.score);

    return (
        <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
            {/* Top: Score ring + Tier */}
            <View style={styles.topRow}>
                <View style={[styles.scoreRing, { borderColor: color }]}>
                    <Ionicons name="leaf" size={18} color={color} />
                    <Text style={[styles.scoreNumber, { color }]}>{data.score}</Text>
                </View>
                <View style={styles.topInfo}>
                    <Text style={styles.title}>Sustainability Score</Text>
                    <Text style={[styles.tier, { color }]}>{data.tier}</Text>
                </View>
            </View>

            {/* 5-Factor Breakdown */}
            <View style={styles.breakdownSection}>
                <BreakdownRow label="Wear Depth" value={data.wearDepth} color={color} />
                <BreakdownRow label="Utilization" value={data.utilization} color={color} />
                <BreakdownRow label="Value Eff." value={data.valueEfficiency} color={color} />
                <BreakdownRow label="Resale" value={data.resaleActivity} color={color} />
                <BreakdownRow label="Buy Less" value={data.purchaseRestraint} color={color} />
            </View>

            {/* CO2 Savings card */}
            {data.co2Saved > 0 && (
                <View style={styles.co2Card}>
                    <Text style={styles.co2Icon}>🌍</Text>
                    <Text style={styles.co2Text}>
                        You saved <Text style={styles.co2Bold}>{data.co2Saved}kg CO₂</Text> by re-wearing vs buying new!
                    </Text>
                </View>
            )}

            {/* Tip */}
            {data.tip ? (
                <View style={styles.tipRow}>
                    <Ionicons name="bulb-outline" size={14} color="#f59e0b" />
                    <Text style={styles.tipText}>{data.tip}</Text>
                </View>
            ) : null}

            {/* Eco Warrior Badge */}
            {data.badgeUnlocked && (
                <View style={styles.badgeCard}>
                    <Text style={styles.badgeEmoji}>🌱</Text>
                    <View style={styles.badgeInfo}>
                        <Text style={styles.badgeName}>{data.badgeName}</Text>
                        <Text style={styles.badgeDesc}>Achieved! Keep it up!</Text>
                    </View>
                </View>
            )}
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
        gap: 8,
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
        width: 76,
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
    co2Card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#ecfdf5',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    co2Icon: {
        fontSize: 20,
    },
    co2Text: {
        fontSize: 12,
        color: '#065f46',
        flex: 1,
        lineHeight: 17,
    },
    co2Bold: {
        fontWeight: '700',
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 10,
    },
    tipText: {
        fontSize: 12,
        color: '#6b7280',
        flex: 1,
        lineHeight: 17,
    },
    badgeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#f0fdf4',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#86efac',
    },
    badgeEmoji: {
        fontSize: 28,
    },
    badgeInfo: {
        flex: 1,
    },
    badgeName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#14532d',
    },
    badgeDesc: {
        fontSize: 12,
        color: '#16a34a',
        marginTop: 2,
    },
});
