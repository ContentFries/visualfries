import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

import { SceneShape, type Scene } from '../schemas/scene/index.js';
import { buildLocalMixedAudioTrack, resolveAudioMixRanges } from './audioMixer.js';
import { prepareLocalDeterministicMedia } from './deterministicMedia.js';
import { resolveEffectiveRenderRanges } from './renderRanges.js';
import { resolveAgentRenderPlan, type AgentRenderPlan } from './renderPlan.js';
import { muxAudioWithVideo, PipeFrameEncoder } from './streamingEncoder.js';

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
	explain?: Array<{ componentId: string; frame: number }>;
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
		items: Array<{ frame: number; time: number; path: string | null; isDuplicate: boolean }>;
		transport: 'range-binding' | 'sparse-evaluate' | 'range-binding-stream-encode';
		skippedDuplicates: number;
	};
	output: string;
	encoded: boolean;
	encoding:
		| { mode: 'none' | 'frame-sequence' }
		| { mode: 'image2pipe'; elapsedMs: number; audioMuxed: boolean };
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

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const defaultPackageRoot = path.resolve(currentDir, '..', '..');

const isRemoteUrl = (value: string | undefined): boolean =>
	typeof value === 'string' && /^[a-z]+:\/\//i.test(value) && !value.startsWith('file://');

export const localPathFromUrl = (value: string | undefined): string | undefined => {
	if (!value || typeof value !== 'string') return undefined;
	if (value.startsWith('file://')) return fileURLToPath(value);
	if (isRemoteUrl(value) || value.startsWith('data:')) return undefined;
	if (path.isAbsolute(value)) return existsSync(value) ? value : undefined;
	return path.resolve(value);
};

const extensionForMedia = (filePath: string): string => path.extname(filePath) || '.bin';

const normalizeImageFormat = (value: string | undefined): 'png' | 'jpg' => {
	const resolved = value ?? 'png';
	if (resolved === 'png' || resolved === 'jpg') return resolved;
	if (resolved === 'jpeg') return 'jpg';
	throw new Error('imageFormat must be png, jpg, or jpeg.');
};

export const eventEmitter3ShimSource = `export default class EventEmitter{constructor(){this._events=new Map();}_add(name,fn,context,once){if(typeof fn!=='function')throw new TypeError('The listener must be a function');const list=this._events.get(name)||[];list.push({fn,context:context===undefined?this:context,once});this._events.set(name,list);return this;}on(name,fn,context){return this._add(name,fn,context,false);}addListener(name,fn,context){return this.on(name,fn,context);}once(name,fn,context){return this._add(name,fn,context,true);}off(name,fn,context,once){return this.removeListener(name,fn,context,once);}removeListener(name,fn,context,once){const list=this._events.get(name);if(!list)return this;if(fn===undefined){this._events.delete(name);return this;}const next=list.filter((listener)=>listener.fn!==fn||(context!==undefined&&listener.context!==context)||(once!==undefined&&listener.once!==once));if(next.length)this._events.set(name,next);else this._events.delete(name);return this;}removeAllListeners(name){if(name===undefined)this._events.clear();else this._events.delete(name);return this;}emit(name,...args){const list=this._events.get(name);if(!list?.length)return false;for(const listener of [...list]){if(listener.once)this.removeListener(name,listener.fn,listener.context,true);listener.fn.apply(listener.context,args);}return true;}listeners(name){return (this._events.get(name)||[]).map((listener)=>listener.fn);}listenerCount(name){return this._events.get(name)?.length||0;}eventNames(){return [...this._events.keys()];}}
export { EventEmitter };
`;

export const normalizeImageQuality = (value: number | undefined, fallback = 0.92): number => {
	if (value === undefined) return fallback;
	if (!Number.isFinite(value)) throw new Error('imageQuality must be a finite number.');
	if (value < 0) throw new Error('imageQuality must be >= 0.');
	if (value <= 1) return value;
	if (value <= 100) return value / 100;
	throw new Error('imageQuality must be in 0..1 or 0..100 percent form.');
};

const contiguousFrameRange = (
	frameIndices: number[]
): { fromFrame: number; toFrame: number } | null => {
	if (!frameIndices.length) return null;
	const fromFrame = frameIndices[0];
	for (let index = 1; index < frameIndices.length; index += 1) {
		if (frameIndices[index] !== fromFrame + index) return null;
	}
	return { fromFrame, toFrame: fromFrame + frameIndices.length };
};

const dataUrlToBuffer = (dataUrl: string): Buffer => {
	const commaIndex = dataUrl.indexOf(',');
	const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
	return Buffer.from(base64, 'base64');
};

const writeDataUrlFrame = async (dataUrl: string, framePath: string): Promise<void> => {
	await fs.writeFile(framePath, dataUrlToBuffer(dataUrl));
};

const framePattern = (framesDir: string, imageFormat: string): string =>
	path.join(framesDir, `frame-%06d.${imageFormat}`);

const runCommand = async (command: string, args: string[]): Promise<void> => {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, { stdio: 'inherit' });
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} exited with code ${code}.`));
		});
	});
};

const encodeFrames = async (input: {
	framesDir: string;
	output: string;
	fps: number;
	imageFormat: 'png' | 'jpg';
	audioInput?: string;
}): Promise<void> => {
	const args = [
		'-y',
		'-framerate',
		String(input.fps),
		'-i',
		framePattern(input.framesDir, input.imageFormat)
	];
	if (input.audioInput) {
		args.push('-i', input.audioInput, '-map', '0:v:0', '-map', '1:a:0?', '-shortest');
	}
	args.push(
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		'-crf',
		'18',
		input.output
	);
	await runCommand(process.env.FFMPEG_PATH || 'ffmpeg', args);
};

const importFromOptionalPaths = async (
	moduleName: string,
	envName: string,
	modulePaths: LocalRenderModulePaths = {}
): Promise<any> => {
	try {
		return await import(moduleName);
	} catch (initialError) {
		const configured =
			moduleName === 'vite'
				? modulePaths.vite
				: moduleName === '@sveltejs/vite-plugin-svelte'
					? modulePaths.svelteVitePlugin
					: moduleName === 'playwright'
						? modulePaths.playwright
						: undefined;
		const extraPaths = [
			configured,
			modulePaths.nodeModules,
			process.env[envName],
			process.env.VISUALFRIES_NODE_MODULES
		].filter(Boolean) as string[];
		for (const moduleDir of extraPaths) {
			try {
				const require = createRequire(import.meta.url);
				const resolved = require.resolve(moduleName, { paths: [moduleDir] });
				return await import(pathToFileURL(resolved).toString());
			} catch {
				// Try next path.
			}
		}
		throw initialError;
	}
};

const resolveModulePathFromOptionalPaths = (
	moduleName: string,
	envName: string,
	modulePaths: LocalRenderModulePaths = {},
	fallback?: string
): string => {
	const configured =
		moduleName === 'vite'
			? modulePaths.vite
			: moduleName === '@sveltejs/vite-plugin-svelte'
				? modulePaths.svelteVitePlugin
				: moduleName === 'playwright'
					? modulePaths.playwright
					: undefined;
	const extraPaths = [
		configured,
		modulePaths.nodeModules,
		process.env[envName],
		process.env.VISUALFRIES_NODE_MODULES
	].filter(Boolean) as string[];
	const require = createRequire(import.meta.url);
	for (const moduleDir of extraPaths) {
		try {
			return require.resolve(moduleName, { paths: [moduleDir] });
		} catch {
			// Try next path.
		}
	}
	try {
		return require.resolve(moduleName);
	} catch {
		if (fallback) return fallback;
		throw new Error(
			`Could not resolve ${moduleName}. Pass modulePaths.nodeModules or set VISUALFRIES_NODE_MODULES.`
		);
	}
};

const copyLocalMediaToRenderRoot = async (
	scene: Scene,
	renderRoot: string,
	baseUrl: string
): Promise<Scene> => {
	const cloned = structuredClone(scene);
	const mediaDir = path.join(renderRoot, 'media');
	await fs.mkdir(mediaDir, { recursive: true });
	const copied = new Map<string, string>();
	let index = 0;

	const rewriteUrl = async (value: string | undefined): Promise<string | undefined> => {
		if (!value) return value;
		const localPath = localPathFromUrl(value);
		if (!localPath || !existsSync(localPath)) return value;
		if (copied.has(localPath)) return copied.get(localPath);

		index += 1;
		const targetName = `${String(index).padStart(3, '0')}${extensionForMedia(localPath)}`;
		const targetPath = path.join(mediaDir, targetName);
		await fs.copyFile(localPath, targetPath);
		const servedUrl = new URL(`/media/${targetName}`, baseUrl).toString();
		copied.set(localPath, servedUrl);
		return servedUrl;
	};

	for (const asset of cloned.assets ?? []) {
		asset.url = (await rewriteUrl(asset.url)) ?? asset.url;
	}
	if (cloned.settings.audio?.src) {
		cloned.settings.audio.src =
			(await rewriteUrl(cloned.settings.audio.src)) ?? cloned.settings.audio.src;
	}
	for (const layer of cloned.layers ?? []) {
		for (const component of layer.components ?? []) {
			if ('source' in component && component.source?.url) {
				component.source.url = (await rewriteUrl(component.source.url)) ?? component.source.url;
			}
			if ('source' in component && component.source?.streamUrl) {
				component.source.streamUrl =
					(await rewriteUrl(component.source.streamUrl)) ?? component.source.streamUrl;
			}
		}
	}

	return cloned;
};

const findPrimaryAudioInput = (scene: Scene): string | undefined => {
	const audioSrc = localPathFromUrl(scene.settings.audio?.src);
	if (audioSrc && existsSync(audioSrc)) return audioSrc;
	if (isRemoteUrl(scene.settings.audio?.src)) return scene.settings.audio?.src;

	for (const asset of scene.assets ?? []) {
		if (asset.type !== 'VIDEO') continue;
		const localPath = localPathFromUrl(asset.url);
		if (localPath && existsSync(localPath)) return localPath;
		if (isRemoteUrl(asset.url)) return asset.url;
	}
	return undefined;
};

const resolveAudioInput = (value: string | undefined): string | undefined => {
	if (!value || value === 'none') return undefined;
	return isRemoteUrl(value) ? value : path.resolve(value);
};

const writeRenderClient = async (rootDir: string): Promise<void> => {
	await fs.writeFile(
		path.join(rootDir, 'index.html'),
		`<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="icon" href="data:," /><title>VisualFries Local Renderer</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}#vf-root{position:relative;overflow:hidden;background:#000}</style></head><body><div id="vf-root"></div><script type="module" src="/render-client.js"></script></body></html>`,
		'utf8'
	);
	await fs.writeFile(
		path.join(rootDir, 'node-url-shim.js'),
		`export function parse(value){try{const u=new URL(value,globalThis.location?.href||'http://localhost/');return{protocol:u.protocol,slashes:value.includes('//'),auth:u.username?u.username+(u.password?':'+u.password:''):null,host:u.host,port:u.port,hostname:u.hostname,hash:u.hash,search:u.search,query:u.search?u.search.slice(1):null,pathname:u.pathname,path:u.pathname+u.search,href:u.href};}catch{return{href:String(value),path:String(value),pathname:String(value),query:null,search:null,hash:null};}}\nexport function format(value){if(typeof value==='string')return value;if(value?.href)return value.href;return String((value?.protocol||'')+(value?.slashes?'//':'')+(value?.host||'')+(value?.pathname||value?.path||'')+(value?.search||'')+(value?.hash||''));}\nexport function resolve(from,to){return new URL(to,from||globalThis.location?.href||'http://localhost/').toString();}\nexport default{parse,format,resolve};\n`,
		'utf8'
	);
	await fs.writeFile(path.join(rootDir, 'eventemitter3-shim.js'), eventEmitter3ShimSource, 'utf8');
	await fs.writeFile(
		path.join(rootDir, 'md5-shim.js'),
		`export default function md5(value){const text=typeof value==='string'?value:JSON.stringify(value);let h1=0x811c9dc5,h2=0x9e3779b9;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);h1^=c;h1=Math.imul(h1,0x01000193);h2^=c+(h1>>>0);h2=Math.imul(h2,0x85ebca6b);}return ((h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0')).repeat(2);}\n`,
		'utf8'
	);
	await fs.writeFile(
		path.join(rootDir, 'gifuct-js-shim.js'),
		`const unsupported=()=>{throw new Error('Browser GIF decoding is unavailable in the local deterministic renderer. Use the predecoded deterministic media path.');};\nexport const parseGIF=unsupported;\nexport const decompressFrames=unsupported;\nexport const decompressFrame=unsupported;\nexport default{parseGIF,decompressFrames,decompressFrame};\n`,
		'utf8'
	);
	await fs.writeFile(
		path.join(rootDir, 'render-client.js'),
		`import { createSceneBuilder } from 'visualfries-runtime';
const root = document.getElementById('vf-root');
let builder;
let scene;
let deterministicMediaPayload;
async function blobToDataUrl(blob){return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});}
async function framePayloadToDataUrl(frame){if(typeof frame==='string')return frame.startsWith('data:')?frame:'data:image/png;base64,'+frame;if(frame instanceof Blob)return await blobToDataUrl(frame);if(frame instanceof ArrayBuffer){const bytes=new Uint8Array(frame);let binary='';for(let index=0;index<bytes.length;index+=1)binary+=String.fromCharCode(bytes[index]);return 'data:image/png;base64,'+btoa(binary);}throw new Error('Unsupported VisualFries frame payload.');}
window.__VISUALFRIES_RENDER__={
	async init(){
		const rawScene=await fetch('/scene.json').then((response)=>response.json());
		const rendererOptions=await fetch('/renderer-options.json').then((response)=>response.json()).catch(()=>({}));
		try{deterministicMediaPayload=await fetch('/deterministic-media.json').then((response)=>response.ok?response.json():null);}catch{deterministicMediaPayload=null;}
		scene=rawScene;
		root.style.width=scene.settings.width+'px';
		root.style.height=scene.settings.height+'px';
		const deterministicProvider=deterministicMediaPayload?.frameManifest?{async getFrame(request){const url=deterministicMediaPayload.frameManifest?.[request.componentId]?.[String(request.frameIndex)];if(!url)return null;return{kind:'url',cacheKey:request.componentId+':'+request.frameIndex+':'+url,url};}}:undefined;
		const serverRendererMode=rendererOptions.serverRendererMode==='webgl'?'webgl':'canvas';
		builder=await createSceneBuilder(scene,root,{environment:rendererOptions.environment==='client'?'client':'server',autoPlay:false,loop:false,scale:1,forceCanvas:rendererOptions.environment==='client'?false:serverRendererMode!=='webgl',serverRendererMode,preferWebGL2:rendererOptions.preferWebGL2!==false,powerPreference:rendererOptions.powerPreference||'high-performance',deterministicMedia:{enabled:Boolean(deterministicProvider),strict:Boolean(deterministicProvider&&deterministicMediaPayload?.mediaDeterministicStrict),diagnostics:Boolean(deterministicProvider&&deterministicMediaPayload?.diagnosticsEnabled),provider:deterministicProvider}});
		await builder.seek(0);
		return{id:scene.id,width:scene.settings.width,height:scene.settings.height,duration:scene.settings.duration,fps:scene.settings.fps??30};
	},
	async renderFrame({time,imageFormat,imageQuality}){if(!builder)throw new Error('VisualFries renderer is not initialized.');await builder.seek(time);const frame=await builder.renderFrame(undefined,'blob',1,{imageFormat,imageQuality});return await framePayloadToDataUrl(frame);},
	async explainFrame({componentId,time}){if(!builder)throw new Error('VisualFries renderer is not initialized.');await builder.seek(time);return builder.explainComponentState(componentId);},
	async seek({time}){if(!builder)throw new Error('VisualFries renderer is not initialized.');await builder.seek(time);return true;},
	async renderFrameRange({fromFrame,toFrame,imageFormat,imageQuality,skipDuplicates}){if(!builder)throw new Error('VisualFries renderer is not initialized.');if(!window.__VISUALFRIES_FRAME_WRITER__)throw new Error('VisualFries frame writer binding is not available.');return await builder.renderFrameRange({fromFrame,toFrame,format:'blob',quality:1,imageFormat,imageQuality,skipDuplicates,onFrame:async({frameIndex,frame,isDuplicate,mimeType,release})=>{const dataUrl=isDuplicate?undefined:await framePayloadToDataUrl(frame);await window.__VISUALFRIES_FRAME_WRITER__({frameIndex,isDuplicate,mimeType,dataUrl});release();}});},
	async destroy(){await builder?.destroy?.();builder=undefined;}
};`,
		'utf8'
	);
};

const writeEarcutShim = async (rootDir: string, earcutEntry: string): Promise<void> => {
	const source = await fs.readFile(earcutEntry, 'utf8');
	const esmSource = source
		.replace(/['"]use strict['"];?\s*/, '')
		.replace(/module\.exports\s*=\s*earcut;\s*/, '')
		.replace(/module\.exports\.default\s*=\s*earcut;\s*/, '');
	await fs.writeFile(
		path.join(rootDir, 'earcut-shim.js'),
		`${esmSource}\nexport default earcut;\n`,
		'utf8'
	);
};

const findBrowserExecutable = (explicit?: string): string | undefined => {
	const candidates = [
		explicit,
		process.env.VISUALFRIES_CHROMIUM_PATH,
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		path.join(
			os.homedir(),
			'.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell'
		)
	].filter(Boolean) as string[];
	return candidates.find((candidate) => existsSync(candidate));
};

const resolveRenderAudioInput = async (input: {
	scene: Scene;
	audioOverride?: string;
	activeRange: { fromFrame: number; toFrame: number } | null;
	fps: number;
	tempRoot: string;
}): Promise<{
	audioInput?: string;
	audioMix: LocalRenderResult['audio'];
}> => {
	if (input.audioOverride === 'none') {
		return {
			audioInput: undefined,
			audioMix: { mode: 'none', selectedSources: 0, skippedSources: 0, plannedSources: 0 }
		};
	}
	if (input.audioOverride) {
		return {
			audioInput: resolveAudioInput(input.audioOverride),
			audioMix: { mode: 'override', selectedSources: 1, skippedSources: 0, plannedSources: 1 }
		};
	}
	if (!input.activeRange) {
		const fallback = findPrimaryAudioInput(input.scene);
		return {
			audioInput: fallback,
			audioMix: {
				mode: fallback ? 'primary-fallback' : 'none',
				selectedSources: fallback ? 1 : 0,
				skippedSources: 0,
				plannedSources: fallback ? 1 : 0
			}
		};
	}

	const ranges = resolveAudioMixRanges(
		input.scene,
		input.activeRange.fromFrame / input.fps,
		input.activeRange.toFrame / input.fps
	);
	const mixed = await buildLocalMixedAudioTrack({
		scene: input.scene,
		ranges,
		workDir: path.join(input.tempRoot, 'audio'),
		renderId: `visualfries-local-${Date.now()}`
	});
	return {
		audioInput: mixed.audioPath ?? undefined,
		audioMix: {
			mode: mixed.audioPath ? 'mixed' : 'none',
			selectedSources: mixed.selectedSources,
			skippedSources: mixed.skippedSources,
			plannedSources: mixed.plannedSources.length,
			path: mixed.audioPath ?? undefined
		}
	};
};

export async function renderSceneLocally(options: LocalRenderOptions): Promise<LocalRenderResult> {
	const parsed = SceneShape.parse(options.scene);
	const normalizedImageFormat = normalizeImageFormat(options.imageFormat);
	const imageQuality = normalizeImageQuality(options.imageQuality);
	const tmpParent =
		options.tmpDir ||
		process.env.VISUALFRIES_TMPDIR ||
		(existsSync('/private/tmp') ? '/private/tmp' : os.tmpdir());
	const tempRoot = await fs.mkdtemp(path.join(tmpParent, 'visualfries-render-'));
	const framesOnly = options.framesOnly ?? false;
	const framesDir = framesOnly ? path.resolve(options.output) : path.join(tempRoot, 'frames');
	await fs.mkdir(framesDir, { recursive: true });

	let server: any;
	let browser: any;
	let activeStreamEncoder: PipeFrameEncoder | undefined;
	try {
		const activeRange =
			options.environment === 'client' ? null : contiguousFrameRange(options.frameIndices);
		const mediaPreparationRange =
			activeRange ??
			(options.frameIndices.length > 0
				? {
						fromFrame: Math.min(...options.frameIndices),
						toFrame: Math.max(...options.frameIndices) + 1
					}
				: null);
		const effectiveRanges = activeRange
			? resolveEffectiveRenderRanges({
					scene: parsed,
					fromFrame: activeRange.fromFrame,
					toFrame: activeRange.toFrame,
					fps: options.fps
				}).ranges
			: [];
		const renderPlan = options.renderPlan ?? resolveAgentRenderPlan(parsed);
		if (activeRange && effectiveRanges.length === 0) {
			if (!framesOnly) {
				throw new Error('All requested frames are removed by trimZones; no frames to encode.');
			}
			return {
				ok: true,
				scene: {
					id: parsed.id,
					width: parsed.settings.width,
					height: parsed.settings.height,
					duration: parsed.settings.duration,
					fps: parsed.settings.fps
				},
				frames: {
					count: 0,
					dir: framesDir,
					items: [],
					transport: 'range-binding',
					skippedDuplicates: 0
				},
				output: path.resolve(options.output),
				encoded: false,
				encoding: { mode: 'none' },
				audio: {
					mode: 'none',
					selectedSources: 0,
					skippedSources: 0,
					plannedSources: 0
				},
				mediaDiagnosticsPath: null,
				mediaDiagnostics: options.mediaDiagnostics
					? [
							{
								kind: 'visualfries-local-render',
								engine: renderPlan.engine,
								frameCount: 0,
								requestedFrameCount: options.frameIndices.length,
								trimAwareRanges: effectiveRanges,
								serverRendererMode: options.serverRendererMode ?? 'canvas',
								transport: 'range-binding'
							}
						]
					: []
			};
		}
		let sceneForRender = parsed;
		let deterministicMediaDiagnostics: Array<Record<string, unknown>> = [];
		if (renderPlan.engine === 'deterministic-local') {
			if (!mediaPreparationRange)
				throw new Error('Local deterministic media render requires at least one frame.');
			const deterministicMedia = await prepareLocalDeterministicMedia({
				scene: parsed,
				workDir: tempRoot,
				fromFrame: mediaPreparationRange.fromFrame,
				toFrame: mediaPreparationRange.toFrame,
				strict: true,
				diagnostics: options.mediaDiagnostics ?? false
			});
			sceneForRender = deterministicMedia.preparedScene;
			deterministicMediaDiagnostics = deterministicMedia.media.map((media) => ({
				kind: 'predecoded-media',
				componentId: media.componentId,
				type: media.type,
				sourceUrl: media.sourceUrl,
				framesPrepared: media.framesPrepared,
				strategy: deterministicMedia.strategyUsed
			}));
			await fs.writeFile(
				path.join(tempRoot, 'deterministic-media.json'),
				`${JSON.stringify(deterministicMedia.payload, null, 2)}\n`
			);
		} else {
			await fs.writeFile(path.join(tempRoot, 'deterministic-media.json'), 'null\n');
		}
		await fs.writeFile(
			path.join(tempRoot, 'renderer-options.json'),
			`${JSON.stringify(
				{
					serverRendererMode: options.serverRendererMode ?? 'canvas',
					environment: options.environment ?? 'server',
					preferWebGL2: options.preferWebGL2 ?? true,
					powerPreference: options.powerPreference ?? 'high-performance'
				},
				null,
				2
			)}\n`
		);

		await writeRenderClient(tempRoot);
		const packageRoot = options.packageRoot ?? defaultPackageRoot;
		const { createServer } = await importFromOptionalPaths(
			'vite',
			'VISUALFRIES_VITE_MODULES',
			options.modulePaths
		);
		const sveltePluginModule = await importFromOptionalPaths(
			'@sveltejs/vite-plugin-svelte',
			'VISUALFRIES_SVELTE_VITE_MODULES',
			options.modulePaths
		);
		const sourceLib = path.join(packageRoot, 'src/lib');
		const packagedLib = path.join(packageRoot, 'dist');
		const libRoot = existsSync(path.join(sourceLib, 'index.ts')) ? sourceLib : packagedLib;
		const runtimeEntry = existsSync(path.join(sourceLib, 'factories/SceneBuilderFactory.ts'))
			? path.join(sourceLib, 'factories/SceneBuilderFactory.ts')
			: path.join(packageRoot, 'dist/factories/SceneBuilderFactory.js');
		const svelteClientEntry = resolveModulePathFromOptionalPaths(
			'svelte/internal/client',
			'VISUALFRIES_NODE_MODULES',
			options.modulePaths,
			path.join(packageRoot, 'node_modules/svelte/src/internal/client/index.js')
		);
		const svelteServerEntry = resolveModulePathFromOptionalPaths(
			'svelte/internal/server',
			'VISUALFRIES_NODE_MODULES',
			options.modulePaths,
			path.join(packageRoot, 'node_modules/svelte/src/internal/server/index.js')
		);
		const earcutEntry = resolveModulePathFromOptionalPaths(
			'earcut',
			'VISUALFRIES_NODE_MODULES',
			options.modulePaths,
			path.join(packageRoot, 'node_modules/earcut/src/earcut.js')
		);
		await writeEarcutShim(tempRoot, earcutEntry);
		const resolveAliases: Record<string, string> = {
			'visualfries-runtime': runtimeEntry,
			$lib: libRoot,
			url: path.join(tempRoot, 'node-url-shim.js'),
			eventemitter3: path.join(tempRoot, 'eventemitter3-shim.js'),
			earcut: path.join(tempRoot, 'earcut-shim.js'),
			md5: path.join(tempRoot, 'md5-shim.js'),
			'svelte/internal/client': svelteClientEntry,
			'svelte/internal/server': svelteServerEntry
		};
		if (renderPlan.engine === 'deterministic-local') {
			resolveAliases['gifuct-js'] = path.join(tempRoot, 'gifuct-js-shim.js');
		}
		server = await createServer({
			root: tempRoot,
			logLevel: 'error',
			plugins: [sveltePluginModule.svelte()],
			server: { host: '127.0.0.1', port: 0, fs: { allow: [tempRoot, packageRoot] } },
			resolve: {
				alias: resolveAliases,
				conditions: ['browser', 'svelte']
			},
			optimizeDeps: { exclude: ['visualfries-runtime'], include: ['earcut'] }
		});
		await server.listen();
		const url = server.resolvedUrls?.local?.[0];
		if (!url) throw new Error('Vite renderer did not expose a local URL.');
		const renderScene = await copyLocalMediaToRenderRoot(sceneForRender, tempRoot, url);
		await fs.writeFile(
			path.join(tempRoot, 'scene.json'),
			`${JSON.stringify(renderScene, null, 2)}\n`
		);

		const playwright = await importFromOptionalPaths(
			'playwright',
			'VISUALFRIES_PLAYWRIGHT_MODULES',
			options.modulePaths
		);
		const chromium = playwright.chromium ?? playwright.default?.chromium;
		if (!chromium) throw new Error('playwright was found, but chromium is not available.');
		const executablePath = findBrowserExecutable(options.chromiumPath);
		browser = await chromium.launch({
			headless: true,
			...(executablePath ? { executablePath } : {})
		});
		const page = await browser.newPage({
			viewport: { width: parsed.settings.width, height: parsed.settings.height },
			deviceScaleFactor: 1
		});

		const { audioInput, audioMix } = await resolveRenderAudioInput({
			scene: parsed,
			audioOverride: options.audioOverride,
			activeRange,
			fps: options.fps,
			tempRoot
		});
		const outputPath = path.resolve(options.output);
		const useStreamEncode = Boolean(options.streamEncode && !framesOnly);
		if (useStreamEncode && !activeRange)
			throw new Error('streamEncode requires a contiguous frame range.');
		const streamedSilentOutput = audioInput ? path.join(tempRoot, 'silent-stream.mp4') : outputPath;
		activeStreamEncoder = useStreamEncode
			? new PipeFrameEncoder({
					fps: options.fps,
					inputExt: normalizedImageFormat,
					outputPath: streamedSilentOutput,
					crf: options.crf,
					preset: options.preset
				})
			: undefined;
		const streamEncoder = activeStreamEncoder;

		const frames: LocalRenderResult['frames']['items'] = [];
		let previousFramePath: string | undefined;
		let previousFrameBuffer: Buffer | undefined;
		let outputFrameIndex = 0;
		let streamEncodeMs = 0;
		await page.exposeFunction('__VISUALFRIES_FRAME_WRITER__', async (payload: any) => {
			if (!activeRange)
				throw new Error('VisualFries frame writer is only available for contiguous frame ranges.');
			outputFrameIndex += 1;
			const outputIndex = outputFrameIndex;
			const framePath = path.join(
				framesDir,
				`frame-${String(outputIndex).padStart(6, '0')}.${normalizedImageFormat}`
			);
			if (streamEncoder) {
				let frameBuffer: Buffer;
				if (payload.isDuplicate) {
					if (!previousFrameBuffer)
						throw new Error(
							`Frame ${payload.frameIndex} was marked duplicate without a previous frame.`
						);
					frameBuffer = previousFrameBuffer;
				} else if (payload.dataUrl) {
					frameBuffer = dataUrlToBuffer(payload.dataUrl);
				} else {
					throw new Error(`Frame ${payload.frameIndex} did not include frame data.`);
				}
				await streamEncoder.writeFrame(frameBuffer);
				previousFrameBuffer = frameBuffer;
			} else {
				if (payload.isDuplicate) {
					if (!previousFramePath)
						throw new Error(
							`Frame ${payload.frameIndex} was marked duplicate without a previous frame.`
						);
					await fs.copyFile(previousFramePath, framePath);
				} else if (payload.dataUrl) {
					await writeDataUrlFrame(payload.dataUrl, framePath);
				} else {
					throw new Error(`Frame ${payload.frameIndex} did not include frame data.`);
				}
				previousFramePath = framePath;
			}
			frames.push({
				frame: payload.frameIndex,
				time: payload.frameIndex / options.fps,
				path: streamEncoder ? null : framePath,
				isDuplicate: Boolean(payload.isDuplicate)
			});
		});
		const runtimeErrors: string[] = [];
		page.on('console', (message: any) => {
			if (message.type() === 'error') {
				const diagnostic = `console: ${message.text()}`;
				runtimeErrors.push(diagnostic);
				console.error(`[browser] ${message.text()}`);
			}
		});
		page.on('pageerror', (error: Error) => {
			runtimeErrors.push(`pageerror: ${error.message}`);
			console.error(`[browser pageerror] ${error.message}\n${error.stack || ''}`);
		});
		page.on('requestfailed', (request: any) => {
			runtimeErrors.push(
				`requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`
			);
		});
		page.on('response', (response: any) => {
			if (response.status() >= 400) {
				runtimeErrors.push(`http: ${response.status()} ${response.url()}`);
			}
		});
		await page.goto(url, { waitUntil: 'networkidle' });
		await page.waitForFunction(() => Boolean((window as any).__VISUALFRIES_RENDER__));
		const info = await page.evaluate(() => (window as any).__VISUALFRIES_RENDER__.init());
		const explanations: Array<Record<string, unknown> | null> = [];
		for (const request of options.explain ?? []) {
			explanations.push(
				await page.evaluate(
					(payload: any) => (window as any).__VISUALFRIES_RENDER__.explainFrame(payload),
					{ componentId: request.componentId, time: request.frame / options.fps }
				)
			);
		}

		let rangeSummary: any;
		if (activeRange) {
			rangeSummary = { framesSkipped: 0 };
			for (const range of effectiveRanges) {
				const summary = await page.evaluate(
					(renderOptions: any) =>
						(window as any).__VISUALFRIES_RENDER__.renderFrameRange(renderOptions),
					{
						fromFrame: range.fromFrame,
						toFrame: range.toFrame,
						imageFormat: normalizedImageFormat,
						imageQuality,
						skipDuplicates: options.skipDuplicates ?? false
					}
				);
				rangeSummary.framesSkipped += summary?.framesSkipped ?? 0;
			}
		} else {
			for (let index = 0; index < options.frameIndices.length; index += 1) {
				const frame = options.frameIndices[index];
				const time = frame / options.fps;
				const framePath = path.join(
					framesDir,
					`frame-${String(index + 1).padStart(6, '0')}.${normalizedImageFormat}`
				);
				if (options.environment === 'client') {
					await page.evaluate(
						(payload: any) => (window as any).__VISUALFRIES_RENDER__.seek(payload),
						{ time }
					);
					const screenshot = await page.locator('#vf-root').screenshot({
						type: normalizedImageFormat === 'png' ? 'png' : 'jpeg',
						...(normalizedImageFormat === 'png' ? {} : { quality: Math.round(imageQuality * 100) })
					});
					await fs.writeFile(framePath, screenshot);
				} else {
					const dataUrl = await page.evaluate(
						(renderOptions: any) =>
							(window as any).__VISUALFRIES_RENDER__.renderFrame(renderOptions),
						{ time, imageFormat: normalizedImageFormat, imageQuality }
					);
					await writeDataUrlFrame(dataUrl, framePath);
				}
				frames.push({ frame, time, path: framePath, isDuplicate: false });
			}
		}
		await page.evaluate(() => (window as any).__VISUALFRIES_RENDER__.destroy());

		let encoded = false;
		if (!framesOnly) {
			if (streamEncoder) {
				const streamResult = await streamEncoder.finish();
				activeStreamEncoder = undefined;
				streamEncodeMs = streamResult.elapsedMs;
				if (audioInput)
					await muxAudioWithVideo({
						videoPath: streamedSilentOutput,
						audioPath: audioInput,
						outputPath
					});
			} else {
				await encodeFrames({
					framesDir,
					output: outputPath,
					fps: options.fps,
					imageFormat: normalizedImageFormat,
					audioInput
				});
			}
			encoded = true;
		}

		const mediaDiagnostics = options.mediaDiagnostics
			? [
					{
						kind: 'visualfries-local-render',
						engine: renderPlan.engine,
						frameCount: frames.length,
						requestedFrameCount: options.frameIndices.length,
						trimAwareRanges: effectiveRanges,
						serverRendererMode: options.serverRendererMode ?? 'canvas',
						transport: streamEncoder
							? 'range-binding-stream-encode'
							: activeRange
								? 'range-binding'
								: 'sparse-evaluate'
					},
					...deterministicMediaDiagnostics
				]
			: [];
		const mediaDiagnosticsPath = options.mediaDiagnostics
			? path.join(
					framesOnly ? path.resolve(options.output) : path.dirname(outputPath),
					'media-diagnostics.json'
				)
			: null;
		if (mediaDiagnosticsPath) {
			await fs.mkdir(path.dirname(mediaDiagnosticsPath), { recursive: true });
			await fs.writeFile(
				mediaDiagnosticsPath,
				`${JSON.stringify(mediaDiagnostics, null, 2)}\n`,
				'utf8'
			);
		}

		return {
			ok: true,
			scene: info,
			frames: {
				count: frames.length,
				dir: framesDir,
				items: frames,
				transport: streamEncoder
					? 'range-binding-stream-encode'
					: activeRange
						? 'range-binding'
						: 'sparse-evaluate',
				skippedDuplicates: rangeSummary?.framesSkipped ?? 0
			},
			output: outputPath,
			encoded,
			encoding: streamEncoder
				? { mode: 'image2pipe', elapsedMs: streamEncodeMs, audioMuxed: Boolean(audioInput) }
				: { mode: framesOnly ? 'none' : 'frame-sequence' },
			audio: audioMix,
			mediaDiagnosticsPath,
			mediaDiagnostics,
			runtimeErrors: [...new Set(runtimeErrors)],
			...(options.explain ? { explanations } : {})
		};
	} finally {
		activeStreamEncoder?.abort();
		await browser?.close?.();
		await server?.close?.();
		if (!options.keepFrames) await fs.rm(tempRoot, { recursive: true, force: true });
	}
}
