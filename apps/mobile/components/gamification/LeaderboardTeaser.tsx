/**
 * LeaderboardTeaser
 * Story 6.7: Placeholder card for future leaderboard/social feature.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LeaderboardTeaser() {
    return (
        <View style={styles.card}>
            <View style={styles.iconRow}>
                <View style={styles.iconWrap}>
                    <Ionicons name="podium-outline" size={24} color="#6366f1" />
                </View>
                <View style={styles.textWrap}>
                    <Text style={styles.title}>Leaderboard</Text>
                    <Text style={styles.subtitle}>Coming Soon</Text>
                </View>
            </View>

            {/* Mock podium */}
            <View style={styles.podium}>
                <View style={styles.podiumItem}>
                    <View style={[styles.podiumBar, styles.podiumSecond]} />
                    <View style={styles.podiumAvatar}>
                        <Ionicons name="person" size={14} color="#d1d5db" />
                    </View>
                    <Text style={styles.podiumRank}>2nd</Text>
                </View>
                <View style={styles.podiumItem}>
                    <View style={[styles.podiumBar, styles.podiumFirst]} />
                    <View style={[styles.podiumAvatar, styles.podiumAvatarFirst]}>
                        <Ionicons name="person" size={14} color="#c7d2fe" />
                    </View>
                    <Text style={[styles.podiumRank, styles.podiumRankFirst]}>1st</Text>
                </View>
                <View style={styles.podiumItem}>
                    <View style={[styles.podiumBar, styles.podiumThird]} />
                    <View style={styles.podiumAvatar}>
                        <Ionicons name="person" size={14} color="#d1d5db" />
                    </View>
                    <Text style={styles.podiumRank}>3rd</Text>
                </View>
            </View>

            <Text style={styles.description}>
                Compete with friends soon! Challenge each other to build the most stylish wardrobe.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textWrap: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 12,
        color: '#6366f1',
        fontWeight: '500',
    },
    podium: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 16,
        paddingHorizontal: 24,
    },
    podiumItem: {
        alignItems: 'center',
        flex: 1,
    },
    podiumBar: {
        width: '100%',
        borderRadius: 6,
        backgroundColor: '#f3f4f6',
    },
    podiumFirst: {
        height: 48,
        backgroundColor: '#eef2ff',
    },
    podiumSecond: {
        height: 36,
    },
    podiumThird: {
        height: 28,
    },
    podiumAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -14,
        borderWidth: 2,
        borderColor: '#fff',
    },
    podiumAvatarFirst: {
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
    },
    podiumRank: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9ca3af',
        marginTop: 4,
    },
    podiumRankFirst: {
        color: '#6366f1',
    },
    description: {
        fontSize: 13,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 18,
    },
});
