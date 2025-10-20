import tinycolor from 'tinycolor2';
import { z } from 'zod';
export function isValidColor(color) {
    const c = tinycolor(color);
    return c.isValid(); // true
}
// ============================================================================
// NUMERIC COERCION VALIDATORS
// ============================================================================
/**
 * Base coercion validator that ensures the value is a valid number after coercion.
 * Prevents NaN, Infinity, and other invalid numeric states.
 * Rejects blank/whitespace-only strings.
 */
export const coerceValidNumber = () => z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') {
        return undefined; // Reject blank strings
    }
    return val;
}, z.coerce
    .number()
    .refine((val) => !isNaN(val), {
    error: 'Must be a valid number'
})
    .refine((val) => isFinite(val), {
    error: 'Must be a finite number'
}));
/**
 * Coerce to a number with minimum constraint.
 * @param min - Minimum allowed value
 * @example coerceNumber(0) // For dimensions, must be >= 0
 * Rejects blank/whitespace-only strings.
 */
export const coerceNumber = (min, max) => z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') {
        return undefined; // Reject blank strings
    }
    return val;
}, z.coerce
    .number()
    .refine((val) => !isNaN(val), {
    error: 'Must be a valid number'
})
    .refine((val) => isFinite(val), {
    error: 'Must be a finite number'
})
    .refine((val) => min === undefined || val >= min, {
    error: `Must be >= ${min}`
})
    .refine((val) => max === undefined || val <= max, {
    error: `Must be <= ${max}`
}));
/**
 * Coerce to a positive number (> 0).
 * Useful for dimensions, sizes, durations, etc.
 * Rejects blank/whitespace-only strings.
 */
export const coercePositiveNumber = () => z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') {
        return undefined; // Reject blank strings
    }
    return val;
}, z.coerce
    .number()
    .refine((val) => !isNaN(val), {
    error: 'Must be a valid number'
})
    .refine((val) => isFinite(val), {
    error: 'Must be a finite number'
})
    .refine((val) => val > 0, {
    error: 'Must be positive (> 0)'
}));
/**
 * Coerce to a number between 0 and 1.
 * Useful for opacity, scale factors, percentages, etc.
 * Rejects blank/whitespace-only strings.
 */
export const coerceNormalizedNumber = () => z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') {
        return undefined; // Reject blank strings
    }
    return val;
}, z.coerce
    .number()
    .refine((val) => !isNaN(val), {
    error: 'Must be a valid number'
})
    .refine((val) => isFinite(val), {
    error: 'Must be a finite number'
})
    .refine((val) => val >= 0 && val <= 1, {
    error: 'Must be between 0 and 1'
}));
/**
 * Coerce to a non-negative number (>= 0).
 * Useful for offsets, blur radius, etc.
 * Rejects blank/whitespace-only strings.
 */
export const coerceNonNegativeNumber = () => z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') {
        return undefined; // Reject blank strings
    }
    return val;
}, z.coerce
    .number()
    .refine((val) => !isNaN(val), {
    error: 'Must be a valid number'
})
    .refine((val) => isFinite(val), {
    error: 'Must be a finite number'
})
    .refine((val) => val >= 0, {
    error: 'Must be >= 0'
}));
/**
 * Coerce to an integer.
 * Useful for counts, indices, etc.
 * Rejects blank/whitespace-only strings.
 */
export const coerceInteger = (min, max) => z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') {
        return undefined; // Reject blank strings
    }
    return val;
}, z.coerce
    .number()
    .refine((val) => !isNaN(val), {
    error: 'Must be a valid number'
})
    .refine((val) => isFinite(val), {
    error: 'Must be a finite number'
})
    .refine((val) => Number.isInteger(val), {
    error: 'Must be an integer'
})
    .refine((val) => min === undefined || val >= min, {
    error: `Must be >= ${min}`
})
    .refine((val) => max === undefined || val <= max, {
    error: `Must be <= ${max}`
}));
