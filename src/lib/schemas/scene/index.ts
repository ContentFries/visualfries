// Export all schemas from core.ts
export * from './core.js';
export type * from './core.js';

// Export all schemas from components.ts
export * from './components.js';
export type * from './components.js';

// Export all schemas from properties.ts
export * from './properties.js';
export type * from './properties.js';

// Export all schemas from animations.ts
export * from './animations.js';
export type * from './animations.js';

// Re-export subtitle types from subtitles.ts
export * from './subtitles.js';
export type * from './subtitles.js';

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
