/**
 * Sign Up Screen
 * Registration form with email, password, and confirmation
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
import { validateEmail, validatePassword, passwordsMatch } from '../../utils/validation';
import { challengeService } from '../../services/challengeService';
import ChallengeInviteModal from '../../components/gamification/ChallengeInviteModal';
import { AuthScreenShell } from '../../components/ui/AuthScreenShell';
import { appTheme } from '../../theme/tokens';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showChallengeInvite, setShowChallengeInvite] = useState(false);

  const handleSignUp = async () => {
    clearError();
    setValidationErrors([]);

    const errors: string[] = [];

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    if (!passwordsMatch(password, confirmPassword)) {
      errors.push('Passwords do not match');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const { success, needsVerification } = await signUp(email, password);

    if (success) {
      if (needsVerification) {
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email },
        });
      } else {
        const shouldInvite = await challengeService.shouldShowInvite();
        if (shouldInvite) {
          setShowChallengeInvite(true);
        } else {
          router.replace('/(tabs)');
        }
      }
    }
  };

  const handleAcceptChallenge = async () => {
    setShowChallengeInvite(false);
    await challengeService.startChallenge();
    router.replace('/(tabs)');
  };

  const handleSkipChallenge = async () => {
    setShowChallengeInvite(false);
    await challengeService.skipChallenge();
    router.replace('/(tabs)');
  };

  const getPasswordStrength = () => {
    if (!password) return null;
    const validation = validatePassword(password);
    if (validation.isValid)
      return {
        label: 'Strong',
        color: appTheme.palette.success,
        icon: 'shield-checkmark' as const,
      };
    if (validation.errors.length === 1)
      return { label: 'Almost there', color: appTheme.palette.gold, icon: 'shield-half' as const };
    return { label: 'Too weak', color: appTheme.palette.danger, icon: 'shield-outline' as const };
  };

  const strength = getPasswordStrength();
  const mismatch = confirmPassword && !passwordsMatch(password, confirmPassword);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AuthScreenShell
        eyebrow="Vestiaire Atelier"
        title="Build your digital closet."
        subtitle="Start with a sharper wardrobe ritual and let the app do the remembering."
        icon="shirt-outline"
        footer={
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already a member?</Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        }
      >
        <View style={styles.formIntro}>
          <Text style={styles.formKicker}>Create account</Text>
          <Text style={styles.formTitle}>Join Vestiaire</Text>
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
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputShell}>
            <Ionicons name="lock-closed-outline" size={18} color={appTheme.palette.textSoft} />
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
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
          {strength ? (
            <View style={styles.strengthRow}>
              <View style={[styles.strengthBar, { backgroundColor: strength.color }]} />
              <Ionicons name={strength.icon} size={14} color={strength.color} />
              <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
            </View>
          ) : null}
          <Text style={styles.helperText}>Use 1 uppercase letter and 1 number.</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.inputShell}>
            <Ionicons name="checkmark-circle-outline" size={18} color={appTheme.palette.textSoft} />
            <TextInput
              style={styles.input}
              placeholder="Repeat your password"
              placeholderTextColor={appTheme.palette.textSoft}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="off"
              textContentType="none"
              autoCorrect={false}
            />
          </View>
          {mismatch ? (
            <View style={styles.inlineMessage}>
              <Ionicons name="close-circle" size={14} color={appTheme.palette.danger} />
              <Text style={styles.inlineMessageText}>Passwords do not match yet.</Text>
            </View>
          ) : null}
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
          onPress={handleSignUp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={appTheme.palette.surface} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Create account</Text>
              <Ionicons name="arrow-forward" size={18} color={appTheme.palette.surface} />
            </>
          )}
        </TouchableOpacity>
      </AuthScreenShell>
      <ChallengeInviteModal
        visible={showChallengeInvite}
        onAccept={handleAcceptChallenge}
        onSkip={handleSkipChallenge}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.palette.canvas,
  },
  formIntro: {
    gap: 6,
  },
  formKicker: {
    color: appTheme.palette.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
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
  trailingButton: {
    width: 32,
    alignItems: 'flex-end',
  },
  helperText: {
    color: appTheme.palette.textSoft,
    fontSize: 12,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strengthBar: {
    width: 34,
    height: 6,
    borderRadius: appTheme.radii.pill,
  },
  strengthText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineMessageText: {
    color: appTheme.palette.danger,
    fontSize: 12,
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
    backgroundColor: appTheme.palette.forest,
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
