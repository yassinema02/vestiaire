/**
 * Profile Setup Screen
 * 3-step onboarding: gender + age / measurements / style picker
 * Shown once before the 5-item challenge onboarding.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userProfileService, STYLE_OPTIONS } from '../services/userProfileService';
import { profileSetupService } from '../services/profileSetupService';
import { onboardingService } from '../services/onboarding';
import { gapAnalysisService } from '../services/gapAnalysisService';
import { Gender, UserProfile } from '../types/userProfile';

// ─── Constants ────────────────────────────────────────────────────

const GENDER_OPTIONS: { id: Gender; label: string }[] = [
    { id: 'man', label: 'Man' },
    { id: 'woman', label: 'Woman' },
    { id: 'non-binary', label: 'Non-binary' },
    { id: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const MAX_STYLE_PICKS = 5;

// ─── Unit conversion helpers ──────────────────────────────────────

function cmToFtIn(cm: number): string {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
}

function ftInToCm(feet: number, inches: number): number {
    return Math.round((feet * 12 + inches) * 2.54);
}

function kgToLbs(kg: number): number {
    return Math.round(kg / 0.453592);
}

function lbsToKg(lbs: number): number {
    return Math.round(lbs * 0.453592 * 10) / 10;
}

// ─── Main Screen ──────────────────────────────────────────────────

export default function ProfileSetupScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    // Step 1 state
    const [gender, setGender] = useState<Gender | undefined>(undefined);
    const [birthYearText, setBirthYearText] = useState('');

    // Step 2 state
    const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
    const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
    const [heightText, setHeightText] = useState('');
    const [weightText, setWeightText] = useState('');
    // For ft mode: separate feet and inches inputs
    const [feetText, setFeetText] = useState('');
    const [inchesText, setInchesText] = useState('');

    // Step 3 state
    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

    // ── Navigation helpers ──────────────────────────────────────

    const handleBack = useCallback(() => {
        if (step > 1) {
            setStep(s => s - 1);
        }
    }, [step]);

    const skipAll = useCallback(async () => {
        await profileSetupService.markProfileSetupComplete();
        const shouldOnboard = await onboardingService.shouldShowOnboarding();
        router.replace(shouldOnboard ? '/onboarding' : '/(tabs)');
    }, []);

    const finish = useCallback(async (styleTags: string[]) => {
        setIsSaving(true);
        try {
            const profile: Partial<UserProfile> = {
                gender,
                style_tags: styleTags,
            };

            const birthYear = parseInt(birthYearText, 10);
            if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= new Date().getFullYear()) {
                profile.birth_year = birthYear;
            }

            // Height → always store as cm
            if (heightUnit === 'cm') {
                const cm = parseInt(heightText, 10);
                if (!isNaN(cm) && cm > 0 && cm < 300) profile.height_cm = cm;
            } else {
                const feet = parseInt(feetText, 10) || 0;
                const inches = parseInt(inchesText, 10) || 0;
                if (feet > 0 || inches > 0) {
                    profile.height_cm = ftInToCm(feet, inches);
                }
            }

            // Weight → always store as kg
            if (weightUnit === 'kg') {
                const kg = parseFloat(weightText);
                if (!isNaN(kg) && kg > 0 && kg < 500) profile.weight_kg = kg;
            } else {
                const lbs = parseInt(weightText, 10);
                if (!isNaN(lbs) && lbs > 0) profile.weight_kg = lbsToKg(lbs);
            }

            await userProfileService.saveProfile(profile);
            // Invalidate gap analysis cache so next analysis uses updated profile
            await gapAnalysisService.invalidateCache();
        } catch {
            // Best effort — don't block the user
        }

        await profileSetupService.markProfileSetupComplete();
        setIsSaving(false);

        const shouldOnboard = await onboardingService.shouldShowOnboarding();
        router.replace(shouldOnboard ? '/onboarding' : '/(tabs)');
    }, [gender, birthYearText, heightUnit, weightUnit, heightText, weightText, feetText, inchesText]);

    // ── Step renderers ──────────────────────────────────────────

    const renderStepIndicator = () => (
        <View style={styles.stepIndicatorRow}>
            {[1, 2, 3].map(s => (
                <View
                    key={s}
                    style={[
                        styles.stepDot,
                        s === step && styles.stepDotActive,
                        s < step && styles.stepDotDone,
                    ]}
                />
            ))}
        </View>
    );

    const renderStep1 = () => (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.stepContent}
        >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.stepTitle}>Tell us about you</Text>
                <Text style={styles.stepSubtitle}>
                    This helps us personalise your wardrobe recommendations.
                </Text>

                {/* Gender */}
                <Text style={styles.fieldLabel}>Gender</Text>
                <View style={styles.genderGrid}>
                    {GENDER_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.id}
                            style={[
                                styles.genderPill,
                                gender === opt.id && styles.genderPillSelected,
                            ]}
                            onPress={() => setGender(opt.id)}
                        >
                            <Text
                                style={[
                                    styles.genderPillText,
                                    gender === opt.id && styles.genderPillTextSelected,
                                ]}
                            >
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Birth year */}
                <Text style={styles.fieldLabel}>Birth year</Text>
                <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 1990"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={birthYearText}
                    onChangeText={setBirthYearText}
                    returnKeyType="done"
                />

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setStep(2)}
                >
                    <Text style={styles.primaryButtonText}>Next</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );

    const renderStep2 = () => (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.stepContent}
        >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.stepTitle}>Your measurements</Text>
                <Text style={styles.stepSubtitle}>
                    Optional — helps us personalise fit suggestions.
                </Text>

                {/* Height */}
                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Height</Text>
                    <View style={styles.unitToggle}>
                        <TouchableOpacity
                            style={[styles.unitBtn, heightUnit === 'cm' && styles.unitBtnActive]}
                            onPress={() => setHeightUnit('cm')}
                        >
                            <Text style={[styles.unitBtnText, heightUnit === 'cm' && styles.unitBtnTextActive]}>cm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.unitBtn, heightUnit === 'ft' && styles.unitBtnActive]}
                            onPress={() => setHeightUnit('ft')}
                        >
                            <Text style={[styles.unitBtnText, heightUnit === 'ft' && styles.unitBtnTextActive]}>ft</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {heightUnit === 'cm' ? (
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 175"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        maxLength={3}
                        value={heightText}
                        onChangeText={setHeightText}
                    />
                ) : (
                    <View style={styles.ftRow}>
                        <TextInput
                            style={[styles.textInput, styles.ftInput]}
                            placeholder="5"
                            placeholderTextColor="#9ca3af"
                            keyboardType="number-pad"
                            maxLength={1}
                            value={feetText}
                            onChangeText={setFeetText}
                        />
                        <Text style={styles.ftSeparator}>ft</Text>
                        <TextInput
                            style={[styles.textInput, styles.ftInput]}
                            placeholder="10"
                            placeholderTextColor="#9ca3af"
                            keyboardType="number-pad"
                            maxLength={2}
                            value={inchesText}
                            onChangeText={setInchesText}
                        />
                        <Text style={styles.ftSeparator}>in</Text>
                    </View>
                )}

                {/* Weight */}
                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Weight</Text>
                    <View style={styles.unitToggle}>
                        <TouchableOpacity
                            style={[styles.unitBtn, weightUnit === 'kg' && styles.unitBtnActive]}
                            onPress={() => setWeightUnit('kg')}
                        >
                            <Text style={[styles.unitBtnText, weightUnit === 'kg' && styles.unitBtnTextActive]}>kg</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.unitBtn, weightUnit === 'lbs' && styles.unitBtnActive]}
                            onPress={() => setWeightUnit('lbs')}
                        >
                            <Text style={[styles.unitBtnText, weightUnit === 'lbs' && styles.unitBtnTextActive]}>lbs</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TextInput
                    style={styles.textInput}
                    placeholder={weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 154'}
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    maxLength={6}
                    value={weightText}
                    onChangeText={setWeightText}
                />

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setStep(3)}
                >
                    <Text style={styles.primaryButtonText}>Next</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipButton} onPress={() => setStep(3)}>
                    <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );

    const toggleStyle = useCallback((id: string) => {
        setSelectedStyles(prev => {
            if (prev.includes(id)) {
                return prev.filter(s => s !== id);
            }
            if (prev.length >= MAX_STYLE_PICKS) return prev; // max reached
            return [...prev, id];
        });
    }, []);

    const renderStep3 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your style</Text>
            <Text style={styles.stepSubtitle}>
                Pick the looks that speak to you ({selectedStyles.length}/{MAX_STYLE_PICKS})
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.styleGrid}>
                    {STYLE_OPTIONS.map(opt => {
                        const selected = selectedStyles.includes(opt.id);
                        const disabled = !selected && selectedStyles.length >= MAX_STYLE_PICKS;
                        return (
                            <TouchableOpacity
                                key={opt.id}
                                style={[
                                    styles.styleCard,
                                    selected && styles.styleCardSelected,
                                    disabled && styles.styleCardDisabled,
                                ]}
                                onPress={() => toggleStyle(opt.id)}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={{ uri: opt.imageUrl }}
                                    style={styles.styleImage}
                                    resizeMode="cover"
                                />
                                {selected && (
                                    <View style={styles.styleCheckOverlay}>
                                        <Ionicons name="checkmark-circle" size={28} color="#fff" />
                                    </View>
                                )}
                                <View style={styles.styleLabelWrap}>
                                    <Text style={styles.styleLabel}>{opt.label}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {isSaving ? (
                    <View style={styles.primaryButton}>
                        <ActivityIndicator color="#fff" />
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.primaryButton, selectedStyles.length === 0 && styles.primaryButtonDisabled]}
                        onPress={() => finish(selectedStyles)}
                        disabled={selectedStyles.length === 0}
                    >
                        <Text style={styles.primaryButtonText}>Continue</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.skipButton} onPress={() => finish([])}>
                    <Text style={styles.skipButtonText}>Skip for now</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {step > 1 ? (
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#374151" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backBtn} />
                )}
                {renderStepIndicator()}
                <TouchableOpacity onPress={skipAll} style={styles.skipAllBtn}>
                    <Text style={styles.skipAllText}>Skip all</Text>
                </TouchableOpacity>
            </View>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    skipAllBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    skipAllText: {
        fontSize: 14,
        color: '#9ca3af',
    },
    stepIndicatorRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#d1d5db',
    },
    stepDotActive: {
        backgroundColor: '#5D4E37',
        width: 20,
        borderRadius: 4,
    },
    stepDotDone: {
        backgroundColor: '#5D4E37',
    },

    // Step content
    stepContent: {
        flex: 1,
        paddingHorizontal: 24,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
        marginTop: 8,
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 28,
        lineHeight: 20,
    },

    // Gender
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    genderGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    genderPill: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#d1d5db',
        backgroundColor: '#fff',
    },
    genderPillSelected: {
        borderColor: '#5D4E37',
        backgroundColor: '#5D4E37',
    },
    genderPillText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    genderPillTextSelected: {
        color: '#fff',
    },

    // Text input
    textInput: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1f2937',
        marginBottom: 24,
    },

    // Field row with unit toggle
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    unitToggle: {
        flexDirection: 'row',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
    },
    unitBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        backgroundColor: '#fff',
    },
    unitBtnActive: {
        backgroundColor: '#5D4E37',
    },
    unitBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
    },
    unitBtnTextActive: {
        color: '#fff',
    },

    // Feet/inches row
    ftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    ftInput: {
        flex: 1,
        marginBottom: 0,
    },
    ftSeparator: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },

    // Buttons
    primaryButton: {
        backgroundColor: '#5D4E37',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
    },
    primaryButtonDisabled: {
        backgroundColor: '#d1d5db',
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 24,
    },
    skipButtonText: {
        fontSize: 14,
        color: '#9ca3af',
    },

    // Style grid
    styleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    styleCard: {
        width: '47%',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 2.5,
        borderColor: 'transparent',
        backgroundColor: '#e5e7eb',
    },
    styleCardSelected: {
        borderColor: '#5D4E37',
    },
    styleCardDisabled: {
        opacity: 0.45,
    },
    styleImage: {
        width: '100%',
        height: 170,
    },
    styleCheckOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(93,78,55,0.85)',
        borderRadius: 14,
        padding: 2,
    },
    styleLabelWrap: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#fff',
    },
    styleLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
});
