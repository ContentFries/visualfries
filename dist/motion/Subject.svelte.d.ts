import { type At } from './runtime.svelte.js';
import { type FootageLayer } from './footage.js';
import { type Point, type SubjectRegion } from './subject-region.js';
import { type Rim } from './subject-canvas.js';
type RegionAt = (at: {
    source: string;
    frame: number;
    clipFrame: number;
}) => SubjectRegion | null;
type $$ComponentProps = {
    region?: SubjectRegion | RegionAt;
    name?: string;
    layer?: FootageLayer;
    outside?: boolean;
    freeze?: At | boolean;
    hole?: boolean | {
        rim?: boolean | Rim;
    };
    smooth?: number;
    pivot?: [number, number];
    place?: boolean;
    x?: number;
    y?: number;
    rotation?: number;
    scale?: number;
    opacity?: number;
    /** Bindable: the pivot on the stage (clip pixels) at the current frame. */
    center?: Point | null;
    class?: string;
    style?: string;
};
declare const Subject: import("svelte").Component<$$ComponentProps, {}, "center">;
type Subject = ReturnType<typeof Subject>;
export default Subject;
