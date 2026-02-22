/**
 * Squad Detail Screen
 * Shows squad info, member list, invite sharing, and admin actions.
 * Story 9.1: Style Squads Creation (Tasks 7 & 8)
 */

import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    Share,
    ActionSheetIOS,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSocialStore } from '../../stores/socialStore';
import { SquadMember, OotdPostWithAuthor } from '../../types/social';

function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export default function SquadDetailScreen() {
    const router = useRouter();
    const { squadId } = useLocalSearchParams<{ squadId: string }>();
    const { activeSquad, members, feedPosts, loadMembers, loadFeed, removeMember, leaveSquad, deleteSquad } = useSocialStore();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (squadId) {
                loadMembers(squadId);
                loadFeed(squadId);
            }
            // Get current user ID
            import('../../services/auth-helpers').then(({ requireUserId }) => {
                requireUserId().then(setCurrentUserId).catch(() => {});
            });
        }, [squadId])
    );

    const isAdmin = members.some(
        (m) => m.user_id === currentUserId && m.role === 'admin'
    );
    const isCreator = activeSquad?.creator_id === currentUserId;

    const handleShareCode = async () => {
        if (!activeSquad) return;
        try {
            await Share.share({
                message: `Join my Style Squad on Vestiaire! Use code: ${activeSquad.invite_code}`,
            });
        } catch {
            // User cancelled
        }
    };

    const handleCopyCode = async () => {
        if (!activeSquad) return;
        await Share.share({ message: `Join my Style Squad! Use code: ${activeSquad.invite_code}` });
    };

    const handleMemberPress = (member: SquadMember) => {
        if (!isAdmin || member.user_id === currentUserId) return;

        const memberName = member.display_name || 'this member';

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', `Remove ${memberName}`],
                    destructiveButtonIndex: 1,
                    cancelButtonIndex: 0,
                },
                async (buttonIndex) => {
                    if (buttonIndex === 1) {
                        await confirmRemoveMember(member);
                    }
                }
            );
        } else {
            Alert.alert(
                'Member Options',
                `Remove ${memberName} from the squad?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => confirmRemoveMember(member),
                    },
                ]
            );
        }
    };

    const confirmRemoveMember = async (member: SquadMember) => {
        if (!squadId) return;
        const { error } = await removeMember(squadId, member.user_id);
        if (error) {
            Alert.alert('Error', error);
        }
    };

    const handleLeaveSquad = () => {
        if (!squadId) return;
        Alert.alert('Leave Squad', 'Are you sure you want to leave this squad?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Leave',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await leaveSquad(squadId);
                    if (error) {
                        Alert.alert('Error', error);
                    } else {
                        router.back();
                    }
                },
            },
        ]);
    };

    const handleDeleteSquad = () => {
        if (!squadId) return;
        Alert.alert(
            'Delete Squad',
            'This will permanently delete the squad and remove all members. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await deleteSquad(squadId);
                        if (error) {
                            Alert.alert('Error', error);
                        } else {
                            router.back();
                        }
                    },
                },
            ]
        );
    };

    const renderMember = (member: SquadMember) => {
        const initials = (member.display_name || '?')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        return (
            <TouchableOpacity
                key={member.id}
                style={styles.memberRow}
                onLongPress={() => handleMemberPress(member)}
                disabled={!isAdmin || member.user_id === currentUserId}
                activeOpacity={isAdmin && member.user_id !== currentUserId ? 0.6 : 1}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                        {member.display_name || 'Anonymous'}
                        {member.user_id === currentUserId ? ' (You)' : ''}
                    </Text>
                </View>
                {member.role === 'admin' && (
                    <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (!activeSquad) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/social')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {activeSquad.name}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleShareCode} style={styles.backButton}>
                    <Ionicons name="share-outline" size={22} color="#6366f1" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Squad info */}
                <View style={styles.infoCard}>
                    {activeSquad.description && (
                        <Text style={styles.description}>{activeSquad.description}</Text>
                    )}
                    <Text style={styles.memberCount}>
                        {members.length}/{activeSquad.max_members} members
                    </Text>
                </View>

                {/* Invite code section */}
                <View style={styles.inviteCard}>
                    <Text style={styles.inviteLabel}>Invite Code</Text>
                    <Text style={styles.inviteCode}>{activeSquad.invite_code}</Text>
                    <View style={styles.inviteActions}>
                        <TouchableOpacity style={styles.inviteAction} onPress={handleCopyCode}>
                            <Ionicons name="copy-outline" size={18} color="#6366f1" />
                            <Text style={styles.inviteActionText}>Copy Code</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.inviteAction} onPress={handleShareCode}>
                            <Ionicons name="chatbubble-outline" size={18} color="#6366f1" />
                            <Text style={styles.inviteActionText}>Share via SMS</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Members section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Members</Text>
                    <Text style={styles.sectionCount}>{members.length}</Text>
                </View>

                {members.map(renderMember)}

                {/* Recent Posts */}
                {feedPosts.length > 0 && (
                    <>
                        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                            <Text style={styles.sectionTitle}>Recent Posts</Text>
                            <Text style={styles.sectionCount}>{feedPosts.length}</Text>
                        </View>
                        {feedPosts.map((post) => {
                            const authorInitials = (post.author_display_name || '?')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2);
                            const timeAgo = getTimeAgo(post.created_at);
                            return (
                                <View key={post.id} style={styles.postCard}>
                                    <View style={styles.postHeader}>
                                        <View style={styles.postAvatar}>
                                            <Text style={styles.postAvatarText}>{authorInitials}</Text>
                                        </View>
                                        <View style={styles.postAuthorInfo}>
                                            <Text style={styles.postAuthorName}>
                                                {post.author_display_name || 'Anonymous'}
                                            </Text>
                                            <Text style={styles.postTime}>{timeAgo}</Text>
                                        </View>
                                    </View>
                                    <Image
                                        source={{ uri: post.photo_url }}
                                        style={styles.postImage}
                                    />
                                    {post.caption && (
                                        <Text style={styles.postCaption}>{post.caption}</Text>
                                    )}
                                </View>
                            );
                        })}
                    </>
                )}

                {/* Actions */}
                <View style={styles.actionsSection}>
                    {!isCreator && (
                        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveSquad}>
                            <Ionicons name="exit-outline" size={20} color="#ef4444" />
                            <Text style={styles.leaveButtonText}>Leave Squad</Text>
                        </TouchableOpacity>
                    )}
                    {isCreator && (
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSquad}>
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            <Text style={styles.deleteButtonText}>Delete Squad</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
        paddingTop: 60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },

    // Info card
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    description: {
        fontSize: 15,
        color: '#4b5563',
        marginBottom: 8,
        lineHeight: 20,
    },
    memberCount: {
        fontSize: 13,
        color: '#9ca3af',
        fontWeight: '500',
    },

    // Invite card
    inviteCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    inviteLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
        marginBottom: 8,
    },
    inviteCode: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#6366f1',
        letterSpacing: 4,
        marginBottom: 16,
    },
    inviteActions: {
        flexDirection: 'row',
        gap: 16,
    },
    inviteAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#eef2ff',
    },
    inviteActionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6366f1',
    },

    // Members section
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    sectionCount: {
        backgroundColor: '#eef2ff',
        color: '#6366f1',
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6366f1',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
    },
    adminBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    adminBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#d97706',
    },

    // Actions
    actionsSection: {
        marginTop: 24,
        gap: 12,
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#fef2f2',
    },
    leaveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ef4444',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#fef2f2',
    },
    deleteButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ef4444',
    },

    // Posts
    postCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    postAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    postAvatarText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366f1',
    },
    postAuthorInfo: {
        flex: 1,
    },
    postAuthorName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    postTime: {
        fontSize: 11,
        color: '#9ca3af',
    },
    postImage: {
        width: '100%',
        aspectRatio: 3 / 4,
        backgroundColor: '#f3f4f6',
    },
    postCaption: {
        fontSize: 14,
        color: '#374151',
        padding: 12,
        lineHeight: 20,
    },
});
