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
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { validateEmail } from '../../utils/validation';

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

        // Validate email
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
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="shirt-outline" size={48} color="#6366f1" />
                    </View>
                    <Text style={styles.title}>Welcome back</Text>
                    <Text style={styles.subtitle}>Sign in to your Vestiaire account</Text>
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
                                placeholder="Enter your password"
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
                    </View>

                    {/* Forgot Password Link */}
                    <Link href="/(auth)/forgot-password" asChild>
                        <TouchableOpacity style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                        </TouchableOpacity>
                    </Link>

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

                    {/* Sign In Button */}
                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleSignIn}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Sign Up Link */}
                    <View style={styles.signUpContainer}>
                        <Text style={styles.signUpText}>Don't have an account? </Text>
                        <Link href="/(auth)/sign-up" asChild>
                            <TouchableOpacity>
                                <Text style={styles.signUpLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
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
        marginBottom: 40,
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: '#6366f1',
        fontWeight: '500',
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
    signUpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    signUpText: {
        color: '#6b7280',
        fontSize: 14,
    },
    signUpLink: {
        color: '#6366f1',
        fontSize: 14,
        fontWeight: '600',
    },
});
