---
title: 'Quickstart: a motion project'
description: Build and render a VisualFries motion project in six steps. Install VisualFries and Playwright, get the quote project, read its document and block, check it, look at a contact sheet and render a silent MP4.
updated: 2026-09-27
---

A **motion project** is a `.vf.json` document that says which Svelte components ("blocks") play when, timed by the words of a transcript. This page takes you from an empty folder to a rendered MP4 with the same `quote` project that runs on the homepage.

## 1. Install

```bash
mkdir my-video && cd my-video
npm init -y
npm install visualfries svelte playwright
npx playwright install chromium   # or point VISUALFRIES_CHROMIUM_PATH at an installed Chromium
npx visualfries doctor
```

Rendering also needs [ffmpeg](https://ffmpeg.org) on your `PATH`. `playwright` is an optional peer dependency, so npm does not install it for you. See [Install and doctor](/docs/install) if a check fails.

## 2. Get the project

```bash
curl -LO https://visualfries.com/demo/quote.zip
unzip quote.zip -d quote && cd quote
```

```text
quote/
  quote.vf.json          which block plays when, and on which words
  voice.transcript.json  word timestamps of the voiceover
  blocks/Quote.svelte    what the clip looks like and how it moves
  styles.css             shared CSS for every block
  fonts/Newsreader.ttf   the font, shipped with the project (OFL)
```

The transcript is a list of words with start and end times in milliseconds (see [Transcripts](/docs/transcripts)):

```json
{
	"words": [
		{ "text": "Nothing", "startMs": 0, "endMs": 400 },
		{ "text": "is", "startMs": 450, "endMs": 550 },
		{ "text": "ever", "startMs": 600, "endMs": 900 },
		{ "text": "matched", "startMs": 1000, "endMs": 1500 },
		{ "text": "silently,", "startMs": 1600, "endMs": 2300 }
	]
}
```

The file in the zip continues with "a missing phrase suggests the closest spoken ones."

## 3. Read the document

```json
{
	"size": [1080, 1350],
	"fps": 30,
	"background": "#f4efe6",
	"fonts": [{ "family": "Newsreader", "src": "fonts/Newsreader.ttf", "weight": "200 800" }],
	"clips": [
		{
			"id": "quote",
			"block": "blocks/Quote.svelte",
			"props": { "quote": "Nothing is matched silently.", "by": "docs/MOTION.md" },
			"from": "nothing is ever",
			"until": "spoken ones",
			"cues": { "reveal": "nothing", "hit": "silently", "by": "suggests" }
		}
	],
	"transcript": "voice.transcript.json",
	"styles": ["styles.css"]
}
```

The clip starts on "nothing" and ends when "ones" ends. `cues` name moments inside it: the quote appears on "nothing", the last word lights up on "silently", the credit fades in on "suggests". Details: [The project file](/docs/project-file) and [Time and cues](/docs/time-and-cues).

## 4. Read the block

```svelte
<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
	const words = clip.props.quote.split(' ');
	const size = Math.round(clip.width / 11); // follows the surface size
</script>

<figure style:font-size="{size}px">
	<blockquote>
		{#each words as word, i}
			{@const last = i === words.length - 1}
			{@const p = clip.p(`reveal+${i * 0.12}`, 0.5)}
			<span
				class:last
				style:color={last && clip.after('hit') ? 'var(--accent)' : null}
				style:opacity={p}
				style:transform="translateY({(1 - p) * 0.3}em)">{word}</span
			>{' '}
		{/each}
	</blockquote>
	<figcaption style:opacity={clip.p('by')}>— {clip.props.by}</figcaption>
</figure>
```

`clip.p('reveal+0.24')` is an eased 0 → 1 progress that starts 0.24 s after "nothing" is said; `clip.after('hit')` becomes true when "silently" starts. Every value in the markup is live, because VisualFries sets the clip's time before each frame. The file in the zip adds a spinning mark, an underline and styles. More in [Motion blocks](/docs/blocks) and [The clip object](/docs/clip-api).

## 5. Resolve and check

```bash
npx visualfries clips quote.vf.json
npx visualfries check quote.vf.json --determinism
```

```text
quote  0.000–6.300s  frame 0  189 frames  blocks/Quote.svelte
  cue reveal         0.00s "Nothing"
  cue hit            1.60s "silently"
  cue by             4.10s "suggests"
ok   quote  (html-in-canvas)
All 1 clips pass.
```

`clips` prints when every clip and cue happens. `check` mounts the block and runs it across the clip without rendering: unknown cues, bad ease names, CSS animations that ignore clip time, and sampled frames that change with seek order are reported before you render.

## 6. Look, then render

```bash
npx visualfries still quote.vf.json --clip quote --output quote.png
npx visualfries render quote.vf.json --output out/
```

`still` writes one contact sheet with frame 0, frame 10, each cue plus 0.6 s and the last frame. `render` writes `out/quote.mp4` and `out/manifest.json` (189 frames took 2.9 s on our test server). The video is **silent**: motion clips are inserts you place over your own voiceover, using the start frame in `manifest.json`. Add `"alpha": true` to a clip for a transparent ProRes 4444 `.mov`.

## Where next

- [Re-takes and a new voiceover](/docs/retakes): re-time everything with one flag.
- [Determinism rules](/docs/determinism): what a block may and may not do.
- [VisualFries for agents](/docs/agents): the loop an AI agent should follow.
