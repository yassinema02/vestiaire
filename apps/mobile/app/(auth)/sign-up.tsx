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
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { validateEmail, validatePassword, passwordsMatch } from '../../utils/validation';
import { challengeService } from '../../services/challengeService';
import ChallengeInviteModal from '../../components/gamification/ChallengeInviteModal';

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

        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            errors.push(...emailValidation.errors);
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            errors.push(...passwordValidation.errors);
        }

        // Check password match
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
                // Check if user should see the challenge invite
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

    // Password strength indicator
    const getPasswordStrength = () => {
        if (!password) return null;
        const validation = validatePassword(password);
        if (validation.isValid) return { label: 'Strong', color: '#22c55e', icon: 'shield-checkmark' as const };
        if (validation.errors.length === 1) return { label: 'Medium', color: '#eab308', icon: 'shield-half' as const };
        return { label: 'Weak', color: '#ef4444', icon: 'shield-outline' as const };
    };

    const strength = getPasswordStrength();

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="shirt-outline" size={48} color="#6366f1" />
                    </View>
                    <Text style={styles.title}>Create account</Text>
                    <Text style={styles.subtitle}>Start organizing your wardrobe</Text>
                </View>

                <View style={styles.form}>
                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="#9ca3af"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Create a password"
                                placeholderTextColor="#9ca3af"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoComplete="off"
                                textContentType="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity
                                style={styles.showButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={22}
                                    color="#6366f1"
                                />
                            </TouchableOpacity>
                        </View>
                        {strength && (
                            <View style={styles.strengthContainer}>
                                <Ionicons name={strength.icon} size={16} color={strength.color} />
                                <View style={[styles.strengthBar, { backgroundColor: strength.color }]} />
                                <Text style={[styles.strengthText, { color: strength.color }]}>
                                    {strength.label}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.passwordHint}>
                            Min 8 characters, 1 uppercase, 1 number
                        </Text>
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm your password"
                                placeholderTextColor="#9ca3af"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoComplete="off"
                                textContentType="none"
                                autoCorrect={false}
                            />
                        </View>
                        {confirmPassword && !passwordsMatch(password, confirmPassword) && (
                            <View style={styles.mismatchContainer}>
                                <Ionicons name="close-circle" size={14} color="#ef4444" />
                                <Text style={styles.mismatchText}>Passwords do not match</Text>
                            </View>
                        )}
                    </View>

                    {/* Error Messages */}
                    {(error || validationErrors.length > 0) && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={18} color="#dc2626" />
                            <View style={styles.errorTextContainer}>
                                {error && <Text style={styles.errorText}>{error}</Text>}
                                {validationErrors.map((err, index) => (
                                    <Text key={index} style={styles.errorText}>{err}</Text>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Sign Up Button */}
                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleSignUp}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    {/* Sign In Link */}
                    <View style={styles.signInContainer}>
                        <Text style={styles.signInText}>Already have an account? </Text>
                        <Link href="/(auth)/sign-in" asChild>
                            <TouchableOpacity>
                                <Text style={styles.signInLink}>Sign In</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
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
        backgroundColor: '#F5F0E8',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    inputIcon: {
        marginLeft: 16,
    },
    input: {
        flex: 1,
        padding: 16,
        paddingLeft: 12,
        fontSize: 16,
        color: '#1f2937',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    passwordInput: {
        flex: 1,
        padding: 16,
        paddingLeft: 12,
        fontSize: 16,
        color: '#1f2937',
    },
    showButton: {
        padding: 16,
    },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    strengthBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    strengthText: {
        fontSize: 12,
        fontWeight: '500',
    },
    passwordHint: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
    },
    mismatchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    mismatchText: {
        fontSize: 12,
        color: '#ef4444',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    errorTextContainer: {
        marginLeft: 8,
        flex: 1,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
    },
    button: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    signInText: {
        color: '#6b7280',
        fontSize: 14,
    },
    signInLink: {
        color: '#6366f1',
        fontSize: 14,
        fontWeight: '600',
    },
});
