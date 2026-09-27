---
title: Scenes in an app
description: Mount a VisualFries scene in a Svelte 5 app with createSceneBuilder, edit components live without rebuilding, and render final video with the scene CLI. The scene API that ContentFries uses.
updated: 2026-09-27
---

A scene app mounts a [scene document](/docs/scene-json) with `createSceneBuilder`, plays and seeks it, and changes components live while it is mounted. This is how the ContentFries editor works.

## Mount a scene

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { createSceneBuilder, type Scene } from 'visualfries';

	let { scene }: { scene: Scene } = $props();
	let container: HTMLDivElement;

	onMount(() => {
		const ready = createSceneBuilder(scene, container, { environment: 'client', autoPlay: true });
		// Report a failed load now, not only at unmount.
		ready.catch((err) => console.error('Scene failed to load', err));
		// Destroy the builder even if the component unmounts before it finished loading.
		return () =>
			void ready.then(
				(builder) => builder.destroy(),
				() => {}
			);
	});
</script>

<div bind:this={container} style="width: 540px; height: 960px"></div>
```

## Edit while mounted

Change a mounted component directly instead of rebuilding the scene JSON:

```ts
const headline = builder.components.get('headline');
if (headline?.props.appearance.text) {
	headline.updateAppearance({ text: { ...headline.props.appearance.text, color: '#ff6b2c' } });
	await headline.refresh();
	await builder.seek(builder.currentTime); // re-run time-based state at the playhead
}
```

`components.get` returns `undefined` for an unknown id. `updateAppearance` takes a partial appearance whose nested `text` is complete, so spread the current text styles before changing one of them. Rebuild from JSON only when the scene's identity or duration changes.

## Media sources

Give media components a `url` in `source`. In an app, IMAGE, VIDEO, AUDIO and GIF load from `source.url`; an `assetId` alone does not load a file there. Keep `assetId` as well: it links components to the scene's `assets` list, which the Node render path and subtitles use.

```json
"source": { "url": "https://cdn.example.com/talk.mp4", "assetId": "main-video" }
```

## Client and server

| `environment` | Use                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `client`      | Interactive preview and editing in a browser.                                                                                             |
| `server`      | Frame rendering in a headless browser. Canvas renderer by default; `serverRendererMode: 'webgl'` opts into WebGL with automatic fallback. |

Frame-exact VIDEO and GIF need pre-decoded media frames, which `server` mode alone does not enable. Use the scene CLI (`visualfries render scene.json`) or `renderSceneLocally` from `visualfries/agent`: they pre-decode media before capturing. See [Scene CLI and captions](/docs/scene-cli).

## Build scenes in code

Write scene JSON by hand, or use the [Composer API](/docs/composer) for typed, validated building. Every component type is listed in [Scene components](/docs/components).
