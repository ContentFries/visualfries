# VisualFries

[![npm version](https://badge.fury.io/js/visualfries.svg)](https://badge.fury.io/js/visualfries)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Your AI agent is your editor now. VisualFries is the open-source engine it edits with.**

VisualFries is an engine for social media content. Give your agent anything spoken (a camera recording, an AI voiceover, an avatar video) and it writes one JSON program; VisualFries renders the finished YouTube video, short or reel: the pauses and retakes cut, the speaker framed, words behind the head, captions, motion graphics, transitions, sound effects and music, all anchored to the words that were said. The same blocks render stills at any size: covers, thumbnails, image posts and carousel slides, in 9:16, 4:5, 1:1 and 16:9 with safe zones for TikTok, Meta and YouTube. It renders frame by frame in headless Chromium, on a CPU; the edit is data, and the CLI says what to fix. Open source, MIT. It is the engine behind [ContentFries](https://contentfries.com).

**Site and examples: [visualfries.com](https://www.visualfries.com)** · docs: [visualfries.com/docs](https://www.visualfries.com/docs) · for agents: [visualfries.com/llms.txt](https://www.visualfries.com/llms.txt)

> VisualFries is in alpha. Scenes power a production app today; programs and motion projects are new. APIs may change.

## From a raw take to a finished reel

A **program** is one `.vf.json` that describes the whole edit. Every timing is a phrase of the transcript, so a retake renders again without touching the edit.

```json
{
	"size": [1080, 1920],
	"fps": 30,
	"footage": {
		"talk": { "src": "talk.mp4", "matte": "talk.matte.mp4", "transcript": "take.transcript.json" }
	},
	"cuts": [{ "id": "hook", "source": "talk", "in": "today we fix", "out": "the slow export" }],
	"shots": [{ "id": "claim", "shot": "punch", "from": "today we fix", "until": "slow export" }],
	"clips": [
		{
			"id": "captions",
			"block": "@visualfries/captions",
			"from": 0,
			"until": "end",
			"words": { "captions": "clip" }
		}
	],
	"sfx": [{ "at": "slow export", "sound": "sfx/pop.wav", "gain": -5 }]
}
```

```bash
npx visualfries program reel.vf.json                 # resolve the edit, measure every edit point
npx visualfries check   reel.vf.json --determinism   # every segment, in seconds
npx visualfries still   reel.vf.json --at 7.5s --output qa/sheet.png
npx visualfries render  reel.vf.json --output out/   # one MP4; add --format 1920x1080 for 16:9
```

Seven built-in shots frame the speaker (`full`, `punch`, `strip`, `window`, `behind`, `whip`, `cutout`), six transitions hand the frame over, and the mix lands at -14 LUFS. Guide: [Programs](https://www.visualfries.com/docs/programs). Worked example: [`static/demo/reel`](static/demo/reel).

## Two more ways to use it

**Scenes** are JSON documents with layers of VIDEO, IMAGE, TEXT, SUBTITLES, SHAPE, GIF and AUDIO components. Mount one in a Svelte app, edit it live, render it headless. This is how the ContentFries editor works.

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { createSceneBuilder, type Scene } from 'visualfries';
	let { scene }: { scene: Scene } = $props();
	let container: HTMLDivElement;
	onMount(() => {
		const ready = createSceneBuilder(scene, container, { environment: 'client', autoPlay: true });
		ready.catch((err) => console.error('Scene failed to load', err));
		return () => {
			ready.then((b) => b.destroy()).catch(() => {});
		};
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
<figcaption style:opacity={clip.p('hit')}>Lights up when "silently" is said</figcaption>
```

A new voiceover re-times every clip with one flag. A phrase that is no longer said fails with a suggestion ("Did you mean …"), never silently.

## Install

```bash
npm install visualfries svelte playwright   # playwright only for rendering
npx playwright install chromium             # or set VISUALFRIES_CHROMIUM_PATH
npx visualfries doctor
```

Requires Svelte 5. Rendering needs Playwright, ffmpeg and a Chromium browser; no GPU. Try the [quote project](https://www.visualfries.com/demo/quote.zip) from the homepage.

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

|                                                                                                                         |                                                |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [Programs](https://www.visualfries.com/docs/programs)                                                                   | From a raw take to a finished reel             |
| [Quickstart](https://www.visualfries.com/docs/quickstart)                                                               | A motion project from zero to MP4 in six steps |
| [Time and cues](https://www.visualfries.com/docs/time-and-cues)                                                         | Anchoring clips to spoken phrases              |
| [Motion blocks](https://www.visualfries.com/docs/blocks) · [The clip object](https://www.visualfries.com/docs/clip-api) | Writing blocks                                 |
| [Scenes in an app](https://www.visualfries.com/docs/scenes) · [Composer API](https://www.visualfries.com/docs/composer) | Scene JSON, live editing                       |
| [CLI](https://www.visualfries.com/docs/cli) · [Scene CLI](https://www.visualfries.com/docs/scene-cli)                   | Commands                                       |
| [VisualFries for agents](https://www.visualfries.com/docs/agents)                                                       | How an AI agent should work with VisualFries   |

The docs site lives in this repository (`src/routes`); every page is also available as Markdown by appending `.md` to its URL. Deeper notes for contributors are in [`docs/`](docs).

## Made with VisualFries

Every video on [visualfries.com](https://www.visualfries.com) was rendered by VisualFries. If you publish something made with it, add `Edited with VisualFries (visualfries.com)` to the description and tell us in an issue: we link the good ones.

## Roadmap

A carousel as one command (pages and a PDF), quote cards on AI-generated backgrounds with a text safe zone, editing text without re-rendering, turning a post into a short reel, speech-to-text adapters with `visualfries setup`, and export in the viewer's browser. See [Stills, carousels, AI backgrounds](https://www.visualfries.com/docs/stills).

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
