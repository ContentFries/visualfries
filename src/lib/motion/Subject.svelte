<!--
	A region of the subject as its own layer: the speaker cut out by the footage's matte, then
	clipped to `region` (the whole subject, the part above or below a line that can follow the
	head, an SVG path or a mask picture). In a program it sits exactly on the picture the stage
	shows (its camera, shot keys included); `x`, `y`, `rotation`, `scale` and `opacity` then move
	it from there, turning and scaling about the middle of the region, so a part of the speaker
	can fly away.

	  region   SubjectRegion, or a function of { source, frame, clipFrame } giving one per frame
	  name     the footage (default: whatever the program shows)
	  layer    "subject" (default), "clean" (the background where the subject was) or "plate"
	  outside  draw everything but the region
	  freeze   a moment (or true: the clip's start) whose pixels and region the layer keeps
	  hole     while true, the stage cuts the region out of the speaker and shows the footage's
	           clean plate there; { rim: true | Rim } also draws the cut edge (program mode)
	  smooth   seconds the head is averaged over when a region follows it (default 0.1)
	  pivot    [x, y] in footage pixels to turn and scale about (default: the region's middle)
	  place    false: fill the clip's frame instead of sitting on the stage's picture
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { useClip, useController, useFrame, type At } from './runtime.svelte.js';
	import { sourceFrameUrl, sourceSubjectBox, type FootageLayer } from './footage.js';
	import {
		headOf,
		otherHalf,
		placeRegion,
		regionPivot,
		type Point,
		type RegionShape,
		type SubjectRegion
	} from './subject-region.js';
	import { drawRegion, loadPicture, regionShare, type Rim } from './subject-canvas.js';

	type RegionAt = (at: {
		source: string;
		frame: number;
		clipFrame: number;
	}) => SubjectRegion | null;

	let {
		region = 'all',
		name,
		layer = 'subject',
		outside = false,
		freeze = false,
		hole = false,
		smooth = 0.1,
		pivot: pivotProp,
		place = true,
		x = 0,
		y = 0,
		rotation = 0,
		scale = 1,
		opacity = 1,
		center = $bindable<Point | null>(null),
		class: className = '',
		style = ''
	}: {
		region?: SubjectRegion | RegionAt;
		name?: string;
		layer?: FootageLayer;
		outside?: boolean;
		freeze?: At | boolean;
		hole?: boolean | { rim?: boolean | Rim };
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
	} = $props();

	const clip = useClip();
	const controller = useController();
	if (name && !clip.footage[name])
		throw new Error(
			`Unknown footage "${name}". Footage: ${Object.keys(clip.footage).join(', ') || 'none (add "footage" to the project)'}`
		);
	const needsMatte = $derived(layer === 'subject' || region !== 'all' || !!hole);
	/**
	 * A footage the layer draws must have a matte: a named one is checked at once, otherwise the
	 * one the program shows when a frame is drawn (other footage in the project may have none).
	 */
	function assertMatte(source: string) {
		if (needsMatte && !clip.footage[source]?.subject)
			throw new Error(
				`<Subject> needs footage with a matte; "${source}" has none. Add "matte" to it (visualfries matte).`
			);
	}
	if (name) assertMatte(name);
	if (hole && !clip.footageMap)
		throw new Error(
			'<Subject hole> needs a program ("cuts" or "shots"): the stage draws the hole. Without one, draw <Footage layer="plate">, then <Subject layer="clean" region={…}> over it yourself.'
		);

	const frozen = $derived(
		freeze === false
			? null
			: Math.max(
					0,
					Math.min(clip.frames - 1, Math.round(clip.at(freeze === true ? 0 : freeze) * clip.fps))
				)
	);
	const smoothFrames = $derived(Math.round(smooth * clip.fps));

	/** The region at a source frame, in footage pixels; null without one. */
	function shapeAt(source: string, frame: number, clipFrame: number) {
		assertMatte(source);
		const footage = clip.footage[source];
		const box = sourceSubjectBox(footage, frame, smoothFrames);
		const spec = typeof region === 'function' ? region({ source, frame, clipFrame }) : region;
		if (spec === null) return null;
		const at = { width: footage.width, height: footage.height, box };
		const shape = placeRegion(spec, at);
		return shape ? { shape, at } : null;
	}

	/** Bounds of an SVG path with absolute coordinates (its numbers taken as x, y pairs). */
	function pathMiddle(d: string): Point | null {
		const n = (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
		if (n.length < 2) return null;
		const xs = n.filter((_, i) => i % 2 === 0);
		const ys = n.filter((_, i) => i % 2 === 1);
		return {
			x: (Math.min(...xs) + Math.max(...xs)) / 2,
			y: (Math.min(...ys) + Math.max(...ys)) / 2
		};
	}

	function middleOf(shape: RegionShape, at: Parameters<typeof regionPivot>[1]): Point | null {
		if (shape.kind === 'path') {
			const m = pathMiddle(shape.d);
			return m && { x: m.x + shape.dx, y: m.y + shape.dy };
		}
		if (shape.kind === 'mask')
			return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
		return regionPivot(shape, at);
	}

	/** What the layer draws at the current frame: source frame and region (frozen or live). */
	const drawn = $derived.by(() => {
		const clipFrame = frozen ?? clip.frame;
		const view = clip.shown(name, clipFrame);
		if (!view) return null;
		const placed = shapeAt(view.source, view.frame, clipFrame);
		if (!placed) return { ...view, shape: null, middle: null };
		const middle = pivotProp
			? { x: pivotProp[0], y: pivotProp[1] }
			: middleOf(placed.shape, placed.at);
		return { ...view, shape: placed.shape, middle };
	});

	const size = $derived.by(() => {
		const f = drawn ? clip.footage[drawn.source] : Object.values(clip.footage)[0];
		return { width: f?.width ?? clip.width, height: f?.height ?? clip.height };
	});
	const camera = $derived(place ? clip.camera : null);
	function toClip(p: Point): Point {
		if (!camera)
			return { x: p.x * (clip.width / size.width), y: p.y * (clip.height / size.height) };
		let px = camera.x + p.x * (camera.width / size.width);
		let py = camera.y + p.y * (camera.height / size.height);
		if (camera.rotation) {
			const a = (camera.rotation * Math.PI) / 180;
			const dx = px - camera.pivot.x;
			const dy = py - camera.pivot.y;
			px = camera.pivot.x + dx * Math.cos(a) - dy * Math.sin(a);
			py = camera.pivot.y + dx * Math.sin(a) + dy * Math.cos(a);
		}
		return { x: px, y: py };
	}

	$effect.pre(() => {
		center = drawn?.middle ? toClip(drawn.middle) : null;
	});

	const boxStyle = $derived.by(() => {
		if (!camera) return 'position:absolute;inset:0';
		const r = (v: number) => Math.round(v * 100) / 100;
		const turn = camera.rotation
			? `;transform:rotate(${camera.rotation}deg);transform-origin:${r(camera.pivot.x - camera.x)}px ${r(camera.pivot.y - camera.y)}px`
			: '';
		return `position:absolute;left:${r(camera.x)}px;top:${r(camera.y)}px;width:${r(camera.width)}px;height:${r(camera.height)}px${turn}`;
	});
	const moveStyle = $derived.by(() => {
		const r = (v: number) => Math.round(v * 1000) / 1000;
		const m = drawn?.middle;
		const sx = camera ? camera.width / size.width : clip.width / size.width;
		const sy = camera ? camera.height / size.height : clip.height / size.height;
		const origin = m ? `${r(m.x * sx)}px ${r(m.y * sy)}px` : '50% 50%';
		const moved = x || y || rotation || scale !== 1;
		return `position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:${origin}${moved ? `;transform:translate(${r(x)}px,${r(y)}px) rotate(${r(rotation)}deg) scale(${r(Math.max(0, scale))})` : ''}${opacity !== 1 ? `;opacity:${r(Math.max(0, Math.min(1, opacity)))}` : ''}`;
	});

	/**
	 * The canvas keeps the footage's size and is scaled onto its box with a transform: HTML-in-
	 * Canvas draws a canvas at its own size whatever its CSS width and height say.
	 */
	const canvasStyle = $derived.by(() => {
		const sx = camera ? camera.width / size.width : clip.width / size.width;
		const sy = camera ? camera.height / size.height : clip.height / size.height;
		return `position:absolute;left:0;top:0;width:${size.width}px;height:${size.height}px;transform-origin:0 0;transform:scale(${sx},${sy})`;
	});

	let canvas: HTMLCanvasElement;
	/** The plate through the matte, for the `subject` layer. */
	let cutOut: HTMLCanvasElement | undefined;
	/** What the canvas holds, so a frozen layer is drawn once. */
	let painted = '';

	useFrame(async () => {
		const now = drawn;
		const ctx = canvas.getContext('2d')!;
		if (!now || !now.shape) {
			if (painted) ctx.clearRect(0, 0, canvas.width, canvas.height);
			painted = '';
			return;
		}
		const footage = clip.footage[now.source];
		const key = JSON.stringify([now.source, now.frame, layer, outside, now.shape]);
		if (key === painted) return;
		// The subject is the plate's own pixels through the matte (the cut-out's alpha), so a
		// piece taken off the speaker has exactly the colours of the picture it leaves.
		const [loaded, alpha, mask] = await Promise.all([
			loadPicture(sourceFrameUrl(footage, now.frame, layer === 'subject' ? 'plate' : layer)),
			layer === 'subject' ? loadPicture(sourceFrameUrl(footage, now.frame, 'subject')) : null,
			now.shape.kind === 'mask' ? loadPicture(now.shape.src) : null
		]);
		if (canvas.width !== footage.width || canvas.height !== footage.height) {
			canvas.width = footage.width;
			canvas.height = footage.height;
		}
		let picture: HTMLImageElement | HTMLCanvasElement = loaded;
		if (alpha) {
			cutOut ??= document.createElement('canvas');
			cutOut.width = footage.width;
			cutOut.height = footage.height;
			const c = cutOut.getContext('2d')!;
			c.drawImage(loaded, 0, 0, footage.width, footage.height);
			c.globalCompositeOperation = 'destination-in';
			c.drawImage(alpha, 0, 0, footage.width, footage.height);
			picture = cutOut;
		}
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (now.shape.kind === 'all' && !outside)
			ctx.drawImage(picture, 0, 0, canvas.width, canvas.height);
		else drawRegion(ctx, picture, now.shape, { outside, mask });
		painted = key;
	});

	onMount(() => {
		const holes = (controller.holes ??= []);
		const probes = (controller.probes ??= []);
		const own = (view: { source: string; frame: number }) => {
			if (!hole || (name && view.source !== name)) return null;
			const placed = shapeAt(view.source, view.frame, clip.frame);
			if (!placed) return null;
			const rim = typeof hole === 'object' && hole.rim ? (hole.rim === true ? {} : hole.rim) : null;
			const head = headOf(placed.at);
			// What leaves with `outside` is everything but the region: for a line, the other half.
			const flip = outside && placed.shape.kind === 'half';
			const shape = flip
				? otherHalf(placed.shape as Extract<RegionShape, { kind: 'half' }>)
				: placed.shape;
			return {
				shape,
				mask: shape.kind === 'mask' ? shape.src : null,
				rim,
				near: head ? head.top : null,
				outside: outside && !flip
			};
		};
		const probe = async () => {
			const now = drawn;
			if (!now || region === 'all') return null;
			if (!now.shape)
				return { share: 0, what: 'the region (the matte finds no subject to place it on)' };
			const footage = clip.footage[now.source];
			const [subject, mask] = await Promise.all([
				loadPicture(sourceFrameUrl(footage, now.frame, 'subject')),
				now.shape.kind === 'mask' ? loadPicture(now.shape.src) : null
			]);
			const share = regionShare(subject, { x: footage.width, y: footage.height }, now.shape, mask);
			return { share: outside ? 1 - share : share, what: 'its region' };
		};
		holes.push(own);
		probes.push(probe);
		return () => {
			holes.splice(holes.indexOf(own), 1);
			probes.splice(probes.indexOf(probe), 1);
		};
	});
</script>

<!-- `data-layer`: `check` asks whether the layer draws the speaker over text (see `faceText`). -->
<div class="vf-subject-layer {className}" data-layer={layer} style="{boxStyle};{style}">
	<div style={moveStyle}>
		<canvas bind:this={canvas} width={size.width} height={size.height} style={canvasStyle}></canvas>
	</div>
</div>
