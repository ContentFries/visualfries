---
title: 'Quickstart: a motion project'
description: Build a motion project in six steps. Write a .vf.json document and a Svelte block, time it by the words of a transcript, check it, look at a contact sheet and render an MP4.
updated: 2026-09-27
---

A **motion project** is a `.vf.json` document that says which Svelte components ("blocks") play when, timed by the words of a transcript. This page takes you from an empty folder to a rendered MP4 in six steps.

## 1. Install

```bash
npm install visualfries
npx visualfries doctor
```

See [Install and doctor](/docs/install) if a check fails.

## 2. Lay out the folder

```text
quote/
  quote.vf.json          which block plays when, and on which words
  voice.transcript.json  word timestamps of the voiceover
  blocks/Quote.svelte    what the clip looks like and how it moves
  fonts/Newsreader.ttf   ship fonts with the project
```

A transcript is a list of words with start and end times. Soniox-style milliseconds and plain seconds both work (see [Transcripts](/docs/transcripts)):

```json
{
	"words": [
		{ "text": "Nothing", "startMs": 0, "endMs": 400 },
		{ "text": "is", "startMs": 450, "endMs": 550 },
		{ "text": "ever", "startMs": 600, "endMs": 900 },
		{ "text": "matched", "startMs": 1000, "endMs": 1500 },
		{ "text": "silently.", "startMs": 1600, "endMs": 2300 }
	]
}
```

## 3. Write the document

```json
{
	"size": [1080, 1350],
	"fps": 30,
	"transcript": "voice.transcript.json",
	"fonts": [{ "family": "Newsreader", "src": "fonts/Newsreader.ttf", "weight": "400 700" }],
	"background": "#f4efe6",
	"clips": [
		{
			"id": "quote",
			"block": "blocks/Quote.svelte",
			"from": "nothing is ever",
			"until": "matched silently",
			"tail": 1,
			"cues": { "hit": "silently" },
			"props": { "quote": "Nothing is matched silently.", "by": "docs/MOTION.md" }
		}
	]
}
```

`from` and `until` are phrases from the transcript; the clip starts on the first word and ends when the last word ends, plus `tail` seconds. `cues` are named moments inside the clip. Details: [The project file](/docs/project-file) and [Time and cues](/docs/time-and-cues).

## 4. Write the block

```svelte
<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<figure>
	<blockquote style:opacity={clip.p(0, 0.8)}>{clip.props.quote}</blockquote>
	<figcaption style:opacity={clip.p('hit')}>— {clip.props.by}</figcaption>
</figure>

<style>
	figure {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		padding: 120px;
		margin: 0;
	}
	blockquote {
		margin: 0;
		font: 500 96px/1.05 Newsreader;
		color: #17130f;
	}
	figcaption {
		margin-top: 40px;
		font: 28px monospace;
		color: #6b6259;
	}
</style>
```

`clip.p('hit')` is an eased 0 → 1 progress that starts when "silently" is spoken. Every value in the markup is live, because VisualFries sets the clip's time before each frame. More in [Motion blocks](/docs/blocks) and [The clip object](/docs/clip-api).

## 5. Resolve and check

```bash
npx visualfries clips quote.vf.json
npx visualfries check quote.vf.json --determinism
```

`clips` prints when every clip and cue happens. `check` mounts the block and runs it across the whole clip in seconds: unknown cues, bad ease names, CSS animations that ignore clip time, and frames that change with seek order are reported before you render.

## 6. Look, then render

```bash
npx visualfries still quote.vf.json --clip quote --output quote.png
npx visualfries render quote.vf.json --output out/
```

`still` writes one contact sheet with the start, every cue and the end, so you (or your agent) can review the whole clip in one image. `render` writes `out/quote.mp4` and `out/manifest.json`. Add `"alpha": true` to a clip for a transparent ProRes 4444 `.mov`.

## Where next

- [Re-takes and a new voiceover](/docs/retakes): re-time everything with one flag.
- [Determinism rules](/docs/determinism): what a block may and may not do.
- [VisualFries for agents](/docs/agents): the loop an AI agent should follow.
