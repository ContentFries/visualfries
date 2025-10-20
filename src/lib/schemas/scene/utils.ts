import tinycolor from 'tinycolor2';
import { z } from 'zod';

export function isValidColor(color: string) {
	const c = tinycolor(color);
	return c.isValid(); // true
}

// ============================================================================
// NUMERIC COERCION VALIDATORS
// ============================================================================

/**
 * Base coercion validator that ensures the value is a valid number after coercion.
 * Prevents NaN, Infinity, and other invalid numeric states.
 */
export const coerceValidNumber = () =>
	z.coerce.number()
		.refine((val) => !isNaN(val), {
			message: 'Must be a valid number'
		})
		.refine((val) => isFinite(val), {
			message: 'Must be a finite number'
		});

/**
 * Coerce to a number with minimum constraint.
 * @param min - Minimum allowed value
 * @example coerceNumber(0) // For dimensions, must be >= 0
 */
export const coerceNumber = (min?: number, max?: number) =>
	z.coerce.number()
		.refine((val) => !isNaN(val), {
			message: 'Must be a valid number'
		})
		.refine((val) => isFinite(val), {
			message: 'Must be a finite number'
		})
		.refine((val) => min === undefined || val >= min, {
			message: `Must be >= ${min}`
		})
		.refine((val) => max === undefined || val <= max, {
			message: `Must be <= ${max}`
		});

/**
 * Coerce to a positive number (> 0).
 * Useful for dimensions, sizes, durations, etc.
 */
export const coercePositiveNumber = () =>
	z.coerce.number()
		.refine((val) => !isNaN(val), {
			message: 'Must be a valid number'
		})
		.refine((val) => isFinite(val), {
			message: 'Must be a finite number'
		})
		.refine((val) => val > 0, {
			message: 'Must be positive (> 0)'
		});

/**
 * Coerce to a number between 0 and 1.
 * Useful for opacity, scale factors, percentages, etc.
 */
export const coerceNormalizedNumber = () =>
	z.coerce.number()
		.refine((val) => !isNaN(val), {
			message: 'Must be a valid number'
		})
		.refine((val) => isFinite(val), {
			message: 'Must be a finite number'
		})
		.refine((val) => val >= 0 && val <= 1, {
			message: 'Must be between 0 and 1'
		});

/**
 * Coerce to a non-negative number (>= 0).
 * Useful for offsets, blur radius, etc.
 */
export const coerceNonNegativeNumber = () =>
	z.coerce.number()
		.refine((val) => !isNaN(val), {
			message: 'Must be a valid number'
		})
		.refine((val) => isFinite(val), {
			message: 'Must be a finite number'
		})
		.refine((val) => val >= 0, {
			message: 'Must be >= 0'
		});

/**
 * Coerce to an integer.
 * Useful for counts, indices, etc.
 */
export const coerceInteger = (min?: number, max?: number) =>
	z.coerce.number()
		.refine((val) => !isNaN(val), {
			message: 'Must be a valid number'
		})
		.refine((val) => isFinite(val), {
			message: 'Must be a finite number'
		})
		.refine((val) => Number.isInteger(val), {
			message: 'Must be an integer'
		})
		.refine((val) => min === undefined || val >= min, {
			message: `Must be >= ${min}`
		})
		.refine((val) => max === undefined || val <= max, {
			message: `Must be <= ${max}`
		});
