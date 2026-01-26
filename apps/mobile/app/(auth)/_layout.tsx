/**
 * Auth Layout
 * Stack navigation for authentication screens with animations
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#F5F0E8' },
                animation: 'fade',
                animationDuration: 200,
            }}
        >
            <Stack.Screen
                name="sign-in"
                options={{ animation: 'fade' }}
            />
            <Stack.Screen
                name="sign-up"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="forgot-password"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="verify-email"
                options={{ animation: 'slide_from_right' }}
            />
        </Stack>
    );
}
