import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';

import {
	SceneAssetShape,
	SceneShape,
	type Scene,
	type SceneInput
} from '../schemas/scene/index.js';
import { createAgentBrollComponent } from './broll.js';
import {
	createAgentTextOverlayComponent,
	resolveAgentOverlayStyle,
	type AgentTextOverlayCue
} from './overlays.js';
import { createAgentTransitionComponent } from './transitions.js';

const MediaShape = z
	.object({
		id: z.string(),
		url: z.string(),
		type: z.enum(['VIDEO', 'IMAGE', 'GIF']).optional(),
		start: z.number().nonnegative(),
		end: z.number().positive(),
		sourceStart: z.number().nonnegative().optional(),
		sourceEnd: z.number().nonnegative().optional(),
		freezeAt: z.number().nonnegative().optional(),
		motion: z.enum(['none', 'slow-zoom-in', 'slow-zoom-out', 'drift-up']).optional(),
		fade: z.number().nonnegative().optional(),
		muted: z.boolean().optional(),
		volume: z.number().min(0).max(1).optional(),
		x: z.number().optional(),
		y: z.number().optional(),
		width: z.number().positive().optional(),
		height: z.number().positive().optional(),
		order: z.number().optional()
	})
	.refine((item) => item.end > item.start, { message: 'media end must be after start' });

const OverlayShape = z
	.object({
		id: z.string().optional(),
		text: z.string().min(1),
		start: z.number().nonnegative(),
		end: z.number().positive(),
		style: z
			.enum([
				'pop-label',
				'shock-word',
				'soft-card',
				'hook-punch',
				'proof-pill',
				'danger-crossout',
				'metric-badge',
				'verdict-slam',
				'receipt-metric',
				'micro-proof',
				'cta-card'
			])
			.optional(),
		x: z.number().optional(),
		y: z.number().optional(),
		width: z.number().positive().optional(),
		height: z.number().positive().optional(),
		color: z.string().optional(),
		backgroundColor: z.string().optional(),
		fontSize: z.number().positive().optional(),
		fontFamily: z.string().optional(),
		fontWeight: z.enum(['700', '800', '900']).optional(),
		textTransform: z.enum(['none', 'uppercase']).optional(),
		rotation: z.number().optional(),
		outlineColor: z.string().optional(),
		outlineSize: z.number().nonnegative().optional(),
		animated: z.boolean().optional(),
		renderAs: z.enum(['TEXT', 'SVG']).default('SVG')
	})
	.refine((item) => item.end > item.start, { message: 'overlay end must be after start' });

const BeatShape = z
	.object({
		id: z.string(),
		name: z.string().optional(),
		start: z.number().nonnegative(),
		end: z.number().positive(),
		media: z.array(MediaShape).default([]),
		overlays: z.array(OverlayShape).default([])
	})
	.refine((beat) => beat.end > beat.start, { message: 'beat end must be after start' });

export const ProductionPlanShape = z.object({
	version: z.literal(1),
	id: z.string(),
	name: z.string().optional(),
	settings: z.object({
		width: z.number().positive().default(1080),
		height: z.number().positive().default(1920),
		duration: z.number().positive(),
		fps: z.number().int().positive().default(30),
		backgroundColor: z.string().default('#000000')
	}),
	beats: z.array(BeatShape).min(1),
	audio: z
		.array(
			z.object({
				id: z.string(),
				name: z.string().optional(),
				url: z.string(),
				startAt: z.number().nonnegative(),
				endAt: z.number().nonnegative().optional(),
				volume: z.number().min(0).max(1).default(1),
				muted: z.boolean().default(false)
			})
		)
		.default([]),
	transitions: z
		.array(
			z.object({
				id: z.string().optional(),
				time: z.number().nonnegative(),
				duration: z.number().positive().optional(),
				style: z
					.enum(['dip-to-black', 'flash', 'swipe-left', 'swipe-up', 'focus-pull'])
					.default('dip-to-black'),
				color: z.string().optional(),
				animated: z.boolean().optional()
			})
		)
		.default([]),
	qa: z
		.object({
			framesAt: z.array(z.number().nonnegative()).default([]),
			maxLeadingSilence: z.number().nonnegative().optional(),
			requiredText: z.array(z.string()).default([])
		})
		.default({ framesAt: [], requiredText: [] })
});

export type ProductionPlan = z.infer<typeof ProductionPlanShape>;

const localUrl = (value: string, baseDir: string): string => {
	if (/^[a-z]+:\/\//i.test(value) || value.startsWith('data:')) return value;
	return pathToFileURL(path.resolve(baseDir, value)).toString();
};

const extractFrame = async (input: string, at: number, output: string): Promise<void> => {
	await fs.mkdir(path.dirname(output), { recursive: true });
	await new Promise<void>((resolve, reject) => {
		const child = spawn(
			process.env.FFMPEG_PATH || 'ffmpeg',
			['-y', '-ss', at.toFixed(3), '-i', input, '-frames:v', '1', '-q:v', '2', output],
			{ stdio: ['ignore', 'ignore', 'pipe'] }
		);
		let stderr = '';
		child.stderr.on('data', (chunk) => {
			stderr = (stderr + String(chunk)).slice(-3000);
		});
		child.on('error', reject);
		child.on('close', (code) =>
			code === 0
				? resolve()
				: reject(new Error(`freeze-frame extraction failed (${code}): ${stderr}`))
		);
	});
};

const escapeXml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');

const wrapText = (text: string, maxCharacters: number): string[] => {
	const lines: string[] = [];
	let line = '';
	for (const word of text.split(/\s+/).filter(Boolean)) {
		const candidate = line ? `${line} ${word}` : word;
		if (line && candidate.length > maxCharacters) {
			lines.push(line);
			line = word;
		} else {
			line = candidate;
		}
	}
	if (line) lines.push(line);
	return lines.length ? lines : [''];
};

const writeOverlaySvg = async (input: {
	overlay: z.infer<typeof OverlayShape>;
	scene: Scene;
	output: string;
}): Promise<void> => {
	const defaults = resolveAgentOverlayStyle(input.overlay.style ?? 'pop-label', input.scene);
	const x = input.overlay.x ?? defaults.x;
	const y = input.overlay.y ?? defaults.y;
	const width = input.overlay.width ?? defaults.width;
	const height = input.overlay.height ?? defaults.height;
	const fontSize = input.overlay.fontSize ?? defaults.fontSize;
	const displayText =
		(input.overlay.textTransform ?? defaults.textTransform) === 'uppercase'
			? input.overlay.text.toUpperCase()
			: input.overlay.text;
	const lines = wrapText(displayText, Math.max(6, Math.floor(width / (fontSize * 0.58))));
	const lineHeight = fontSize * 1.02;
	const firstY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2;
	const outline = input.overlay.outlineColor ?? defaults.outlineColor ?? 'transparent';
	const outlineSize = input.overlay.outlineSize ?? defaults.outlineSize ?? 0;
	const fontFamily = input.overlay.fontFamily ?? defaults.fontFamily;
	const fontStack = fontFamily.includes(',')
		? fontFamily
		: `${fontFamily}, Arial, Helvetica, sans-serif`;
	const text = lines
		.map(
			(line, index) =>
				`<text x="${x + width / 2}" y="${firstY + index * lineHeight}" dominant-baseline="middle" text-anchor="middle" font-family="${escapeXml(fontStack)}" font-size="${fontSize}" font-weight="${input.overlay.fontWeight ?? defaults.fontWeight}" fill="${escapeXml(input.overlay.color ?? defaults.color)}" stroke="${escapeXml(outline)}" stroke-width="${outlineSize}" paint-order="stroke fill">${escapeXml(line)}</text>`
		)
		.join('');
	const rotation = input.overlay.rotation ?? defaults.rotation;
	const editorialCard = ['metric-badge', 'verdict-slam', 'hook-punch', 'receipt-metric'].includes(
		input.overlay.style ?? 'pop-label'
	);
	const background = input.overlay.backgroundColor ?? defaults.backgroundColor;
	const transparentBackground = background === 'transparent' || background.endsWith(', 0)');
	const border = editorialCard ? '#FFFFFF' : 'transparent';
	const borderWidth = editorialCard ? Math.max(4, Math.round(width * 0.006)) : 0;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${input.scene.settings.width}" height="${input.scene.settings.height}" viewBox="0 0 ${input.scene.settings.width} ${input.scene.settings.height}"><defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="10" dy="14" stdDeviation="${Math.max(2, defaults.shadowBlur / 4)}" flood-color="#111C2D" flood-opacity="0.72"/></filter></defs><g${transparentBackground ? '' : ' filter="url(#shadow)"'} transform="rotate(${rotation} ${x + width / 2} ${y + height / 2})"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${defaults.radius}" fill="${escapeXml(background)}" stroke="${border}" stroke-width="${borderWidth}"/>${text}</g></svg>`;
	await fs.mkdir(path.dirname(input.output), { recursive: true });
	await fs.writeFile(input.output, `${svg}\n`, 'utf8');
};

export async function compileProductionPlan(input: {
	plan: unknown;
	planPath?: string;
	generatedAssetsDir?: string;
}): Promise<{
	scene: Scene;
	plan: ProductionPlan;
	generatedAssets: string[];
	qaFrameIndices: number[];
}> {
	const plan = ProductionPlanShape.parse(input.plan);
	const baseDir = input.planPath ? path.dirname(path.resolve(input.planPath)) : process.cwd();
	const generatedDir = path.resolve(
		input.generatedAssetsDir ?? path.join(baseDir, '.visualfries-assets')
	);
	const generatedAssets: string[] = [];
	const baseScene = SceneShape.parse({
		id: plan.id,
		name: plan.name ?? plan.id,
		settings: plan.settings,
		assets: [],
		layers: [],
		audioTracks: plan.audio.map((track) => ({ ...track, url: localUrl(track.url, baseDir) })),
		transitions: []
	} satisfies SceneInput);
	const assets = [...baseScene.assets];
	const layers: Scene['layers'] = [];

	for (const [beatIndex, beat] of plan.beats.entries()) {
		const mediaComponents: Scene['layers'][number]['components'] = [];
		for (const [mediaIndex, media] of beat.media.entries()) {
			const url = localUrl(media.url, baseDir);
			const sourcePath = url.startsWith('file://') ? fileURLToPath(url) : media.url;
			const freezeTimeline =
				media.freezeAt === undefined
					? undefined
					: media.start + (media.freezeAt - (media.sourceStart ?? 0));
			const movingEnd =
				freezeTimeline === undefined ? media.end : Math.min(media.end, freezeTimeline);
			if (movingEnd > media.start) {
				const created = createAgentBrollComponent(
					{
						...media,
						id: `${media.id}-motion`,
						url,
						start: media.start,
						end: movingEnd,
						fade: media.fade ?? 0
					},
					baseScene,
					mediaIndex
				);
				assets.push(SceneAssetShape.parse(created.asset));
				mediaComponents.push(created.component as Scene['layers'][number]['components'][number]);
			}
			if (freezeTimeline !== undefined && freezeTimeline < media.end) {
				const output = path.join(
					generatedDir,
					`${plan.id}-${media.id}-${media.freezeAt!.toFixed(3).replace('.', '_')}.jpg`
				);
				await extractFrame(sourcePath, media.freezeAt!, output);
				generatedAssets.push(output);
				const created = createAgentBrollComponent(
					{
						...media,
						id: `${media.id}-freeze`,
						url: pathToFileURL(output).toString(),
						type: 'IMAGE',
						start: freezeTimeline,
						end: media.end,
						motion: 'none',
						fade: 0
					},
					baseScene,
					mediaIndex + 100
				);
				assets.push(SceneAssetShape.parse(created.asset));
				mediaComponents.push(created.component as Scene['layers'][number]['components'][number]);
			}
		}
		if (mediaComponents.length)
			layers.push({
				id: `beat-${beat.id}-media`,
				name: beat.name ?? beat.id,
				order: 10 + beatIndex,
				visible: true,
				muted: false,
				components: mediaComponents
			});
		if (beat.overlays.length) {
			for (const [overlayIndex, overlay] of beat.overlays.entries()) {
				let component: Scene['layers'][number]['components'][number];
				if (overlay.renderAs === 'TEXT') {
					component = createAgentTextOverlayComponent(
						overlay as AgentTextOverlayCue,
						baseScene,
						overlayIndex
					) as Scene['layers'][number]['components'][number];
				} else {
					const id = overlay.id ?? `${beat.id}-overlay-${overlayIndex + 1}`;
					const output = path.join(generatedDir, `${plan.id}-${id}.svg`);
					await writeOverlaySvg({ overlay, scene: baseScene, output });
					generatedAssets.push(output);
					const created = createAgentBrollComponent(
						{
							id,
							url: pathToFileURL(output).toString(),
							type: 'IMAGE',
							start: overlay.start,
							end: overlay.end,
							motion: 'none',
							fade: 0,
							x: 0,
							y: 0,
							width: baseScene.settings.width,
							height: baseScene.settings.height
						},
						baseScene,
						overlayIndex
					);
					assets.push(SceneAssetShape.parse(created.asset));
					component = created.component as Scene['layers'][number]['components'][number];
				}
				layers.push({
					id: `beat-${beat.id}-overlay-${component.id}`,
					name: `${beat.name ?? beat.id}: ${overlay.text}`,
					order: 70 + beatIndex + overlayIndex / 100,
					visible: true,
					muted: false,
					components: [component]
				});
			}
		}
	}
	if (plan.transitions.length)
		layers.push({
			id: 'production-transitions',
			name: 'Production transitions',
			order: 99,
			visible: true,
			muted: false,
			components: plan.transitions.map(
				(transition, index) =>
					createAgentTransitionComponent(
						transition,
						baseScene,
						index
					) as Scene['layers'][number]['components'][number]
			)
		});
	const scene = SceneShape.parse({ ...baseScene, assets, layers });
	const texts = plan.beats.flatMap((beat) => beat.overlays.map((overlay) => overlay.text));
	for (const required of plan.qa.requiredText) {
		if (!texts.includes(required))
			throw new Error(`Production plan QA failed: required text "${required}" is missing.`);
	}
	return {
		scene,
		plan,
		generatedAssets,
		qaFrameIndices: [
			...new Set(
				plan.qa.framesAt.map((time) =>
					Math.min(
						Math.floor(plan.settings.duration * plan.settings.fps) - 1,
						Math.round(time * plan.settings.fps)
					)
				)
			)
		].sort((a, b) => a - b)
	};
}
