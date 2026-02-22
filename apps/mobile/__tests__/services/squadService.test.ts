/**
 * Squad Service Tests
 * Story 9.1: Style Squads Creation
 *
 * Setup required:
 *   npx expo install jest-expo @testing-library/react-native
 *   npm install -D @types/jest
 */

import { generateInviteCode } from '../../services/squadService';

// Mock Supabase client
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: mockSelect.mockReturnThis(),
            insert: mockInsert.mockReturnThis(),
            delete: mockDelete.mockReturnThis(),
            update: mockUpdate.mockReturnThis(),
            eq: mockEq.mockReturnThis(),
            in: mockIn.mockReturnThis(),
            order: mockOrder.mockReturnThis(),
            single: mockSingle,
            maybeSingle: mockMaybeSingle,
        })),
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
            }),
        },
    },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('test-user-id'),
}));

describe('generateInviteCode', () => {
    it('should generate a 6-character code', () => {
        const code = generateInviteCode();
        expect(code).toHaveLength(6);
    });

    it('should only contain uppercase alphanumeric characters', () => {
        for (let i = 0; i < 100; i++) {
            const code = generateInviteCode();
            expect(code).toMatch(/^[A-Z0-9]{6}$/);
        }
    });

    it('should not contain confusing characters (I, O, 0, 1)', () => {
        for (let i = 0; i < 200; i++) {
            const code = generateInviteCode();
            expect(code).not.toMatch(/[IO01]/);
        }
    });

    it('should generate unique codes', () => {
        const codes = new Set<string>();
        for (let i = 0; i < 100; i++) {
            codes.add(generateInviteCode());
        }
        // With 30^6 = 729M possible codes, 100 codes should all be unique
        expect(codes.size).toBe(100);
    });
});

describe('squadService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createSquad', () => {
        it('should create a squad and add creator as admin', async () => {
            // Mock: invite code uniqueness check returns no existing
            mockMaybeSingle.mockResolvedValueOnce({ data: null });
            // Mock: insert squad
            mockSingle.mockResolvedValueOnce({
                data: {
                    id: 'squad-1',
                    creator_id: 'test-user-id',
                    name: 'Test Squad',
                    description: null,
                    invite_code: 'ABC123',
                    max_members: 20,
                },
                error: null,
            });
            // Mock: insert membership
            mockInsert.mockReturnValueOnce({
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                error: null,
            });

            const { squadService } = require('../../services/squadService');
            const result = await squadService.createSquad({ name: 'Test Squad' });

            expect(result.error).toBeNull();
            expect(result.squad).toBeTruthy();
            expect(result.squad?.name).toBe('Test Squad');
        });
    });

    describe('joinSquadByCode', () => {
        it('should return error for invalid code', async () => {
            mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

            const { squadService } = require('../../services/squadService');
            const result = await squadService.joinSquadByCode('XXXXXX');

            expect(result.error).toContain('Invalid invite code');
            expect(result.squad).toBeNull();
        });

        it('should return error if already a member', async () => {
            // Found squad
            mockMaybeSingle.mockResolvedValueOnce({
                data: { id: 'squad-1', max_members: 20 },
                error: null,
            });
            // Already a member
            mockMaybeSingle.mockResolvedValueOnce({
                data: { id: 'membership-1' },
                error: null,
            });

            const { squadService } = require('../../services/squadService');
            const result = await squadService.joinSquadByCode('ABC123');

            expect(result.error).toContain('already a member');
        });

        it('should return error if squad is full', async () => {
            // Found squad
            mockMaybeSingle.mockResolvedValueOnce({
                data: { id: 'squad-1', max_members: 20 },
                error: null,
            });
            // Not already a member
            mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
            // Count = 20 (full)
            mockEq.mockReturnValueOnce({ count: 20, error: null });

            const { squadService } = require('../../services/squadService');
            const result = await squadService.joinSquadByCode('ABC123');

            expect(result.error).toContain('full');
        });
    });

    describe('leaveSquad', () => {
        it('should prevent sole admin from leaving', async () => {
            // User is admin
            mockSingle.mockResolvedValueOnce({
                data: { role: 'admin' },
                error: null,
            });
            // Only 1 admin
            mockEq.mockReturnValueOnce({ count: 1, error: null });

            const { squadService } = require('../../services/squadService');
            const result = await squadService.leaveSquad('squad-1');

            expect(result.error).toContain('only admin');
        });
    });

    describe('removeMember', () => {
        it('should prevent non-admin from removing members', async () => {
            // Caller is not admin
            mockSingle.mockResolvedValueOnce({
                data: { role: 'member' },
                error: null,
            });

            const { squadService } = require('../../services/squadService');
            const result = await squadService.removeMember('squad-1', 'other-user');

            expect(result.error).toBeTruthy();
            expect(result.error?.message).toContain('admin');
        });
    });
});
