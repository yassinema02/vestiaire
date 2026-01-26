/**
 * Password Validation Utility
 * Validates password strength according to requirements
 */

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Validate password meets requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
export const validatePassword = (password: string): ValidationResult => {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least 1 uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least 1 number');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationResult => {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        errors.push('Email is required');
    } else if (!emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Check if passwords match
 */
export const passwordsMatch = (password: string, confirmPassword: string): boolean => {
    return password === confirmPassword;
};
