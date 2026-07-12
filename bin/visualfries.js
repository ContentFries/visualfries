#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	applyAgentCueFile,
	createCaptionScene,
	createAgentCuePreset,
	compileProductionPlan,
	getAgentCatalog,
	inspectScene,
	mergeAgentCueFiles,
	parseSubtitleText,
	renderSceneLocally,
	resolveAgentRenderPlan,
	validateAgentCueFile
} from '../dist/agent/index.js';
import { SceneShape } from '../dist/schemas/scene/index.js';

const packageRequire = createRequire(import.meta.url);
const { version: VERSION } = packageRequire('../package.json');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..');

function help() {
	console.log(`visualfries ${VERSION}

Usage:
  visualfries validate <scene.json> [--strict-runtime-support] [--json]
  visualfries inspect <scene.json> [--strict-runtime-support] [--json] [--screenshots --output <dir>]
  visualfries explain <scene.json> --component <id> [--frame <n>] [--json]
  visualfries parity <scene.json> --output <dir> [--frames 0,12,30] [--strict] [--json]
  visualfries init <dir> [--video <video> --transcript <file>] [options]
  visualfries caption-scene --video <video> --transcript <file> --output <scene.json> [options]
  visualfries preset-cues --duration <seconds> --output <cues.json> [options]
  visualfries validate-cues <cues.json> [--duration <seconds>] [--json]
  visualfries apply-cues <scene.json> --cues <cues.json> --output <scene.json> [options]
  visualfries compose --video <video> --transcript <file> --output <out.mp4|frames-dir> [options]
  visualfries produce <production-plan.json> --output <out.mp4> [options]
  visualfries qa <scene.json> --output <dir> [options]
  visualfries render <scene.json> --output <out.mp4|frames-dir> [options]
  visualfries catalog [--component <TYPE>] [--capabilities] [--json]
  visualfries doctor [--json]

caption-scene options:
  --preset <name>       reels-center | reels-lower | podcast-clean | hidden-engine-center
  --language <code>     Default: en
  --asset-id <id>       Default: main-video
  --duration <seconds>  Defaults to transcript end time
  --width <px>          Default: 1080
  --height <px>         Default: 1920
  --fps <number>        Default: 30

init options:
  --video <video>       Optional input video path or URL
  --transcript <file>   Optional transcript JSON, SRT, or VTT path
  --preset <name>       Caption preset when video+transcript are provided
  --cue-preset <name>   Cue preset for generated cues.json. Default: hidden-engine-dynamic
  --width <px>          Default: 1080
  --height <px>         Default: 1920
  --fps <number>        Default: 30

apply-cues options:
  --cues <json>         Cue file with overlays, broll, and/or transitions arrays
  --output <path>       Output scene JSON path
  --in-place            Write back to the input scene path

preset-cues options:
  --preset <name>       hidden-engine-dynamic | captioned-clean
  --duration <seconds>  Required
  --output <path>       Output cue JSON path

compose options:
  --video <video>       Input video path or URL
  --transcript <file>   Transcript JSON, SRT, or VTT path
  --output <path>       MP4 output path, or frames directory with --frames-only
  --scene-output <path> Optional scene JSON output path
  --cues <json>         Optional cue file to apply
  --cue-preset <name>   Optional starter cue preset to apply before --cues
  --qa-output <dir>     Optional sampled screenshot QA directory
  --skip-duplicates     Reuse identical deterministic frames on the final render

produce options:
  --output <path>       Final MP4 output path
  --scene-output <path> Compiled editable scene JSON (default: <plan>.scene.json)
  --qa-output <dir>     Exact QA frames and acceptance.json output directory
  --generated-assets <dir>
                       Generated freeze-frame assets (default: beside the plan)

render options:
  --output <path>       MP4 output path, or frames directory with --frames-only
  --render-mode <mode>  final | preview. Default: final
  --engine <engine>     auto | browser-preview | deterministic-local. Default: auto
  --allow-browser-media-final
                       Force legacy browser media output for VIDEO/GIF final renders.
                       Use only for local experiments; it is not deterministic.
  --frames-only         Render PNG frame sequence without ffmpeg encode
  --from-frame <n>      Default: 0
  --to-frame <n>        Default: ceil(duration * fps)
  --skip-duplicates     Reuse identical deterministic frames when VisualFries marks them clean
  --stream-encode       Pipe frames directly into ffmpeg instead of writing a temporary sequence
  --crf <number>        H.264 CRF for MP4 output. Default: 18
  --preset <name>       ffmpeg x264 preset for MP4 output. Default: veryfast
  --fps <number>        Defaults to scene settings fps
  --image-format <fmt>  png | jpg. Default: png
  --quality <number>    Image quality for jpg. Default: 0.92
  --keep-frames         Keep temporary frames after MP4 encode
  --audio <path|none>   Override audio input. Defaults to local scene audio mix.

qa options:
  --output <dir>        QA directory. Writes inspect.json and frames/
  --samples <n>         Number of sampled frames. Default: 3
  --image-format <fmt>  png | jpg. Default: png

inspect screenshot options:
  --screenshots         Render sampled QA frames into --output
  --output <dir>        Screenshot directory. Default: <scene>.qa
  --samples <n>         Number of sampled frames. Default: 3
  --image-format <fmt>  png | jpg. Default: png

doctor checks:
  ffmpeg, Vite, Svelte Vite plugin, Playwright, Chromium executable, temp dir

Notes:
  This CLI is the agent-facing scene contract. It creates and validates VisualFries
  scene JSON. Browser rendering is preview/QA for VIDEO/GIF scenes. Final VIDEO/GIF
  output must go through the local deterministic renderer.
`);
}

function readFlag(args, name, fallback = undefined) {
	const index = args.indexOf(name);
	if (index === -1) return fallback;
	return args[index + 1] ?? fallback;
}

function hasFlag(args, name) {
	return args.includes(name);
}

function numberFlag(args, name, fallback = undefined) {
	const raw = readFlag(args, name);
	if (raw === undefined) return fallback;
	const value = Number(raw);
	if (!Number.isFinite(value)) {
		throw new Error(`${name} must be a number.`);
	}
	return value;
}

function intFlag(args, name, fallback = undefined) {
	const value = numberFlag(args, name, fallback);
	if (value === undefined) return value;
	return Math.trunc(value);
}

async function readJson(filePath) {
	return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readTranscript(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === '.srt' || ext === '.vtt') {
		return parseSubtitleText(await fs.readFile(filePath, 'utf8'), ext === '.vtt' ? 'vtt' : 'srt');
	}
	return readJson(filePath);
}

function normalizeMediaUrl(value) {
	if (/^[a-z]+:\/\//i.test(value) || value.startsWith('file://')) return value;
	return pathToFileURL(path.resolve(value)).toString();
}

async function writeJson(filePath, data) {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function importFromOptionalPaths(moduleName, envName) {
	try {
		return await import(moduleName);
	} catch (initialError) {
		const extraPaths = [process.env[envName], process.env.VISUALFRIES_NODE_MODULES].filter(Boolean);
		for (const moduleDir of extraPaths) {
			try {
				const require = createRequire(import.meta.url);
				const resolved = require.resolve(moduleName, { paths: [moduleDir] });
				return await import(pathToFileURL(resolved).toString());
			} catch {
				// Try the next configured module path.
			}
		}

		const hint =
			moduleName === 'playwright'
				? 'Install playwright or set VISUALFRIES_PLAYWRIGHT_MODULES to a node_modules directory that contains it.'
				: `Install ${moduleName} or set ${envName} to a node_modules directory that contains it.`;
		throw new Error(`${moduleName} is required for rendering. ${hint}\n${initialError.message}`);
	}
}

async function probeCommand(command, args = ['-version']) {
	return await new Promise((resolve) => {
		let stdout = '';
		let stderr = '';
		const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		child.stdout.on('data', (chunk) => {
			stdout += String(chunk);
		});
		child.stderr.on('data', (chunk) => {
			stderr += String(chunk);
		});
		child.on('error', (error) => {
			resolve({ ok: false, error: error.message });
		});
		child.on('close', (code) => {
			resolve({
				ok: code === 0,
				code,
				version: `${stdout}\n${stderr}`.split(/\r?\n/).find(Boolean)
			});
		});
	});
}

function findBrowserExecutable() {
	const candidates = [
		process.env.VISUALFRIES_CHROMIUM_PATH,
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		path.join(
			os.homedir(),
			'.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell'
		)
	].filter(Boolean);
	return candidates.find((candidate) => existsSync(candidate));
}

function normalizeImageFormat(value) {
	if (!['png', 'jpg', 'jpeg'].includes(value)) {
		throw new Error('--image-format must be png, jpg, or jpeg.');
	}
	return value === 'jpeg' ? 'jpg' : value;
}

function frameRange(fromFrame, toFrame) {
	const frames = [];
	for (let frame = fromFrame; frame < toFrame; frame += 1) frames.push(frame);
	return frames;
}

function sampledFrames({ duration, fps, samples }) {
	const totalFrames = Math.max(1, Math.ceil(duration * fps));
	const count = Math.max(1, Math.trunc(samples));
	if (count === 1) return [0];
	const lastFrame = Math.max(0, totalFrames - 1);
	return Array.from({ length: count }, (_, index) =>
		Math.round((lastFrame * index) / Math.max(1, count - 1))
	);
}

function renderEncodingOptionsFromArgs(args, scene) {
	return {
		fps: numberFlag(args, '--fps', scene.settings.fps ?? 30),
		imageFormat: normalizeImageFormat(readFlag(args, '--image-format', 'png')),
		imageQuality: numberFlag(args, '--quality', 0.92)
	};
}

function renderPlanOptionsFromArgs(args) {
	const mode = readFlag(args, '--render-mode', 'final');
	const engine = readFlag(args, '--engine', 'auto');
	if (!['final', 'preview'].includes(mode)) {
		throw new Error('--render-mode must be final or preview.');
	}
	if (!['auto', 'browser-preview', 'deterministic-local'].includes(engine)) {
		throw new Error('--engine must be auto, browser-preview, or deterministic-local.');
	}
	return {
		mode,
		engine,
		allowBrowserMediaFinal: hasFlag(args, '--allow-browser-media-final')
	};
}

function assertBrowserRenderAllowed(scene, args) {
	const plan = resolveAgentRenderPlan(scene, renderPlanOptionsFromArgs(args));
	if (plan.blockers.length > 0) {
		throw new Error(
			[
				'VisualFries render blocked by render plan.',
				`mode=${plan.mode}`,
				`engine=${plan.engine}`,
				`requiresDeterministicMedia=${plan.requiresDeterministicMedia}`,
				...plan.media.map(
					(item) =>
						`media ${item.type} ${item.componentId ?? 'unknown'}${item.source ? ` -> ${item.source}` : ''}: ${item.reason}`
				),
				...plan.blockers.map((blocker) => `blocker: ${blocker}`),
				'For quick QA, rerun with --render-mode preview. For a one-off legacy output, add --allow-browser-media-final.'
			].join('\n')
		);
	}

	for (const warning of plan.warnings) {
		console.warn(`WARN ${warning}`);
	}

	return plan;
}

function fullRenderOptionsFromArgs(args, scene, output) {
	const { fps, imageFormat, imageQuality } = renderEncodingOptionsFromArgs(args, scene);
	const renderPlan = resolveAgentRenderPlan(scene, renderPlanOptionsFromArgs(args));
	const fromFrame = intFlag(args, '--from-frame', 0);
	const toFrame = intFlag(args, '--to-frame', Math.ceil(scene.settings.duration * fps));
	const framesOnly = hasFlag(args, '--frames-only');

	return {
		fromFrame,
		toFrame,
		renderOptions: {
			scene,
			output,
			framesOnly,
			frameIndices: frameRange(fromFrame, toFrame),
			fps,
			imageFormat,
			imageQuality,
			audioOverride: readFlag(args, '--audio'),
			keepFrames: hasFlag(args, '--keep-frames') || framesOnly,
			skipDuplicates: hasFlag(args, '--skip-duplicates'),
			streamEncode: hasFlag(args, '--stream-encode'),
			crf: intFlag(args, '--crf', 18),
			preset: readFlag(args, '--preset', 'veryfast'),
			renderPlan
		}
	};
}

async function renderSampledSceneFrames({ args, scene, output }) {
	const { fps, imageFormat, imageQuality } = renderEncodingOptionsFromArgs(args, scene);
	return await renderSceneWithBrowser({
		scene,
		output,
		framesOnly: true,
		frameIndices: sampledFrames({
			duration: scene.settings.duration,
			fps,
			samples: intFlag(args, '--samples', 3)
		}),
		fps,
		imageFormat,
		imageQuality,
		audioOverride: 'none',
		keepFrames: true,
		skipDuplicates: false
	});
}

async function renderSceneWithBrowser({
	scene,
	output,
	framesOnly,
	frameIndices,
	fps,
	imageFormat,
	imageQuality,
	audioOverride,
	keepFrames,
	skipDuplicates = false,
	streamEncode = false,
	crf = 18,
	preset = 'veryfast',
	renderPlan
}) {
	return await renderSceneLocally({
		scene,
		output,
		framesOnly,
		frameIndices,
		fps,
		imageFormat,
		imageQuality,
		audioOverride,
		keepFrames,
		skipDuplicates,
		streamEncode,
		crf,
		preset,
		renderPlan,
		packageRoot: PACKAGE_ROOT,
		modulePaths: {
			vite: process.env.VISUALFRIES_VITE_MODULES,
			svelteVitePlugin: process.env.VISUALFRIES_SVELTE_VITE_MODULES,
			playwright: process.env.VISUALFRIES_PLAYWRIGHT_MODULES,
			nodeModules: process.env.VISUALFRIES_NODE_MODULES
		}
	});
}

async function validateCommand(args) {
	const filePath = args[0];
	if (!filePath) throw new Error('Usage: visualfries validate <scene.json>');
	const scene = await readJson(filePath);
	const report = inspectScene(scene, {
		strictRuntimeSupport: hasFlag(args, '--strict-runtime-support')
	});
	const output = {
		ok: report.valid,
		file: filePath,
		schemaValid: report.schemaValid,
		runtimeSupported: report.runtimeSupported,
		issues: report.issues,
		summary: report.summary
	};
	if (hasFlag(args, '--json')) {
		console.log(JSON.stringify(output, null, 2));
	} else if (report.valid) {
		console.log(`OK ${filePath}`);
		for (const issue of report.issues) {
			console.log(`${issue.level.toUpperCase()} ${issue.type}: ${issue.message}`);
		}
	} else {
		for (const issue of report.issues) {
			console.error(`${issue.level.toUpperCase()} ${issue.type}: ${issue.message}`);
		}
	}
	if (!report.valid) process.exitCode = 1;
}

async function initCommand(args) {
	const targetDir = args[0];
	if (!targetDir)
		throw new Error('Usage: visualfries init <dir> [--video <video> --transcript <file>]');
	const root = path.resolve(targetDir);
	const assetsDir = path.join(root, 'assets');
	const qaFramesDir = path.join(root, 'qa', 'frames');
	await fs.mkdir(assetsDir, { recursive: true });
	await fs.mkdir(qaFramesDir, { recursive: true });

	const video = readFlag(args, '--video');
	const transcriptPath = readFlag(args, '--transcript');
	let scene;
	if (video && transcriptPath) {
		scene = createCaptionScene({
			id: readFlag(args, '--id', 'agent-video-scene'),
			video: {
				url: normalizeMediaUrl(video),
				assetId: readFlag(args, '--asset-id', 'main-video'),
				duration: numberFlag(args, '--duration')
			},
			transcript: await readTranscript(transcriptPath),
			preset: readFlag(args, '--preset', 'hidden-engine-center'),
			language: readFlag(args, '--language', 'en'),
			width: numberFlag(args, '--width', 1080),
			height: numberFlag(args, '--height', 1920),
			fps: numberFlag(args, '--fps', 30),
			duration: numberFlag(args, '--duration')
		});
	} else {
		scene = SceneShape.parse({
			id: readFlag(args, '--id', 'agent-video-scene'),
			name: 'Agent Video Scene',
			settings: {
				width: numberFlag(args, '--width', 1080),
				height: numberFlag(args, '--height', 1920),
				duration: numberFlag(args, '--duration', 5),
				fps: numberFlag(args, '--fps', 30),
				backgroundColor: '#000000'
			},
			assets: [],
			layers: []
		});
	}

	const scenePath = path.join(root, 'scene.json');
	const cuesPath = path.join(root, 'cues.json');
	const cuePreset = readFlag(args, '--cue-preset', 'hidden-engine-dynamic');
	const cues = createAgentCuePreset({
		preset: cuePreset,
		duration: scene.settings.duration
	});
	await writeJson(scenePath, scene);
	await writeJson(cuesPath, cues);
	await writeJson(path.join(root, 'qa', 'inspect.json'), inspectScene(scene));
	await writeJson(path.join(root, 'transcript.example.json'), {
		segments: [
			{
				text: 'Replace this transcript with timed words or segments.',
				start: 0,
				end: 2,
				words: [
					{ text: 'Replace', start: 0, end: 0.3 },
					{ text: 'this', start: 0.3, end: 0.5 },
					{ text: 'transcript', start: 0.5, end: 1.1 }
				]
			}
		]
	});
	await fs.writeFile(
		path.join(root, 'notes.md'),
		`# VisualFries Agent Video

## Commands

\`\`\`bash
visualfries doctor --json
visualfries compose --video ./input.mp4 --transcript ./captions.srt --cue-preset hidden-engine-dynamic --cues ./cues.json --scene-output ./scene.json --qa-output ./qa/frames --output ./out.mp4
\`\`\`

## Debug Commands

\`\`\`bash
visualfries validate ./scene.json
visualfries qa ./scene.json --output ./qa
visualfries apply-cues ./scene.json --cues ./cues.json --output ./scene.with-cues.json
visualfries render ./scene.with-cues.json --output ./out.mp4
\`\`\`

## Agent Notes

- Keep source assets in ./assets.
- Put sampled QA frames in ./qa/frames.
- Keep scene.json as the source of truth.
- Keep cues.json as the visual timeline map.
- Use visualfries apply-cues or visualfries/agent helpers for captions, b-roll, overlays, and transitions.
`,
		'utf8'
	);

	console.log(
		JSON.stringify(
			{
				ok: true,
				dir: root,
				scene: scenePath,
				cues: cuesPath,
				assets: assetsDir,
				qaFrames: qaFramesDir
			},
			null,
			2
		)
	);
}

async function inspectCommand(args) {
	const filePath = args[0];
	if (!filePath) throw new Error('Usage: visualfries inspect <scene.json>');
	const rawScene = await readJson(filePath);
	const report = inspectScene(rawScene, {
		strictRuntimeSupport: hasFlag(args, '--strict-runtime-support')
	});
	if (!report.schemaValid) {
		if (hasFlag(args, '--json')) console.log(JSON.stringify(report, null, 2));
		else console.error(report.issues.map((issue) => issue.message).join('\n'));
		process.exitCode = 1;
		return;
	}
	const scene = SceneShape.parse(rawScene);
	let screenshots;
	if (hasFlag(args, '--screenshots')) {
		const output =
			readFlag(args, '--output') ??
			path.resolve(`${path.basename(filePath, path.extname(filePath))}.qa`);
		screenshots = await renderSampledSceneFrames({
			args,
			output,
			scene
		});
	}
	const output = screenshots ? { ...report, screenshots } : report;
	if (hasFlag(args, '--json')) {
		console.log(JSON.stringify(output, null, 2));
		return;
	}

	console.log(`${report.valid ? 'OK' : 'FAIL'} ${filePath}`);
	console.log(
		`${report.summary.width}x${report.summary.height}, ${report.summary.duration}s, ${report.summary.layers} layers, ${report.summary.components} components`
	);
	for (const issue of report.issues) {
		console.log(`${issue.level.toUpperCase()} ${issue.type}: ${issue.message}`);
	}
	if (screenshots) {
		console.log(`SCREENSHOTS ${screenshots.frames.count} frames -> ${screenshots.frames.dir}`);
	}
	if (!report.valid) process.exitCode = 1;
}

async function qaCommand(args) {
	const scenePath = args[0];
	const outputDir = readFlag(args, '--output');
	if (!scenePath || !outputDir) {
		throw new Error('Usage: visualfries qa <scene.json> --output <dir> [--samples <n>]');
	}

	const scene = SceneShape.parse(await readJson(scenePath));
	const report = inspectScene(scene);
	const root = path.resolve(outputDir);
	const framesDir = path.join(root, 'frames');
	await fs.mkdir(framesDir, { recursive: true });
	await writeJson(path.join(root, 'inspect.json'), report);

	let screenshots;
	if (report.valid) {
		screenshots = await renderSampledSceneFrames({
			args,
			output: framesDir,
			scene
		});
		await writeJson(path.join(root, 'screenshots.json'), screenshots);
	}

	const result = {
		ok: report.valid,
		output: root,
		inspect: path.join(root, 'inspect.json'),
		frames: screenshots?.frames,
		issues: report.issues
	};
	console.log(JSON.stringify(result, null, 2));
	if (!report.valid) process.exitCode = 1;
}

async function captionSceneCommand(args) {
	const video = readFlag(args, '--video');
	const transcriptPath = readFlag(args, '--transcript');
	const output = readFlag(args, '--output');
	if (!video || !transcriptPath || !output) {
		throw new Error(
			'Usage: visualfries caption-scene --video <video> --transcript <file> --output <scene.json>'
		);
	}

	const scene = createCaptionScene({
		id: readFlag(args, '--id', 'agent-caption-scene'),
		video: {
			url: normalizeMediaUrl(video),
			assetId: readFlag(args, '--asset-id', 'main-video'),
			duration: numberFlag(args, '--duration')
		},
		transcript: await readTranscript(transcriptPath),
		preset: readFlag(args, '--preset', 'reels-center'),
		language: readFlag(args, '--language', 'en'),
		width: numberFlag(args, '--width', 1080),
		height: numberFlag(args, '--height', 1920),
		fps: numberFlag(args, '--fps', 30),
		duration: numberFlag(args, '--duration')
	});

	await writeJson(output, scene);
	const report = inspectScene(scene);
	console.log(
		JSON.stringify(
			{
				ok: report.valid,
				output,
				scene: {
					id: scene.id,
					duration: scene.settings.duration,
					width: scene.settings.width,
					height: scene.settings.height
				},
				issues: report.issues
			},
			null,
			2
		)
	);
	if (!report.valid) process.exitCode = 1;
}

async function applyCuesCommand(args) {
	const scenePath = args[0];
	const cuesPath = readFlag(args, '--cues');
	const output = hasFlag(args, '--in-place') ? scenePath : readFlag(args, '--output');
	if (!scenePath || !cuesPath || !output) {
		throw new Error(
			'Usage: visualfries apply-cues <scene.json> --cues <cues.json> --output <scene.json> [--in-place]'
		);
	}

	const result = applyAgentCueFile({
		scene: SceneShape.parse(await readJson(scenePath)),
		cues: await readJson(cuesPath),
		cueFilePath: cuesPath
	});
	const parsed = SceneShape.parse(result.scene);
	await writeJson(output, parsed);
	const report = inspectScene(parsed);
	console.log(
		JSON.stringify(
			{
				ok: report.valid,
				output: path.resolve(output),
				applied: result.applied,
				summary: report.summary,
				issues: report.issues
			},
			null,
			2
		)
	);
	if (!report.valid) process.exitCode = 1;
}

async function validateCuesCommand(args) {
	const cuesPath = args[0];
	if (!cuesPath) {
		throw new Error('Usage: visualfries validate-cues <cues.json> [--duration <seconds>] [--json]');
	}

	const report = validateAgentCueFile({
		cues: await readJson(cuesPath),
		cueFilePath: cuesPath,
		duration: numberFlag(args, '--duration')
	});

	if (hasFlag(args, '--json')) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(`${report.valid ? 'OK' : 'FAIL'} ${cuesPath}`);
		console.log(
			`${report.summary.broll} b-roll, ${report.summary.overlays} overlays, ${report.summary.transitions} transitions`
		);
		for (const issue of report.issues) {
			console.log(`${issue.level.toUpperCase()} ${issue.path}: ${issue.message}`);
		}
	}
	if (!report.valid) process.exitCode = 1;
}

async function presetCuesCommand(args) {
	const output = readFlag(args, '--output');
	const duration = numberFlag(args, '--duration');
	if (!output || duration === undefined) {
		throw new Error(
			'Usage: visualfries preset-cues --duration <seconds> --output <cues.json> [--preset <name>]'
		);
	}

	const cues = createAgentCuePreset({
		preset: readFlag(args, '--preset', 'hidden-engine-dynamic'),
		duration
	});
	await writeJson(output, cues);
	console.log(
		JSON.stringify(
			{
				ok: true,
				output: path.resolve(output),
				preset: readFlag(args, '--preset', 'hidden-engine-dynamic'),
				duration,
				counts: {
					broll: cues.broll?.length ?? 0,
					overlays: cues.overlays?.length ?? 0,
					transitions: cues.transitions?.length ?? 0
				}
			},
			null,
			2
		)
	);
}

function captionSceneInputFromArgs(args) {
	const video = readFlag(args, '--video');
	const transcriptPath = readFlag(args, '--transcript');
	if (!video || !transcriptPath) {
		throw new Error('--video and --transcript are required.');
	}

	return {
		video,
		transcriptPath,
		options: {
			id: readFlag(args, '--id', 'agent-caption-scene'),
			video: {
				url: normalizeMediaUrl(video),
				assetId: readFlag(args, '--asset-id', 'main-video'),
				duration: numberFlag(args, '--duration')
			},
			preset: readFlag(args, '--preset', 'reels-center'),
			language: readFlag(args, '--language', 'en'),
			width: numberFlag(args, '--width', 1080),
			height: numberFlag(args, '--height', 1920),
			fps: numberFlag(args, '--fps', 30),
			duration: numberFlag(args, '--duration')
		}
	};
}

async function composeSceneFromArgs(args) {
	const { transcriptPath, options } = captionSceneInputFromArgs(args);
	let scene = createCaptionScene({
		...options,
		transcript: await readTranscript(transcriptPath)
	});

	const cueFiles = [];
	const cuePreset = readFlag(args, '--cue-preset');
	if (cuePreset) {
		cueFiles.push(createAgentCuePreset({ preset: cuePreset, duration: scene.settings.duration }));
	}

	const cuesPath = readFlag(args, '--cues');
	if (cuesPath) {
		cueFiles.push(await readJson(cuesPath));
	}

	if (cueFiles.length > 0) {
		scene = applyAgentCueFile({
			scene,
			cues: mergeAgentCueFiles(...cueFiles),
			cueFilePath: cuesPath
		}).scene;
	}

	return SceneShape.parse(scene);
}

async function composeCommand(args) {
	const output = readFlag(args, '--output');
	if (!output) {
		throw new Error(
			'Usage: visualfries compose --video <video> --transcript <file> --output <out.mp4|frames-dir> [options]'
		);
	}

	const scene = await composeSceneFromArgs(args);
	const sceneOutput = readFlag(args, '--scene-output');
	if (sceneOutput) {
		await writeJson(sceneOutput, scene);
	}

	const report = inspectScene(scene);
	if (!report.valid) {
		throw new Error(`Scene is not renderable: ${JSON.stringify(report.issues, null, 2)}`);
	}

	const renderPlan = assertBrowserRenderAllowed(scene, args);

	let qa;
	const qaOutput = readFlag(args, '--qa-output');
	if (qaOutput) {
		qa = await renderSampledSceneFrames({
			args,
			output: qaOutput,
			scene
		});
	}

	const { fromFrame, toFrame, renderOptions } = fullRenderOptionsFromArgs(args, scene, output);
	const result = await renderSceneWithBrowser(renderOptions);

	console.log(
		JSON.stringify(
			{
				ok: true,
				scene: {
					id: scene.id,
					duration: scene.settings.duration,
					width: scene.settings.width,
					height: scene.settings.height
				},
				sceneOutput: sceneOutput ? path.resolve(sceneOutput) : undefined,
				renderPlan,
				qa,
				render: {
					...result,
					frames: {
						...result.frames,
						fromFrame,
						toFrame
					}
				}
			},
			null,
			2
		)
	);
}

async function detectLeadingSilence(filePath) {
	return await new Promise((resolve, reject) => {
		const child = spawn(
			process.env.FFMPEG_PATH || 'ffmpeg',
			[
				'-hide_banner',
				'-i',
				filePath,
				'-af',
				'silencedetect=noise=-45dB:d=0.01',
				'-f',
				'null',
				'-'
			],
			{ stdio: ['ignore', 'ignore', 'pipe'] }
		);
		let stderr = '';
		child.stderr.on('data', (chunk) => {
			stderr += String(chunk);
		});
		child.on('error', reject);
		child.on('close', (code) => {
			if (code !== 0) return reject(new Error(`Audio QA failed for ${filePath}.`));
			const startsAtZero = /silence_start:\s*-?0(?:\.0+)?\b/.test(stderr);
			const match = stderr.match(/silence_end:\s*([0-9.]+)/);
			resolve(startsAtZero && match ? Number(match[1]) : 0);
		});
	});
}

async function extractQaFrames(filePath, times, outputDir) {
	await fs.mkdir(outputDir, { recursive: true });
	const items = [];
	for (const [index, time] of times.entries()) {
		const output = path.join(
			outputDir,
			`qa-${String(index + 1).padStart(2, '0')}-${time.toFixed(2).replace('.', '_')}s.png`
		);
		await new Promise((resolve, reject) => {
			const child = spawn(
				process.env.FFMPEG_PATH || 'ffmpeg',
				['-y', '-i', filePath, '-ss', time.toFixed(3), '-frames:v', '1', '-c:v', 'png', output],
				{ stdio: ['ignore', 'ignore', 'pipe'] }
			);
			let stderr = '';
			child.stderr.on('data', (chunk) => {
				stderr = (stderr + String(chunk)).slice(-2000);
			});
			child.on('error', reject);
			child.on('close', (code) =>
				code === 0
					? resolve()
					: reject(new Error(`QA frame extraction failed (${code}): ${stderr}`))
			);
		});
		items.push({ time, output });
	}
	return items;
}

function productionFrameBoundaries(plan) {
	const fps = plan.settings.fps;
	const times = [0, plan.settings.duration];
	for (const beat of plan.beats) {
		times.push(beat.start, beat.end);
		for (const media of beat.media) {
			times.push(media.start, media.end);
			if (media.freezeAt !== undefined) {
				times.push(media.start + (media.freezeAt - (media.sourceStart ?? 0)));
			}
		}
		for (const overlay of beat.overlays) times.push(overlay.start, overlay.end);
	}
	for (const transition of plan.transitions) {
		const duration = transition.duration ?? 0.26;
		times.push(transition.time - duration / 2, transition.time + duration / 2);
	}
	return [
		...new Set(
			times.map((time) =>
				Math.max(0, Math.min(Math.ceil(plan.settings.duration * fps), Math.round(time * fps)))
			)
		)
	]
		.sort((a, b) => a - b)
		.filter((frame, index, frames) => index === 0 || frame > frames[index - 1]);
}

async function concatMp4Segments(segments, output) {
	const listPath = path.join(path.dirname(segments[0]), 'concat.txt');
	await fs.writeFile(
		listPath,
		`${segments.map((segment) => `file '${segment.replaceAll("'", "'\\''")}'`).join('\n')}\n`,
		'utf8'
	);
	await new Promise((resolve, reject) => {
		const child = spawn(
			process.env.FFMPEG_PATH || 'ffmpeg',
			[
				'-y',
				'-f',
				'concat',
				'-safe',
				'0',
				'-i',
				listPath,
				'-c:v',
				'libx264',
				'-crf',
				'18',
				'-preset',
				'veryfast',
				'-pix_fmt',
				'yuv420p',
				'-c:a',
				'aac',
				'-b:a',
				'192k',
				'-movflags',
				'+faststart',
				output
			],
			{ stdio: ['ignore', 'ignore', 'pipe'] }
		);
		let stderr = '';
		child.stderr.on('data', (chunk) => {
			stderr = (stderr + String(chunk)).slice(-4000);
		});
		child.on('error', reject);
		child.on('close', (code) =>
			code === 0
				? resolve()
				: reject(new Error(`Production segment concat failed (${code}): ${stderr}`))
		);
	});
}

async function produceCommand(args) {
	const planPath = args[0];
	const output = readFlag(args, '--output');
	if (!planPath || !output) {
		throw new Error(
			'Usage: visualfries produce <production-plan.json> --output <out.mp4> [options]'
		);
	}
	const compiled = await compileProductionPlan({
		plan: await readJson(planPath),
		planPath,
		generatedAssetsDir: readFlag(args, '--generated-assets')
	});
	const sceneOutput = readFlag(
		args,
		'--scene-output',
		path.resolve(
			path.dirname(planPath),
			`${path.basename(planPath, path.extname(planPath))}.scene.json`
		)
	);
	await writeJson(sceneOutput, compiled.scene);
	const inspection = inspectScene(compiled.scene);
	if (!inspection.valid)
		throw new Error(`Compiled scene is not renderable: ${JSON.stringify(inspection.issues)}`);

	const qaRoot = readFlag(args, '--qa-output');
	const renderPlan = assertBrowserRenderAllowed(compiled.scene, args);
	const { renderOptions } = fullRenderOptionsFromArgs(args, compiled.scene, output);
	const segmentRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'visualfries-production-'));
	let render;
	try {
		const boundaries = productionFrameBoundaries(compiled.plan);
		const segments = [];
		const results = [];
		for (let index = 0; index < boundaries.length - 1; index += 1) {
			const fromFrame = boundaries[index];
			const toFrame = boundaries[index + 1];
			if (toFrame <= fromFrame) continue;
			const segment = path.join(segmentRoot, `segment-${String(index + 1).padStart(3, '0')}.mp4`);
			results.push(
				await renderSceneWithBrowser({
					...renderOptions,
					output: segment,
					frameIndices: frameRange(fromFrame, toFrame),
					streamEncode: true
				})
			);
			segments.push(segment);
		}
		await concatMp4Segments(segments, path.resolve(output));
		render = {
			ok: true,
			mode: 'timeline-segmented',
			segments: segments.length,
			boundaries,
			frames: results.reduce((sum, result) => sum + result.frames.count, 0),
			audioSources: Math.max(...results.map((result) => result.audio.selectedSources), 0)
		};
	} finally {
		await fs.rm(segmentRoot, { recursive: true, force: true });
	}
	const qa = qaRoot
		? await extractQaFrames(
				path.resolve(output),
				compiled.plan.qa.framesAt,
				path.join(path.resolve(qaRoot), 'frames')
			)
		: undefined;
	const leadingSilence = await detectLeadingSilence(path.resolve(output));
	const limit = compiled.plan.qa.maxLeadingSilence;
	const acceptance = {
		ok: limit === undefined || leadingSilence <= limit,
		leadingSilence,
		maxLeadingSilence: limit,
		requiredText: compiled.plan.qa.requiredText,
		qaFramesAt: compiled.plan.qa.framesAt,
		generatedAssets: compiled.generatedAssets,
		inspection
	};
	if (qaRoot) await writeJson(path.join(path.resolve(qaRoot), 'acceptance.json'), acceptance);
	if (!acceptance.ok) {
		throw new Error(
			`Production QA failed: leading silence ${leadingSilence.toFixed(3)}s exceeds ${limit}s.`
		);
	}
	console.log(
		JSON.stringify(
			{
				ok: true,
				output: path.resolve(output),
				sceneOutput: path.resolve(sceneOutput),
				renderPlan,
				render,
				qa,
				acceptance
			},
			null,
			2
		)
	);
}

async function checkOptionalModule(moduleName, envName) {
	try {
		await importFromOptionalPaths(moduleName, envName);
		return { ok: true };
	} catch (error) {
		return { ok: false, error: error?.message || String(error) };
	}
}

async function doctorCommand(args) {
	const tmpParent =
		process.env.VISUALFRIES_TMPDIR || (existsSync('/private/tmp') ? '/private/tmp' : os.tmpdir());
	const checks = {
		node: {
			ok: true,
			version: process.version
		},
		ffmpeg: await probeCommand('ffmpeg', ['-version']),
		vite: await checkOptionalModule('vite', 'VISUALFRIES_VITE_MODULES'),
		svelteVitePlugin: await checkOptionalModule(
			'@sveltejs/vite-plugin-svelte',
			'VISUALFRIES_SVELTE_VITE_MODULES'
		),
		playwright: await checkOptionalModule('playwright', 'VISUALFRIES_PLAYWRIGHT_MODULES'),
		chromiumExecutable: (() => {
			const executablePath = findBrowserExecutable();
			return executablePath
				? { ok: true, path: executablePath }
				: {
						ok: false,
						error:
							'No Chromium executable found. Set VISUALFRIES_CHROMIUM_PATH or PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.'
					};
		})(),
		tempDir: {
			ok: existsSync(tmpParent),
			path: tmpParent
		}
	};
	const ok = Object.values(checks).every((check) => check.ok);
	const report = {
		ok,
		version: VERSION,
		packageRoot: PACKAGE_ROOT,
		env: {
			VISUALFRIES_NODE_MODULES: process.env.VISUALFRIES_NODE_MODULES,
			VISUALFRIES_TMPDIR: process.env.VISUALFRIES_TMPDIR,
			VISUALFRIES_CHROMIUM_PATH: process.env.VISUALFRIES_CHROMIUM_PATH,
			PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
		},
		checks
	};

	if (hasFlag(args, '--json')) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(`${ok ? 'OK' : 'FAIL'} visualfries doctor`);
		for (const [name, check] of Object.entries(checks)) {
			const detail = check.path ?? check.version ?? check.error ?? '';
			console.log(`${check.ok ? 'OK' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
		}
	}
	if (!ok) process.exitCode = 1;
}

async function catalogCommand(args) {
	const requestedComponent = readFlag(args, '--component');
	const catalog = getAgentCatalog(
		requestedComponent ? { component: requestedComponent.toUpperCase() } : undefined
	);
	if (hasFlag(args, '--json')) {
		console.log(JSON.stringify(catalog, null, 2));
		return;
	}

	console.log('VisualFries Agent Catalog');
	for (const [key, value] of Object.entries(catalog)) {
		if (Array.isArray(value)) {
			console.log(`${key}: ${value.join(', ')}`);
		}
	}
	console.log(`routine: ${catalog.recommendedWorkflow.routine}`);
}

async function explainCommand(args) {
	const scenePath = args[0];
	const componentId = readFlag(args, '--component');
	if (!scenePath || !componentId) {
		throw new Error('Usage: visualfries explain <scene.json> --component <id> [--frame <n>]');
	}
	const scene = SceneShape.parse(await readJson(scenePath));
	const fps = scene.settings.fps ?? 30;
	const frame = numberFlag(args, '--frame', 0);
	const componentReport = inspectScene(scene).components.find((item) => item.id === componentId);
	if (!componentReport) throw new Error(`Component not found: ${componentId}`);
	const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'visualfries-explain-'));
	try {
		const result = await renderSceneLocally({
			scene,
			output: outputDir,
			framesOnly: true,
			frameIndices: [frame],
			fps,
			keepFrames: false,
			explain: [{ componentId, frame }],
			packageRoot: PACKAGE_ROOT,
			modulePaths: {
				vite: process.env.VISUALFRIES_VITE_MODULES,
				svelteVitePlugin: process.env.VISUALFRIES_SVELTE_VITE_MODULES,
				playwright: process.env.VISUALFRIES_PLAYWRIGHT_MODULES,
				nodeModules: process.env.VISUALFRIES_NODE_MODULES
			}
		});
		const output = {
			frame,
			fps,
			capability: componentReport.capability,
			state: result.explanations?.[0] ?? null
		};
		console.log(JSON.stringify(output, null, 2));
	} finally {
		await fs.rm(outputDir, { recursive: true, force: true });
	}
}

async function compareFrameSsim(previewPath, finalPath, { semantic = false, crop } = {}) {
	return await new Promise((resolve, reject) => {
		let stderr = '';
		const semanticSigma = crop?.semanticSigma ?? 1;
		const filter = crop
			? `[0:v]crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}${semantic ? `,gblur=sigma=${semanticSigma}` : ''}[a];[1:v]crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}${semantic ? `,gblur=sigma=${semanticSigma}` : ''}[b];[a][b]ssim`
			: semantic
				? '[0:v]gblur=sigma=1[a];[1:v]gblur=sigma=1[b];[a][b]ssim'
				: 'ssim';
		const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', [
			'-i',
			previewPath,
			'-i',
			finalPath,
			'-lavfi',
			filter,
			'-f',
			'null',
			'-'
		]);
		child.stderr.on('data', (chunk) => (stderr += String(chunk)));
		child.on('error', reject);
		child.on('close', (code) => {
			if (code !== 0) return reject(new Error(`ffmpeg SSIM exited with code ${code}`));
			const match = stderr.match(/All:([0-9.]+)/);
			if (!match) return reject(new Error('ffmpeg did not report an SSIM All value'));
			resolve(Number(match[1]));
		});
	});
}

async function sha256(filePath) {
	return createHash('sha256')
		.update(await fs.readFile(filePath))
		.digest('hex');
}

async function writeParityDiffRow(previewPath, finalPath, outputPath) {
	await fs.mkdir(path.dirname(outputPath), { recursive: true });
	await new Promise((resolve, reject) => {
		const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', [
			'-y',
			'-i',
			previewPath,
			'-i',
			finalPath,
			'-filter_complex',
			'[0:v][1:v]blend=all_mode=difference,lutrgb=r=val*4:g=val*4:b=val*4[diff];[0:v][1:v][diff]hstack=inputs=3[out]',
			'-map',
			'[out]',
			outputPath
		]);
		let stderr = '';
		child.stderr.on('data', (chunk) => (stderr += String(chunk)));
		child.on('error', reject);
		child.on('close', (code) =>
			code === 0 ? resolve() : reject(new Error(`ffmpeg parity diff exited ${code}: ${stderr}`))
		);
	});
}

async function writeParityContactSheet(rows, outputPath) {
	if (!rows.length) return;
	await new Promise((resolve, reject) => {
		const args = ['-y'];
		for (const row of rows) args.push('-i', row);
		args.push('-filter_complex', `vstack=inputs=${rows.length}[out]`, '-map', '[out]', outputPath);
		const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args);
		let stderr = '';
		child.stderr.on('data', (chunk) => (stderr += String(chunk)));
		child.on('error', reject);
		child.on('close', (code) =>
			code === 0
				? resolve()
				: reject(new Error(`ffmpeg parity contact sheet exited ${code}: ${stderr}`))
		);
	});
}

async function parityCommand(args) {
	const scenePath = args[0];
	const output = readFlag(args, '--output');
	if (!scenePath || !output) {
		throw new Error('Usage: visualfries parity <scene.json> --output <dir> [--frames 0,12,30]');
	}
	const scene = SceneShape.parse(await readJson(scenePath));
	const roiConfigPath = readFlag(args, '--rois');
	const roiConfig = roiConfigPath ? await readJson(roiConfigPath) : null;
	const regions = Array.isArray(roiConfig?.regions) ? roiConfig.regions : [];
	const fps = scene.settings.fps ?? 30;
	const defaultFrames = [
		0,
		Math.floor((scene.settings.duration * fps) / 2),
		Math.max(0, Math.ceil(scene.settings.duration * fps) - 1)
	];
	const frames = [
		...new Set(
			(readFlag(args, '--frames')
				? readFlag(args, '--frames').split(',').map(Number)
				: defaultFrames
			).filter((frame) => Number.isInteger(frame) && frame >= 0)
		)
	];
	if (!frames.length) throw new Error('--frames must contain at least one non-negative integer');
	const requestedFrames = [...frames, ...[...frames].reverse()];
	const root = path.resolve(output);
	const previewDir = path.join(root, 'preview');
	const finalDir = path.join(root, 'final');
	const common = {
		scene,
		framesOnly: true,
		frameIndices: requestedFrames,
		fps,
		keepFrames: false,
		packageRoot: PACKAGE_ROOT,
		modulePaths: {
			vite: process.env.VISUALFRIES_VITE_MODULES,
			svelteVitePlugin: process.env.VISUALFRIES_SVELTE_VITE_MODULES,
			playwright: process.env.VISUALFRIES_PLAYWRIGHT_MODULES,
			nodeModules: process.env.VISUALFRIES_NODE_MODULES
		}
	};
	const previewResult = await renderSceneLocally({
		...common,
		output: previewDir,
		environment: 'client',
		serverRendererMode: 'webgl',
		renderPlan: resolveAgentRenderPlan(scene, { mode: 'preview' })
	});
	const finalResult = await renderSceneLocally({
		...common,
		output: finalDir,
		environment: 'server',
		renderPlan: resolveAgentRenderPlan(scene, { mode: 'final' })
	});

	const comparisons = [];
	const diffRows = [];
	for (let index = 0; index < frames.length; index += 1) {
		const name = `frame-${String(index + 1).padStart(6, '0')}.png`;
		const previewPath = path.join(previewDir, name);
		const finalPath = path.join(finalDir, name);
		const diffPath = path.join(root, 'diff', `frame-${String(frames[index]).padStart(6, '0')}.png`);
		await writeParityDiffRow(previewPath, finalPath, diffPath);
		diffRows.push(diffPath);
		const regionComparisons = await Promise.all(
			regions.map(async (region) => ({
				name: region.name,
				class: region.class,
				rawFloor: region.rawFloor,
				semanticFloor: region.semanticFloor,
				semanticSigma: region.semanticSigma ?? 1,
				ssim: await compareFrameSsim(previewPath, finalPath, { crop: region }),
				semanticSsim: await compareFrameSsim(previewPath, finalPath, {
					semantic: true,
					crop: region
				})
			}))
		);
		comparisons.push({
			frame: frames[index],
			preview: { path: previewPath, sha256: await sha256(previewPath) },
			final: { path: finalPath, sha256: await sha256(finalPath) },
			ssim: await compareFrameSsim(previewPath, finalPath),
			semanticSsim: await compareFrameSsim(previewPath, finalPath, { semantic: true }),
			diff: diffPath,
			...(regionComparisons.length ? { regions: regionComparisons } : {})
		});
	}
	const contactSheetPath = path.join(root, 'contact-sheet.png');
	await writeParityContactSheet(diffRows, contactSheetPath);
	const reseekItems = [];
	const reseekSsimFloor = 0.999;
	for (let index = 0; index < frames.length; index += 1) {
		const firstName = `frame-${String(index + 1).padStart(6, '0')}.png`;
		const reverseIndex = frames.length + (frames.length - 1 - index) + 1;
		const repeatName = `frame-${String(reverseIndex).padStart(6, '0')}.png`;
		const previewFirstPath = path.join(previewDir, firstName);
		const previewRepeatPath = path.join(previewDir, repeatName);
		const finalFirstPath = path.join(finalDir, firstName);
		const finalRepeatPath = path.join(finalDir, repeatName);
		const previewExact = (await sha256(previewFirstPath)) === (await sha256(previewRepeatPath));
		const finalExact = (await sha256(finalFirstPath)) === (await sha256(finalRepeatPath));
		const previewSsim = previewExact
			? 1
			: await compareFrameSsim(previewFirstPath, previewRepeatPath);
		const finalSsim = finalExact ? 1 : await compareFrameSsim(finalFirstPath, finalRepeatPath);
		reseekItems.push({
			frame: frames[index],
			previewExact,
			finalExact,
			previewSsim,
			finalSsim,
			stable: previewSsim >= reseekSsimFloor && finalSsim >= reseekSsimFloor
		});
	}
	const reseek = {
		order: requestedFrames,
		items: reseekItems,
		allExact: reseekItems.every((item) => item.previewExact && item.finalExact),
		ssimFloor: reseekSsimFloor,
		allStable: reseekItems.every((item) => item.stable)
	};
	const rawReviewFloor = 0.9;
	const semanticThreshold = 0.95;
	const manifest = {
		scene: scene.id,
		fps,
		frames,
		thresholds: {
			rawWholeFrameSsimReviewFloor: rawReviewFloor,
			semanticWholeFrameSsim: semanticThreshold,
			semanticBlurSigma: 1,
			deterministicReseekExactPreferred: true,
			deterministicReseekSsimFloor: reseekSsimFloor,
			...(roiConfig?.classes ? { classes: roiConfig.classes } : {})
		},
		comparisons,
		contactSheet: contactSheetPath,
		reseek,
		runtimeErrors: {
			preview: previewResult.runtimeErrors ?? [],
			final: finalResult.runtimeErrors ?? []
		},
		passed:
			comparisons.every(
				(item) =>
					item.ssim >= rawReviewFloor &&
					item.semanticSsim >= semanticThreshold &&
					(item.regions ?? []).every(
						(region) =>
							region.ssim >= region.rawFloor && region.semanticSsim >= region.semanticFloor
					)
			) &&
			reseek.allStable &&
			(previewResult.runtimeErrors?.length ?? 0) === 0 &&
			(finalResult.runtimeErrors?.length ?? 0) === 0,
		caveat:
			'Raw SSIM remains visible for dither/antialias review. Semantic SSIM applies a 1px Gaussian blur to separate renderer pixel noise from missing or misplaced visuals.'
	};
	await fs.mkdir(root, { recursive: true });
	await fs.writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
	console.log(JSON.stringify(manifest, null, 2));
	if (!manifest.passed && hasFlag(args, '--strict')) process.exitCode = 1;
}

async function renderCommand(args) {
	const scenePath = args[0];
	const output = readFlag(args, '--output');
	if (!scenePath || !output) {
		throw new Error(
			'Usage: visualfries render <scene.json> --output <out.mp4|frames-dir> [--frames-only]'
		);
	}

	const parsed = SceneShape.parse(await readJson(scenePath));
	const report = inspectScene(parsed);
	if (!report.valid) {
		throw new Error(`Scene is not renderable: ${JSON.stringify(report.issues, null, 2)}`);
	}

	const renderPlan = assertBrowserRenderAllowed(parsed, args);
	const { fromFrame, toFrame, renderOptions } = fullRenderOptionsFromArgs(args, parsed, output);
	const result = await renderSceneWithBrowser(renderOptions);

	console.log(
		JSON.stringify(
			{
				...result,
				renderPlan,
				frames: {
					...result.frames,
					fromFrame,
					toFrame
				}
			},
			null,
			2
		)
	);
}

async function main() {
	const [command, ...args] = process.argv.slice(2);
	if (!command || command === 'help' || command === '--help' || command === '-h') {
		help();
		return;
	}

	if (command === 'validate') return validateCommand(args);
	if (command === 'init') return initCommand(args);
	if (command === 'inspect') return inspectCommand(args);
	if (command === 'qa') return qaCommand(args);
	if (command === 'caption-scene') return captionSceneCommand(args);
	if (command === 'preset-cues') return presetCuesCommand(args);
	if (command === 'validate-cues') return validateCuesCommand(args);
	if (command === 'apply-cues') return applyCuesCommand(args);
	if (command === 'compose') return composeCommand(args);
	if (command === 'produce') return produceCommand(args);
	if (command === 'render') return renderCommand(args);
	if (command === 'catalog') return catalogCommand(args);
	if (command === 'explain') return explainCommand(args);
	if (command === 'parity') return parityCommand(args);
	if (command === 'doctor') return doctorCommand(args);
	throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
	console.error(error?.message || String(error));
	process.exitCode = 1;
});
