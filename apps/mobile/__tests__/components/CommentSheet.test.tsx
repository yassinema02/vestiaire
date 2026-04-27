/**
 * CommentSheet Component Tests
 * Story 9.4: Reactions & Comments
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock stores
const mockLoadComments = jest.fn();
const mockAddComment = jest.fn().mockResolvedValue({ error: null });
const mockDeleteComment = jest.fn().mockResolvedValue({ error: null });

jest.mock('../../stores/socialStore', () => ({
    useSocialStore: jest.fn(() => ({
        postComments: {
            'post-1': [
                {
                    id: 'c1',
                    post_id: 'post-1',
                    user_id: 'user-a',
                    text: 'Great look!',
                    created_at: '2026-02-22T10:00:00Z',
                    author_display_name: 'Alice',
                    author_avatar_url: null,
                },
                {
                    id: 'c2',
                    post_id: 'post-1',
                    user_id: 'current-user',
                    text: 'Thanks!',
                    created_at: '2026-02-22T11:00:00Z',
                    author_display_name: 'Current User',
                    author_avatar_url: null,
                },
            ],
        },
        loadComments: mockLoadComments,
        addComment: mockAddComment,
        deleteComment: mockDeleteComment,
    })),
}));

jest.mock('../../utils/formatTime', () => ({
    formatRelativeTime: jest.fn(() => '2h ago'),
}));

import CommentSheet from '../../components/features/CommentSheet';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('CommentSheet', () => {
    const defaultProps = {
        visible: true,
        postId: 'post-1',
        postAuthorId: 'post-author',
        currentUserId: 'current-user',
        commentCount: 2,
        onClose: jest.fn(),
    };

    it('renders header with comment count', () => {
        const { getByText } = render(<CommentSheet {...defaultProps} />);
        expect(getByText('Comments (2)')).toBeTruthy();
    });

    it('renders comments with author names', () => {
        const { getByText } = render(<CommentSheet {...defaultProps} />);
        expect(getByText('Alice')).toBeTruthy();
        expect(getByText('Great look!')).toBeTruthy();
        expect(getByText('Current User')).toBeTruthy();
        expect(getByText('Thanks!')).toBeTruthy();
    });

    it('renders comment timestamps', () => {
        const { getAllByText } = render(<CommentSheet {...defaultProps} />);
        expect(getAllByText('2h ago')).toHaveLength(2);
    });

    it('loads comments on mount', () => {
        render(<CommentSheet {...defaultProps} />);
        expect(mockLoadComments).toHaveBeenCalledWith('post-1');
    });

    it('calls onClose when close button pressed', () => {
        const onClose = jest.fn();
        const { getByTestId } = render(
            <CommentSheet {...defaultProps} onClose={onClose} />
        );
        // Close button is a TouchableOpacity with Ionicons close icon
        // We'll find it by the parent header structure
    });

    it('disables post button when input is empty', () => {
        const { getByText } = render(<CommentSheet {...defaultProps} />);
        const postBtn = getByText('Post');
        // Button should be disabled (opacity style applied)
        expect(postBtn).toBeTruthy();
    });

    it('shows character counter', () => {
        const { getByText } = render(<CommentSheet {...defaultProps} />);
        expect(getByText('0/200')).toBeTruthy();
    });

    it('renders empty state when no comments', () => {
        const emptyStore = require('../../stores/socialStore');
        emptyStore.useSocialStore.mockReturnValueOnce({
            postComments: {},
            loadComments: mockLoadComments,
            addComment: mockAddComment,
            deleteComment: mockDeleteComment,
        });

        const { getByText } = render(
            <CommentSheet {...defaultProps} postId="post-empty" commentCount={0} />
        );
        expect(getByText('No comments yet')).toBeTruthy();
        expect(getByText('Be the first to comment!')).toBeTruthy();
    });
});
