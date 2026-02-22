/**
 * Join Squad Screen
 * Enter a 6-character invite code to join a Style Squad.
 * Story 9.1: Style Squads Creation
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSocialStore } from '../../stores/socialStore';

export default function JoinSquadScreen() {
    const router = useRouter();
    const { joinSquad } = useSocialStore();

    const [code, setCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const sanitizedCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const canJoin = sanitizedCode.length === 6;

    const handleCodeChange = (text: string) => {
        // Only allow alphanumeric, auto-uppercase, max 6 chars
        const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
        setCode(cleaned);
    };

    const handleJoin = async () => {
        if (!canJoin || isJoining) return;
        setIsJoining(true);

        const { squad, error } = await joinSquad(sanitizedCode);

        setIsJoining(false);

        if (error) {
            Alert.alert('Cannot Join', error);
            return;
        }

        if (squad) {
            Alert.alert('Joined!', `You are now a member of ${squad.name}.`, [
                {
                    text: 'View Squad',
                    onPress: () => {
                        useSocialStore.getState().setActiveSquad(squad);
                        router.replace(`/(tabs)/squad-detail?squadId=${squad.id}`);
                    },
                },
                {
                    text: 'OK',
                    onPress: () => router.back(),
                },
            ]);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Join a Squad</Text>
                <View style={styles.backButton} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="enter-outline" size={48} color="#6366f1" />
                </View>

                <Text style={styles.instruction}>
                    Enter the 6-character invite code shared by your friend
                </Text>

                <TextInput
                    style={styles.codeInput}
                    placeholder="ABC123"
                    placeholderTextColor="#d1d5db"
                    value={code}
                    onChangeText={handleCodeChange}
                    maxLength={6}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus
                    textAlign="center"
                />

                <TouchableOpacity
                    style={[styles.joinSubmit, !canJoin && styles.joinSubmitDisabled]}
                    onPress={handleJoin}
                    disabled={!canJoin || isJoining}
                >
                    {isJoining ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.joinSubmitText}>Join Squad</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    content: {
        paddingHorizontal: 32,
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
    instruction: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    codeInput: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 18,
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1f2937',
        letterSpacing: 8,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        width: '100%',
        marginBottom: 24,
    },
    joinSubmit: {
        backgroundColor: '#6366f1',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
    },
    joinSubmitDisabled: {
        opacity: 0.5,
    },
    joinSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
