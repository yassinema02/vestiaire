/**
 * Validation Utilities
 * Input validation for authentication and user data.
 *
 * SECURITY NOTE (audit 2026-04-05): Strengthened password policy (added
 * special-character requirement, max-length cap to prevent hash-DoS) and
 * tightened email regex to reject common malformed addresses.
 */

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/** Maximum password length — prevents bcrypt/argon2 hash-DoS. */
const MAX_PASSWORD_LENGTH = 128;

/**
 * Validate password meets requirements:
 * - Minimum 8 characters, maximum 128
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export const validatePassword = (password: string): ValidationResult => {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
        errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least 1 uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least 1 lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least 1 number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push('Password must contain at least 1 special character');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Validate email format.
 *
 * Regex requires: local part (no spaces/@ allowed), @ symbol, domain with at
 * least two labels, TLD of 2+ characters. Rejects addresses like "a@b.c" or
 * those with consecutive dots in the domain.
 */
export const validateEmail = (email: string): ValidationResult => {
    const errors: string[] = [];
    // Stricter regex: requires TLD ≥ 2 chars, disallows consecutive dots
    const emailRegex = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

    if (!email) {
        errors.push('Email is required');
    } else if (email.length > 254) {
        errors.push('Email address is too long');
    } else if (!emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
    } else if (/\.\./.test(email)) {
        errors.push('Email address contains invalid consecutive dots');
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

/**
 * Sanitize user-facing text to prevent injection in contexts where the
 * string might be interpolated (e.g. AI prompts, analytics labels).
 *
 * Strips: HTML/XML delimiters, backticks, control characters (except
 * space/newline), curly braces (template literal injection), and
 * collapses excessive whitespace.
 */
export const sanitizeText = (text: string, maxLength = 500): string => {
    return text
        .slice(0, maxLength)
        // Strip control characters except space (U+0020) and newline (U+000A)
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '')
        // Strip HTML/XML delimiters, backticks, curly braces
        .replace(/[<>"'`{}]/g, '')
        // Collapse runs of whitespace into a single space
        .replace(/\s{2,}/g, ' ')
        .trim();
};
