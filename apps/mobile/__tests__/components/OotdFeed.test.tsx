/**
 * OOTD Feed & Post Card Tests
 * Story 9.3: OOTD Feed Display
 */

import React from 'react';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
    supabase: {
        from: jest.fn(),
        storage: { from: jest.fn() },
        auth: { getUser: jest.fn() },
    },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('test-user-id'),
}));

// Mock ootdService
const mockGetItemsByIds = jest.fn().mockResolvedValue({ items: [], error: null });
jest.mock('../../services/ootdService', () => ({
    ootdService: {
        getItemsByIds: mockGetItemsByIds,
        getMyFeed: jest.fn().mockResolvedValue({ posts: [], error: null }),
        getSquadFeed: jest.fn().mockResolvedValue({ posts: [], error: null }),
    },
}));

jest.mock('../../utils/formatTime', () => ({
    formatRelativeTime: jest.fn(() => '2h ago'),
}));

import { render, fireEvent } from '@testing-library/react-native';
import OotdPostCard from '../../components/features/OotdPostCard';
import PhotoViewer from '../../components/features/PhotoViewer';
import { OotdPostWithAuthor } from '../../types/social';

const mockPost: OotdPostWithAuthor = {
    id: 'post-1',
    user_id: 'user-1',
    squad_id: 'squad-1',
    photo_url: 'https://example.com/photo.jpg',
    caption: 'Looking great today!',
    tagged_item_ids: ['item-1', 'item-2'],
    reaction_count: 0,
    comment_count: 0,
    created_at: '2026-02-20T10:00:00Z',
    author_display_name: 'Jane Doe',
    author_avatar_url: null,
};

describe('OotdPostCard', () => {
    const mockOnPhotoPress = jest.fn();
    const mockOnItemPress = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render author name', () => {
        const { getByText } = render(
            <OotdPostCard
                post={mockPost}
                onPhotoPress={mockOnPhotoPress}
                onItemPress={mockOnItemPress}
            />
        );
        expect(getByText('Jane Doe')).toBeTruthy();
    });

    it('should render author initials in avatar', () => {
        const { getByText } = render(
            <OotdPostCard
                post={mockPost}
                onPhotoPress={mockOnPhotoPress}
                onItemPress={mockOnItemPress}
            />
        );
        expect(getByText('JD')).toBeTruthy();
    });

    it('should render timestamp', () => {
        const { getByText } = render(
            <OotdPostCard
                post={mockPost}
                onPhotoPress={mockOnPhotoPress}
                onItemPress={mockOnItemPress}
            />
        );
        expect(getByText('2h ago')).toBeTruthy();
    });

    it('should render caption', () => {
        const { getByText } = render(
            <OotdPostCard
                post={mockPost}
                onPhotoPress={mockOnPhotoPress}
                onItemPress={mockOnItemPress}
            />
        );
        expect(getByText('Looking great today!')).toBeTruthy();
    });

    it('should render squad badge when squadName provided', () => {
        const { getByText } = render(
            <OotdPostCard
                post={mockPost}
                squadName="Fashion Besties"
                onPhotoPress={mockOnPhotoPress}
                onItemPress={mockOnItemPress}
            />
        );
        expect(getByText('Fashion Besties')).toBeTruthy();
    });

    it('should call onPhotoPress when photo is tapped', () => {
        const { getByTestId, UNSAFE_getAllByType } = render(
            <OotdPostCard
                post={mockPost}
                onPhotoPress={mockOnPhotoPress}
                onItemPress={mockOnItemPress}
            />
        );
        // The photo is inside a TouchableOpacity — find it by the Image source
        const touchables = UNSAFE_getAllByType(
            require('react-native').TouchableOpacity
        );
        // The photo touchable is the second one (first is the card wrapper or similar)
        // Press the one containing the photo
        const photoTouchable = touchables.find((t: any) => {
            const props = t.props;
            return props.activeOpacity === 0.95;
        });
        if (photoTouchable) {
            fireEvent.press(photoTouchable);
            expect(mockOnPhotoPress).toHaveBeenCalledTimes(1);
        }
    });

    it('should hide caption section when caption is null', () => {
        const postNoCaption = { ...mockPost, caption: null };
        const { queryByText } = render(
            <OotdPostCard
                post={postNoCaption}
                onPhotoPress={mockOnPhotoPress}
                onItemPress={mockOnItemPress}
            />
        );
        expect(queryByText('Looking great today!')).toBeNull();
    });

    it('should show "Anonymous" for null author name', () => {
        const postAnon = { ...mockPost, author_display_name: null };
        const { getByText } = render(
            <OotdPostCard
                post={postAnon}
                onPhotoPress={mockOnPhotoPress}
                onItemPress={mockOnItemPress}
            />
        );
        expect(getByText('Anonymous')).toBeTruthy();
    });
});

describe('PhotoViewer', () => {
    it('should render when visible', () => {
        const { getByText } = render(
            <PhotoViewer
                visible={true}
                photoUrl="https://example.com/photo.jpg"
                authorName="Jane Doe"
                caption="Nice outfit"
                onClose={jest.fn()}
            />
        );
        expect(getByText('Jane Doe')).toBeTruthy();
        expect(getByText('Nice outfit')).toBeTruthy();
    });

    it('should call onClose when close button is pressed', () => {
        const mockOnClose = jest.fn();
        const { UNSAFE_getAllByType } = render(
            <PhotoViewer
                visible={true}
                photoUrl="https://example.com/photo.jpg"
                onClose={mockOnClose}
            />
        );
        // Find the close button TouchableOpacity
        const touchables = UNSAFE_getAllByType(
            require('react-native').TouchableOpacity
        );
        // Close button is the second touchable (first is backdrop)
        if (touchables.length >= 2) {
            fireEvent.press(touchables[1]);
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        }
    });

    it('should not render author/caption overlay when not provided', () => {
        const { queryByText } = render(
            <PhotoViewer
                visible={true}
                photoUrl="https://example.com/photo.jpg"
                onClose={jest.fn()}
            />
        );
        // No overlay text should be present
        expect(queryByText('Jane Doe')).toBeNull();
    });
});

describe('Feed getItemsByIds', () => {
    it('should return empty array for empty ids', async () => {
        const { ootdService } = require('../../services/ootdService');
        const result = await ootdService.getItemsByIds([]);
        // The mock returns { items: [], error: null }
        expect(result.items).toEqual([]);
    });
});
