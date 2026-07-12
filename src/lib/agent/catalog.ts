import {
	getCapabilityCatalog,
	getComponentCapability,
	type CapabilityComponentType
} from './capabilities.js';

export const AGENT_CAPTION_PRESETS = [
	'reels-center',
	'reels-lower',
	'podcast-clean',
	'hidden-engine-center'
] as const;

export const AGENT_CUE_PRESETS = ['hidden-engine-dynamic', 'captioned-clean'] as const;

export const AGENT_OVERLAY_STYLES = [
	'pop-label',
	'shock-word',
	'soft-card',
	'hook-punch',
	'proof-pill',
	'danger-crossout',
	'metric-badge',
	'cta-card'
] as const;

export const AGENT_BROLL_MOTIONS = ['none', 'slow-zoom-in', 'slow-zoom-out', 'drift-up'] as const;

export const AGENT_TRANSITION_STYLES = ['dip-to-black', 'flash', 'swipe-left', 'swipe-up'] as const;

export const AGENT_TRANSCRIPT_FORMATS = ['json', 'srt', 'vtt'] as const;

export const AGENT_CLI_COMMANDS = [
	'doctor',
	'catalog',
	'validate',
	'init',
	'caption-scene',
	'preset-cues',
	'apply-cues',
	'validate-cues',
	'qa',
	'inspect',
	'explain',
	'parity',
	'render',
	'compose',
	'produce'
] as const;

export function getAgentCatalog(options: { component?: CapabilityComponentType } = {}) {
	const componentCapability = options.component
		? getComponentCapability(options.component)
		: undefined;
	if (options.component && !componentCapability) {
		throw new Error(`Unknown VisualFries component type: ${options.component}`);
	}
	return {
		captionPresets: [...AGENT_CAPTION_PRESETS],
		cuePresets: [...AGENT_CUE_PRESETS],
		overlayStyles: [...AGENT_OVERLAY_STYLES],
		brollMotions: [...AGENT_BROLL_MOTIONS],
		transitionStyles: [...AGENT_TRANSITION_STYLES],
		transcriptFormats: [...AGENT_TRANSCRIPT_FORMATS],
		cliCommands: [...AGENT_CLI_COMMANDS],
		capabilities: componentCapability ?? getCapabilityCatalog(),
		recommendedWorkflow: {
			routine:
				'visualfries compose --video ./input.mp4 --transcript ./captions.srt --cue-preset hidden-engine-dynamic --cues ./cues.json --scene-output ./scene.json --qa-output ./qa/frames --render-mode preview --output ./preview.mp4',
			debug: [
				'visualfries doctor --json',
				'visualfries caption-scene --video ./input.mp4 --transcript ./captions.srt --preset hidden-engine-center --output ./scene.json',
				'visualfries preset-cues --duration 45 --preset hidden-engine-dynamic --output ./cues.json',
				'visualfries apply-cues ./scene.json --cues ./cues.json --output ./scene.with-cues.json',
				'visualfries inspect ./scene.with-cues.json --screenshots --samples 3 --output ./qa/frames --json',
				'visualfries render ./scene.with-cues.json --render-mode preview --output ./preview.mp4'
			]
		}
	};
}
