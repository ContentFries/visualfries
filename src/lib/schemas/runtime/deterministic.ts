import type { TextureSource } from 'pixi.js-legacy';
import { z } from 'zod';

export type DeterministicFrameRequest = {
	componentId: string;
	componentType: 'VIDEO' | 'GIF';
	// Component-local frame index at current component timeline time.
	// This is not the global scene frame index.
	frameIndex: number;
	fps: number;
	width: number;
	height: number;
};

export type DeterministicFramePayload =
	| {
			kind: 'url';
			cacheKey: string;
			url: string;
	  }
	| {
			kind: 'blob';
			cacheKey: string;
			blob: Blob;
	  }
	| {
			kind: 'arraybuffer';
			cacheKey: string;
			arrayBuffer: ArrayBuffer;
	  }
	| {
			kind: 'imageBitmap';
			cacheKey: string;
			imageBitmap: ImageBitmap;
	  };

export interface DeterministicFrameProvider {
	getFrame(request: DeterministicFrameRequest): Promise<DeterministicFramePayload | null>;
	releaseComponent?(componentId: string): Promise<void> | void;
	destroy?(): Promise<void> | void;
}

export type DeterministicMediaConfig = {
	enabled: boolean;
	strict: boolean;
	diagnostics: boolean;
	maxCachedTextures?: number;
	provider?: DeterministicFrameProvider;
};

export const DeterministicMediaConfigShape = z.object({
	enabled: z.boolean().prefault(false),
	strict: z.boolean().prefault(false),
	diagnostics: z.boolean().prefault(false),
	maxCachedTextures: z.number().int().positive().optional(),
	provider: z.custom<DeterministicFrameProvider>().optional()
}).prefault({});

export const defaultDeterministicMediaConfig: DeterministicMediaConfig =
	DeterministicMediaConfigShape.parse(undefined);

export type DeterministicFrameOverride = {
	cacheKey: string;
	pixiResource: TextureSource;
	imageElement?: HTMLImageElement | ImageBitmap;
};

export type DeterministicDiagnosticsReport = {
	providerHits: number;
	providerMisses: number;
	cacheHits: number;
	cacheHitRatio: number;
	latency: {
		minMs: number;
		maxMs: number;
		avgMs: number;
	};
};

export type RenderFrameRangeItem = {
	frameIndex: number;
	frame: string | ArrayBuffer | Blob;
	isDuplicate: boolean;
	mimeType?: string;
	release: () => void;
};

export type FrameImageFormat = 'jpg' | 'jpeg' | 'png';

export type FrameImageEncodingOptions = {
	imageFormat?: FrameImageFormat;
	imageQuality?: number;
};

export type RenderFrameRangeOptions = {
	fromFrame: number;
	toFrame: number;
	format?: 'arraybuffer' | 'blob' | 'png' | 'jpg' | 'jpeg';
	quality?: number;
	imageFormat?: FrameImageFormat;
	imageQuality?: number;
	skipDuplicates?: boolean;
	signal?: AbortSignal;
	onFrame: (item: RenderFrameRangeItem) => Promise<void> | void;
};

export type RenderFrameRangeSummary = {
	framesRendered: number;
	framesSkipped: number;
	aborted: boolean;
	diagnostics?: DeterministicDiagnosticsReport | null;
};

export class DeterministicRenderError extends Error {
	readonly componentId: string;
	readonly frameIndex: number;
	readonly sceneTime: number;

	constructor(message: string, props: { componentId: string; frameIndex: number; sceneTime: number }) {
		super(message);
		this.name = 'DeterministicRenderError';
		this.componentId = props.componentId;
		this.frameIndex = props.frameIndex;
		this.sceneTime = props.sceneTime;
	}
}

export class RenderFrameEncodingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RenderFrameEncodingError';
	}
}
