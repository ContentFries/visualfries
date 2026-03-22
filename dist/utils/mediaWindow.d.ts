import type { ComponentData } from '..';
export declare const DEFAULT_MEDIA_PREROLL_SECONDS = 0.75;
export declare const STREAMING_MEDIA_PREROLL_SECONDS = 2;
export declare const DEFAULT_MEDIA_POSTROLL_SECONDS = 0.25;
type MediaWindowComponent = Pick<ComponentData, 'type' | 'visible' | 'timeline'> & {
    source?: {
        url?: string | null;
    };
};
export declare function isMediaWindowComponent(data: MediaWindowComponent | undefined): data is MediaWindowComponent;
export declare function getMediaPrerollSeconds(data: MediaWindowComponent | undefined): number;
export declare function shouldPrepareMediaAtTime(data: MediaWindowComponent | undefined, currentTime: number): boolean;
export {};
