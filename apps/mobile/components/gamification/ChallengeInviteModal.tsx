/**
 * ChallengeInviteModal
 * Story 6.6: Shown after signup to invite user to the Closet Safari challenge.
 * "Upload 20 items in 7 days" — Accept or Skip.
 */

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChallengeInviteModalProps {
    visible: boolean;
    onAccept: () => void;
    onSkip: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChallengeInviteModal({ visible, onAccept, onSkip }: ChallengeInviteModalProps) {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 60,
                    friction: 12,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 60,
                    friction: 12,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(SCREEN_HEIGHT);
            scaleAnim.setValue(0.8);
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [
                                { translateY: slideAnim },
                                { scale: scaleAnim },
                            ],
                        },
                    ]}
                >
                    {/* Safari Icon */}
                    <View style={styles.iconWrap}>
                        <Ionicons name="compass" size={48} color="#6366f1" />
                    </View>

                    <Text style={styles.title}>Closet Safari</Text>
                    <Text style={styles.subtitle}>Your first challenge awaits!</Text>

                    <View style={styles.detailsCard}>
                        <View style={styles.detailRow}>
                            <Ionicons name="camera-outline" size={20} color="#6366f1" />
                            <Text style={styles.detailText}>Upload 20 items to your wardrobe</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="time-outline" size={20} color="#6366f1" />
                            <Text style={styles.detailText}>Complete within 7 days</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="star-outline" size={20} color="#eab308" />
                            <Text style={styles.detailText}>Win 1 month of Premium free!</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="ribbon-outline" size={20} color="#6366f1" />
                            <Text style={styles.detailText}>Unlock the Safari Explorer badge</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.acceptButton} onPress={onAccept} activeOpacity={0.8}>
                        <Ionicons name="rocket-outline" size={20} color="#fff" />
                        <Text style={styles.acceptText}>Accept Challenge</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
                        <Text style={styles.skipText}>Maybe later</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
        alignItems: 'center',
    },
    iconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 3,
        borderColor: '#c7d2fe',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        color: '#6b7280',
        marginBottom: 24,
    },
    detailsCard: {
        width: '100%',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        gap: 14,
        marginBottom: 24,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailText: {
        fontSize: 15,
        color: '#374151',
        flex: 1,
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        backgroundColor: '#6366f1',
        borderRadius: 14,
        paddingVertical: 16,
        marginBottom: 12,
    },
    acceptText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    skipButton: {
        paddingVertical: 10,
    },
    skipText: {
        fontSize: 15,
        color: '#9ca3af',
        fontWeight: '500',
    },
});
