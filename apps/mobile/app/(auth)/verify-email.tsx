/**
 * Verify Email Screen
 * Displays message after signup prompting user to verify email
 */

import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth';

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
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="mail-unread-outline" size={48} color="#6366f1" />
                </View>
                <Text style={styles.title}>Verify your email</Text>
                <Text style={styles.text}>
                    We've sent a verification link to{'\n'}
                    <Text style={styles.emailText}>{email || 'your email'}</Text>
                </Text>
                <Text style={styles.instruction}>
                    Click the link in the email to verify your account, then come back and sign in.
                </Text>

                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={18} color="#dc2626" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {resendSuccess && (
                    <View style={styles.successContainer}>
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                        <Text style={styles.successText}>Verification email resent!</Text>
                    </View>
                )}

                {/* Resend Email Button */}
                <TouchableOpacity
                    style={[styles.resendButton, isResending && styles.buttonDisabled]}
                    onPress={handleResendEmail}
                    disabled={isResending}
                >
                    {isResending ? (
                        <ActivityIndicator color="#6366f1" />
                    ) : (
                        <>
                            <Ionicons name="refresh-outline" size={18} color="#6366f1" />
                            <Text style={styles.resendText}>Resend verification email</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Back to Sign In */}
                <Link href="/(auth)/sign-in" asChild>
                    <TouchableOpacity style={styles.signInButton}>
                        <Text style={styles.signInText}>Back to Sign In</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </View>
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
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    text: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 16,
    },
    emailText: {
        fontWeight: '600',
        color: '#374151',
    },
    instruction: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        width: '100%',
        gap: 8,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        flex: 1,
    },
    successContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        width: '100%',
        gap: 8,
    },
    successText: {
        color: '#22c55e',
        fontSize: 14,
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginBottom: 16,
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    resendText: {
        color: '#6366f1',
        fontSize: 16,
        fontWeight: '500',
    },
    signInButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        alignItems: 'center',
    },
    signInText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
