import { type AgentBrollCue } from './broll.js';
import { type AgentTextOverlayCue } from './overlays.js';
import { type AgentTransitionCue } from './transitions.js';
import { type Scene, type SceneInput } from '../schemas/scene/index.js';
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
export declare function mergeAgentCueFiles(...cueFiles: AgentCueFile[]): AgentCueFile;
export declare function normalizeAgentCueFile(cues: AgentCueFile, cueFilePath?: string): AgentCueFile;
export declare function validateAgentCueFile(input: ValidateAgentCueFileInput): AgentCueValidationReport;
export declare function applyAgentCueFile(input: ApplyAgentCueFileInput): ApplyAgentCueFileResult;
