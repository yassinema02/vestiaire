/**
 * Comment Bottom Sheet
 * Displays comments on an OOTD post with input bar.
 * Story 9.4: Reactions & Comments
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActionSheetIOS,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OotdCommentWithAuthor } from '../../types/social';
import { formatRelativeTime } from '../../utils/formatTime';
import { useSocialStore } from '../../stores/socialStore';

interface CommentSheetProps {
    visible: boolean;
    postId: string;
    postAuthorId: string;
    currentUserId: string;
    commentCount: number;
    onClose: () => void;
}

export default function CommentSheet({
    visible,
    postId,
    postAuthorId,
    currentUserId,
    commentCount,
    onClose,
}: CommentSheetProps) {
    const [inputText, setInputText] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const { postComments, loadComments, addComment, deleteComment } = useSocialStore();
    const comments = postComments[postId] || [];

    useEffect(() => {
        if (visible && postId) {
            loadComments(postId);
        }
    }, [visible, postId]);

    const handlePost = async () => {
        if (!inputText.trim() || isPosting) return;

        setIsPosting(true);
        const { error } = await addComment(postId, inputText);
        setIsPosting(false);

        if (!error) {
            setInputText('');
        }
    };

    const handleDeleteComment = (comment: OotdCommentWithAuthor) => {
        const canDelete = comment.user_id === currentUserId || postAuthorId === currentUserId;
        if (!canDelete) return;

        const doDelete = () => {
            deleteComment(postId, comment.id);
        };

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Delete Comment'],
                    destructiveButtonIndex: 1,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) doDelete();
                }
            );
        } else {
            Alert.alert('Delete Comment', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete },
            ]);
        }
    };

    const getInitials = (name: string | null) =>
        (name || '?')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

    const renderComment = ({ item }: { item: OotdCommentWithAuthor }) => {
        const canDelete = item.user_id === currentUserId || postAuthorId === currentUserId;

        return (
            <TouchableOpacity
                style={styles.commentItem}
                onLongPress={() => canDelete && handleDeleteComment(item)}
                activeOpacity={canDelete ? 0.7 : 1}
                delayLongPress={500}
            >
                <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                        {getInitials(item.author_display_name)}
                    </Text>
                </View>
                <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>
                            {item.author_display_name || 'Anonymous'}
                        </Text>
                        <Text style={styles.commentTime}>
                            {formatRelativeTime(item.created_at)}
                        </Text>
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.handle} />
                    <View style={styles.headerRow}>
                        <Text style={styles.headerTitle}>
                            Comments ({commentCount})
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6b7280" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Comment list */}
                <FlatList
                    data={comments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderComment}
                    contentContainerStyle={styles.commentList}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No comments yet</Text>
                            <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />

                {/* Input bar */}
                <View style={styles.inputBar}>
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder="Add a comment..."
                        placeholderTextColor="#9ca3af"
                        value={inputText}
                        onChangeText={(t) => setInputText(t.slice(0, 200))}
                        maxLength={200}
                        multiline
                        returnKeyType="default"
                    />
                    <View style={styles.inputActions}>
                        <Text style={styles.charCount}>
                            {inputText.length}/200
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.postBtn,
                                (!inputText.trim() || isPosting) && styles.postBtnDisabled,
                            ]}
                            onPress={handlePost}
                            disabled={!inputText.trim() || isPosting}
                        >
                            {isPosting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.postBtnText}>Post</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingTop: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e5e7eb',
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#d1d5db',
        alignSelf: 'center',
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentList: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        flexGrow: 1,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    commentAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        marginTop: 2,
    },
    commentAvatarText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6366f1',
    },
    commentBody: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    commentAuthor: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
    },
    commentTime: {
        fontSize: 11,
        color: '#9ca3af',
    },
    commentText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#9ca3af',
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#d1d5db',
    },
    inputBar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingBottom: Platform.OS === 'ios' ? 34 : 10,
    },
    input: {
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 14,
        color: '#1f2937',
        maxHeight: 80,
    },
    inputActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    charCount: {
        fontSize: 11,
        color: '#9ca3af',
    },
    postBtn: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 14,
        minWidth: 56,
        alignItems: 'center',
    },
    postBtnDisabled: {
        opacity: 0.4,
    },
    postBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
});
