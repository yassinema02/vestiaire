/**
 * Edit Profile Screen
 * Allows users to update display name, change password, and sign out
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/auth';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, signOut } = useAuthStore();

    const [displayName, setDisplayName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        const name = user?.user_metadata?.display_name || '';
        setDisplayName(name);
    }, [user]);

    const handleSave = async () => {
        setIsSaving(true);
        const { error } = await authService.updateProfile({ display_name: displayName.trim() });
        setIsSaving(false);

        if (error) {
            Alert.alert('Error', error.message);
            return;
        }

        setHasChanges(false);
        Alert.alert('Saved', 'Your profile has been updated.');
    };

    const handleChangePassword = () => {
        if (!user?.email) return;

        Alert.alert(
            'Reset Password',
            `We'll send a password reset link to ${user.email}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Link',
                    onPress: async () => {
                        const { error } = await authService.resetPassword(user.email!);
                        if (error) {
                            Alert.alert('Error', error.message);
                        } else {
                            Alert.alert('Email Sent', 'Check your inbox for the password reset link.');
                        }
                    },
                },
            ]
        );
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/');
                    },
                },
            ]
        );
    };

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
          })
        : '';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/profile')}>
                    <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Edit Profile</Text>
                {hasChanges && (
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={48} color="#9ca3af" />
                    </View>
                </View>

                {/* Display Name */}
                <View style={styles.section}>
                    <Text style={styles.label}>Display Name</Text>
                    <TextInput
                        style={styles.input}
                        value={displayName}
                        onChangeText={(text) => {
                            setDisplayName(text);
                            setHasChanges(true);
                        }}
                        placeholder="Enter your name"
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="words"
                    />
                </View>

                {/* Email (read-only) */}
                <View style={styles.section}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.readOnlyField}>
                        <Text style={styles.readOnlyText}>{user?.email || ''}</Text>
                        <Ionicons name="lock-closed" size={16} color="#d1d5db" />
                    </View>
                </View>

                {/* Member Since */}
                {memberSince && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Member Since</Text>
                        <View style={styles.readOnlyField}>
                            <Text style={styles.readOnlyText}>{memberSince}</Text>
                        </View>
                    </View>
                )}

                {/* Change Password */}
                <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
                    <Ionicons name="key-outline" size={20} color="#6366f1" />
                    <Text style={styles.actionButtonText}>Change Password</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                {/* Sign Out */}
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontSize: 22,
        fontWeight: '600',
        color: '#1f2937',
    },
    saveButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    avatarSection: {
        alignItems: 'center',
        marginVertical: 24,
    },
    avatarContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1f2937',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    readOnlyField: {
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    readOnlyText: {
        fontSize: 16,
        color: '#6b7280',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 12,
        marginBottom: 12,
    },
    actionButtonText: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
        marginTop: 24,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ef4444',
    },
});
