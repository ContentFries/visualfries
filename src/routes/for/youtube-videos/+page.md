---
layout: page
title: 'Open-source AI YouTube video editor for your coding agent: VisualFries'
heading: Your AI agent edits your YouTube videos
description: Hand your agent a recording or an AI voiceover. VisualFries renders the finished YouTube video with cuts, punch-ins, graphics on your words, music and the mix. MIT.
updated: 2026-11-14
faq:
  - q: Can an AI agent really edit a whole YouTube video?
    a: Yes. The edit is one JSON program of cuts, shots, clips and sound, anchored to phrases of the transcript. The agent writes it, the CLI resolves it and names every problem, the agent fixes it and renders. We edit every episode of our own channel this way, including a 17-minute one as a single program.
  - q: How long does a render take?
    a: It depends on the length and on how much is drawn over the footage. The video is drawn in 15-second chunks that are encoded once and cached, so after a change only the chunks that changed are drawn again and the rest is joined without encoding.
  - q: Can I keep editing in DaVinci Resolve or Premiere?
    a: Yes. Render the graphics as transparent ProRes 4444 inserts with handles and a manifest that says where each one goes, and finish on your own timeline.
  - q: Does VisualFries transcribe the recording?
    a: Not yet. Bring a word-level transcript from your speech-to-text provider; VisualFries reads the JSON most of them return.
  - q: What does it cost?
    a: VisualFries is free and MIT licensed. You pay for your coding agent and your speech-to-text provider.
---

You talk, or your AI voice does. Your agent edits. VisualFries renders the finished episode: the dead air and the retakes cut, punch-ins on the claims, full-screen cards for the one thing worth showing, graphics that land on the word you say, music under the whole video and a mix at -14 LUFS.

<video src="/media/v4/cf053-demo.mp4" poster="/media/v4/cf053-demo.jpg" autoplay muted loop playsinline aria-label="A passage of a YouTube episode made only of explainer animation: ten questions wrapped into one call, a sorting machine with a running counter, and a wall of tiles a human colours one by one before the model fills it in a wave. Captions translate the voice."></video>

28 seconds of a CodingFry episode, edited by an agent. The episode is in Slovak; for this page the same program was rendered again with English text on screen, and the captions translate the voice.

## What you hand over

- Something spoken: raw camera takes, a rough cut you already made, an AI voiceover for a fully animated video, or an avatar video.
- A word-level transcript of it.
- One sentence about what you want.

## What your agent writes

One program. Every timing is a phrase you said, so nothing is a guessed timestamp.

```json
{
	"size": [1920, 1080],
	"cuts": [{ "id": "intro", "source": "talk", "in": "today we fix", "out": "the slow export" }],
	"shots": [{ "id": "claim", "shot": "punch", "from": "today we fix", "until": "slow export" }],
	"clips": [
		{
			"id": "steps",
			"block": "blocks/Steps.svelte",
			"slot": "card",
			"from": "three steps",
			"until": "that is all"
		}
	],
	"sfx": [{ "at": "three steps", "sound": "sfx/pop.wav", "gain": -5 }]
}
```

## Built for long videos

- **One changed card redraws 15 seconds.** The video is drawn in 15-second chunks, each encoded once and joined by stream copy. A render that draws nothing new only joins.
- **Phrases that come back.** In a long talk the same words are said again minutes later. A repeated phrase resolves by program order, and the CLI prints which occurrence it picked.
- **Checks before the render.** `check` warns when text covers your face, when a shot crops your head and when a full-screen card flashes the camera for a few frames at a cut.
- **Seven shots, six transitions.** `full`, `punch`, `strip`, `window`, `behind`, `whip` and `cutout`; a corner face-cam while a visual explains is one line.
- **Teasers from the same program.** An excerpt renders a passage as a vertical short with an end card, without a second project.
- **Your editor stays an option.** Export every graphic as a transparent insert with a manifest and finish in Resolve or Premiere.

## What it does not do

- It does not pick the takes or write the visuals on its own: your agent does, with your direction.
- It has no timeline to click in. You review stills and the render.
- It does not transcribe, and it does not sync several cameras for you.

## Start

```bash
npm install visualfries svelte playwright
npx visualfries doctor
```

Then give your agent the recording, the transcript and the skill that ships in the package. The format is on [Programs](/docs/programs), the working agreement for agents on [VisualFries for agents](/docs/agents). Cutting vertical clips too? See [shorts and reels](/for/shorts-and-reels).
