import type {
	SubtitleWord,
	CompactWordTuple,
	CompactWordMetadata,
	SubtitleWithCompactWords,
	SubtitleWithLegacyWords,
	SubtitleCollection,
	Subtitle,
	ColorType
} from '$lib';
import { SubtitleWithCompactWordsShape, ColorTypeShape } from '$lib';

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a word is a CompactWordTuple
 */
function isCompactWordTuple(
	word: SubtitleWord | CompactWordTuple
): word is CompactWordTuple {
	return Array.isArray(word);
}

/**
 * Type guard to check if a word is a SubtitleWord
 */
function isSubtitleWord(word: SubtitleWord | CompactWordTuple): word is SubtitleWord {
	return !Array.isArray(word);
}

/**
 * Safely access CompactWordTuple elements with bounds checking
 */
function safeGetTupleElement<T>(tuple: CompactWordTuple, index: number): T | undefined {
	return index < tuple.length ? (tuple[index] as T) : undefined;
}

/**
 * Safely get text from CompactWordTuple with type checking
 */
function safeGetWordText(word: CompactWordTuple): string {
	const text = safeGetTupleElement<string>(word, 0);
	return text || '';
}

/**
 * Safely get start time from CompactWordTuple with type checking
 */
function safeGetWordStart(word: CompactWordTuple): number {
	const start = safeGetTupleElement<number>(word, 1);
	return start || 0;
}

/**
 * Safely get end time from CompactWordTuple with type checking
 */
function safeGetWordEnd(word: CompactWordTuple): number {
	const end = safeGetTupleElement<number>(word, 2);
	return end || 0;
}

/**
 * Safely get metadata from CompactWordTuple with type checking
 */
function safeGetWordMeta(word: CompactWordTuple): CompactWordMetadata | undefined {
	return safeGetTupleElement<CompactWordMetadata>(word, 3);
}

// ============================================================================
// WORD PROPERTY ACCESS
// ============================================================================

function wordText(word: SubtitleWord | CompactWordTuple): string {
	return isCompactWordTuple(word) ? safeGetWordText(word) : word.text;
}

function wordStart(word: SubtitleWord | CompactWordTuple): number {
	return isCompactWordTuple(word) ? safeGetWordStart(word) : word.start_at;
}

function wordEnd(word: SubtitleWord | CompactWordTuple): number {
	return isCompactWordTuple(word) ? safeGetWordEnd(word) : word.end_at;
}

function wordMeta(word: CompactWordTuple): CompactWordMetadata | undefined {
	return safeGetWordMeta(word);
}

// ============================================================================
// METADATA HELPERS
// ============================================================================

function hasEmoji(word: CompactWordTuple): boolean {
	return wordMeta(word)?.e ? true : false;
}

function getSpeakerIndex(word: CompactWordTuple): number | undefined {
	return wordMeta(word)?.s;
}

function getColor(word: CompactWordTuple): ColorType | undefined {
	const color = wordMeta(word)?.c;
	if (color) {
		const c = ColorTypeShape.safeParse(color);
		if (c.success) {
			return c.data;
		}
	}
	return undefined;
}

// ============================================================================
// FORMAT CONVERSION - WORD LEVEL
// ============================================================================

function compactToLegacy(
	wordTuple: CompactWordTuple,
	parentSubtitleId: string,
	position: number
): SubtitleWord {
	const [text, start_at, end_at] = wordTuple;

	return {
		id: `${parentSubtitleId}-word-${position}`,
		start_at,
		end_at,
		text,
		position
	};
}

function legacyToCompact(word: SubtitleWord, includeMetadata = false): CompactWordTuple {
	const tuple: CompactWordTuple = [word.text, word.start_at, word.end_at];

	if (includeMetadata) {
		const metadata: CompactWordMetadata = {};
		tuple.push(metadata);
	}

	return tuple;
}

// ============================================================================
// FORMAT CONVERSION - SUBTITLE LEVEL
// ============================================================================

/**
 * Convert subtitle with legacy words to compact format
 */
function subtitleToCompact(subtitle: SubtitleWithLegacyWords): SubtitleWithCompactWords {
	const compactWords = subtitle.words?.map((word) => legacyToCompact(word));

	return {
		...subtitle,
		words: compactWords
	};
}

/**
 * Convert subtitle with compact words to legacy format
 */
function subtitleToLegacy(subtitle: SubtitleWithCompactWords): SubtitleWithLegacyWords {
	const legacyWords = subtitle.words?.map((wordTuple, index) =>
		compactToLegacy(wordTuple, subtitle.id, index)
	);

	return {
		...subtitle,
		words: legacyWords,
		// Convert ColorType properties to string if needed
		color: typeof subtitle.color === 'string' ? subtitle.color : undefined,
		background: typeof subtitle.background === 'string' ? subtitle.background : undefined
	};
}

// ============================================================================
// COLLECTION UTILITIES
// ============================================================================

export function normalizeSubtitle(subtitle: Subtitle): SubtitleWithCompactWords | null {
	// Start with the original subtitle as the candidate we'll validate
	let candidate: Subtitle | SubtitleWithCompactWords | SubtitleWithLegacyWords = subtitle;

	// If words exist and are in legacy format, convert to compact
	if (subtitle.words && subtitle.words.length > 0) {
		const firstWord = subtitle.words[0];
		if (Array.isArray(firstWord)) {
			candidate = subtitle as SubtitleWithCompactWords;
		} else {
			candidate = subtitleToCompact(subtitle as SubtitleWithLegacyWords);
		}
	}

	const resp = SubtitleWithCompactWordsShape.safeParse(candidate);
	if (resp.success) {
		return resp.data;
	} else {
		console.error('Failed to normalize subtitle', candidate, resp.error);
	}

	return null;
}
/**
 * Normalize subtitle collection to use compact format internally
 */
function normalizeCollection(
	collection: SubtitleCollection
): Record<string, SubtitleWithCompactWords[]> {
	const normalized: Record<string, SubtitleWithCompactWords[]> = {};

	for (const [key, subtitles] of Object.entries(collection)) {
		normalized[key] = subtitles
			.map((subtitle) => {
				return normalizeSubtitle(subtitle); //subtitle as SubtitleWithCompactWords;
			})
			.filter(Boolean) as SubtitleWithCompactWords[];
	}

	return normalized;
}

/**
 * Calculate file size savings from using compact format
 */
function calculateSavings(collection: SubtitleCollection): {
	legacySize: number;
	compactSize: number;
	savingsBytes: number;
	savingsPercent: number;
} {
	const legacyJson = JSON.stringify(collection);
	const compactCollection = normalizeCollection(collection);
	const compactJson = JSON.stringify(compactCollection);

	const legacySize = legacyJson.length;
	const compactSize = compactJson.length;
	const savingsBytes = legacySize - compactSize;
	const savingsPercent = (savingsBytes / legacySize) * 100;

	return {
		legacySize,
		compactSize,
		savingsBytes,
		savingsPercent: Math.round(savingsPercent * 100) / 100
	};
}
