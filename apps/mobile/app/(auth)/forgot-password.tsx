/**
 * Forgot Password Screen
 * Password reset email request form
 */

import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { validateEmail } from '../../utils/validation';
import { AuthScreenShell } from '../../components/ui/AuthScreenShell';
import { appTheme } from '../../theme/tokens';
import { Text } from '../../components/ui/Typography';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    clearError();
    setValidationErrors([]);

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setValidationErrors(emailValidation.errors);
      return;
    }

    const success = await resetPassword(email);
    if (success) {
      setEmailSent(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AuthScreenShell
        eyebrow="Account recovery"
        title={emailSent ? 'Link sent.' : 'Reset your password.'}
        subtitle={
          emailSent
            ? `We sent a reset link to ${email}.`
            : 'Enter the email attached to your wardrobe and we’ll send a recovery link.'
        }
        icon={emailSent ? 'mail-open-outline' : 'key-outline'}
        footer={
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity style={styles.footerLinkRow}>
              <Ionicons name="arrow-back" size={16} color={appTheme.palette.accent} />
              <Text style={styles.footerLinkText}>Back to sign in</Text>
            </TouchableOpacity>
          </Link>
        }
      >
        {emailSent ? (
          <>
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={18} color={appTheme.palette.success} />
              <Text style={styles.successText}>
                Open the link in your inbox, then return here to sign in.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/(auth)/sign-in')}
            >
              <Text style={styles.primaryButtonText}>Back to sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setEmailSent(false);
                clearError();
              }}
            >
              <Text style={styles.secondaryButtonText}>Use a different email</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputShell}>
                <Ionicons name="mail-outline" size={18} color={appTheme.palette.textSoft} />
                <TextInput
                  style={styles.input}
                  placeholder="name@email.com"
                  placeholderTextColor={appTheme.palette.textSoft}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {(error || validationErrors.length > 0) && (
              <View style={styles.messageError}>
                <Ionicons name="alert-circle" size={18} color={appTheme.palette.danger} />
                <View style={styles.messageCopy}>
                  {error ? <Text style={styles.messageErrorText}>{error}</Text> : null}
                  {validationErrors.map((err, index) => (
                    <Text key={index} style={styles.messageErrorText}>
                      {err}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={appTheme.palette.surface} />
              ) : (
                <Text style={styles.primaryButtonText}>Send reset link</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </AuthScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.palette.canvas,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: appTheme.palette.textMuted,
    letterSpacing: 0.3,
  },
  inputShell: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: appTheme.palette.canvas,
    borderRadius: appTheme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.30)',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: appTheme.palette.text,
    fontSize: 16,
    paddingVertical: 16,
  },
  messageError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: appTheme.radii.md,
    backgroundColor: 'rgba(180, 72, 58, 0.09)',
  },
  messageCopy: {
    flex: 1,
    gap: 4,
  },
  messageErrorText: {
    color: appTheme.palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
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
    ...appTheme.shadows.card,
  },
  primaryButtonText: {
    color: appTheme.palette.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: appTheme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.palette.canvas,
  },
  secondaryButtonText: {
    color: appTheme.palette.textMuted,
    fontSize: 15,
    fontWeight: '600',
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
