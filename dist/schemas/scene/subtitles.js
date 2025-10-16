import { z } from 'zod';
import { ColorTypeShape } from './properties.js';
// ============================================================================
// COMPACT WORD FORMAT SCHEMAS
// ============================================================================
/**
 * Compact word metadata object with optional short keys
 */
const CompactWordMetadataShape = z
    .object({
    s: z.number().optional(), // size override in percent
    si: z.number().optional(), // speaker index
    c: ColorTypeShape.optional(), // color (0-1)
    e: z.string().optional(), // emoji
    w: z.string().optional(), // font weight or bold, bolder etc.
    f: z.string().optional() // font family
})
    .catchall(z.any())
    .optional(); // Allow additional metadata fields
/**
 * Compact word tuple: [text, start_at, end_at, metadata?]
 */
const CompactWordTupleShape = z
    .tuple([
    z.string(), // text
    z.number(), // start_at
    z.number() // end_at
])
    .rest(z.union([CompactWordMetadataShape, z.null()])); // optional metadata as 4th element, can be null
// ============================================================================
// REGULAR WORD FORMAT SCHEMAS
// ============================================================================
/**
 * Regular word object with full property names
 */
const SubtitleWordShape = z.object({
    id: z.string(),
    start_at: z.number(),
    end_at: z.number(),
    text: z.string(),
    position: z.number().optional()
});
// ============================================================================
// SUBTITLE SCHEMAS
// ============================================================================
const EnlargeShape = z
    .union([
    z.boolean(),
    z.number(),
    z.string().transform((val) => {
        const num = parseFloat(val);
        if (isNaN(num)) {
            return true;
        }
        return num;
    })
])
    .optional()
    .transform((v) => {
    if (typeof v === 'boolean') {
        return v ? 150 : undefined;
    }
    return v;
});
/**
 * Subtitle with compact words format
 */
const SubtitleWithCompactWordsShape = z.object({
    id: z.string(),
    start_at: z.number(),
    end_at: z.number(),
    text: z.string(),
    words: z.array(CompactWordTupleShape).optional(),
    // Optional appearance fields
    enlarge: EnlargeShape.optional(),
    visible: z.boolean().optional(),
    emoji: z.string().optional(),
    color: ColorTypeShape.optional(),
    background: ColorTypeShape.optional()
});
/**
 * Subtitle with regular words format (legacy)
 */
const SubtitleWithLegacyWordsShape = z.object({
    id: z.string(),
    start_at: z.number(),
    end_at: z.number(),
    text: z.string(),
    words: z.array(SubtitleWordShape).optional(),
    // Optional appearance fields
    enlarge: EnlargeShape.optional(),
    visible: z.boolean().optional(),
    emoji: z.string().optional(),
    color: z.string().optional(),
    background: z.string().optional()
});
/**
 * Union type that accepts both formats
 */
const SubtitleShape = z.union([SubtitleWithCompactWordsShape, SubtitleWithLegacyWordsShape]);
// ============================================================================
// COLLECTION SCHEMAS
// ============================================================================
/**
 * Subtitle collection (language mapping)
 */
const SubtitleCollectionShape = z.record(z.string(), z.array(SubtitleShape));
// ============================================================================
// SCHEMA EXPORTS
// ============================================================================
export { CompactWordMetadataShape, CompactWordTupleShape, SubtitleWordShape, SubtitleWithCompactWordsShape, SubtitleWithLegacyWordsShape, SubtitleShape, SubtitleCollectionShape };
