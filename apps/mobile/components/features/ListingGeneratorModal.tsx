/**
 * ListingGeneratorModal
 * Story 7.2: AI Listing Generator
 * Bottom sheet modal for generating and editing Vinted resale listings.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Clipboard,
    Alert,
    Linking,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeItem } from '../../services/items';
import { listingService, ListingTone, ListingData } from '../../services/listingService';

interface ListingGeneratorModalProps {
    visible: boolean;
    item: WardrobeItem;
    onDismiss: () => void;
}

const TONES: { key: ListingTone; label: string; icon: string }[] = [
    { key: 'casual', label: 'Casual', icon: 'chatbubble-outline' },
    { key: 'detailed', label: 'Detailed', icon: 'document-text-outline' },
    { key: 'minimal', label: 'Minimal', icon: 'remove-outline' },
];

export default function ListingGeneratorModal({ visible, item, onDismiss }: ListingGeneratorModalProps) {
    const [tone, setTone] = useState<ListingTone>('casual');
    const [isGenerating, setIsGenerating] = useState(false);
    const [listing, setListing] = useState<ListingData | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [fromAI, setFromAI] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (visible) {
            setListing(null);
            setEditTitle('');
            setEditDescription('');
            setCopied(false);
            handleGenerate('casual');
        }
    }, [visible, item.id]);

    const handleGenerate = async (selectedTone: ListingTone) => {
        setTone(selectedTone);
        setIsGenerating(true);
        setCopied(false);

        const { listing: result, fromAI: ai } = await listingService.generateListing(item, selectedTone);

        if (result) {
            setListing(result);
            setEditTitle(result.title);
            setEditDescription(result.description);
            setFromAI(ai);
        }

        setIsGenerating(false);
    };

    const handleCopyAll = () => {
        const hashtagStr = listing?.hashtags?.join(' ') || '';
        const fullText = `${editTitle}\n\n${editDescription}${hashtagStr ? `\n\n${hashtagStr}` : ''}`;
        Clipboard.setString(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleOpenVinted = async () => {
        // Try deep link first, then fall back to web
        const vintedDeepLink = 'vinted://sell';
        const vintedWeb = 'https://www.vinted.com/items/new';

        try {
            const canOpen = await Linking.canOpenURL(vintedDeepLink);
            if (canOpen) {
                await Linking.openURL(vintedDeepLink);
            } else {
                await Linking.openURL(vintedWeb);
            }
        } catch {
            await Linking.openURL(vintedWeb);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss} />

                <View style={styles.sheet}>
                    {/* Handle */}
                    <View style={styles.handleBar} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Ionicons name="pricetag" size={20} color="#22c55e" />
                            <Text style={styles.headerTitle}>Generate Listing</Text>
                        </View>
                        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Tone Selector */}
                    <View style={styles.toneRow}>
                        {TONES.map((t) => (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.toneButton, tone === t.key && styles.toneButtonActive]}
                                onPress={() => handleGenerate(t.key)}
                                disabled={isGenerating}
                            >
                                <Ionicons
                                    name={t.icon as any}
                                    size={16}
                                    color={tone === t.key ? '#fff' : '#6b7280'}
                                />
                                <Text style={[styles.toneText, tone === t.key && styles.toneTextActive]}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {isGenerating ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#6366f1" />
                                <Text style={styles.loadingText}>Writing your listing...</Text>
                                <Text style={styles.loadingSubtext}>This takes a few seconds</Text>
                            </View>
                        ) : listing ? (
                            <>
                                {/* AI badge */}
                                {fromAI && (
                                    <View style={styles.aiBadge}>
                                        <Ionicons name="sparkles" size={14} color="#6366f1" />
                                        <Text style={styles.aiBadgeText}>AI Generated</Text>
                                    </View>
                                )}

                                {/* Title */}
                                <Text style={styles.fieldLabel}>Title</Text>
                                <TextInput
                                    style={styles.titleInput}
                                    value={editTitle}
                                    onChangeText={setEditTitle}
                                    maxLength={50}
                                    placeholder="Listing title"
                                    placeholderTextColor="#9ca3af"
                                />
                                <Text style={styles.charCount}>{editTitle.length}/50</Text>

                                {/* Description */}
                                <Text style={styles.fieldLabel}>Description</Text>
                                <TextInput
                                    style={styles.descriptionInput}
                                    value={editDescription}
                                    onChangeText={setEditDescription}
                                    multiline
                                    textAlignVertical="top"
                                    placeholder="Listing description"
                                    placeholderTextColor="#9ca3af"
                                />

                                {/* Price Range */}
                                {listing.suggested_price_range ? (
                                    <View style={styles.priceRow}>
                                        <Ionicons name="cash-outline" size={16} color="#22c55e" />
                                        <Text style={styles.priceLabel}>Suggested price:</Text>
                                        <Text style={styles.priceValue}>{listing.suggested_price_range}</Text>
                                    </View>
                                ) : null}

                                {/* Hashtags */}
                                {listing.hashtags?.length > 0 && (
                                    <View style={styles.hashtagsContainer}>
                                        <Text style={styles.fieldLabel}>Hashtags</Text>
                                        <View style={styles.hashtagsRow}>
                                            {listing.hashtags.map((tag, i) => (
                                                <View key={i} style={styles.hashtagChip}>
                                                    <Text style={styles.hashtagText}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Actions */}
                                <View style={styles.actionsRow}>
                                    <TouchableOpacity
                                        style={[styles.copyButton, copied && styles.copyButtonDone]}
                                        onPress={handleCopyAll}
                                    >
                                        <Ionicons
                                            name={copied ? 'checkmark' : 'copy-outline'}
                                            size={18}
                                            color="#fff"
                                        />
                                        <Text style={styles.copyButtonText}>
                                            {copied ? 'Copied!' : 'Copy All'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.vintedButton} onPress={handleOpenVinted}>
                                        <Ionicons name="open-outline" size={18} color="#09B1BA" />
                                        <Text style={styles.vintedButtonText}>Open Vinted</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={{ height: 24 }} />
                            </>
                        ) : null}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#d1d5db',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
    },
    // Tone selector
    toneRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
        marginBottom: 16,
    },
    toneButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    toneButtonActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    toneText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
    },
    toneTextActive: {
        color: '#fff',
    },
    // Content
    scrollContent: {
        paddingHorizontal: 20,
    },
    // Loading
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 16,
    },
    loadingSubtext: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 4,
    },
    // AI badge
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: '#eef2ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 14,
    },
    aiBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366f1',
    },
    // Fields
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    titleInput: {
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    charCount: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'right',
        marginTop: 4,
        marginBottom: 14,
    },
    descriptionInput: {
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1f2937',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minHeight: 120,
        marginBottom: 14,
    },
    // Price
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 14,
    },
    priceLabel: {
        fontSize: 14,
        color: '#374151',
    },
    priceValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#16a34a',
    },
    // Hashtags
    hashtagsContainer: {
        marginBottom: 16,
    },
    hashtagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    hashtagChip: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    hashtagText: {
        fontSize: 13,
        color: '#6366f1',
        fontWeight: '500',
    },
    // Actions
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    copyButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#6366f1',
        paddingVertical: 14,
        borderRadius: 12,
    },
    copyButtonDone: {
        backgroundColor: '#22c55e',
    },
    copyButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    vintedButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#f0fdfa',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#99f6e4',
    },
    vintedButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#09B1BA',
    },
});
