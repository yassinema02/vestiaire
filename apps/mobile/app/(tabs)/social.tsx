/**
 * Social Tab
 * Shows OOTD feed with squad filter chips and squad management.
 * Story 9.1: Style Squads Creation
 * Story 9.2: OOTD Posting Flow
 * Story 9.3: OOTD Feed Display
 */

import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Animated,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSocialStore } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import { StyleSquad, OotdPostWithAuthor } from '../../types/social';
import OotdPostCard from '../../components/features/OotdPostCard';
import PhotoViewer from '../../components/features/PhotoViewer';
import CommentSheet from '../../components/features/CommentSheet';

export default function SocialScreen() {
    const router = useRouter();
    const {
        squads,
        isLoading,
        loadMySquads,
        feedPosts,
        isFeedLoading,
        activeFilter,
        setFeedFilter,
        loadFeed,
        postReactions,
        loadReactionStates,
        toggleReaction,
    } = useSocialStore();

    const currentUserId = useAuthStore((s) => s.user?.id) || '';

    const [refreshing, setRefreshing] = useState(false);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerPost, setViewerPost] = useState<OotdPostWithAuthor | null>(null);
    const [commentSheetPost, setCommentSheetPost] = useState<OotdPostWithAuthor | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadMySquads();
            loadFeed(activeFilter || undefined).then(() => {
                const postIds = useSocialStore.getState().feedPosts.map((p) => p.id);
                if (postIds.length > 0) loadReactionStates(postIds);
            });
        }, [])
    );

    const handlePostOotd = () => {
        router.push('/(tabs)/create-ootd');
    };

    const handleCreateSquad = () => {
        router.push('/(tabs)/create-squad');
    };

    const handleJoinSquad = () => {
        router.push('/(tabs)/join-squad');
    };

    const handleSquadPress = (squad: StyleSquad) => {
        useSocialStore.getState().setActiveSquad(squad);
        router.push(`/(tabs)/squad-detail?squadId=${squad.id}`);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            loadMySquads(),
            loadFeed(activeFilter || undefined),
        ]);
        setRefreshing(false);
    };

    const handlePhotoPress = (post: OotdPostWithAuthor) => {
        setViewerPost(post);
        setViewerVisible(true);
    };

    const handleItemPress = (itemId: string) => {
        router.push(`/(tabs)/item-detail?id=${itemId}`);
    };

    const handleReactionPress = (postId: string) => {
        toggleReaction(postId);
    };

    const handleCommentPress = (post: OotdPostWithAuthor) => {
        setCommentSheetPost(post);
    };

    const handleStealLookPress = async (post: OotdPostWithAuthor) => {
        router.push({
            pathname: '/(tabs)/steal-look',
            params: {
                postId: post.id,
                authorName: post.author_display_name || '',
                photoUrl: post.photo_url,
            },
        });
        useSocialStore.getState().analyzeLook(post);
    };

    const getSquadName = (squadId: string): string | undefined => {
        return squads.find((s) => s.id === squadId)?.name;
    };

    // --- Sub-components ---

    const renderFilterChips = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
        >
            <TouchableOpacity
                style={[styles.filterChip, !activeFilter && styles.filterChipActive]}
                onPress={() => setFeedFilter(null)}
            >
                <Text style={[styles.filterChipText, !activeFilter && styles.filterChipTextActive]}>
                    All
                </Text>
            </TouchableOpacity>
            {squads.map((squad) => (
                <TouchableOpacity
                    key={squad.id}
                    style={[styles.filterChip, activeFilter === squad.id && styles.filterChipActive]}
                    onPress={() => setFeedFilter(squad.id)}
                >
                    <Text
                        style={[styles.filterChipText, activeFilter === squad.id && styles.filterChipTextActive]}
                        numberOfLines={1}
                    >
                        {squad.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderSquadRow = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.squadRow}
        >
            {squads.map((squad) => (
                <TouchableOpacity
                    key={squad.id}
                    style={styles.squadChip}
                    onPress={() => handleSquadPress(squad)}
                >
                    <View style={styles.squadChipIcon}>
                        <Ionicons name="people" size={16} color="#6366f1" />
                    </View>
                    <Text style={styles.squadChipName} numberOfLines={1}>
                        {squad.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
                </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.squadChipAdd} onPress={handleJoinSquad}>
                <Ionicons name="enter-outline" size={16} color="#6366f1" />
                <Text style={styles.squadChipAddText}>Join</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderSkeletonCard = (index: number) => (
        <View key={`skeleton-${index}`} style={styles.skeletonCard}>
            <View style={styles.skeletonHeader}>
                <View style={styles.skeletonAvatar} />
                <View style={styles.skeletonNameCol}>
                    <View style={styles.skeletonName} />
                    <View style={styles.skeletonTime} />
                </View>
            </View>
            <View style={styles.skeletonPhoto} />
            <View style={styles.skeletonCaption} />
        </View>
    );

    const renderEmptyFeed = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="camera-outline" size={48} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No posts yet!</Text>
            <Text style={styles.emptySubtitle}>
                Be the first to share your outfit of the day
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handlePostOotd}>
                <Ionicons name="camera" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyButtonText}>Post OOTD</Text>
            </TouchableOpacity>
        </View>
    );

    const renderNoSquads = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={48} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No squads yet!</Text>
            <Text style={styles.emptySubtitle}>
                Create or join a Style Squad to share outfits with friends
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateSquad}>
                <Text style={styles.emptyButtonText}>Create Style Squad</Text>
            </TouchableOpacity>
        </View>
    );

    const renderPostCard = ({ item }: { item: OotdPostWithAuthor }) => (
        <OotdPostCard
            post={item}
            squadName={getSquadName(item.squad_id)}
            isReacted={postReactions[item.id] || false}
            onPhotoPress={() => handlePhotoPress(item)}
            onItemPress={handleItemPress}
            onReactionPress={() => handleReactionPress(item.id)}
            onCommentPress={() => handleCommentPress(item)}
            onStealLookPress={() => handleStealLookPress(item)}
        />
    );

    const renderListHeader = () => (
        <View>
            {/* Compact squad row */}
            {squads.length > 0 && renderSquadRow()}

            {/* Filter chips */}
            {squads.length > 0 && renderFilterChips()}
        </View>
    );

    // --- Main render ---

    // No squads at all — show onboarding empty state
    if (!isLoading && squads.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Style Squads</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.headerBtn} onPress={handleCreateSquad}>
                            <Ionicons name="add" size={22} color="#6366f1" />
                        </TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity style={styles.joinBar} onPress={handleJoinSquad}>
                    <Ionicons name="enter-outline" size={20} color="#6366f1" />
                    <Text style={styles.joinBarText}>Join with Code</Text>
                </TouchableOpacity>
                {renderNoSquads()}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Style Squads</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn} onPress={handlePostOotd}>
                        <Ionicons name="camera" size={20} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleCreateSquad}>
                        <Ionicons name="add" size={22} color="#6366f1" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Feed */}
            {isFeedLoading && feedPosts.length === 0 ? (
                <FlatList
                    data={[]}
                    renderItem={null}
                    ListHeaderComponent={renderListHeader}
                    ListFooterComponent={
                        <View style={styles.feedPadding}>
                            {[0, 1, 2].map(renderSkeletonCard)}
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.feedContainer}
                />
            ) : (
                <FlatList
                    data={feedPosts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPostCard}
                    ListHeaderComponent={renderListHeader}
                    ListEmptyComponent={renderEmptyFeed}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#6366f1"
                            colors={['#6366f1']}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.feedContainer}
                    removeClippedSubviews
                />
            )}

            {/* Full-screen photo viewer */}
            <PhotoViewer
                visible={viewerVisible}
                photoUrl={viewerPost?.photo_url || ''}
                authorName={viewerPost?.author_display_name || undefined}
                caption={viewerPost?.caption}
                onClose={() => setViewerVisible(false)}
            />

            {/* Comment sheet */}
            <CommentSheet
                visible={!!commentSheetPost}
                postId={commentSheetPost?.id || ''}
                postAuthorId={commentSheetPost?.user_id || ''}
                currentUserId={currentUserId}
                commentCount={commentSheetPost?.comment_count || 0}
                onClose={() => setCommentSheetPost(null)}
            />
        </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Join bar (no-squads state)
    joinBar: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginLeft: 24,
        marginBottom: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 6,
    },
    joinBarText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },

    // Compact squad row
    squadRow: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
        gap: 8,
    },
    squadChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    squadChipIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    squadChipName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#1f2937',
        maxWidth: 100,
    },
    squadChipAdd: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
        gap: 4,
    },
    squadChipAddText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6366f1',
    },

    // Filter chips
    filterRow: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    filterChipActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    filterChipTextActive: {
        color: '#fff',
    },

    // Feed
    feedContainer: {
        paddingBottom: 100,
    },
    feedPadding: {
        paddingHorizontal: 16,
    },

    // Skeleton
    skeletonCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
    },
    skeletonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    skeletonAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        marginRight: 8,
    },
    skeletonNameCol: {
        flex: 1,
    },
    skeletonName: {
        width: 100,
        height: 12,
        borderRadius: 4,
        backgroundColor: '#f3f4f6',
        marginBottom: 4,
    },
    skeletonTime: {
        width: 50,
        height: 10,
        borderRadius: 4,
        backgroundColor: '#f3f4f6',
    },
    skeletonPhoto: {
        width: '100%',
        aspectRatio: 3 / 4,
        backgroundColor: '#f3f4f6',
    },
    skeletonCaption: {
        marginHorizontal: 12,
        marginVertical: 10,
        height: 14,
        width: '60%',
        borderRadius: 4,
        backgroundColor: '#f3f4f6',
    },

    // Empty states
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    emptyIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});
