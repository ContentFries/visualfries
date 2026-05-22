import path from 'node:path';
import { addAgentBrollSequence, type AgentBrollCue } from './broll.js';
import { AGENT_BROLL_MOTIONS, AGENT_OVERLAY_STYLES, AGENT_TRANSITION_STYLES } from './catalog.js';
import { addAgentTextOverlays, type AgentTextOverlayCue } from './overlays.js';
import { addAgentTransitions, type AgentTransitionCue } from './transitions.js';
import { SceneShape, type Scene, type SceneInput } from '../schemas/scene/index.js';

export type AgentCueFile = {
	broll?: AgentBrollCue[];
	overlays?: AgentTextOverlayCue[];
	transitions?: AgentTransitionCue[];
	brollLayerId?: string;
	brollLayerName?: string;
	brollLayerOrder?: number;
	overlayLayerId?: string;
	overlayLayerName?: string;
	overlayLayerOrder?: number;
	transitionLayerId?: string;
	transitionLayerName?: string;
	transitionLayerOrder?: number;
};

export type ApplyAgentCueFileInput = {
	scene: Scene | SceneInput;
	cues: AgentCueFile;
	cueFilePath?: string;
};

export type ApplyAgentCueFileResult = {
	scene: Scene;
	applied: {
		broll: number;
		overlays: number;
		transitions: number;
	};
};

export type AgentCueValidationIssue = {
	level: 'error' | 'warning';
	path: string;
	message: string;
};

export type ValidateAgentCueFileInput = {
	cues: AgentCueFile;
	duration?: number;
	cueFilePath?: string;
};

export type AgentCueValidationReport = {
	valid: boolean;
	issues: AgentCueValidationIssue[];
	summary: {
		broll: number;
		overlays: number;
		transitions: number;
	};
};

export function mergeAgentCueFiles(...cueFiles: AgentCueFile[]): AgentCueFile {
	return cueFiles.reduce<AgentCueFile>(
		(merged, cues) => ({
			...merged,
			...cues,
			broll: [...(merged.broll ?? []), ...(cues.broll ?? [])],
			overlays: [...(merged.overlays ?? []), ...(cues.overlays ?? [])],
			transitions: [...(merged.transitions ?? []), ...(cues.transitions ?? [])]
		}),
		{}
	);
}

function cueArray<T>(cues: AgentCueFile, key: keyof AgentCueFile): T[] {
	const value = cues[key];
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(`cues.${String(key)} must be an array.`);
	}
	return value as T[];
}

function isPortableUrl(value: string): boolean {
	return /^[a-z]+:\/\//i.test(value) || value.startsWith('file://') || value.startsWith('data:');
}

export function normalizeAgentCueFile(cues: AgentCueFile, cueFilePath?: string): AgentCueFile {
	const baseDir = cueFilePath ? path.dirname(path.resolve(cueFilePath)) : undefined;
	const broll = cueArray<AgentBrollCue>(cues, 'broll').map((cue) => {
		if (!baseDir || !cue.url || isPortableUrl(cue.url) || path.isAbsolute(cue.url)) return cue;
		return {
			...cue,
			url: path.join(baseDir, cue.url)
		};
	});

	return {
		...cues,
		broll,
		overlays: cueArray<AgentTextOverlayCue>(cues, 'overlays'),
		transitions: cueArray<AgentTransitionCue>(cues, 'transitions')
	};
}

function isNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function checkRange(
	issues: AgentCueValidationIssue[],
	path: string,
	start: unknown,
	end: unknown,
	duration?: number
) {
	if (!isNumber(start)) {
		issues.push({ level: 'error', path: `${path}.start`, message: 'start must be a finite number.' });
	}
	if (!isNumber(end)) {
		issues.push({ level: 'error', path: `${path}.end`, message: 'end must be a finite number.' });
	}
	if (isNumber(start) && isNumber(end) && end < start) {
		issues.push({ level: 'error', path: `${path}.end`, message: 'end must be greater than or equal to start.' });
	}
	if (duration !== undefined && isNumber(end) && end > duration) {
		issues.push({
			level: 'warning',
			path: `${path}.end`,
			message: `end is outside scene duration (${end}s > ${duration}s).`
		});
	}
}

export function validateAgentCueFile(input: ValidateAgentCueFileInput): AgentCueValidationReport {
	const cues = normalizeAgentCueFile(input.cues, input.cueFilePath);
	const broll = cues.broll ?? [];
	const overlays = cues.overlays ?? [];
	const transitions = cues.transitions ?? [];
	const issues: AgentCueValidationIssue[] = [];

	for (const [index, cue] of broll.entries()) {
		const pathPrefix = `broll[${index}]`;
		if (!cue.url || typeof cue.url !== 'string') {
			issues.push({ level: 'error', path: `${pathPrefix}.url`, message: 'url is required.' });
		}
		if (cue.motion && !AGENT_BROLL_MOTIONS.includes(cue.motion as (typeof AGENT_BROLL_MOTIONS)[number])) {
			issues.push({ level: 'error', path: `${pathPrefix}.motion`, message: `Unknown b-roll motion "${cue.motion}".` });
		}
		checkRange(issues, pathPrefix, cue.start, cue.end, input.duration);
	}

	for (const [index, cue] of overlays.entries()) {
		const pathPrefix = `overlays[${index}]`;
		if (!cue.text || typeof cue.text !== 'string') {
			issues.push({ level: 'error', path: `${pathPrefix}.text`, message: 'text is required.' });
		}
		if (cue.style && !AGENT_OVERLAY_STYLES.includes(cue.style as (typeof AGENT_OVERLAY_STYLES)[number])) {
			issues.push({ level: 'error', path: `${pathPrefix}.style`, message: `Unknown overlay style "${cue.style}".` });
		}
		checkRange(issues, pathPrefix, cue.start, cue.end, input.duration);
	}

	for (const [index, cue] of transitions.entries()) {
		const pathPrefix = `transitions[${index}]`;
		if (!isNumber(cue.time)) {
			issues.push({ level: 'error', path: `${pathPrefix}.time`, message: 'time must be a finite number.' });
		}
		if (cue.style && !AGENT_TRANSITION_STYLES.includes(cue.style as (typeof AGENT_TRANSITION_STYLES)[number])) {
			issues.push({
				level: 'error',
				path: `${pathPrefix}.style`,
				message: `Unknown transition style "${cue.style}".`
			});
		}
		if (input.duration !== undefined && isNumber(cue.time) && cue.time > input.duration) {
			issues.push({
				level: 'warning',
				path: `${pathPrefix}.time`,
				message: `time is outside scene duration (${cue.time}s > ${input.duration}s).`
			});
		}
	}

	return {
		valid: !issues.some((issue) => issue.level === 'error'),
		issues,
		summary: {
			broll: broll.length,
			overlays: overlays.length,
			transitions: transitions.length
		}
	};
}

export function applyAgentCueFile(input: ApplyAgentCueFileInput): ApplyAgentCueFileResult {
	const cues = normalizeAgentCueFile(input.cues, input.cueFilePath);
	let scene = SceneShape.parse(input.scene);
	const validation = validateAgentCueFile({ cues, cueFilePath: input.cueFilePath, duration: scene.settings.duration });
	if (!validation.valid) {
		throw new Error(`Invalid cue file: ${JSON.stringify(validation.issues, null, 2)}`);
	}
	const broll = cues.broll ?? [];
	const overlays = cues.overlays ?? [];
	const transitions = cues.transitions ?? [];

	if (broll.length > 0) {
		scene = addAgentBrollSequence({
			scene,
			cues: broll,
			layerId: cues.brollLayerId,
			layerName: cues.brollLayerName,
			layerOrder: cues.brollLayerOrder
		});
	}

	if (overlays.length > 0) {
		scene = addAgentTextOverlays({
			scene,
			overlays,
			layerId: cues.overlayLayerId,
			layerName: cues.overlayLayerName,
			layerOrder: cues.overlayLayerOrder
		});
	}

	if (transitions.length > 0) {
		scene = addAgentTransitions({
			scene,
			transitions,
			layerId: cues.transitionLayerId,
			layerName: cues.transitionLayerName,
			layerOrder: cues.transitionLayerOrder
		});
	}

	return {
		scene: SceneShape.parse(scene),
		applied: {
			broll: broll.length,
			overlays: overlays.length,
			transitions: transitions.length
		}
	};
}
