---
layout: page
title: 'Open-source AI editor for Shorts, Reels and TikTok: VisualFries'
heading: Shorts and reels, cut by the words you said
description: Your AI agent turns a raw take or a passage of a long video into a finished short with captions, punch-ins, words behind your head, sound and an end card. Open source, MIT.
updated: 2026-11-14
faq:
  - q: How is this different from an auto-captions app?
    a: A captions app adds captions to a clip you already cut. VisualFries makes the whole edit, including the cut list over the raw take, the shots that frame you, graphics, sound effects, music and captions, and your agent decides every part of it, so no two clips have to look the same.
  - q: Does it choose the clips from a long video?
    a: Your agent does. It reads the transcript, proposes the passages and writes each one as an excerpt or its own program. VisualFries cuts exactly those ranges.
  - q: Which caption styles are built in?
    a: Five presets, bold, karaoke, pill, punch and neon, with emphasis words and line breaking. A caption style of your own is a Svelte component.
  - q: Will text be covered by the TikTok or Instagram buttons?
    a: Blocks read the safe zone of the platform you choose (TikTok, Meta, YouTube, or all of them at once), and check warns about text outside it.
  - q: Can I render the same clip as 16:9 or 4:5?
    a: Yes. One program renders in any frame size with one flag, and check runs the edit in that size before you render.
---

One raw take, or one good passage of a long video, becomes a vertical clip that holds attention: the pauses gone, a punch-in on the claim, the big word behind your head, captions on every word, a sound on the hit and an end card that sends people to the full video.

## What is in the edit

- **The cut list.** Takes, retakes and their order, each cut placed on a phrase and measured on the sound, with a warning when it clips a word.
- **Shots that know where you are.** `punch`, `strip` with a panel beside you, `window`, `behind` for words behind your head, `whip` to a full-screen card and back, `cutout`.
- **Captions.** The built-in block times every word; five presets, emphasis words, or your own style.
- **Sound.** Effects land on a spoken word, music snaps to bars and ends on one, the mix is -14 LUFS.
- **Safe zones.** TikTok, Meta and YouTube insets are built in.
- **An end card.** The built-in end card closes a teaser with your lines and handle.

```json
{
	"excerpts": [
		{
			"id": "teaser1",
			"from": 0,
			"until": { "say": "while my computer is off", "edge": "end" },
			"format": "1080x1920",
			"end": {
				"duration": 3,
				"props": { "lines": ["Full video", "on YouTube"], "handle": "@channel" }
			}
		}
	]
}
```

## A retake costs nothing

Say the sentence again, pass the new transcript, render. Every cut, shot and caption follows the words. A phrase that is gone fails with a "Did you mean" suggestion instead of landing somewhere wrong.

## What it does not do

- It does not find viral moments by itself: your agent reads the transcript and chooses.
- It is not an app you click in: you need a coding agent.
- It does not transcribe: bring a word-level transcript.

## Start

```bash
npm install visualfries svelte playwright
npx visualfries doctor
```

The worked example is [`static/demo/reel`](https://github.com/ContentFries/visualfries/tree/main/static/demo/reel): a 9:16 reel from one 45-second take, also rendered as 16:9. The format is on [Programs](/docs/programs) and [Shots, transitions and keys](/docs/shots-and-transitions). Editing the long video too? See [YouTube videos](/for/youtube-videos).
