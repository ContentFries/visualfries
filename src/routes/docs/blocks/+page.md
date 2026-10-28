---
title: Motion blocks
description: A motion block is a Svelte 5 component that reads clip time. Write animation as live markup with clip.p, as a paused GSAP timeline with useTimeline, or as per-frame drawing with useFrame.
updated: 2026-10-26
---

A **motion block** is a Svelte 5 component that draws one clip. It reads the clip's time from `useClip()`; VisualFries sets that time before every frame, so a block that follows the [determinism rules](/docs/determinism) gives the same frame in a contact sheet and in the final video.

## Three ways to animate

**1. Live markup.** Read time where you need it. This is the shortest and the most common style.

```svelte
<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<h1 style:opacity={clip.p('extra')} style:transform="translateY({(1 - clip.p('extra')) * 30}px)">
	Transcript <em>by words</em>
</h1>
```

**2. A paused GSAP timeline.** Useful for staggers and choreography that reads better as a timeline. Positions are clip seconds; `at()` turns a cue into seconds and `q()` selects elements of this clip only.

```svelte
<script>
	import { useTimeline } from 'visualfries/motion';
	useTimeline(({ tl, at, q }) => {
		tl.from(
			q('.card'),
			{ y: 60, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(1.7)' },
			at('extra')
		).to(q('.card'), { backgroundColor: '#ff6b2c', duration: 0.3 }, at('extra+0.8'));
	});
</script>
```

VisualFries owns the timeline: it is paused, primed once so every tween records its start values, and seeked to the clip time on each frame.

**Named moves without GSAP.** For entrances, exits and emphasis, [motion primitives](/docs/motion) need one line: `<h1 use:motion={{ enter: 'pop', at: 'extra' }}>`.

**3. Per-frame drawing.** For canvas, procedural SVG or an existing engine.

```svelte
<script>
	import { onMount } from 'svelte';
	import { useClip, useFrame } from 'visualfries/motion';
	import { createFilmstrip } from './filmstrip-driver.js';
	let { offset, timing } = $props();
	const clip = useClip();
	let el, driver;
	onMount(() => {
		driver = createFilmstrip(el);
		return () => driver.destroy();
	});
	useFrame(() => driver.render(offset + clip.map(timing)));
</script>

<div bind:this={el}></div>
```

The CF004 example drives a hand-written filmstrip engine this way, unchanged, and maps its internal time onto the voice with `clip.map`.

A block can also own a WebGL canvas. To run a shader over the block's own HTML, make it a `<canvas layoutsubtree>` with the HTML inside; in `useFrame`, call `canvas.requestPaint()`, await its `paint` event, upload the children with `gl.texElementImage2D(gl.TEXTURE_2D, gl.RGBA8, element)` and draw. Keep CSS `filter` and `mask` off that canvas and every element around it: Chromium crashes on them, so the frame fails and names the element. Filter the canvas's children or do the effect in the shader. On a server without a GPU, WebGL runs on the CPU (see 3D blocks below for the cost).

## 3D blocks

Install `three` in the project folder (`npm install three`) and import it in the block: `import * as THREE from 'three'`, addons as `three/addons/…`. Build the world once in `onMount`, then render it in `useFrame` with every pose computed from the clip's time, never from a clock:

```svelte
<script>
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { useClip, useFrame } from 'visualfries/motion';
	const clip = useClip();
	const W = clip.width;
	const H = clip.height;
	let canvas, world;
	onMount(() => {
		const renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
			preserveDrawingBuffer: true
		});
		renderer.setPixelRatio(1);
		renderer.setSize(W, H, false);
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
		const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshNormalMaterial());
		scene.add(cube);
		world = { renderer, scene, camera, cube };
		return () => renderer.dispose();
	});
	useFrame(({ t }) => {
		const { renderer, scene, camera, cube } = world;
		cube.rotation.y = clip.map(
			[
				[0, 0],
				['turn', 0],
				['turn+0.8', Math.PI]
			],
			'power2.inOut'
		);
		camera.position.set(0, 2, 12 - t * 0.3);
		camera.lookAt(0, 0, 0);
		camera.setViewOffset(W, H, 0, 0.2 * H, W, H); // the scene's centre 30 % down the frame
		renderer.render(scene, camera);
	});
</script>

<canvas bind:this={canvas} style="position:absolute;inset:0;width:100%;height:100%"></canvas>
```

`setPixelRatio(1)` with `setSize(W, H, false)` makes the drawing buffer exactly the clip's pixels. The capture does not need `preserveDrawingBuffer` (frames come out identical without it), but it keeps the frame in the canvas once the browser has shown it, for anything that reads the canvas afterwards, and costs nothing at one frame per capture. `camera.setViewOffset` moves the scene in the frame without turning the camera. Nothing may carry over from earlier frames, as pages draw frames in any order: a geometry whose vertices move every frame needs `computeBoundingSphere()` after the move, because Three.js sorts transparent objects by bounds it computes once (`check --determinism` finds this). To sit behind the speaker in a program, give the clip `"layer": "behind"` and the block its own background, and put labels that stay in front in a second clip. A world that runs through the whole program is one clip from `0` to `"end"` with its beats as cues by phrase (`{ "say": "skill", "occurrence": 2 }` for a repeat); `clip.programTime` and `clip.programFrame` give the program's clock.

Without a GPU, Chromium renders WebGL on the CPU: roughly 0.5 s per 1080×1920 frame per job (a 1 395-frame 3D program took about 700 s with `--jobs 2`), as much as or more than local matting (about 0.36 s per 1920×1080 frame on four CPU threads).

## Data and styling

- **Props** come from the clip's `props` in the project file: read them as `clip.props` or as component props.
- **Pictures per clip** go in `props` as project files: `{ "file": "assets/web/home.png" }`, relative to the project, anywhere in `props`. The block gets a URL instead of the object, so `"props": { "shot": { "file": "assets/web/home.png" } }` is read as `<img src={clip.props.shot} alt="" />`. The file must be inside the project folder; a missing one, or a URL, is an error of the clip that names the path. A `{ "file" }` with no other keys is reserved for this; one with more keys reaches the block as it is, with a warning. Only those files are served to the page (a symlinked folder inside the project counts as part of it).
- **Transcript words** come from `words` bindings: `clip.words.row`, or the words of a cue: `clip.cue.duplicate.words`.
- **Shared components and CSS** live in your project (for example `theme/`). Import components with relative paths; list global CSS under `css`.
- **Fonts** are loaded before a block mounts, so measuring text in `onMount` is safe.
- **Packages**: a block imports npm packages installed for the project (`node_modules` in the project folder or a folder above it), with the subpaths they export. A missing one fails the bundle with the importing file and the `npm install` command. `svelte`, `gsap` and `visualfries/motion` need no install and are always VisualFries's own copies. The package files a block imports are part of its hash, so a new version renders again.

## Two Svelte details

A plain `const` in `<script>` is computed once. Anything that depends on time must be `$derived` or written in the markup:

```svelte
const late = clip.p('stable');             // frozen at the first frame
const late = $derived(clip.p('stable'));   // follows time
<div style:opacity={clip.p('stable')}>     // markup is always live
```

Svelte drops leading whitespace inside an element. Write `<span>{' / FCPXML'}</span>` rather than `<span> / FCPXML</span>`.

## Waiting for assets

```js
import { useReady } from 'visualfries/motion';
useReady(decodeImages()); // the first frame waits until this settles
```

Next: [The clip object](/docs/clip-api) lists every helper; [Motion primitives](/docs/motion) lists the named moves; [Determinism rules](/docs/determinism) lists what a block must not do.
