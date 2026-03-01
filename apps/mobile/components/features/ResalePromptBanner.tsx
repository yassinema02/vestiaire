/**
 * ResalePromptBanner
 * Story 13.2: Compact expandable banner for home screen showing resale prompts.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResalePrompt } from '../../services/resalePromptService';
import ResalePromptCard from './ResalePromptCard';

interface ResalePromptBannerProps {
    prompts: ResalePrompt[];
    onDismiss: (itemId: string) => void;
    onCreateListing: (itemId: string) => void;
    onDismissAll: () => void;
}

export default function ResalePromptBanner({
    prompts,
    onDismiss,
    onCreateListing,
    onDismissAll,
}: ResalePromptBannerProps) {
    const [expanded, setExpanded] = useState(false);

    if (prompts.length === 0) return null;

    const topItem = prompts[0].item;

    return (
        <View style={styles.container}>
            {/* Compact banner */}
            <TouchableOpacity
                style={styles.banner}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <View style={styles.bannerLeft}>
                    <Ionicons name="cash-outline" size={20} color="#f59e0b" />
                    <Image
                        source={{ uri: topItem.processed_image_url || topItem.image_url }}
                        style={styles.bannerThumb}
                    />
                    <Text style={styles.bannerText}>
                        {prompts.length} item{prompts.length !== 1 ? 's' : ''} ready to sell
                    </Text>
                </View>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#8b7e6a"
                />
            </TouchableOpacity>

            {/* Expanded cards */}
            {expanded && (
                <View style={styles.expandedSection}>
                    {prompts.map((prompt) => (
                        <ResalePromptCard
                            key={prompt.item.id}
                            prompt={prompt}
                            onDismiss={onDismiss}
                            onCreateListing={onCreateListing}
                        />
                    ))}
                    {prompts.length > 1 && (
                        <TouchableOpacity
                            style={styles.dismissAllButton}
                            onPress={onDismissAll}
                        >
                            <Text style={styles.dismissAllText}>Dismiss All</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F5F0E8',
        borderRadius: 12,
        padding: 12,
    },
    bannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bannerThumb: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#e5e0d8',
    },
    bannerText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5D4E37',
    },
    expandedSection: {
        marginTop: 10,
        gap: 10,
    },
    dismissAllButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    dismissAllText: {
        fontSize: 13,
        color: '#8b7e6a',
        fontWeight: '500',
    },
});
