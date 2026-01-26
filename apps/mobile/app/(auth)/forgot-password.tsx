/**
 * Forgot Password Screen
 * Password reset email request form
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

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { resetPassword, isLoading, error, clearError } = useAuthStore();

    const [email, setEmail] = useState('');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [emailSent, setEmailSent] = useState(false);

    const handleResetPassword = async () => {
        clearError();
        setValidationErrors([]);

        // Validate email
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

    if (emailSent) {
        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.successIconContainer}>
                        <Ionicons name="mail" size={48} color="#22c55e" />
                    </View>
                    <Text style={styles.successTitle}>Check your email</Text>
                    <Text style={styles.successText}>
                        We've sent a password reset link to{'\n'}
                        <Text style={styles.emailText}>{email}</Text>
                    </Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => router.replace('/(auth)/sign-in')}
                    >
                        <Text style={styles.buttonText}>Back to Sign In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.resendButton}
                        onPress={() => {
                            setEmailSent(false);
                            clearError();
                        }}
                    >
                        <Ionicons name="refresh-outline" size={16} color="#6366f1" />
                        <Text style={styles.resendText}>Didn't receive email? Try again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="key-outline" size={48} color="#6366f1" />
                    </View>
                    <Text style={styles.title}>Reset password</Text>
                    <Text style={styles.subtitle}>
                        Enter your email and we'll send you a link to reset your password
                    </Text>
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

                    {/* Reset Button */}
                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleResetPassword}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Send Reset Link</Text>
                        )}
                    </TouchableOpacity>

                    {/* Back to Sign In */}
                    <Link href="/(auth)/sign-in" asChild>
                        <TouchableOpacity style={styles.backButton}>
                            <Ionicons name="arrow-back" size={18} color="#6366f1" />
                            <Text style={styles.backText}>Back to Sign In</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
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
        textAlign: 'center',
        lineHeight: 24,
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 24,
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
        marginBottom: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 6,
    },
    backText: {
        color: '#6366f1',
        fontSize: 14,
        fontWeight: '500',
    },
    successIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f0fdf4',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 12,
    },
    successText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    emailText: {
        fontWeight: '600',
        color: '#374151',
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 6,
    },
    resendText: {
        color: '#6366f1',
        fontSize: 14,
    },
});
