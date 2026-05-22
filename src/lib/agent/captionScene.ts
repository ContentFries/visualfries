import {
	SceneShape,
	type ComponentInput,
	type Scene,
	type SceneAssetInput,
	type SceneInput,
	type SceneLayerInput
} from '../schemas/scene/index.js';
import { inferTranscriptDuration, normalizeTranscript, type TranscriptInput } from './transcripts.js';

export type CaptionScenePreset =
	| 'reels-center'
	| 'reels-lower'
	| 'podcast-clean'
	| 'hidden-engine-center';

export type CaptionSceneInput = {
	id?: string;
	video: {
		url: string;
		assetId?: string;
		width?: number;
		height?: number;
		duration?: number;
		hasAudio?: boolean;
	};
	transcript: TranscriptInput;
	preset?: CaptionScenePreset;
	language?: string;
	width?: number;
	height?: number;
	fps?: number;
	duration?: number;
	backgroundColor?: string;
};

type CaptionPresetConfig = {
	x: number;
	y: number;
	width: number;
	height: number;
	fontSize: number;
	fontFamily: string;
	fontWeight: '700' | '800' | '900';
	color: string;
	activeColor: string;
	activeBackgroundColor?: string;
	backgroundColor?: string;
	backgroundAlwaysVisible?: boolean;
	textTransform?: 'none' | 'uppercase';
	shadowBlur: number;
};

function captionPreset(preset: CaptionScenePreset, width: number, height: number): CaptionPresetConfig {
	const safeWidth = Math.round(width * 0.86);
	const x = Math.round((width - safeWidth) / 2);

	if (preset === 'reels-lower') {
		return {
			x,
			y: Math.round(height * 0.68),
			width: safeWidth,
			height: Math.round(height * 0.18),
			fontSize: Math.round(width * 0.065),
			fontFamily: 'Montserrat',
			fontWeight: '900',
			color: '#FFFFFF',
			activeColor: '#FFDD55',
			activeBackgroundColor: '#083F36',
			backgroundColor: 'rgba(0, 0, 0, 0.42)',
			backgroundAlwaysVisible: false,
			textTransform: 'uppercase',
			shadowBlur: 12
		};
	}

	if (preset === 'podcast-clean') {
		return {
			x,
			y: Math.round(height * 0.7),
			width: safeWidth,
			height: Math.round(height * 0.16),
			fontSize: Math.round(width * 0.054),
			fontFamily: 'Inter',
			fontWeight: '800',
			color: '#FFFFFF',
			activeColor: '#FFFFFF',
			activeBackgroundColor: '#0D5C4A',
			backgroundColor: 'rgba(0, 0, 0, 0.34)',
			backgroundAlwaysVisible: false,
			textTransform: 'none',
			shadowBlur: 8
		};
	}

	if (preset === 'hidden-engine-center') {
		return {
			x,
			y: Math.round(height * 0.44),
			width: safeWidth,
			height: Math.round(height * 0.2),
			fontSize: Math.round(width * 0.066),
			fontFamily: 'Montserrat',
			fontWeight: '900',
			color: '#F7F7F2',
			activeColor: '#FFDF5A',
			activeBackgroundColor: '#06483D',
			backgroundColor: 'rgba(0, 0, 0, 0.28)',
			backgroundAlwaysVisible: false,
			textTransform: 'uppercase',
			shadowBlur: 10
		};
	}

	return {
		x,
		y: Math.round(height * 0.48),
		width: safeWidth,
		height: Math.round(height * 0.2),
		fontSize: Math.round(width * 0.064),
		fontFamily: 'Montserrat',
		fontWeight: '900',
		color: '#FFFFFF',
		activeColor: '#FFD84D',
		activeBackgroundColor: '#054D42',
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
		backgroundAlwaysVisible: false,
		textTransform: 'uppercase',
		shadowBlur: 10
	};
}

export function createCaptionScene(input: CaptionSceneInput): Scene {
	const width = input.width ?? 1080;
	const height = input.height ?? 1920;
	const fps = input.fps ?? 30;
	const language = input.language ?? 'en';
	const assetId = input.video.assetId ?? 'main-video';
	const subtitles = normalizeTranscript(input.transcript);
	const duration = input.duration ?? input.video.duration ?? inferTranscriptDuration(subtitles);
	const sceneDuration = Math.max(0.1, duration);
	const videoUrl = input.video.url;
	const preset = captionPreset(input.preset ?? 'reels-center', width, height);

	const videoAsset: SceneAssetInput = {
		id: assetId,
		type: 'VIDEO',
		url: videoUrl,
		metadata: {
			width: input.video.width ?? width,
			height: input.video.height ?? height,
			duration: sceneDuration,
			hasAudio: input.video.hasAudio ?? true
		}
	};

	const video: ComponentInput = {
		id: 'video-main',
		type: 'VIDEO',
		name: 'Main video',
		timeline: { startAt: 0, endAt: sceneDuration },
		source: { url: videoUrl, assetId, metadata: videoAsset.metadata },
		appearance: { x: 0, y: 0, width, height },
		volume: 1,
		muted: false,
		playback: { autoplay: true, loop: false, playbackRate: 1 },
		crop: { x: 0, y: 0, width: 1, height: 1 },
		order: 0
	};

	const captions: ComponentInput = {
		id: 'subtitles-main',
		type: 'SUBTITLES',
		name: 'Captions',
		timeline: { startAt: 0, endAt: sceneDuration },
		source: { assetId, languageCode: language },
		timingAnchor: {
			mode: 'ASSET_USAGE',
			assetId,
			offset: 0
		},
		appearance: {
			x: preset.x,
			y: preset.y,
			width: preset.width,
			height: preset.height,
			horizontalAlign: 'center',
			verticalAlign: 'center',
			...(preset.backgroundColor
				? {
						background: {
							enabled: true,
							color: preset.backgroundColor,
							target: 'wrapper' as const,
							radius: 18
						}
					}
				: {}),
			backgroundAlwaysVisible: preset.backgroundAlwaysVisible,
			text: {
				fontFamily: preset.fontFamily,
				fontSize: { value: preset.fontSize, unit: 'px' },
				fontWeight: preset.fontWeight,
				color: preset.color,
				textAlign: 'center',
				textTransform: preset.textTransform,
				lineHeight: { value: 1.05, unit: 'em' },
				shadow: {
					enabled: true,
					color: '#000000',
					blur: preset.shadowBlur,
					offsetX: 0,
					offsetY: 3
				},
				activeWord: {
					enabled: true,
					color: preset.activeColor,
					backgroundColor: preset.activeBackgroundColor,
					scale: 1.08,
					backgroundPaddingX: 14,
					backgroundPaddingY: 6,
					backgroundBorderRadius: 10
				}
			}
		},
		order: 10
	};

	const mediaLayer: SceneLayerInput = {
		id: 'layer-media',
		name: 'Media',
		order: 0,
		components: [video]
	};
	const captionLayer: SceneLayerInput = {
		id: 'layer-captions',
		name: 'Captions',
		order: 10,
		components: [captions]
	};

	const scene: SceneInput = {
		id: input.id ?? 'visualfries-caption-scene',
		name: 'Agent Caption Scene',
		settings: {
			width,
			height,
			duration: sceneDuration,
			fps,
			backgroundColor: input.backgroundColor ?? '#000000',
			subtitles: {
				punctuation: true,
				mergeGap: 0.2,
				data: {
					[assetId]: {
						[language]: subtitles
					}
				}
			}
		},
		assets: [videoAsset],
		layers: [mediaLayer, captionLayer]
	};

	return SceneShape.parse(scene);
}
