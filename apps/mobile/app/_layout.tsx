/**
 * Root Layout
 * Handles auth state and navigation routing with animations
 * Includes onboarding flow check
 */

import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { onboardingService } from '../services/onboarding';
import { eveningReminderService } from '../services/eveningReminderService';

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const { session, isLoading, isInitialized, initialize } = useAuthStore();
    const [hasCheckedInitialOnboarding, setHasCheckedInitialOnboarding] = useState(false);

    // Initialize auth on mount and record app open for smart reminder skip
    useEffect(() => {
        initialize();
        eveningReminderService.recordAppOpen();
    }, []);

    // Handle auth state routing with onboarding check
    useEffect(() => {
        if (!isInitialized) return;

        const checkAndRoute = async () => {
            const inAuthGroup = segments[0] === '(auth)';
            const inOnboarding = segments[0] === 'onboarding';
            const inAddFlow = segments[1] === 'add' || segments[1] === 'confirm-item';
            const isAuthenticated = !!session;

            if (!isAuthenticated && !inAuthGroup) {
                // Redirect to sign-in if not authenticated
                router.replace('/(auth)/sign-in');
            } else if (isAuthenticated && inAuthGroup) {
                // User just logged in - check if should show onboarding
                const shouldOnboard = await onboardingService.shouldShowOnboarding();
                if (shouldOnboard) {
                    router.replace('/onboarding');
                } else {
                    router.replace('/(tabs)');
                }
                setHasCheckedInitialOnboarding(true);
            } else if (isAuthenticated && !inOnboarding && !inAuthGroup && !inAddFlow && !hasCheckedInitialOnboarding) {
                // First load after auth - check onboarding status (skip if in add flow)
                setHasCheckedInitialOnboarding(true);
                const shouldOnboard = await onboardingService.shouldShowOnboarding();
                if (shouldOnboard) {
                    router.replace('/onboarding');
                }
            }
        };

        checkAndRoute();
    }, [session, segments, isInitialized]);

    // Show loading screen while initializing
    if (!isInitialized || isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return <Slot />;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F0E8',
    },
});
