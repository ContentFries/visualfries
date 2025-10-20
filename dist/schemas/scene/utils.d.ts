import { z } from 'zod';
export declare function isValidColor(color: string): boolean;
/**
 * Base coercion validator that ensures the value is a valid number after coercion.
 * Prevents NaN, Infinity, and other invalid numeric states.
 * Rejects blank/whitespace-only strings.
 */
export declare const coerceValidNumber: () => z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>;
/**
 * Coerce to a number with minimum constraint.
 * @param min - Minimum allowed value
 * @example coerceNumber(0) // For dimensions, must be >= 0
 * Rejects blank/whitespace-only strings.
 */
export declare const coerceNumber: (min?: number, max?: number) => z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>;
/**
 * Coerce to a positive number (> 0).
 * Useful for dimensions, sizes, durations, etc.
 * Rejects blank/whitespace-only strings.
 */
export declare const coercePositiveNumber: () => z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>;
/**
 * Coerce to a number between 0 and 1.
 * Useful for opacity, scale factors, percentages, etc.
 * Rejects blank/whitespace-only strings.
 */
export declare const coerceNormalizedNumber: () => z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>;
/**
 * Coerce to a non-negative number (>= 0).
 * Useful for offsets, blur radius, etc.
 * Rejects blank/whitespace-only strings.
 */
export declare const coerceNonNegativeNumber: () => z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>;
/**
 * Coerce to an integer.
 * Useful for counts, indices, etc.
 * Rejects blank/whitespace-only strings.
 */
export declare const coerceInteger: (min?: number, max?: number) => z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>;
