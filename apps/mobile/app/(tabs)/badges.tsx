/**
 * Badges Screen
 * Dedicated screen for viewing the full badge collection grid.
 */

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { gamificationService, UserBadge } from '../../services/gamificationService';
import BadgeGrid from '../../components/gamification/BadgeGrid';

export default function BadgesScreen() {
    const router = useRouter();
    const [userBadges, setUserBadges] = useState<UserBadge[]>([]);

    const loadBadges = useCallback(async () => {
        const { badges } = await gamificationService.getUserBadges();
        setUserBadges(badges);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadBadges();
        }, [])
    );

    const earnedCount = userBadges.length;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/profile')}>
                    <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Badges</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{earnedCount} earned</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <BadgeGrid
                    earnedBadges={userBadges}
                    onBadgesChanged={loadBadges}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    countBadge: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    countText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366f1',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
});
