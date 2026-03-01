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
import { profileSetupService } from '../services/profileSetupService';
import { eveningReminderService } from '../services/eveningReminderService';
import { ootdReminderService } from '../services/ootdReminderService';
import { migrateSessionStorage } from '../services/sessionMigration';

/**
 * Register for push notifications and save token to profile.
 * STUBBED: expo-notifications requires a development build.
 */
/**
 * Schedule OOTD daily posting reminder if enabled.
 * STUBBED: expo-notifications requires a development build.
 */
async function scheduleOotdReminder() {
    try {
        const { prefs } = await ootdReminderService.getPreferences();
        if (prefs.enabled) {
            await ootdReminderService.scheduleReminder(prefs.time);
        }
    } catch (error) {
        console.error('[OOTD Reminder] Schedule error:', error);
    }
}

async function registerForPushNotifications() {
    // TODO: Replace with real expo-notifications when migrating to dev build
    // import * as Notifications from 'expo-notifications';
    // const { status } = await Notifications.requestPermissionsAsync();
    // if (status !== 'granted') return;
    // const token = (await Notifications.getExpoPushTokenAsync()).data;
    // await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
    console.log('[Push Notifications STUB] Token registration skipped (Expo Go)');
}

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const { session, isLoading, isInitialized, initialize } = useAuthStore();
    const [hasCheckedInitialOnboarding, setHasCheckedInitialOnboarding] = useState(false);

    // Migrate session storage then initialize auth
    useEffect(() => {
        migrateSessionStorage().then(() => initialize());
        eveningReminderService.recordAppOpen();
        registerForPushNotifications();
        scheduleOotdReminder();
    }, []);

    // Listen for notification taps (deep linking)
    useEffect(() => {
        // TODO: Replace with real expo-notifications listener when migrating to dev build
        // const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        //   const data = response.notification.request.content.data;
        //   if (data?.type === 'ootd_post') {
        //     router.push('/(tabs)/social');
        //   } else if (data?.type === 'ootd_reminder') {
        //     router.push('/(tabs)/create-ootd');
        //   }
        // });
        // return () => subscription.remove();
        console.log('[Push Notifications STUB] Deep link listener registered (stubbed for Expo Go)');
    }, []);

    // Handle auth state routing with onboarding check
    useEffect(() => {
        if (!isInitialized) return;

        const checkAndRoute = async () => {
            const inAuthGroup = segments[0] === '(auth)';
            const inOnboarding = segments[0] === 'onboarding';
            const inProfileSetup = segments[0] === 'profile-setup';
            const inAddFlow = segments[1] === 'add' || segments[1] === 'confirm-item';
            const isAuthenticated = !!session;

            if (!isAuthenticated && !inAuthGroup) {
                // Redirect to sign-in if not authenticated
                router.replace('/(auth)/sign-in');
            } else if (isAuthenticated && inAuthGroup) {
                // User just logged in - check profile setup then onboarding
                const shouldSetup = await profileSetupService.shouldShowProfileSetup();
                if (shouldSetup) {
                    router.replace('/profile-setup');
                    setHasCheckedInitialOnboarding(true);
                    return;
                }
                const shouldOnboard = await onboardingService.shouldShowOnboarding();
                if (shouldOnboard) {
                    router.replace('/onboarding');
                } else {
                    router.replace('/(tabs)');
                }
                setHasCheckedInitialOnboarding(true);
            } else if (isAuthenticated && !inOnboarding && !inProfileSetup && !inAuthGroup && !inAddFlow && !hasCheckedInitialOnboarding) {
                // First load after auth - check profile setup then onboarding
                setHasCheckedInitialOnboarding(true);
                const shouldSetup = await profileSetupService.shouldShowProfileSetup();
                if (shouldSetup) {
                    router.replace('/profile-setup');
                    return;
                }
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
