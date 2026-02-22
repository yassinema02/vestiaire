/**
 * OOTD Post Card
 * Displays a single OOTD post in the feed.
 * Story 9.3: OOTD Feed Display
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OotdPostWithAuthor } from '../../types/social';
import { formatRelativeTime } from '../../utils/formatTime';
import { ootdService } from '../../services/ootdService';

interface TaggedItem {
    id: string;
    name: string | null;
    category: string | null;
    image_url: string;
    processed_image_url: string | null;
}

interface OotdPostCardProps {
    post: OotdPostWithAuthor;
    squadName?: string;
    isReacted?: boolean;
    onPhotoPress: () => void;
    onItemPress: (itemId: string) => void;
    onReactionPress?: () => void;
    onCommentPress?: () => void;
    onStealLookPress?: () => void;
}

export default function OotdPostCard({ post, squadName, isReacted, onPhotoPress, onItemPress, onReactionPress, onCommentPress, onStealLookPress }: OotdPostCardProps) {
    const [taggedItems, setTaggedItems] = useState<TaggedItem[]>([]);

    useEffect(() => {
        if (post.tagged_item_ids && post.tagged_item_ids.length > 0) {
            ootdService.getItemsByIds(post.tagged_item_ids).then(({ items }) => {
                setTaggedItems(items);
            });
        }
    }, [post.tagged_item_ids]);

    const authorInitials = (post.author_display_name || '?')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{authorInitials}</Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.authorName}>
                        {post.author_display_name || 'Anonymous'}
                    </Text>
                    <Text style={styles.timestamp}>
                        {formatRelativeTime(post.created_at)}
                    </Text>
                </View>
                {squadName && (
                    <View style={styles.squadBadge}>
                        <Text style={styles.squadBadgeText} numberOfLines={1}>
                            {squadName}
                        </Text>
                    </View>
                )}
            </View>

            {/* Photo */}
            <TouchableOpacity onPress={onPhotoPress} activeOpacity={0.95}>
                <Image
                    source={{ uri: post.photo_url }}
                    style={styles.photo}
                />
            </TouchableOpacity>

            {/* Caption */}
            {post.caption && (
                <Text style={styles.caption} numberOfLines={3}>
                    {post.caption}
                </Text>
            )}

            {/* Tagged items */}
            {taggedItems.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.taggedRow}
                >
                    {taggedItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.taggedItem}
                            onPress={() => onItemPress(item.id)}
                        >
                            <Image
                                source={{ uri: item.processed_image_url || item.image_url }}
                                style={styles.taggedImage}
                            />
                            <Text style={styles.taggedName} numberOfLines={1}>
                                {item.name || item.category || 'Item'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* Engagement footer */}
            <View style={styles.engagementRow}>
                <TouchableOpacity
                    style={styles.engagementBtn}
                    onPress={onReactionPress}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.reactionEmoji, isReacted && styles.reactionEmojiActive]}>
                        🔥
                    </Text>
                    <Text style={[styles.engagementCount, isReacted && styles.engagementCountActive]}>
                        {post.reaction_count || 0}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.engagementBtn}
                    onPress={onCommentPress}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
                    <Text style={styles.engagementCount}>
                        {post.comment_count || 0}
                    </Text>
                </TouchableOpacity>

                {post.tagged_item_ids && post.tagged_item_ids.length > 0 && onStealLookPress && (
                    <TouchableOpacity
                        style={styles.stealBtn}
                        onPress={onStealLookPress}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="sparkles" size={14} color="#6366f1" />
                        <Text style={styles.stealBtnText}>Steal</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    avatarText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366f1',
    },
    headerInfo: {
        flex: 1,
    },
    authorName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    timestamp: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 1,
    },
    squadBadge: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        maxWidth: 120,
    },
    squadBadgeText: {
        fontSize: 11,
        color: '#6b7280',
        fontWeight: '500',
    },
    photo: {
        width: '100%',
        aspectRatio: 3 / 4,
        backgroundColor: '#f3f4f6',
    },
    caption: {
        fontSize: 14,
        color: '#374151',
        paddingHorizontal: 12,
        paddingTop: 10,
        lineHeight: 20,
    },
    taggedRow: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
    },
    taggedItem: {
        alignItems: 'center',
        width: 52,
    },
    taggedImage: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        marginBottom: 2,
    },
    taggedName: {
        fontSize: 10,
        color: '#6b7280',
        textAlign: 'center',
    },
    engagementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#f3f4f6',
    },
    engagementBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reactionEmoji: {
        fontSize: 18,
        opacity: 0.5,
    },
    reactionEmojiActive: {
        opacity: 1,
    },
    engagementCount: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    engagementCountActive: {
        color: '#6366f1',
        fontWeight: '600',
    },
    stealBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 'auto',
        backgroundColor: '#eef2ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    stealBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366f1',
    },
});
