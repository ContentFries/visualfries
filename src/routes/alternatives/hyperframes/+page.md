---
layout: comparison
title: 'HyperFrames alternative for talking-head video: VisualFries'
heading: The HyperFrames alternative built for talking-head video
description: Looking for a HyperFrames alternative? VisualFries is the MIT engine that turns one raw talking-head recording into a finished reel. Fair, sourced comparison.
updated: 2026-11-14
faq:
  - q: Is VisualFries a drop-in replacement for HyperFrames?
    a: No. HyperFrames renders HTML compositions of any kind. VisualFries edits recordings of a person talking, described as one JSON program with Svelte blocks. If your video has no speaker and no transcript, HyperFrames is the better tool.
  - q: Is VisualFries free?
    a: Yes. VisualFries is MIT licensed, renders on your own machine or server, and has no account, no seats and no hosted service to pay for. You pay for your coding agent and, if you use one, your speech-to-text provider.
  - q: Which is better for videos made by an AI agent?
    a: Both are built for agents. HyperFrames has the agent write HTML with timings in seconds. VisualFries has the agent write a cut list, shots and clips anchored to phrases of the transcript, and a check command that names every problem before the render. For talking-head edits that is less to get wrong.
  - q: Can I use VisualFries and HyperFrames together?
    a: Yes. VisualFries can render each clip as a ProRes 4444 insert with an alpha channel, and a finished VisualFries reel is an ordinary MP4 you can place anywhere.
  - q: What do I need to run VisualFries?
    a: Node 20 or newer, ffmpeg, a Chromium browser through Playwright, and a word-level transcript of the recording. No GPU.
---

HyperFrames turns HTML into video, and it does that well. VisualFries does one job: you hand it a raw recording of a person talking and it gives back the finished edit. If your videos start with a camera and a voice, VisualFries is the engine built for exactly that.

## The short version

- **Pick VisualFries** when the video is a talking head: a reel, a short, a YouTube explainer, a course lesson. The whole edit is one program, timed by the words that were said.
- **Pick HyperFrames** when the video is motion design without a recording at its centre: a product launch film, a chart race, a website turned into a promo.
- Both are free, open source and made to be driven by a coding agent. They are good at different videos.

## What HyperFrames is

HyperFrames is an open-source framework from HeyGen, licensed under Apache 2.0. Its own description: "Write HTML. Render video. Built for agents." [1] A composition is an HTML file whose elements carry timing in `data-start` and `data-duration` attributes; animation is GSAP, CSS or Lottie, and the renderer seeks every frame in headless Chrome. [1] Around the framework there is a catalog of about 450 ready-made blocks, a Studio app, a hosted connector for chat apps and cloud rendering on HeyGen, AWS Lambda and Google Cloud Run. [1] [2] [3]

HyperFrames works with footage too. Its guide for talking-head clips covers captions, title cards and a tighter cut with long pauses removed, and it can cut a person out so titles pass behind them. [4] [5]

## Where VisualFries wins

**The whole edit is one program.** A VisualFries program holds the cut list over the raw take, the shots that frame the speaker, the clips over and behind them, the transitions, the captions, the sound effects and the music. One file in, one finished video out, in every format you ask for.

```json
{
	"cuts": [{ "id": "hook", "source": "talk", "in": "This whole video", "out": "one prompt" }],
	"shots": [{ "id": "claim", "shot": "punch", "from": "nobody edits", "until": "by hand" }],
	"clips": [
		{ "id": "captions", "block": "@visualfries/captions", "from": 0, "until": "one prompt" }
	]
}
```

**Time is the words, not seconds.** Every cut, shot, clip and sound effect is anchored to a phrase of the transcript. Record a retake, pass the new transcript, and the whole edit follows. A phrase that is no longer said fails loudly with a "Did you mean" suggestion. In HyperFrames, captions follow the clip as it currently is, so its guide tells you to cut first and caption after, because cutting later makes captions drift. [4]

**Picking and reordering takes is the cut list.** Choosing the third try of a sentence, dropping a retake, pulling the hook from minute nine to second zero: each is one line in `cuts`. The HyperFrames guide covers removing pauses and sends reordering or selecting moments to a separate custom workflow. [4]

**The engine knows where the speaker is.** Seven built-in shots frame the person: `full`, `punch`, `strip`, `window`, `behind`, `whip` and `cutout`. Words sit behind the head through a matte, and `check` warns when text covers the face, when a shot crops the head, or when a clip flashes the camera for a few frames at an edge.

**Sound is part of the edit.** Sound effects land on a spoken word, music snaps to bars and ends on one, and the mix is normalised to -14 LUFS. No second tool.

**Re-renders are cheap.** The program is drawn in 15-second chunks, each encoded once and joined by stream copy. Change one card in a 15-minute talk and only its chunk is drawn again.

## Where HyperFrames wins

- **Range.** Any HTML page can become a video. VisualFries is narrow on purpose.
- **A big catalog.** About 450 blocks and components to install. VisualFries ships a small set of built-in blocks and expects your agent to write the rest in Svelte. [1]
- **A visual editor.** HyperFrames has a Studio app and a browser editor with a timeline. [2] VisualFries programs are edited by an agent or by hand in JSON; there is no timeline GUI for them.
- **Hosted rendering.** HeyGen cloud, AWS Lambda and Google Cloud Run are documented paths. [3] VisualFries renders where you run it: your laptop, your server, your CI.
- **Built-in media.** Voices, a music catalog, avatars and transcription are part of the HyperFrames workflow, some through a HeyGen account. [3] VisualFries reads the word-level transcript you give it and the music you choose.
- **No framework.** HyperFrames needs no React, Svelte or build step. VisualFries blocks are Svelte 5 components.
- **Maturity and community.** HyperFrames has more than 80,000 GitHub stars and a company behind it. [1] VisualFries is in alpha, maintained by one developer and used in production by ContentFries.

## Side by side

|                          | VisualFries                                                    | HyperFrames                                                 |
| ------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Built for                | Talking-head video: raw recording to finished edit             | Any video made from HTML                                    |
| You write                | One JSON program plus Svelte blocks                            | HTML, CSS and JavaScript                                    |
| Timing                   | Phrases of the transcript; seconds, frames and beats also work | Seconds in data attributes                                  |
| Cutting a raw take       | Cut list: takes, retakes, order, handles                       | Pause removal through the agent [4]                         |
| After a retake           | Pass the new transcript, the edit follows                      | Cut first, then caption again [4]                           |
| Speaker framing          | Seven built-in shots, face-aware checks                        | Layout and keyframes you write                              |
| Words behind the speaker | `behind` shot with a matte (fal.ai or local)                   | Background removal, local or cloud [5]                      |
| Sound                    | Effects on words, music on bars, -14 LUFS mix                  | Audio tracks and effects, music catalog with an account [3] |
| Formats                  | 9:16, 4:5, 1:1, 16:9 from one program                          | Set per composition                                         |
| Editor GUI               | None for programs                                              | Studio app and browser editor [2]                           |
| Rendering                | Local headless Chromium, CPU only                              | Local, Docker, HeyGen cloud, Lambda, Cloud Run [3]          |
| Licence                  | MIT                                                            | Apache 2.0 [1]                                              |
| Needs                    | Node 20+, ffmpeg, Chromium, Svelte 5                           | Node 22+, ffmpeg [1]                                        |

## Coming from HyperFrames

1. Install: `npm install visualfries svelte playwright`, then `npx visualfries doctor`.
2. Get a word-level transcript of your recording from your speech-to-text provider.
3. Give your agent the recording, the transcript and the skill that ships inside the package, and ask for a reel.
4. Run `npx visualfries check`, look at the stills, render.

The [quickstart](/docs/quickstart) is six steps, and [Programs](/docs/programs) explains the whole edit format. Also comparing with React? See [VisualFries as a Remotion alternative](/alternatives/remotion) or [all three side by side](/alternatives).

## Sources

Facts about HyperFrames come from its own pages, read on 14 November 2026. Tools change; if something here is out of date, open an issue and we fix it.

1. [HyperFrames repository and README](https://github.com/heygen-com/hyperframes)
2. [HyperFrames documentation: introduction](https://hyperframes.heygen.com/introduction)
3. [HyperFrames FAQ](https://hyperframes.heygen.com/faq)
4. [HyperFrames guide: captions and recuts](https://hyperframes.heygen.com/guides/captions-and-recuts)
5. [HyperFrames guide: remove background](https://hyperframes.heygen.com/guides/remove-background)
