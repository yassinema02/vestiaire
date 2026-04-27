/**
 * Verify Email Screen
 * Displays message after signup prompting user to verify email
 */

import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth';
import { AuthScreenShell } from '../../components/ui/AuthScreenShell';
import { appTheme } from '../../theme/tokens';
import { Text } from '../../components/ui/Typography';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    setError(null);
    setResendSuccess(false);

    const { error: resendError } = await authService.resendVerificationEmail(email);

    setIsResending(false);

    if (resendError) {
      setError(resendError.message);
    } else {
      setResendSuccess(true);
    }
  };

  return (
    <AuthScreenShell
      eyebrow="Verification"
      title="Check your inbox."
      subtitle={`We sent a verification link to ${email || 'your email address'}.`}
      icon="mail-unread-outline"
      footer={
        <Link href="/(auth)/sign-in" asChild>
          <TouchableOpacity style={styles.footerLinkRow}>
            <Ionicons name="arrow-back" size={16} color={appTheme.palette.accent} />
            <Text style={styles.footerLinkText}>Back to sign in</Text>
          </TouchableOpacity>
        </Link>
      }
    >
      <Text style={styles.bodyText}>
        Open the email, confirm your account, then return here. If nothing arrives, resend it below.
      </Text>

      {error ? (
        <View style={styles.messageError}>
          <Ionicons name="alert-circle" size={18} color={appTheme.palette.danger} />
          <Text style={styles.messageErrorText}>{error}</Text>
        </View>
      ) : null}

      {resendSuccess ? (
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={18} color={appTheme.palette.success} />
          <Text style={styles.successText}>Verification email resent successfully.</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, isResending && styles.buttonDisabled]}
        onPress={handleResendEmail}
        disabled={isResending}
      >
        {isResending ? (
          <ActivityIndicator color={appTheme.palette.surface} />
        ) : (
          <>
            <Ionicons name="refresh-outline" size={18} color={appTheme.palette.surface} />
            <Text style={styles.primaryButtonText}>Resend verification email</Text>
          </>
        )}
      </TouchableOpacity>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: appTheme.palette.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  messageError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: appTheme.radii.md,
    backgroundColor: 'rgba(180, 72, 58, 0.09)',
  },
  messageErrorText: {
    flex: 1,
    color: appTheme.palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: appTheme.radii.md,
    backgroundColor: 'rgba(63, 107, 87, 0.10)',
  },
  successText: {
    flex: 1,
    color: appTheme.palette.success,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: appTheme.radii.md,
    backgroundColor: appTheme.palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    ...appTheme.shadows.card,
  },
  primaryButtonText: {
    color: appTheme.palette.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerLinkText: {
    color: appTheme.palette.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
