import path from 'node:path';
import { addAgentBrollSequence } from './broll.js';
import { AGENT_BROLL_MOTIONS, AGENT_OVERLAY_STYLES, AGENT_TRANSITION_STYLES } from './catalog.js';
import { addAgentTextOverlays } from './overlays.js';
import { addAgentTransitions } from './transitions.js';
import { SceneShape } from '../schemas/scene/index.js';
export function mergeAgentCueFiles(...cueFiles) {
    return cueFiles.reduce((merged, cues) => ({
        ...merged,
        ...cues,
        broll: [...(merged.broll ?? []), ...(cues.broll ?? [])],
        overlays: [...(merged.overlays ?? []), ...(cues.overlays ?? [])],
        transitions: [...(merged.transitions ?? []), ...(cues.transitions ?? [])]
    }), {});
}
function cueArray(cues, key) {
    const value = cues[key];
    if (value === undefined)
        return [];
    if (!Array.isArray(value)) {
        throw new Error(`cues.${String(key)} must be an array.`);
    }
    return value;
}
function isPortableUrl(value) {
    return /^[a-z]+:\/\//i.test(value) || value.startsWith('file://') || value.startsWith('data:');
}
export function normalizeAgentCueFile(cues, cueFilePath) {
    const baseDir = cueFilePath ? path.dirname(path.resolve(cueFilePath)) : undefined;
    const broll = cueArray(cues, 'broll').map((cue) => {
        if (!baseDir || !cue.url || isPortableUrl(cue.url) || path.isAbsolute(cue.url))
            return cue;
        return {
            ...cue,
            url: path.join(baseDir, cue.url)
        };
    });
    return {
        ...cues,
        broll,
        overlays: cueArray(cues, 'overlays'),
        transitions: cueArray(cues, 'transitions')
    };
}
function isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function checkRange(issues, path, start, end, duration) {
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
export function validateAgentCueFile(input) {
    const cues = normalizeAgentCueFile(input.cues, input.cueFilePath);
    const broll = cues.broll ?? [];
    const overlays = cues.overlays ?? [];
    const transitions = cues.transitions ?? [];
    const issues = [];
    for (const [index, cue] of broll.entries()) {
        const pathPrefix = `broll[${index}]`;
        if (!cue.url || typeof cue.url !== 'string') {
            issues.push({ level: 'error', path: `${pathPrefix}.url`, message: 'url is required.' });
        }
        if (cue.motion && !AGENT_BROLL_MOTIONS.includes(cue.motion)) {
            issues.push({ level: 'error', path: `${pathPrefix}.motion`, message: `Unknown b-roll motion "${cue.motion}".` });
        }
        checkRange(issues, pathPrefix, cue.start, cue.end, input.duration);
    }
    for (const [index, cue] of overlays.entries()) {
        const pathPrefix = `overlays[${index}]`;
        if (!cue.text || typeof cue.text !== 'string') {
            issues.push({ level: 'error', path: `${pathPrefix}.text`, message: 'text is required.' });
        }
        if (cue.style && !AGENT_OVERLAY_STYLES.includes(cue.style)) {
            issues.push({ level: 'error', path: `${pathPrefix}.style`, message: `Unknown overlay style "${cue.style}".` });
        }
        checkRange(issues, pathPrefix, cue.start, cue.end, input.duration);
    }
    for (const [index, cue] of transitions.entries()) {
        const pathPrefix = `transitions[${index}]`;
        if (!isNumber(cue.time)) {
            issues.push({ level: 'error', path: `${pathPrefix}.time`, message: 'time must be a finite number.' });
        }
        if (cue.style && !AGENT_TRANSITION_STYLES.includes(cue.style)) {
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
export function applyAgentCueFile(input) {
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
