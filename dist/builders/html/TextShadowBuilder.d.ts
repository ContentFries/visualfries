/**
 * Enum of supported text shadow preset types.
 */
export declare enum TextEffectPresetName {
    DEFAULT = "default",
    CLASSIC = "classic",
    EMERGING = "emerging",
    GLOW = "glow",
    TEXT = "text",
    BOLD = "bold",
    NEON = "neon",
    ANAGLYPH = "anaglyph",
    FIRE = "fire",
    THREE_D = "3d",
    FROSTY = "frosty",
    INK = "ink",
    RAINBOW = "rainbow",
    OUTLINE = "outline",
    STROKE = "stroke"
}
/**
 * Configuration options for building a text shadow.
 */
interface TextShadowBuildConfig {
    preset: string;
    size: number;
    color: string;
    opacity: number;
    textColor?: string;
}
/**
 * Utility class for building CSS text-shadow values based on different presets.
 */
export declare class TextShadowBuilder {
    /**
     * Map of preset names to their corresponding shadow generation strategies.
     */
    private static strategies;
    /**
     * Helper method to create a funky shadow string for specific presets.
     * @param toSize The maximum size for the shadow.
     * @param color The shadow color.
     * @returns A CSS text-shadow string.
     */
    private static funkyShadowString;
    /**
     * Builds a CSS text-shadow value based on the provided configuration.
     * @param config The configuration for the text shadow.
     * @returns A CSS text-shadow string or 'none' if size is <= 0.
     */
    static build(config: TextShadowBuildConfig): string;
    /**
     * Builds a CSS filter drop-shadow value by converting a text-shadow string.
     * This is used to apply shadows to elements with transparent text, such as those with gradient fills.
     * @param config The configuration for the text shadow.
     * @returns A CSS filter string with one or more drop-shadow() functions, or 'none'.
     */
    static buildDropShadow(config: TextShadowBuildConfig): string;
}
export {};
