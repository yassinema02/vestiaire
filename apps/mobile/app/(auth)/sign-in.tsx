/**
 * Sign In Screen
 * Email/password login form
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { validateEmail } from '../../utils/validation';
import { AuthScreenShell } from '../../components/ui/AuthScreenShell';
import { appTheme } from '../../theme/tokens';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSignIn = async () => {
    clearError();
    setValidationErrors([]);

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setValidationErrors(emailValidation.errors);
      return;
    }

    if (!password) {
      setValidationErrors(['Password is required']);
      return;
    }

    const success = await signIn(email, password);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AuthScreenShell
        eyebrow="Vestiaire Club"
        title="Dress with intent."
        subtitle="Return to your wardrobe, your styling cues, and the pieces you actually wear."
        icon="sparkles-outline"
        footer={
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New here?</Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Create an account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        }
      >
        <View style={styles.formIntro}>
          <Text style={styles.formKicker}>Sign in</Text>
          <Text style={styles.formTitle}>Welcome back</Text>
        </View>

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

        <View style={styles.inputGroup}>
          <View style={styles.passwordHeader}>
            <Text style={styles.label}>Password</Text>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity>
                <Text style={styles.inlineLink}>Forgot?</Text>
              </TouchableOpacity>
            </Link>
          </View>
          <View style={styles.inputShell}>
            <Ionicons name="lock-closed-outline" size={18} color={appTheme.palette.textSoft} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={appTheme.palette.textSoft}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="off"
              textContentType="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.trailingButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={appTheme.palette.accent}
              />
            </TouchableOpacity>
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
          onPress={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={appTheme.palette.surface} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Enter wardrobe</Text>
              <Ionicons name="arrow-forward" size={18} color={appTheme.palette.surface} />
            </>
          )}
        </TouchableOpacity>
      </AuthScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.palette.canvas,
  },
  formIntro: {
    gap: 8,
  },
  formKicker: {
    color: appTheme.palette.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 11,
    fontWeight: '700',
  },
  formTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: appTheme.palette.text,
    fontFamily: appTheme.typography.display,
  },
  inputGroup: {
    gap: 10,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: appTheme.palette.textMuted,
    letterSpacing: 0.4,
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
  trailingButton: {
    width: 32,
    alignItems: 'flex-end',
  },
  inlineLink: {
    color: appTheme.palette.accent,
    fontWeight: '700',
    fontSize: 13,
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
  primaryButton: {
    minHeight: 58,
    borderRadius: appTheme.radii.md,
    backgroundColor: appTheme.palette.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...appTheme.shadows.card,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: appTheme.palette.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: appTheme.palette.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: appTheme.palette.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
