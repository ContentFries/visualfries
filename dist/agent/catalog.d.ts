export declare const AGENT_CAPTION_PRESETS: readonly ["reels-center", "reels-lower", "podcast-clean", "hidden-engine-center"];
export declare const AGENT_CUE_PRESETS: readonly ["hidden-engine-dynamic", "captioned-clean"];
export declare const AGENT_OVERLAY_STYLES: readonly ["pop-label", "shock-word", "soft-card", "hook-punch", "proof-pill", "danger-crossout", "metric-badge", "cta-card"];
export declare const AGENT_BROLL_MOTIONS: readonly ["none", "slow-zoom-in", "slow-zoom-out", "drift-up"];
export declare const AGENT_TRANSITION_STYLES: readonly ["dip-to-black", "flash", "swipe-left", "swipe-up"];
export declare const AGENT_TRANSCRIPT_FORMATS: readonly ["json", "srt", "vtt"];
export declare const AGENT_CLI_COMMANDS: readonly ["doctor", "init", "caption-scene", "preset-cues", "apply-cues", "validate-cues", "qa", "inspect", "render", "compose"];
export declare function getAgentCatalog(): {
    captionPresets: ("reels-center" | "reels-lower" | "podcast-clean" | "hidden-engine-center")[];
    cuePresets: ("hidden-engine-dynamic" | "captioned-clean")[];
    overlayStyles: ("pop-label" | "shock-word" | "soft-card" | "hook-punch" | "proof-pill" | "danger-crossout" | "metric-badge" | "cta-card")[];
    brollMotions: ("none" | "slow-zoom-in" | "slow-zoom-out" | "drift-up")[];
    transitionStyles: ("dip-to-black" | "flash" | "swipe-left" | "swipe-up")[];
    transcriptFormats: ("srt" | "vtt" | "json")[];
    cliCommands: ("render" | "doctor" | "init" | "caption-scene" | "preset-cues" | "apply-cues" | "validate-cues" | "qa" | "inspect" | "compose")[];
    recommendedWorkflow: {
        routine: string;
        debug: string[];
    };
};
