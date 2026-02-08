/**
 * ChallengeTrackerCard
 * Story 6.6: Shows challenge progress on the home screen.
 * Displays progress bar (X/20), days remaining countdown.
 * Only visible when challenge status is 'active'.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserChallenge } from '../../services/challengeService';

interface ChallengeTrackerCardProps {
    challenge: UserChallenge;
    onPress?: () => void;
}

function getDaysRemaining(expiresAt: string): number {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function ChallengeTrackerCard({ challenge, onPress }: ChallengeTrackerCardProps) {
    if (challenge.status !== 'active') return null;

    const daysLeft = getDaysRemaining(challenge.expires_at);
    const progress = Math.min(challenge.progress, challenge.target);
    const percent = (progress / challenge.target) * 100;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={onPress ? 0.8 : 1}
            disabled={!onPress}
        >
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="compass" size={20} color="#6366f1" />
                    </View>
                    <Text style={styles.title}>Closet Safari</Text>
                </View>
                <View style={styles.countdownBadge}>
                    <Ionicons name="time-outline" size={14} color={daysLeft <= 2 ? '#ef4444' : '#6366f1'} />
                    <Text style={[styles.countdownText, daysLeft <= 2 && styles.countdownUrgent]}>
                        {daysLeft === 0 ? 'Last day!' : `${daysLeft}d left`}
                    </Text>
                </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${percent}%` }]} />
                </View>
                <Text style={styles.progressText}>
                    {progress}/{challenge.target} items
                </Text>
            </View>

            {/* Motivation text */}
            <Text style={styles.motivationText}>
                {progress === 0
                    ? 'Start uploading items to earn Premium!'
                    : progress >= challenge.target * 0.75
                        ? 'Almost there! Keep going!'
                        : `${challenge.target - progress} more items to unlock Premium`}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#c7d2fe',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
    },
    countdownBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#f0f0ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countdownText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366f1',
    },
    countdownUrgent: {
        color: '#ef4444',
    },
    progressSection: {
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#6366f1',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4b5563',
        textAlign: 'right',
    },
    motivationText: {
        fontSize: 13,
        color: '#6b7280',
    },
});
