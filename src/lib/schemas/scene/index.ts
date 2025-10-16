// Export all schemas from core.ts
export * from './core.js'

// Export all schemas from components.ts
export * from './components.js';

// Export all schemas from properties.ts
export * from './properties.js';

// Export all schemas from animations.ts
export * from './animations.js';


// Export all types from components.ts
export type * from './components.js';

// Export all types from properties.ts
export type * from './properties.js';

// Re-export subtitle types from subtitles.ts
export type {
	CompactWordMetadata,
	CompactWordTuple,
	SubtitleWord,
	SubtitleWithCompactWords,
	SubtitleWithLegacyWords,
	Subtitle,
	SubtitleCollection
} from './subtitles.js';

// Re-export subtitle schemas
export * from './subtitles.js';

export type FontType = {
	alias: string;
	url?: string;
	data?: {
		family: string;
	};
	source: 'google' | 'custom';
	src?: string;
};

export type BackgroundColors = {
	colors: string[];
	angle: number;
	type: string;
};