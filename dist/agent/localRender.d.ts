import { type AgentRenderPlan } from './renderPlan.js';
export type LocalRenderModulePaths = {
    vite?: string;
    svelteVitePlugin?: string;
    playwright?: string;
    nodeModules?: string;
};
export type LocalRenderOptions = {
    scene: unknown;
    output: string;
    framesOnly?: boolean;
    frameIndices: number[];
    fps: number;
    imageFormat?: 'png' | 'jpg' | 'jpeg';
    imageQuality?: number;
    audioOverride?: string;
    keepFrames?: boolean;
    skipDuplicates?: boolean;
    streamEncode?: boolean;
    crf?: number;
    preset?: string;
    renderPlan?: AgentRenderPlan;
    tmpDir?: string;
    packageRoot?: string;
    modulePaths?: LocalRenderModulePaths;
    chromiumPath?: string;
    serverRendererMode?: 'canvas' | 'webgl';
    preferWebGL2?: boolean;
    powerPreference?: 'default' | 'high-performance' | 'low-power';
    mediaDiagnostics?: boolean;
    explain?: Array<{
        componentId: string;
        frame: number;
    }>;
    environment?: 'client' | 'server';
};
export type LocalRenderResult = {
    ok: true;
    scene: {
        id: string;
        width: number;
        height: number;
        duration: number;
        fps: number;
    };
    frames: {
        count: number;
        dir: string;
        items: Array<{
            frame: number;
            time: number;
            path: string | null;
            isDuplicate: boolean;
        }>;
        transport: 'range-binding' | 'sparse-evaluate' | 'range-binding-stream-encode';
        skippedDuplicates: number;
    };
    output: string;
    encoded: boolean;
    encoding: {
        mode: 'none' | 'frame-sequence';
    } | {
        mode: 'image2pipe';
        elapsedMs: number;
        audioMuxed: boolean;
    };
    audio: {
        mode: 'none' | 'override' | 'mixed' | 'primary-fallback';
        selectedSources: number;
        skippedSources: number;
        plannedSources: number;
        path?: string;
    };
    mediaDiagnosticsPath: string | null;
    mediaDiagnostics: Array<Record<string, unknown>>;
    explanations?: Array<Record<string, unknown> | null>;
    runtimeErrors?: string[];
};
export declare const localPathFromUrl: (value: string | undefined) => string | undefined;
export declare const eventEmitter3ShimSource = "export default class EventEmitter{constructor(){this._events=new Map();}_add(name,fn,context,once){if(typeof fn!=='function')throw new TypeError('The listener must be a function');const list=this._events.get(name)||[];list.push({fn,context:context===undefined?this:context,once});this._events.set(name,list);return this;}on(name,fn,context){return this._add(name,fn,context,false);}addListener(name,fn,context){return this.on(name,fn,context);}once(name,fn,context){return this._add(name,fn,context,true);}off(name,fn,context,once){return this.removeListener(name,fn,context,once);}removeListener(name,fn,context,once){const list=this._events.get(name);if(!list)return this;if(fn===undefined){this._events.delete(name);return this;}const next=list.filter((listener)=>listener.fn!==fn||(context!==undefined&&listener.context!==context)||(once!==undefined&&listener.once!==once));if(next.length)this._events.set(name,next);else this._events.delete(name);return this;}removeAllListeners(name){if(name===undefined)this._events.clear();else this._events.delete(name);return this;}emit(name,...args){const list=this._events.get(name);if(!list?.length)return false;for(const listener of [...list]){if(listener.once)this.removeListener(name,listener.fn,listener.context,true);listener.fn.apply(listener.context,args);}return true;}listeners(name){return (this._events.get(name)||[]).map((listener)=>listener.fn);}listenerCount(name){return this._events.get(name)?.length||0;}eventNames(){return [...this._events.keys()];}}\nexport { EventEmitter };\n";
export declare const normalizeImageQuality: (value: number | undefined, fallback?: number) => number;
export declare function renderSceneLocally(options: LocalRenderOptions): Promise<LocalRenderResult>;
