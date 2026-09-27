# VisualFries

[![npm version](https://badge.fury.io/js/visualfries.svg)](https://badge.fury.io/js/visualfries)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**One document. Every surface.**

VisualFries is an open-source Svelte 5 engine for visual content for social media. A JSON document describes what is on screen, when, and in which format; visuals are Svelte components and real HTML/CSS; animation is GSAP. The same document mounts live in an editor and renders frame-exact on a server. It is the engine behind [ContentFries](https://contentfries.com).

**Docs: [visualfries.com/docs](https://visualfries.com/docs)** · for agents: [visualfries.com/llms.txt](https://visualfries.com/llms.txt)

> VisualFries is in alpha. Scenes power a production app today; motion projects are new and experimental. APIs may change.

## Two ways to use it

**Scenes** are JSON documents with layers of VIDEO, IMAGE, TEXT, SUBTITLES, SHAPE, GIF and AUDIO components. Mount one in a Svelte app, edit it live, render it headless. This is how the ContentFries editor works.

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { createSceneBuilder, type Scene } from 'visualfries';
	let { scene }: { scene: Scene } = $props();
	let container: HTMLDivElement;
	onMount(() => {
		const ready = createSceneBuilder(scene, container, { environment: 'client', autoPlay: true });
		return () => void ready.then((b) => b.destroy());
	});
</script>

<div bind:this={container} style="width: 540px; height: 960px"></div>
```

**Motion projects** are `.vf.json` documents whose clips are your own Svelte components, timed by the **words of a transcript** instead of typed seconds. Made for explainer inserts, lower thirds and title cards that follow a voiceover, and for AI agents that write and repair them.

```json
{
	"size": [1080, 1350],
	"fps": 30,
	"transcript": "voice.transcript.json",
	"clips": [
		{
			"id": "quote",
			"block": "blocks/Quote.svelte",
			"from": "nothing is ever",
			"until": "matched silently",
			"cues": { "hit": "silently" }
		}
	]
}
```

```svelte
<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<blockquote style:opacity={clip.p(0, 0.8)}>Nothing is matched silently.</blockquote>
<figcaption style:opacity={clip.p('hit')}>— lights up when "silently" is said</figcaption>
```

A new voiceover re-times every clip with one flag. A phrase that is no longer said fails with a suggestion ("Did you mean …"), never silently.

## Install

```bash
npm install visualfries
npx visualfries doctor   # ffmpeg, Chromium, Playwright for rendering
```

Requires Svelte 5. Rendering needs ffmpeg and a Chromium browser; no GPU.

## Command line

```bash
# motion projects
npx visualfries clips   project.vf.json                     # where every clip and cue lands
npx visualfries check   project.vf.json --determinism       # run every block in seconds
npx visualfries still   project.vf.json --clip quote --output quote.png
npx visualfries render  project.vf.json --output out/       # MP4, or ProRes 4444 with alpha
npx visualfries render  project.vf.json --output out/ --transcript retake.json

# scenes
npx visualfries caption-scene --video in.mp4 --transcript in.srt --preset reels-center --output scene.json
npx visualfries validate scene.json --strict-runtime-support
npx visualfries render scene.json --output out.mp4
```

## Documentation

|                                                                                                                 |                                                |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [Quickstart](https://visualfries.com/docs/quickstart)                                                           | A motion project from zero to MP4 in six steps |
| [Time and cues](https://visualfries.com/docs/time-and-cues)                                                     | Anchoring clips to spoken phrases              |
| [Motion blocks](https://visualfries.com/docs/blocks) · [The clip object](https://visualfries.com/docs/clip-api) | Writing blocks                                 |
| [Scenes in an app](https://visualfries.com/docs/scenes) · [Composer API](https://visualfries.com/docs/composer) | Scene JSON, live editing                       |
| [CLI](https://visualfries.com/docs/cli) · [Scene CLI](https://visualfries.com/docs/scene-cli)                   | Commands                                       |
| [VisualFries for agents](https://visualfries.com/docs/agents)                                                   | How an AI agent should work with VisualFries   |

The docs site lives in this repository (`src/routes`); every page is also available as Markdown by appending `.md` to its URL. Deeper notes for contributors are in [`docs/`](docs).

## Roadmap

Stills and carousels from the same blocks, quote cards on AI-generated backgrounds with a text safe zone, editing text without re-rendering, turning a post into a short reel, speech-to-text adapters with `visualfries setup`, and export in the viewer's browser. See [Stills, carousels, AI backgrounds](https://visualfries.com/docs/stills).

## Contributing

VisualFries is maintained by one developer and used in production by ContentFries. Issues, bug reports, documentation fixes and examples are welcome on [GitHub](https://github.com/ContentFries/visualfries/issues).

```bash
pnpm install
pnpm dev            # the site and docs at localhost:5173
pnpm test           # unit tests
pnpm build          # static site in build/ and the package in dist/
```

## License

MIT
