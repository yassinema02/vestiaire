/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
    }).format(amount);
}

/**
 * Calculate cost per wear
 */
export function calculateCPW(purchasePrice: number | null, wearCount: number): number | null {
    if (purchasePrice === null || wearCount === 0) {
        return null;
    }
    return purchasePrice / wearCount;
}

/**
 * Get CPW color based on thresholds
 */
export function getCPWColor(cpw: number | null): 'green' | 'yellow' | 'red' | 'gray' {
    if (cpw === null) return 'gray';
    if (cpw < 5) return 'green';
    if (cpw < 20) return 'yellow';
    return 'red';
}

/**
 * Check if item is neglected (not worn in X days)
 */
export function isNeglected(lastWornAt: Date | null, thresholdDays = 60): boolean {
    if (!lastWornAt) return true;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastWornAt.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= thresholdDays;
}
