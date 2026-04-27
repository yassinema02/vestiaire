/**
 * Relative Time Formatting Tests
 * Story 9.3: OOTD Feed Display
 */

import { formatRelativeTime } from '../../utils/formatTime';

describe('formatRelativeTime', () => {
    const NOW = 1708444800000; // Fixed timestamp for tests

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(NOW);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return "Just now" for less than 1 minute ago', () => {
        const tenSecsAgo = new Date(NOW - 10_000).toISOString();
        expect(formatRelativeTime(tenSecsAgo)).toBe('Just now');
    });

    it('should return minutes ago for less than 1 hour', () => {
        const fiveMinsAgo = new Date(NOW - 5 * 60_000).toISOString();
        expect(formatRelativeTime(fiveMinsAgo)).toBe('5m ago');
    });

    it('should return hours ago for less than 24 hours', () => {
        const threeHoursAgo = new Date(NOW - 3 * 3_600_000).toISOString();
        expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });

    it('should return "Yesterday" for 1 day ago', () => {
        const oneDayAgo = new Date(NOW - 24 * 3_600_000).toISOString();
        expect(formatRelativeTime(oneDayAgo)).toBe('Yesterday');
    });

    it('should return "X days ago" for 2-6 days', () => {
        const threeDaysAgo = new Date(NOW - 3 * 24 * 3_600_000).toISOString();
        expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('should return "Mon DD" format for 7+ days ago', () => {
        const twoWeeksAgo = new Date(NOW - 14 * 24 * 3_600_000).toISOString();
        const result = formatRelativeTime(twoWeeksAgo);
        // Should match "Mon DD" pattern
        expect(result).toMatch(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}$/);
    });

    it('should handle edge case at exactly 60 minutes', () => {
        const oneHourAgo = new Date(NOW - 60 * 60_000).toISOString();
        expect(formatRelativeTime(oneHourAgo)).toBe('1h ago');
    });
});
