/**
 * Create Style Squad Screen
 * Form to create a new squad with name and optional description.
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
    Share,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSocialStore } from '../../stores/socialStore';

export default function CreateSquadScreen() {
    const router = useRouter();
    const { createSquad } = useSocialStore();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createdCode, setCreatedCode] = useState<string | null>(null);

    const canCreate = name.trim().length > 0 && name.trim().length <= 30;

    const handleCreate = async () => {
        if (!canCreate || isCreating) return;
        setIsCreating(true);

        const { squad, error } = await createSquad({
            name: name.trim(),
            description: description.trim() || undefined,
        });

        setIsCreating(false);

        if (error) {
            Alert.alert('Error', error);
            return;
        }

        if (squad) {
            setCreatedCode(squad.invite_code);
        }
    };

    const handleShareCode = async () => {
        if (!createdCode) return;
        try {
            await Share.share({
                message: `Join my Style Squad on Vestiaire! Use code: ${createdCode}`,
            });
        } catch {
            // User cancelled
        }
    };

    const handleDone = () => {
        router.back();
    };

    // Success state — show invite code
    if (createdCode) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleDone} style={styles.backButton}>
                        <Ionicons name="close" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Squad Created!</Text>
                    <View style={styles.backButton} />
                </View>

                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                    </View>
                    <Text style={styles.successTitle}>{name.trim()}</Text>
                    <Text style={styles.successSubtitle}>
                        Share this code with friends to invite them
                    </Text>

                    <View style={styles.codeCard}>
                        <Text style={styles.codeLabel}>Invite Code</Text>
                        <Text style={styles.codeValue}>{createdCode}</Text>
                    </View>

                    <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
                        <Ionicons name="share-outline" size={20} color="#fff" />
                        <Text style={styles.shareButtonText}>Share Invite</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                        <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Style Squad</Text>
                <View style={styles.backButton} />
            </View>

            <View style={styles.form}>
                <View style={styles.field}>
                    <Text style={styles.label}>Squad Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Fashion Besties"
                        placeholderTextColor="#9ca3af"
                        value={name}
                        onChangeText={setName}
                        maxLength={30}
                        autoFocus
                    />
                    <Text style={styles.charCount}>{name.length}/30</Text>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Description (optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g. Daily outfit inspo"
                        placeholderTextColor="#9ca3af"
                        value={description}
                        onChangeText={setDescription}
                        maxLength={100}
                        multiline
                        numberOfLines={3}
                    />
                    <Text style={styles.charCount}>{description.length}/100</Text>
                </View>

                <TouchableOpacity
                    style={[styles.createSubmit, !canCreate && styles.createSubmitDisabled]}
                    onPress={handleCreate}
                    disabled={!canCreate || isCreating}
                >
                    {isCreating ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.createSubmitText}>Create Squad</Text>
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
    form: {
        paddingHorizontal: 24,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
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
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'right',
        marginTop: 4,
    },
    createSubmit: {
        backgroundColor: '#6366f1',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    createSubmitDisabled: {
        opacity: 0.5,
    },
    createSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Success state
    successContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 40,
    },
    successIcon: {
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    codeCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    codeLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
        marginBottom: 8,
    },
    codeValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#6366f1',
        letterSpacing: 6,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
        gap: 8,
        marginBottom: 12,
    },
    shareButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    doneButton: {
        paddingVertical: 14,
        paddingHorizontal: 28,
    },
    doneButtonText: {
        color: '#6b7280',
        fontSize: 16,
        fontWeight: '500',
    },
});
