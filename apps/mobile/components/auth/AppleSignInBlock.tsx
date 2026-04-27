import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { appTheme } from '../../theme/tokens';
import { Text } from '../ui/Typography';

interface AppleSignInBlockProps {
  label?: 'continue' | 'signIn' | 'signUp';
}

export function AppleSignInBlock({ label = 'continue' }: AppleSignInBlockProps) {
  const router = useRouter();
  const { signInWithApple } = useAuthStore();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  const buttonType =
    label === 'signIn'
      ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
      : label === 'signUp'
        ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
        : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE;

  const handlePress = async () => {
    const success = await signInWithApple();
    if (success) router.replace('/(tabs)');
  };

  return (
    <View style={styles.wrapper}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={buttonType}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={appTheme.radii.md}
        style={styles.button}
        onPress={handlePress}
      />
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with email</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 18,
  },
  button: {
    width: '100%',
    height: 54,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(93, 78, 55, 0.25)',
  },
  dividerText: {
    fontSize: 12,
    letterSpacing: 0.6,
    color: appTheme.palette.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
