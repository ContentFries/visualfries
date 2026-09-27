---
title: Scenes in an app
description: Mount a VisualFries scene in a Svelte 5 app with createSceneBuilder, edit it live without rebuilding, and render it on a server. The scene API that ContentFries uses.
updated: 2026-09-27
---

A scene app mounts a [scene document](/docs/scene-json) with `createSceneBuilder`, plays and seeks it, and changes components live while it is mounted. This is how the ContentFries editor works.

## Mount a scene

```svelte
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createSceneBuilder, type ISceneBuilder, type Scene } from 'visualfries';

	let { scene }: { scene: Scene } = $props();
	let container: HTMLDivElement;
	let builder: ISceneBuilder;

	onMount(async () => {
		builder = await createSceneBuilder(scene, container, { environment: 'client', autoPlay: true });
	});
	onDestroy(() => builder?.destroy());
</script>

<div bind:this={container} style="width: 540px; height: 960px"></div>
```

## Edit while mounted

Change a mounted component directly instead of rebuilding the scene JSON:

```ts
const headline = builder.components.get('headline');
headline.updateAppearance({ text: { color: '#ff6b2c' } }); // deep merge
headline.refresh();
builder.seek(builder.currentTime); // re-run time-based state
```

Rebuild from JSON only when the scene's identity or duration changes.

## Client and server

| `environment` | Use                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client`      | Interactive preview and editing in a browser.                                                                                                           |
| `server`      | Deterministic frame rendering in a headless browser. Canvas renderer by default; `serverRendererMode: 'webgl'` opts into WebGL with automatic fallback. |

Final renders of scenes that contain VIDEO or GIF use pre-decoded frames instead of browser media seeking, so every frame is exact.

## Build scenes in code

Write scene JSON by hand, or use the [Composer API](/docs/composer) for typed, validated building. Every component type is listed in [Scene components](/docs/components).
