import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { SceneShape } from '../schemas/scene/index.js';
import { buildLocalMixedAudioTrack, resolveAudioMixRanges } from './audioMixer.js';
import { prepareLocalDeterministicMedia } from './deterministicMedia.js';
import { resolveEffectiveRenderRanges } from './renderRanges.js';
import { resolveAgentRenderPlan } from './renderPlan.js';
import { muxAudioWithVideo, PipeFrameEncoder } from './streamingEncoder.js';
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const defaultPackageRoot = path.resolve(currentDir, '..', '..');
const isRemoteUrl = (value) => typeof value === 'string' && /^[a-z]+:\/\//i.test(value) && !value.startsWith('file://');
const localPathFromUrl = (value) => {
    if (!value || typeof value !== 'string')
        return undefined;
    if (value.startsWith('file://'))
        return fileURLToPath(value);
    if (isRemoteUrl(value) || value.startsWith('data:') || value.startsWith('/'))
        return undefined;
    return path.resolve(value);
};
const extensionForMedia = (filePath) => path.extname(filePath) || '.bin';
const normalizeImageFormat = (value) => {
    const resolved = value ?? 'png';
    if (resolved === 'png' || resolved === 'jpg')
        return resolved;
    if (resolved === 'jpeg')
        return 'jpg';
    throw new Error('imageFormat must be png, jpg, or jpeg.');
};
export const normalizeImageQuality = (value, fallback = 0.92) => {
    if (value === undefined)
        return fallback;
    if (!Number.isFinite(value))
        throw new Error('imageQuality must be a finite number.');
    if (value < 0)
        throw new Error('imageQuality must be >= 0.');
    if (value <= 1)
        return value;
    if (value <= 100)
        return value / 100;
    throw new Error('imageQuality must be in 0..1 or 0..100 percent form.');
};
const contiguousFrameRange = (frameIndices) => {
    if (!frameIndices.length)
        return null;
    const fromFrame = frameIndices[0];
    for (let index = 1; index < frameIndices.length; index += 1) {
        if (frameIndices[index] !== fromFrame + index)
            return null;
    }
    return { fromFrame, toFrame: fromFrame + frameIndices.length };
};
const dataUrlToBuffer = (dataUrl) => {
    const commaIndex = dataUrl.indexOf(',');
    const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    return Buffer.from(base64, 'base64');
};
const writeDataUrlFrame = async (dataUrl, framePath) => {
    await fs.writeFile(framePath, dataUrlToBuffer(dataUrl));
};
const framePattern = (framesDir, imageFormat) => path.join(framesDir, `frame-%06d.${imageFormat}`);
const runCommand = async (command, args) => {
    await new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'inherit' });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`${command} exited with code ${code}.`));
        });
    });
};
const encodeFrames = async (input) => {
    const args = ['-y', '-framerate', String(input.fps), '-i', framePattern(input.framesDir, input.imageFormat)];
    if (input.audioInput) {
        args.push('-i', input.audioInput, '-map', '0:v:0', '-map', '1:a:0?', '-shortest');
    }
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-crf', '18', input.output);
    await runCommand('ffmpeg', args);
};
const importFromOptionalPaths = async (moduleName, envName, modulePaths = {}) => {
    try {
        return await import(moduleName);
    }
    catch (initialError) {
        const configured = moduleName === 'vite'
            ? modulePaths.vite
            : moduleName === '@sveltejs/vite-plugin-svelte'
                ? modulePaths.svelteVitePlugin
                : moduleName === 'playwright'
                    ? modulePaths.playwright
                    : undefined;
        const extraPaths = [configured, modulePaths.nodeModules, process.env[envName], process.env.VISUALFRIES_NODE_MODULES].filter(Boolean);
        for (const moduleDir of extraPaths) {
            try {
                const require = createRequire(import.meta.url);
                const resolved = require.resolve(moduleName, { paths: [moduleDir] });
                return await import(pathToFileURL(resolved).toString());
            }
            catch {
                // Try next path.
            }
        }
        throw initialError;
    }
};
const resolveModulePathFromOptionalPaths = (moduleName, envName, modulePaths = {}, fallback) => {
    const configured = moduleName === 'vite'
        ? modulePaths.vite
        : moduleName === '@sveltejs/vite-plugin-svelte'
            ? modulePaths.svelteVitePlugin
            : moduleName === 'playwright'
                ? modulePaths.playwright
                : undefined;
    const extraPaths = [configured, modulePaths.nodeModules, process.env[envName], process.env.VISUALFRIES_NODE_MODULES].filter(Boolean);
    const require = createRequire(import.meta.url);
    for (const moduleDir of extraPaths) {
        try {
            return require.resolve(moduleName, { paths: [moduleDir] });
        }
        catch {
            // Try next path.
        }
    }
    try {
        return require.resolve(moduleName);
    }
    catch {
        if (fallback)
            return fallback;
        throw new Error(`Could not resolve ${moduleName}. Pass modulePaths.nodeModules or set VISUALFRIES_NODE_MODULES.`);
    }
};
const copyLocalMediaToRenderRoot = async (scene, renderRoot, baseUrl) => {
    const cloned = structuredClone(scene);
    const mediaDir = path.join(renderRoot, 'media');
    await fs.mkdir(mediaDir, { recursive: true });
    const copied = new Map();
    let index = 0;
    const rewriteUrl = async (value) => {
        if (!value)
            return value;
        const localPath = localPathFromUrl(value);
        if (!localPath || !existsSync(localPath))
            return value;
        if (copied.has(localPath))
            return copied.get(localPath);
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
        cloned.settings.audio.src = (await rewriteUrl(cloned.settings.audio.src)) ?? cloned.settings.audio.src;
    }
    for (const layer of cloned.layers ?? []) {
        for (const component of layer.components ?? []) {
            if ('source' in component && component.source?.url) {
                component.source.url = (await rewriteUrl(component.source.url)) ?? component.source.url;
            }
        }
    }
    return cloned;
};
const findPrimaryAudioInput = (scene) => {
    const audioSrc = localPathFromUrl(scene.settings.audio?.src);
    if (audioSrc && existsSync(audioSrc))
        return audioSrc;
    if (isRemoteUrl(scene.settings.audio?.src))
        return scene.settings.audio?.src;
    for (const asset of scene.assets ?? []) {
        if (asset.type !== 'VIDEO')
            continue;
        const localPath = localPathFromUrl(asset.url);
        if (localPath && existsSync(localPath))
            return localPath;
        if (isRemoteUrl(asset.url))
            return asset.url;
    }
    return undefined;
};
const resolveAudioInput = (value) => {
    if (!value || value === 'none')
        return undefined;
    return isRemoteUrl(value) ? value : path.resolve(value);
};
const writeRenderClient = async (rootDir) => {
    await fs.writeFile(path.join(rootDir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="icon" href="data:," /><title>VisualFries Local Renderer</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}#vf-root{position:relative;overflow:hidden;background:#000}</style></head><body><div id="vf-root"></div><script type="module" src="/render-client.js"></script></body></html>`, 'utf8');
    await fs.writeFile(path.join(rootDir, 'node-url-shim.js'), `export function parse(value){try{const u=new URL(value,globalThis.location?.href||'http://localhost/');return{protocol:u.protocol,slashes:value.includes('//'),auth:u.username?u.username+(u.password?':'+u.password:''):null,host:u.host,port:u.port,hostname:u.hostname,hash:u.hash,search:u.search,query:u.search?u.search.slice(1):null,pathname:u.pathname,path:u.pathname+u.search,href:u.href};}catch{return{href:String(value),path:String(value),pathname:String(value),query:null,search:null,hash:null};}}\nexport function format(value){if(typeof value==='string')return value;if(value?.href)return value.href;return String((value?.protocol||'')+(value?.slashes?'//':'')+(value?.host||'')+(value?.pathname||value?.path||'')+(value?.search||'')+(value?.hash||''));}\nexport function resolve(from,to){return new URL(to,from||globalThis.location?.href||'http://localhost/').toString();}\nexport default{parse,format,resolve};\n`, 'utf8');
    await fs.writeFile(path.join(rootDir, 'eventemitter3-shim.js'), `export default class EventEmitter{constructor(){this._events=new Map();}on(name,fn){const list=this._events.get(name)||[];list.push(fn);this._events.set(name,list);return this;}addListener(name,fn){return this.on(name,fn);}once(name,fn){const wrapped=(...args)=>{this.off(name,wrapped);fn(...args);};return this.on(name,wrapped);}off(name,fn){return this.removeListener(name,fn);}removeListener(name,fn){const list=this._events.get(name)||[];this._events.set(name,list.filter((item)=>item!==fn));return this;}removeAllListeners(name){if(name===undefined)this._events.clear();else this._events.delete(name);return this;}emit(name,...args){const list=this._events.get(name)||[];for(const fn of [...list])fn(...args);return list.length>0;}listeners(name){return [...(this._events.get(name)||[])];}listenerCount(name){return this.listeners(name).length;}eventNames(){return [...this._events.keys()];}}\nexport { EventEmitter };\n`, 'utf8');
    await fs.writeFile(path.join(rootDir, 'md5-shim.js'), `export default function md5(value){const text=typeof value==='string'?value:JSON.stringify(value);let h1=0x811c9dc5,h2=0x9e3779b9;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);h1^=c;h1=Math.imul(h1,0x01000193);h2^=c+(h1>>>0);h2=Math.imul(h2,0x85ebca6b);}return ((h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0')).repeat(2);}\n`, 'utf8');
    await fs.writeFile(path.join(rootDir, 'gifuct-js-shim.js'), `const unsupported=()=>{throw new Error('Browser GIF decoding is unavailable in the local deterministic renderer. Use the predecoded deterministic media path.');};\nexport const parseGIF=unsupported;\nexport const decompressFrames=unsupported;\nexport const decompressFrame=unsupported;\nexport default{parseGIF,decompressFrames,decompressFrame};\n`, 'utf8');
    await fs.writeFile(path.join(rootDir, 'render-client.js'), `import { createSceneBuilder } from 'visualfries-runtime';
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
		builder=await createSceneBuilder(scene,root,{environment:'server',autoPlay:false,loop:false,scale:1,forceCanvas:serverRendererMode!=='webgl',serverRendererMode,preferWebGL2:rendererOptions.preferWebGL2!==false,powerPreference:rendererOptions.powerPreference||'high-performance',deterministicMedia:{enabled:Boolean(deterministicProvider),strict:Boolean(deterministicProvider&&deterministicMediaPayload?.mediaDeterministicStrict),diagnostics:Boolean(deterministicProvider&&deterministicMediaPayload?.diagnosticsEnabled),provider:deterministicProvider}});
		return{id:scene.id,width:scene.settings.width,height:scene.settings.height,duration:scene.settings.duration,fps:scene.settings.fps??30};
	},
	async renderFrame({time,imageFormat,imageQuality}){if(!builder)throw new Error('VisualFries renderer is not initialized.');await builder.seek(time);const frame=await builder.renderFrame(undefined,'blob',1,{imageFormat,imageQuality});return await framePayloadToDataUrl(frame);},
	async renderFrameRange({fromFrame,toFrame,imageFormat,imageQuality,skipDuplicates}){if(!builder)throw new Error('VisualFries renderer is not initialized.');if(!window.__VISUALFRIES_FRAME_WRITER__)throw new Error('VisualFries frame writer binding is not available.');return await builder.renderFrameRange({fromFrame,toFrame,format:'blob',quality:1,imageFormat,imageQuality,skipDuplicates,onFrame:async({frameIndex,frame,isDuplicate,mimeType,release})=>{const dataUrl=isDuplicate?undefined:await framePayloadToDataUrl(frame);await window.__VISUALFRIES_FRAME_WRITER__({frameIndex,isDuplicate,mimeType,dataUrl});release();}});},
	destroy(){builder?.destroy?.();builder=undefined;}
};`, 'utf8');
};
const writeEarcutShim = async (rootDir, earcutEntry) => {
    const source = await fs.readFile(earcutEntry, 'utf8');
    const esmSource = source
        .replace(/['"]use strict['"];?\s*/, '')
        .replace(/module\.exports\s*=\s*earcut;\s*/, '')
        .replace(/module\.exports\.default\s*=\s*earcut;\s*/, '');
    await fs.writeFile(path.join(rootDir, 'earcut-shim.js'), `${esmSource}\nexport default earcut;\n`, 'utf8');
};
const findBrowserExecutable = (explicit) => {
    const candidates = [
        explicit,
        process.env.VISUALFRIES_CHROMIUM_PATH,
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell')
    ].filter(Boolean);
    return candidates.find((candidate) => existsSync(candidate));
};
const resolveRenderAudioInput = async (input) => {
    if (input.audioOverride === 'none') {
        return { audioInput: undefined, audioMix: { mode: 'none', selectedSources: 0, skippedSources: 0, plannedSources: 0 } };
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
    const ranges = resolveAudioMixRanges(input.scene, input.activeRange.fromFrame / input.fps, input.activeRange.toFrame / input.fps);
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
export async function renderSceneLocally(options) {
    const parsed = SceneShape.parse(options.scene);
    const normalizedImageFormat = normalizeImageFormat(options.imageFormat);
    const imageQuality = normalizeImageQuality(options.imageQuality);
    const tmpParent = options.tmpDir || process.env.VISUALFRIES_TMPDIR || (existsSync('/private/tmp') ? '/private/tmp' : os.tmpdir());
    const tempRoot = await fs.mkdtemp(path.join(tmpParent, 'visualfries-render-'));
    const framesOnly = options.framesOnly ?? false;
    const framesDir = framesOnly ? path.resolve(options.output) : path.join(tempRoot, 'frames');
    await fs.mkdir(framesDir, { recursive: true });
    let server;
    let browser;
    let activeStreamEncoder;
    try {
        const activeRange = contiguousFrameRange(options.frameIndices);
        const effectiveRanges = activeRange
            ? resolveEffectiveRenderRanges({
                scene: parsed,
                fromFrame: activeRange.fromFrame,
                toFrame: activeRange.toFrame,
                fps: options.fps
            }).ranges
            : [];
        const renderPlan = options.renderPlan ?? resolveAgentRenderPlan(parsed);
        let sceneForRender = parsed;
        let deterministicMediaDiagnostics = [];
        if (renderPlan.engine === 'deterministic-local') {
            if (!activeRange)
                throw new Error('Local deterministic media render requires a contiguous frame range.');
            const deterministicMedia = await prepareLocalDeterministicMedia({
                scene: parsed,
                workDir: tempRoot,
                fromFrame: activeRange.fromFrame,
                toFrame: activeRange.toFrame,
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
            await fs.writeFile(path.join(tempRoot, 'deterministic-media.json'), `${JSON.stringify(deterministicMedia.payload, null, 2)}\n`);
        }
        else {
            await fs.writeFile(path.join(tempRoot, 'deterministic-media.json'), 'null\n');
        }
        await fs.writeFile(path.join(tempRoot, 'renderer-options.json'), `${JSON.stringify({
            serverRendererMode: options.serverRendererMode ?? 'canvas',
            preferWebGL2: options.preferWebGL2 ?? true,
            powerPreference: options.powerPreference ?? 'high-performance'
        }, null, 2)}\n`);
        await writeRenderClient(tempRoot);
        const packageRoot = options.packageRoot ?? defaultPackageRoot;
        const { createServer } = await importFromOptionalPaths('vite', 'VISUALFRIES_VITE_MODULES', options.modulePaths);
        const sveltePluginModule = await importFromOptionalPaths('@sveltejs/vite-plugin-svelte', 'VISUALFRIES_SVELTE_VITE_MODULES', options.modulePaths);
        const sourceLib = path.join(packageRoot, 'src/lib');
        const packagedLib = path.join(packageRoot, 'dist');
        const libRoot = existsSync(path.join(sourceLib, 'index.ts')) ? sourceLib : packagedLib;
        const runtimeEntry = existsSync(path.join(sourceLib, 'factories/SceneBuilderFactory.ts'))
            ? path.join(sourceLib, 'factories/SceneBuilderFactory.ts')
            : path.join(packageRoot, 'dist/factories/SceneBuilderFactory.js');
        const svelteClientEntry = resolveModulePathFromOptionalPaths('svelte/internal/client', 'VISUALFRIES_NODE_MODULES', options.modulePaths, path.join(packageRoot, 'node_modules/svelte/src/internal/client/index.js'));
        const svelteServerEntry = resolveModulePathFromOptionalPaths('svelte/internal/server', 'VISUALFRIES_NODE_MODULES', options.modulePaths, path.join(packageRoot, 'node_modules/svelte/src/internal/server/index.js'));
        const earcutEntry = resolveModulePathFromOptionalPaths('earcut', 'VISUALFRIES_NODE_MODULES', options.modulePaths, path.join(packageRoot, 'node_modules/earcut/src/earcut.js'));
        await writeEarcutShim(tempRoot, earcutEntry);
        server = await createServer({
            root: tempRoot,
            logLevel: 'error',
            plugins: [sveltePluginModule.svelte()],
            server: { host: '127.0.0.1', port: 0, fs: { allow: [tempRoot, packageRoot] } },
            resolve: {
                alias: {
                    'visualfries-runtime': runtimeEntry,
                    $lib: libRoot,
                    url: path.join(tempRoot, 'node-url-shim.js'),
                    eventemitter3: path.join(tempRoot, 'eventemitter3-shim.js'),
                    earcut: path.join(tempRoot, 'earcut-shim.js'),
                    md5: path.join(tempRoot, 'md5-shim.js'),
                    'gifuct-js': path.join(tempRoot, 'gifuct-js-shim.js'),
                    'svelte/internal/client': svelteClientEntry,
                    'svelte/internal/server': svelteServerEntry
                },
                conditions: ['browser', 'svelte']
            },
            optimizeDeps: { exclude: ['visualfries-runtime'], include: ['earcut'] }
        });
        await server.listen();
        const url = server.resolvedUrls?.local?.[0];
        if (!url)
            throw new Error('Vite renderer did not expose a local URL.');
        const renderScene = await copyLocalMediaToRenderRoot(sceneForRender, tempRoot, url);
        await fs.writeFile(path.join(tempRoot, 'scene.json'), `${JSON.stringify(renderScene, null, 2)}\n`);
        const playwright = await importFromOptionalPaths('playwright', 'VISUALFRIES_PLAYWRIGHT_MODULES', options.modulePaths);
        const chromium = playwright.chromium ?? playwright.default?.chromium;
        if (!chromium)
            throw new Error('playwright was found, but chromium is not available.');
        const executablePath = findBrowserExecutable(options.chromiumPath);
        browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
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
        const frames = [];
        let previousFramePath;
        let previousFrameBuffer;
        let outputFrameIndex = 0;
        let streamEncodeMs = 0;
        await page.exposeFunction('__VISUALFRIES_FRAME_WRITER__', async (payload) => {
            if (!activeRange)
                throw new Error('VisualFries frame writer is only available for contiguous frame ranges.');
            outputFrameIndex += 1;
            const outputIndex = outputFrameIndex;
            const framePath = path.join(framesDir, `frame-${String(outputIndex).padStart(6, '0')}.${normalizedImageFormat}`);
            if (streamEncoder) {
                let frameBuffer;
                if (payload.isDuplicate) {
                    if (!previousFrameBuffer)
                        throw new Error(`Frame ${payload.frameIndex} was marked duplicate without a previous frame.`);
                    frameBuffer = previousFrameBuffer;
                }
                else if (payload.dataUrl) {
                    frameBuffer = dataUrlToBuffer(payload.dataUrl);
                }
                else {
                    throw new Error(`Frame ${payload.frameIndex} did not include frame data.`);
                }
                await streamEncoder.writeFrame(frameBuffer);
                previousFrameBuffer = frameBuffer;
            }
            else {
                if (payload.isDuplicate) {
                    if (!previousFramePath)
                        throw new Error(`Frame ${payload.frameIndex} was marked duplicate without a previous frame.`);
                    await fs.copyFile(previousFramePath, framePath);
                }
                else if (payload.dataUrl) {
                    await writeDataUrlFrame(payload.dataUrl, framePath);
                }
                else {
                    throw new Error(`Frame ${payload.frameIndex} did not include frame data.`);
                }
                previousFramePath = framePath;
            }
            frames.push({ frame: payload.frameIndex, time: payload.frameIndex / options.fps, path: streamEncoder ? null : framePath, isDuplicate: Boolean(payload.isDuplicate) });
        });
        page.on('console', (message) => {
            if (message.type() === 'error')
                console.error(`[browser] ${message.text()}`);
        });
        page.on('pageerror', (error) => {
            console.error(`[browser pageerror] ${error.message}\n${error.stack || ''}`);
        });
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__VISUALFRIES_RENDER__));
        const info = await page.evaluate(() => window.__VISUALFRIES_RENDER__.init());
        let rangeSummary;
        if (activeRange) {
            rangeSummary = { framesSkipped: 0 };
            for (const range of effectiveRanges) {
                const summary = await page.evaluate((renderOptions) => window.__VISUALFRIES_RENDER__.renderFrameRange(renderOptions), {
                    fromFrame: range.fromFrame,
                    toFrame: range.toFrame,
                    imageFormat: normalizedImageFormat,
                    imageQuality,
                    skipDuplicates: options.skipDuplicates ?? false
                });
                rangeSummary.framesSkipped += summary?.framesSkipped ?? 0;
            }
        }
        else {
            for (let index = 0; index < options.frameIndices.length; index += 1) {
                const frame = options.frameIndices[index];
                const time = frame / options.fps;
                const dataUrl = await page.evaluate((renderOptions) => window.__VISUALFRIES_RENDER__.renderFrame(renderOptions), { time, imageFormat: normalizedImageFormat, imageQuality });
                const framePath = path.join(framesDir, `frame-${String(index + 1).padStart(6, '0')}.${normalizedImageFormat}`);
                await writeDataUrlFrame(dataUrl, framePath);
                frames.push({ frame, time, path: framePath, isDuplicate: false });
            }
        }
        await page.evaluate(() => window.__VISUALFRIES_RENDER__.destroy());
        let encoded = false;
        if (!framesOnly) {
            if (streamEncoder) {
                const streamResult = await streamEncoder.finish();
                activeStreamEncoder = undefined;
                streamEncodeMs = streamResult.elapsedMs;
                if (audioInput)
                    await muxAudioWithVideo({ videoPath: streamedSilentOutput, audioPath: audioInput, outputPath });
            }
            else {
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
                    transport: streamEncoder ? 'range-binding-stream-encode' : activeRange ? 'range-binding' : 'sparse-evaluate'
                },
                ...deterministicMediaDiagnostics
            ]
            : [];
        const mediaDiagnosticsPath = options.mediaDiagnostics
            ? path.join(framesOnly ? path.resolve(options.output) : path.dirname(outputPath), 'media-diagnostics.json')
            : null;
        if (mediaDiagnosticsPath) {
            await fs.mkdir(path.dirname(mediaDiagnosticsPath), { recursive: true });
            await fs.writeFile(mediaDiagnosticsPath, `${JSON.stringify(mediaDiagnostics, null, 2)}\n`, 'utf8');
        }
        return {
            ok: true,
            scene: info,
            frames: {
                count: frames.length,
                dir: framesDir,
                items: frames,
                transport: streamEncoder ? 'range-binding-stream-encode' : activeRange ? 'range-binding' : 'sparse-evaluate',
                skippedDuplicates: rangeSummary?.framesSkipped ?? 0
            },
            output: outputPath,
            encoded,
            encoding: streamEncoder
                ? { mode: 'image2pipe', elapsedMs: streamEncodeMs, audioMuxed: Boolean(audioInput) }
                : { mode: framesOnly ? 'none' : 'frame-sequence' },
            audio: audioMix,
            mediaDiagnosticsPath,
            mediaDiagnostics
        };
    }
    finally {
        activeStreamEncoder?.abort();
        await browser?.close?.();
        await server?.close?.();
        if (!options.keepFrames)
            await fs.rm(tempRoot, { recursive: true, force: true });
    }
}
