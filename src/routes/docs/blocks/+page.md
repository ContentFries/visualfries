---
title: Motion blocks
description: A motion block is a Svelte 5 component that reads clip time. Write animation as live markup with clip.p, as a paused GSAP timeline with useTimeline, or as per-frame drawing with useFrame.
updated: 2026-10-21
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

A block can also own a WebGL canvas. To run a shader over the block's own HTML, make it a `<canvas layoutsubtree>` with the HTML inside; in `useFrame`, call `canvas.requestPaint()`, await its `paint` event, upload the children with `gl.texElementImage2D(gl.TEXTURE_2D, gl.RGBA8, element)` and draw. Keep CSS `filter` and `mask` off that canvas and every element around it: Chromium crashes on them, so the frame fails and names the element. Filter the canvas's children or do the effect in the shader. On a server without a GPU, WebGL runs on the CPU and roughly doubles the cost of a 1080p frame.

## Data and styling

- **Props** come from the clip's `props` in the project file: read them as `clip.props` or as component props.
- **Transcript words** come from `words` bindings: `clip.words.row`, or the words of a cue: `clip.cue.duplicate.words`.
- **Shared components and CSS** live in your project (for example `theme/`). Import components with relative paths; list global CSS under `styles`.
- **Fonts** are loaded before a block mounts, so measuring text in `onMount` is safe.
- A block may import `svelte`, `gsap` and `visualfries/motion` without its own `node_modules`.

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
