/**
 * Cost-Per-Wear Calculator
 * Story 5.3: Utility functions for CPW calculation and display
 */

export interface CPWResult {
    value: number | null;
    formatted: string;
    color: string;
    colorName: 'green' | 'yellow' | 'red' | 'none';
    label: string;
}

// CPW color thresholds and hex values
const CPW_THRESHOLDS = {
    great: 5,   // < $5
    good: 20,   // $5-20
};

const CPW_COLORS = {
    green: '#22c55e',
    yellow: '#eab308',
    red: '#ef4444',
    none: '#9ca3af',
};

/**
 * Calculate cost-per-wear
 * Returns null if no price is set
 */
export function calculateCPW(price: number | null | undefined, wearCount: number): number | null {
    if (!price || price <= 0) return null;
    if (wearCount <= 0) return price; // Never worn = full price
    return price / wearCount;
}

/**
 * Get the color name for a CPW value
 */
export function getCPWColorName(cpw: number): 'green' | 'yellow' | 'red' {
    if (cpw < CPW_THRESHOLDS.great) return 'green';
    if (cpw <= CPW_THRESHOLDS.good) return 'yellow';
    return 'red';
}

/**
 * Get the hex color for a CPW value
 */
export function getCPWColor(cpw: number | null): string {
    if (cpw === null) return CPW_COLORS.none;
    return CPW_COLORS[getCPWColorName(cpw)];
}

/**
 * Get a human-readable label for the CPW tier
 */
export function getCPWLabel(cpw: number): string {
    if (cpw < CPW_THRESHOLDS.great) return 'Great value';
    if (cpw <= CPW_THRESHOLDS.good) return 'Good value';
    return 'Keep wearing';
}

/**
 * Format a CPW value as currency string
 */
export function formatCPW(cpw: number | null): string {
    if (cpw === null) return '-';
    return `$${cpw.toFixed(2)}`;
}

/**
 * Get a full CPW result with all display properties
 */
export function getCPWResult(price: number | null | undefined, wearCount: number): CPWResult {
    const value = calculateCPW(price, wearCount);

    if (value === null) {
        return {
            value: null,
            formatted: '-',
            color: CPW_COLORS.none,
            colorName: 'none',
            label: 'Add price to track',
        };
    }

    const colorName = getCPWColorName(value);
    return {
        value,
        formatted: `$${value.toFixed(2)}`,
        color: CPW_COLORS[colorName],
        colorName,
        label: getCPWLabel(value),
    };
}

/**
 * Format the CPW breakdown formula
 * e.g. "$120.00 / 24 wears = $5.00/wear"
 */
export function formatCPWBreakdown(price: number, wearCount: number): string {
    const cpw = calculateCPW(price, wearCount);
    if (cpw === null) return '';
    const wearLabel = wearCount === 1 ? '1 wear' : `${wearCount} wears`;
    return `$${price.toFixed(2)} \u00f7 ${wearLabel} = $${cpw.toFixed(2)}/wear`;
}

/**
 * Check if CPW just crossed below the "great value" threshold
 * Used to trigger celebration animation
 */
export function didCPWCrossThreshold(
    price: number | null | undefined,
    previousWearCount: number,
    newWearCount: number
): boolean {
    if (!price || price <= 0) return false;

    const previousCPW = calculateCPW(price, previousWearCount);
    const newCPW = calculateCPW(price, newWearCount);

    if (previousCPW === null || newCPW === null) return false;

    return previousCPW >= CPW_THRESHOLDS.great && newCPW < CPW_THRESHOLDS.great;
}
