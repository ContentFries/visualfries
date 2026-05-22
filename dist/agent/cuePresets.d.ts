import type { AgentCueFile } from './cueFiles.js';
export type AgentCuePresetName = 'hidden-engine-dynamic' | 'captioned-clean';
export type CreateAgentCuePresetInput = {
    preset?: AgentCuePresetName;
    duration: number;
};
export declare function createAgentCuePreset(input: CreateAgentCuePresetInput): AgentCueFile;
