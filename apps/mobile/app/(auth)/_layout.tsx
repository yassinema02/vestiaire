/**
 * Auth Layout
 * Stack navigation for authentication screens with animations
 */

import { Stack } from 'expo-router';
import { appTheme } from '../../theme/tokens';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: appTheme.palette.canvas },
        animation: 'fade',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
      <Stack.Screen name="sign-up" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="verify-email" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
