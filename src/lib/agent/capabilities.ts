export const VISUAL_COMPONENT_TYPES = [
	'TEXT',
	'SUBTITLES',
	'IMAGE',
	'VIDEO',
	'GIF',
	'SHAPE',
	'COLOR',
	'GRADIENT'
] as const;

export const COMPONENT_TYPES = [...VISUAL_COMPONENT_TYPES, 'AUDIO'] as const;

export type CapabilityComponentType = (typeof COMPONENT_TYPES)[number];
export type VisualCapabilityComponentType = (typeof VISUAL_COMPONENT_TYPES)[number];
export type AnimationTransform = 'x' | 'y' | 'opacity' | 'rotation' | 'scale' | 'scaleX' | 'scaleY';

export type ComponentCapability = {
	type: CapabilityComponentType;
	visual: boolean;
	renderers: {
		preview: 'html' | 'pixi' | 'native-media' | 'none';
		final: 'pixi' | 'deterministic-media-pixi' | 'audio-mix' | 'none';
		parity:
			| 'same-representation'
			| 'different-representation'
			| 'media-predecoded'
			| 'not-applicable';
	};
	animation: {
		attached: boolean;
		target: 'html-element-or-wrapper' | 'pixi-container' | 'none';
		transforms: AnimationTransform[];
		selectors: Array<'container' | 'words' | 'lines' | 'chars' | 'css'>;
		coordinateSpace: 'css-transform' | 'component-relative-offset' | 'none';
		transformOrigin: 'css-center-fixed' | 'component-center-fixed' | 'none';
		seekDeterministic: boolean;
	};
	effects: {
		supported: string[];
		validationOnly: string[];
	};
	backgrounds: string[];
	textFeatures: string[];
	caveats: string[];
};

const VISUAL_TRANSFORMS: AnimationTransform[] = [
	'x',
	'y',
	'opacity',
	'rotation',
	'scale',
	'scaleX',
	'scaleY'
];

const GENERIC_VALIDATION_ONLY_EFFECTS = ['blur', 'colorAdjustment', 'rotationRandomizer'];

export const COMPONENT_CAPABILITIES: Record<CapabilityComponentType, ComponentCapability> = {
	TEXT: {
		type: 'TEXT',
		visual: true,
		renderers: {
			preview: 'html',
			final: 'pixi',
			parity: 'different-representation'
		},
		animation: {
			attached: true,
			target: 'html-element-or-wrapper',
			transforms: [...VISUAL_TRANSFORMS],
			selectors: ['container', 'words', 'lines', 'chars', 'css'],
			coordinateSpace: 'css-transform',
			transformOrigin: 'css-center-fixed',
			seekDeterministic: true
		},
		effects: {
			supported: ['textShadow', 'textOutline'],
			validationOnly: [...GENERIC_VALIDATION_ONLY_EFFECTS]
		},
		backgrounds: ['solid-wrapper', 'gradient-wrapper', 'solid-element', 'gradient-element'],
		textFeatures: [
			'font',
			'solid-color',
			'gradient-color',
			'alignment',
			'transform',
			'outline-solid',
			'shadow',
			'active-word-color-background',
			'active-line-color-background',
			'active-word-line-scale',
			'solid-highlight-color-cycling',
			'px-padding',
			'split-words-lines-chars'
		],
		caveats: [
			'Preview uses HTML while final output rasterizes HTML into Pixi.',
			'Element background padding defaults to 0.22em only when explicit padding is absent.',
			'clipColor is not implemented; highlight color cycling supports solid colors only.'
		]
	},
	SUBTITLES: {
		type: 'SUBTITLES',
		visual: true,
		renderers: { preview: 'html', final: 'pixi', parity: 'different-representation' },
		animation: {
			attached: true,
			target: 'html-element-or-wrapper',
			transforms: [...VISUAL_TRANSFORMS],
			selectors: ['container', 'words', 'lines', 'chars', 'css'],
			coordinateSpace: 'css-transform',
			transformOrigin: 'css-center-fixed',
			seekDeterministic: true
		},
		effects: {
			supported: ['textShadow', 'textOutline'],
			validationOnly: [...GENERIC_VALIDATION_ONLY_EFFECTS]
		},
		backgrounds: ['solid-wrapper', 'gradient-wrapper', 'solid-element', 'gradient-element'],
		textFeatures: [
			'font',
			'solid-color',
			'gradient-color',
			'active-word-color-background',
			'active-line-color-background',
			'active-word-line-scale',
			'solid-highlight-color-cycling',
			'px-padding',
			'timed-words'
		],
		caveats: ['Advanced out anchors depend on cue/component duration and require frame QA.']
	},
	IMAGE: {
		type: 'IMAGE',
		visual: true,
		renderers: { preview: 'pixi', final: 'pixi', parity: 'same-representation' },
		animation: {
			attached: true,
			target: 'pixi-container',
			transforms: [...VISUAL_TRANSFORMS],
			selectors: ['container'],
			coordinateSpace: 'component-relative-offset',
			transformOrigin: 'component-center-fixed',
			seekDeterministic: true
		},
		effects: {
			supported: ['layoutSplit', 'fillBackgroundBlur'],
			validationOnly: [...GENERIC_VALIDATION_ONLY_EFFECTS]
		},
		backgrounds: [],
		textFeatures: [],
		caveats: ['source.url is required by the image runtime even when assetId is present.']
	},
	VIDEO: {
		type: 'VIDEO',
		visual: true,
		renderers: {
			preview: 'native-media',
			final: 'deterministic-media-pixi',
			parity: 'media-predecoded'
		},
		animation: {
			attached: true,
			target: 'pixi-container',
			transforms: [...VISUAL_TRANSFORMS],
			selectors: ['container'],
			coordinateSpace: 'component-relative-offset',
			transformOrigin: 'component-center-fixed',
			seekDeterministic: true
		},
		effects: {
			supported: ['layoutSplit', 'fillBackgroundBlur'],
			validationOnly: [...GENERIC_VALIDATION_ONLY_EFFECTS]
		},
		backgrounds: [],
		textFeatures: [],
		caveats: ['Final media frames are predecoded; browser media is preview-only.']
	},
	GIF: {
		type: 'GIF',
		visual: true,
		renderers: {
			preview: 'native-media',
			final: 'deterministic-media-pixi',
			parity: 'media-predecoded'
		},
		animation: {
			attached: true,
			target: 'pixi-container',
			transforms: [...VISUAL_TRANSFORMS],
			selectors: ['container'],
			coordinateSpace: 'component-relative-offset',
			transformOrigin: 'component-center-fixed',
			seekDeterministic: true
		},
		effects: { supported: [], validationOnly: [...GENERIC_VALIDATION_ONLY_EFFECTS] },
		backgrounds: [],
		textFeatures: [],
		caveats: ['Final GIF frames are predecoded; browser GIF playback is preview-only.']
	},
	SHAPE: {
		type: 'SHAPE',
		visual: true,
		renderers: { preview: 'pixi', final: 'pixi', parity: 'same-representation' },
		animation: {
			attached: true,
			target: 'pixi-container',
			transforms: [...VISUAL_TRANSFORMS],
			selectors: ['container'],
			coordinateSpace: 'component-relative-offset',
			transformOrigin: 'component-center-fixed',
			seekDeterministic: true
		},
		effects: { supported: [], validationOnly: [...GENERIC_VALIDATION_ONLY_EFFECTS] },
		backgrounds: ['solid-fill'],
		textFeatures: [],
		caveats: ['Rectangle cornerRadius and gradient fill are not production-proven.']
	},
	COLOR: {
		type: 'COLOR',
		visual: true,
		renderers: { preview: 'pixi', final: 'pixi', parity: 'same-representation' },
		animation: {
			attached: true,
			target: 'pixi-container',
			transforms: [...VISUAL_TRANSFORMS],
			selectors: ['container'],
			coordinateSpace: 'component-relative-offset',
			transformOrigin: 'component-center-fixed',
			seekDeterministic: true
		},
		effects: { supported: [], validationOnly: [...GENERIC_VALIDATION_ONLY_EFFECTS] },
		backgrounds: ['solid-canvas-fill'],
		textFeatures: [],
		caveats: []
	},
	GRADIENT: {
		type: 'GRADIENT',
		visual: true,
		renderers: { preview: 'pixi', final: 'pixi', parity: 'same-representation' },
		animation: {
			attached: true,
			target: 'pixi-container',
			transforms: [...VISUAL_TRANSFORMS],
			selectors: ['container'],
			coordinateSpace: 'component-relative-offset',
			transformOrigin: 'component-center-fixed',
			seekDeterministic: true
		},
		effects: { supported: [], validationOnly: [...GENERIC_VALIDATION_ONLY_EFFECTS] },
		backgrounds: ['linear-canvas-gradient', 'radial-canvas-gradient'],
		textFeatures: [],
		caveats: ['Radial shape/position fields currently use a centered max-radius fallback.']
	},
	AUDIO: {
		type: 'AUDIO',
		visual: false,
		renderers: { preview: 'none', final: 'audio-mix', parity: 'not-applicable' },
		animation: {
			attached: false,
			target: 'none',
			transforms: [],
			selectors: [],
			coordinateSpace: 'none',
			transformOrigin: 'none',
			seekDeterministic: false
		},
		effects: { supported: [], validationOnly: [] },
		backgrounds: [],
		textFeatures: [],
		caveats: ['AUDIO has no visual animation contract.']
	}
};

export function getComponentCapability(type: string): ComponentCapability | undefined {
	return COMPONENT_CAPABILITIES[type as CapabilityComponentType];
}

export function getCapabilityCatalog() {
	return COMPONENT_TYPES.map((type) => COMPONENT_CAPABILITIES[type]);
}

export function componentSupportsRuntimeAnimation(type: string): boolean {
	return getComponentCapability(type)?.animation.attached === true;
}
