export type FontProvider = (fontFamily: string, text?: string) => Promise<ArrayBuffer | null>;
