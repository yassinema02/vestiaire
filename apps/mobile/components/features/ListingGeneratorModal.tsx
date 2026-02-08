/**
 * ListingGeneratorModal
 * Story 7.2 + 7.3: AI Listing Generator with Copy, Share & Image Save
 * Bottom sheet modal for generating, editing, and sharing Vinted resale listings.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Linking,
    Clipboard,
    Share,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WardrobeItem } from '../../services/items';
import { listingService, ListingTone, ListingData } from '../../services/listingService';
import { usageLimitsService, UsageLimitStatus } from '../../services/usageLimitsService';
import PaywallModal from '../PaywallModal';

const TOOLTIP_STORAGE_KEY = 'listing_tooltip_shown';

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

function formatListingText(
    title: string,
    description: string,
    item: WardrobeItem,
    hashtags: string[]
): string {
    const lines = [title, '', description, ''];

    if (item.category) lines.push(`Category: ${item.category}${item.sub_category ? ` / ${item.sub_category}` : ''}`);
    if (item.brand) lines.push(`Brand: ${item.brand}`);

    const condition =
        item.wear_count === 0
            ? 'New without tags'
            : item.wear_count < 5
                ? 'Like new'
                : 'Good condition';
    lines.push(`Condition: ${condition}`);

    if (hashtags.length > 0) {
        lines.push('', hashtags.join(' '));
    }

    return lines.join('\n');
}

export default function ListingGeneratorModal({ visible, item, onDismiss }: ListingGeneratorModalProps) {
    const [tone, setTone] = useState<ListingTone>('casual');
    const [isGenerating, setIsGenerating] = useState(false);
    const [listing, setListing] = useState<ListingData | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [fromAI, setFromAI] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imageSaved, setImageSaved] = useState(false);
    const [isSavingImage, setIsSavingImage] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipOpacity] = useState(new Animated.Value(0));
    const [limitStatus, setLimitStatus] = useState<UsageLimitStatus | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);

    useEffect(() => {
        if (visible) {
            setListing(null);
            setEditTitle('');
            setEditDescription('');
            setCopied(false);
            setImageSaved(false);
            handleGenerate('casual');
            checkFirstUse();
        }
    }, [visible, item.id]);

    const checkFirstUse = async () => {
        try {
            const shown = await AsyncStorage.getItem(TOOLTIP_STORAGE_KEY);
            if (!shown) {
                setShowTooltip(true);
                Animated.timing(tooltipOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }
        } catch {}
    };

    const dismissTooltip = async () => {
        Animated.timing(tooltipOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setShowTooltip(false));
        try {
            await AsyncStorage.setItem(TOOLTIP_STORAGE_KEY, 'true');
        } catch {}
    };

    const handleGenerate = async (selectedTone: ListingTone) => {
        setTone(selectedTone);
        setIsGenerating(true);
        setCopied(false);

        // Check usage limit before generating
        try {
            const status = await usageLimitsService.checkResaleListingLimit();
            setLimitStatus(status);

            if (!status.allowed) {
                setShowPaywall(true);
                setIsGenerating(false);
                return;
            }
        } catch {
            // Fail silently — don't block generation
        }

        const { listing: result, fromAI: ai } = await listingService.generateListing(item, selectedTone);

        if (result) {
            setListing(result);
            setEditTitle(result.title);
            setEditDescription(result.description);
            setFromAI(ai);
            // Save to listing history
            listingService.saveToHistory(item, result).catch(() => {});
            // Increment counter after successful generation
            try {
                await usageLimitsService.incrementResaleListings();
                const updated = await usageLimitsService.checkResaleListingLimit();
                setLimitStatus(updated);
            } catch {}
        }

        setIsGenerating(false);
    };

    const getFullListingText = useCallback(() => {
        if (!listing) return '';
        return formatListingText(editTitle, editDescription, item, listing.hashtags || []);
    }, [editTitle, editDescription, item, listing]);

    const handleCopyAll = () => {
        const fullText = getFullListingText();
        Clipboard.setString(fullText);
        setCopied(true);
        if (showTooltip) dismissTooltip();
        setTimeout(() => setCopied(false), 2500);
    };

    const handleShare = async () => {
        const fullText = getFullListingText();
        try {
            await Share.share({
                message: fullText,
                title: editTitle,
            });
        } catch {}
    };

    const handleSaveImage = async () => {
        const imageUrl = item.processed_image_url || item.image_url;
        if (!imageUrl) {
            Alert.alert('No Image', 'This item does not have an image to save.');
            return;
        }

        setIsSavingImage(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please allow access to your photo library to save listing images.',
                    [{ text: 'OK' }]
                );
                setIsSavingImage(false);
                return;
            }

            const fileUri = cacheDirectory + `listing_${item.id}.jpg`;
            const result = await downloadAsync(imageUrl, fileUri);
            await MediaLibrary.saveToLibraryAsync(result.uri);

            setImageSaved(true);
            setTimeout(() => setImageSaved(false), 2500);
        } catch (err) {
            console.error('Failed to save image:', err);
            Alert.alert('Error', 'Failed to save image. Please try again.');
        } finally {
            setIsSavingImage(false);
        }
    };

    const handleOpenVinted = async () => {
        // Copy listing first so it's ready to paste
        handleCopyAll();

        const vintedDeepLink = 'vinted://sell';
        const vintedWeb = 'https://www.vinted.co.uk/items/new';

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
                            {limitStatus && !limitStatus.isPremium && (
                                <View style={styles.usageCounter}>
                                    <Text style={styles.usageCounterText}>
                                        {limitStatus.used}/{limitStatus.limit}
                                    </Text>
                                </View>
                            )}
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
                                {/* First-use tutorial tooltip */}
                                {showTooltip && (
                                    <Animated.View style={[styles.tooltip, { opacity: tooltipOpacity }]}>
                                        <View style={styles.tooltipContent}>
                                            <Ionicons name="bulb-outline" size={18} color="#f59e0b" />
                                            <Text style={styles.tooltipText}>
                                                Tap "Copy & Open Vinted" to copy your listing, then paste it directly into Vinted's description field!
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={dismissTooltip} style={styles.tooltipDismiss}>
                                            <Text style={styles.tooltipDismissText}>Got it</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                )}

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

                                {/* Primary Actions */}
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
                                        <Text style={styles.vintedButtonText}>
                                            {copied ? 'Open Vinted' : 'Copy & Open Vinted'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Secondary Actions */}
                                <View style={styles.secondaryActionsRow}>
                                    <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
                                        <Ionicons name="share-outline" size={18} color="#6b7280" />
                                        <Text style={styles.secondaryButtonText}>Share</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.secondaryButton}
                                        onPress={handleSaveImage}
                                        disabled={isSavingImage}
                                    >
                                        {isSavingImage ? (
                                            <ActivityIndicator size="small" color="#6b7280" />
                                        ) : (
                                            <Ionicons
                                                name={imageSaved ? 'checkmark-circle' : 'image-outline'}
                                                size={18}
                                                color={imageSaved ? '#22c55e' : '#6b7280'}
                                            />
                                        )}
                                        <Text
                                            style={[
                                                styles.secondaryButtonText,
                                                imageSaved && { color: '#22c55e' },
                                            ]}
                                        >
                                            {imageSaved ? 'Saved!' : 'Save Photo'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Success toast */}
                                {copied && (
                                    <View style={styles.successToast}>
                                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                                        <Text style={styles.successToastText}>
                                            Copied! Ready to paste in Vinted
                                        </Text>
                                    </View>
                                )}

                                <View style={{ height: 24 }} />
                            </>
                        ) : null}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            <PaywallModal
                visible={showPaywall}
                onDismiss={() => setShowPaywall(false)}
                feature="resale_listings"
                used={limitStatus?.used ?? 0}
                limit={limitStatus?.limit ?? 2}
                resetAt={limitStatus?.resetAt ?? null}
            />
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
    usageCounter: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    usageCounterText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6366f1',
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
    // Tooltip
    tooltip: {
        backgroundColor: '#fffbeb',
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    tooltipContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    tooltipText: {
        flex: 1,
        fontSize: 13,
        color: '#92400e',
        lineHeight: 19,
    },
    tooltipDismiss: {
        alignSelf: 'flex-end',
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: '#fef3c7',
        borderRadius: 8,
    },
    tooltipDismissText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#92400e',
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
    // Primary actions
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
        fontSize: 14,
        fontWeight: '600',
        color: '#09B1BA',
    },
    // Secondary actions
    secondaryActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#f9fafb',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    // Success toast
    successToast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    successToastText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#16a34a',
    },
});
