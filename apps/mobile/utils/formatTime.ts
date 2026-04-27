/**
 * Relative Time Formatting
 * Story 9.3: OOTD Feed Display
 */

/**
 * Format a date string into a human-readable relative time.
 * "Just now", "2m ago", "1h ago", "5h ago", "Yesterday", "3 days ago", "Feb 15"
 */
export function formatRelativeTime(dateString: string): string {
    const now = Date.now();
    const date = new Date(dateString).getTime();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    const d = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
}
