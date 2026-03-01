/**
 * ResalePromptCard
 * Story 13.2: Individual resale prompt card for a neglected item.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResalePrompt } from '../../services/resalePromptService';
import { formatNeglectedLabel } from '../../utils/neglectedItems';

interface ResalePromptCardProps {
    prompt: ResalePrompt;
    onDismiss: (itemId: string) => void;
    onCreateListing: (itemId: string) => void;
}

export default function ResalePromptCard({ prompt, onDismiss, onCreateListing }: ResalePromptCardProps) {
    const { item, estimatedPrice } = prompt;
    const name = item.name || item.category || 'Item';

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons name="cash-outline" size={18} color="#f59e0b" />
                <Text style={styles.headerTitle}>Time to sell?</Text>
            </View>

            {/* Item info row */}
            <View style={styles.itemRow}>
                <Image
                    source={{ uri: item.processed_image_url || item.image_url }}
                    style={styles.thumbnail}
                />
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.itemLabel}>{formatNeglectedLabel(item)}</Text>
                    <Text style={styles.priceText}>Estimated: £{estimatedPrice}</Text>
                </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={() => onDismiss(item.id)}
                >
                    <Text style={styles.dismissText}>I'll Keep It</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.listingButton}
                    onPress={() => onCreateListing(item.id)}
                >
                    <Text style={styles.listingText}>Create Listing</Text>
                    <Ionicons name="chevron-forward" size={14} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#F5F0E8',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#5D4E37',
    },
    itemRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    thumbnail: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#e5e0d8',
    },
    itemInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#5D4E37',
        marginBottom: 2,
    },
    itemLabel: {
        fontSize: 13,
        color: '#8b7e6a',
        marginBottom: 2,
    },
    priceText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#16a34a',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    dismissButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#c4b9a8',
        alignItems: 'center',
    },
    dismissText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#5D4E37',
    },
    listingButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    listingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
