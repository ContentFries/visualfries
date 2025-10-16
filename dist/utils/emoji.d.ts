export declare function getIconCode(char: string): string;
export declare const apis: {
    twemoji: (code: string) => string;
    openmoji: string;
    blobmoji: string;
    noto: string;
    fluent: (code: string) => string;
    fluentFlat: (code: string) => string;
};
export declare function loadEmoji(type: keyof typeof apis, code: string): Promise<any>;
