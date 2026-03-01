/**
 * Event Classification Badge Component
 * Shows event type + formality score with re-classification option
 * Story 12.2: Event Detection & Classification
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { eventClassificationService, EventType } from '../../services/eventClassificationService';
import { getOccasionColor } from '../../utils/occasionDetector';

interface EventClassificationBadgeProps {
    eventId: string;
    eventType: EventType | null;
    formalityScore: number | null;
    userCorrected?: boolean;
    onReclassify?: (newType: EventType) => void;
}

const TYPE_CONFIG: Record<EventType, { label: string; icon: string; color: string }> = {
    work: { label: 'Work', icon: 'briefcase-outline', color: '#3b82f6' },
    social: { label: 'Social', icon: 'people-outline', color: '#f59e0b' },
    active: { label: 'Active', icon: 'fitness-outline', color: '#10b981' },
    formal: { label: 'Formal', icon: 'sparkles-outline', color: '#8b5cf6' },
    casual: { label: 'Casual', icon: 'cafe-outline', color: '#6b7280' },
};

const ALL_TYPES: EventType[] = ['work', 'social', 'active', 'formal', 'casual'];

export const EventClassificationBadge: React.FC<EventClassificationBadgeProps> = ({
    eventId,
    eventType,
    formalityScore,
    userCorrected,
    onReclassify,
}) => {
    const [showPicker, setShowPicker] = useState(false);
    const [currentType, setCurrentType] = useState(eventType);
    const [currentScore, setCurrentScore] = useState(formalityScore);

    if (!currentType) return null;

    const config = TYPE_CONFIG[currentType];

    const handleReclassify = async (newType: EventType) => {
        setCurrentType(newType);
        setCurrentScore(eventClassificationService.getFormalityScore(newType));
        setShowPicker(false);

        await eventClassificationService.reclassifyEvent(eventId, newType);
        onReclassify?.(newType);
    };

    return (
        <>
            <View style={styles.container}>
                <View style={[styles.badge, { backgroundColor: config.color + '15' }]}>
                    <Ionicons name={config.icon as any} size={14} color={config.color} />
                    <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
                </View>

                {currentScore !== null && (
                    <Text style={styles.formalityText}>Formality: {currentScore}/10</Text>
                )}

                {userCorrected && (
                    <Ionicons name="checkmark-circle" size={14} color="#22c55e" style={styles.correctedIcon} />
                )}

                <TouchableOpacity
                    style={styles.wrongButton}
                    onPress={() => setShowPicker(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={styles.wrongText}>Wrong?</Text>
                </TouchableOpacity>
            </View>

            {/* Type Picker Modal */}
            <Modal
                visible={showPicker}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowPicker(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Correct Event Type</Text>
                        <TouchableOpacity onPress={() => setShowPicker(false)}>
                            <Ionicons name="close" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.typeList}>
                        {ALL_TYPES.map(type => {
                            const tc = TYPE_CONFIG[type];
                            const isSelected = type === currentType;
                            return (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                                    onPress={() => handleReclassify(type)}
                                >
                                    <View style={[styles.typeIcon, { backgroundColor: tc.color + '15' }]}>
                                        <Ionicons name={tc.icon as any} size={22} color={tc.color} />
                                    </View>
                                    <View style={styles.typeInfo}>
                                        <Text style={styles.typeLabel}>{tc.label}</Text>
                                        <Text style={styles.typeScore}>
                                            Formality: {eventClassificationService.getFormalityScore(type)}/10
                                        </Text>
                                    </View>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={22} color={tc.color} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </SafeAreaView>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    formalityText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    correctedIcon: {
        marginLeft: -2,
    },
    wrongButton: {
        marginLeft: 'auto',
    },
    wrongText: {
        fontSize: 12,
        color: '#6366f1',
        fontWeight: '500',
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    typeList: {
        padding: 16,
        gap: 10,
    },
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        gap: 14,
    },
    typeOptionSelected: {
        borderWidth: 2,
        borderColor: '#6366f1',
    },
    typeIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typeInfo: {
        flex: 1,
    },
    typeLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    typeScore: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 2,
    },
});
