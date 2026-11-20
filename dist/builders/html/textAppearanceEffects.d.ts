import { TextEffectPresetName } from './TextShadowBuilder.js';
type TextColor = string | {
    colors?: string[];
} | null | undefined;
type ShadowInput = {
    enabled?: boolean;
    preset?: string;
    color?: string;
    size?: number;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
    opacity?: number;
};
type OutlineInput = {
    enabled?: boolean;
    preset?: string;
    color?: string;
    size?: number;
    opacity?: number;
    style?: string;
};
export declare const isStructuredShadow: (shadow: ShadowInput) => boolean;
export declare const isStructuredOutline: (outline: OutlineInput) => boolean;
export declare function textShadowEffect(shadow: ShadowInput, textColor: TextColor): {
    type: string;
    structured: boolean;
    enabled: boolean;
    color: string;
    size: number | undefined;
    blur: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
    preset?: undefined;
} | {
    type: string;
    preset: TextEffectPresetName;
    enabled: boolean;
    color: string | undefined;
    size: number | undefined;
    structured?: undefined;
    blur?: undefined;
    offsetX?: undefined;
    offsetY?: undefined;
    opacity?: undefined;
};
export declare function textOutlineEffect(outline: OutlineInput): {
    type: string;
    enabled: boolean;
    size: number | undefined;
    color: string | undefined;
} | {
    structured: boolean;
    opacity: number;
    type: string;
    enabled: boolean;
    size: number | undefined;
    color: string | undefined;
};
export {};
