---
layout: page
title: 'Remotion alternative for edited videos and motion promos: VisualFries (MIT)'
heading: The Remotion alternative where your AI agent is the editor
description: Looking for a Remotion alternative? VisualFries is MIT with no seats. Your AI agent edits anything spoken into finished videos and builds motion promos. Fair.
updated: 2026-11-14
faq:
  - q: Is VisualFries an open-source alternative to Remotion?
    a: Yes. VisualFries is MIT licensed for everyone, with no seat count and no company licence. Remotion uses its own licence, free for individuals, non-profits and for-profit organisations with up to 3 employees, and paid above that.
  - q: Do I need React to use VisualFries?
    a: No. The edit is a JSON program. Custom visuals are Svelte 5 components, and built-in blocks cover captions, end cards and speaker effects without writing any component.
  - q: Can VisualFries do everything Remotion does?
    a: No. Remotion is a general framework for any video written in React, with a Studio, a Player you can embed in an app and rendering on AWS Lambda. VisualFries edits anything spoken into social content and has no hosted renderer or embeddable player for programs.
  - q: How are captions and animations timed in VisualFries?
    a: By phrases of a word-level transcript. A clip starts when a phrase is said and a cue fires on a word. Seconds, frames and music beats work too. After a retake you pass the new transcript and every timing follows.
  - q: Can I move a Remotion project to VisualFries?
    a: There is no converter. The models differ, React code against a JSON program, so a move means rebuilding the edit. For a video driven by a voice that is usually faster than porting, because the cut list, shots, captions and mix are built in.
---

Remotion is the most established way to make video with code, and its code is React. With VisualFries your AI agent is the editor: give it anything spoken (a camera recording, an AI voiceover, an avatar video) and one program, and it renders the finished YouTube video, short or reel, timed by the words that are said. MIT, for everyone.

## The short version

- **Pick VisualFries** for social content your agent should ship end to end (a YouTube episode, shorts, reels, an explainer over a voiceover, [motion promos](/for/promo-videos) cut to music, with their covers and carousel slides), when your agent should write data instead of an app, or when a per-seat licence is a blocker.
- **Pick Remotion** when your team writes React, when the video lives inside a product (a player, a template editor, renders at scale on Lambda), or when you need its ecosystem.
- VisualFries is newer and smaller. On editing and animating a spoken video it does more out of the box.

## What Remotion is

Remotion describes itself as a way to "make videos programmatically with React". [1] A video is a React component; your code reads the current frame and returns what that frame looks like. Around it there is a Studio, a Player for embedding video in an app, rendering on AWS Lambda, official agent skills and a large set of packages and templates. [1] [2] [6] [7]

Remotion has its own licence. It is free for individuals, non-profits and for-profit organisations with up to 3 employees; larger companies need a company licence. [3] The pricing page lists $25 per seat per month for creators, and $0.01 per render with a $100 monthly minimum for automated rendering. [4]

For captions, Remotion offers `@remotion/captions` and four ways to transcribe, among them Whisper.cpp locally and the OpenAI and ElevenLabs APIs. [5] Caption data is in milliseconds, and the component converts it to frames and places each page in a sequence. [5]

## Where VisualFries wins

**MIT, for everyone.** No seats, no render fees, no licence review, whatever the size of your company.

**A finished edit, not a toolkit.** Remotion gives you the parts to build a video. VisualFries takes the raw recording and returns the reel: a cut list over the takes, shots that frame the speaker, captions, transitions, sound effects, music and a mix at -14 LUFS, all in one program.

```json
{
	"cuts": [{ "id": "hook", "source": "talk", "in": "This whole video", "out": "one prompt" }],
	"shots": [{ "id": "claim", "shot": "punch", "from": "nobody edits", "until": "by hand" }],
	"clips": [
		{ "id": "captions", "block": "@visualfries/captions", "from": 0, "until": "one prompt" }
	]
}
```

**Time is the words, not frame numbers.** A shot starts on "nobody edits" and ends on "by hand". Nobody converts milliseconds to frames. Record a retake, pass the new transcript, and the edit follows; a phrase that is gone fails with a "Did you mean" suggestion.

**Your agent writes data and gets told what is wrong.** A program is JSON, so there is no app to scaffold and no build to break. `program` measures every edit point, `check` renders every segment forward, backward and scrambled and compares the frames, and warnings name the clip and the frame: text over the face, a cropped head, a flash at a cut.

**The engine knows where the speaker is.** Seven built-in shots (`full`, `punch`, `strip`, `window`, `behind`, `whip`, `cutout`), words behind the head through a matte, and gags that work on the body.

**One program, every format.** 9:16, 4:5, 1:1 and 16:9 render from the same project with one flag, and safe zones per platform are built in.

## Where Remotion wins

- **Ecosystem and maturity.** More than 70,000 GitHub stars, years in production, templates, packages and answers to almost every question. [1] VisualFries is in alpha, maintained by one developer and used in production by ContentFries.
- **React.** If your team and your components are React, Remotion is home. VisualFries blocks are Svelte 5.
- **Video inside a product.** The Remotion Player embeds a composition in a web app with live props. [6] VisualFries programs render to files.
- **Rendering at scale.** Remotion Lambda is a documented, widely used way to render in parallel in the cloud. [7] VisualFries renders on the machine you run it on.
- **A visual Studio.** Preview, scrub and edit props in the browser. [1] VisualFries programs have stills and contact sheets, no timeline GUI.
- **Videos made from data.** Personalised videos at volume, data-driven videos, music visualisers. VisualFries makes one video at a time for a feed: an edit of something spoken, or a motion promo.
- **Transcription included.** Remotion ships packages that run or call speech-to-text. [5] VisualFries reads the word-level transcript you bring.

## Side by side

|                    | VisualFries                                                                                                                  | Remotion                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Built for          | Social content: videos edited from anything spoken, motion promos cut to music, and stills (covers, carousel slides, quotes) | Any video written in React                                                                             |
| You write          | One JSON program plus Svelte blocks                                                                                          | React components in TypeScript                                                                         |
| Timing             | Phrases of the transcript; seconds, frames and beats also work                                                               | Frame numbers [5]                                                                                      |
| Cutting a raw take | Cut list: takes, retakes, order, handles                                                                                     | Sequences and trims you write; the Recorder template trims silence at the ends of takes [9]            |
| After a retake     | Pass the new transcript, the edit follows                                                                                    | Captions follow new caption data; other timings are yours to update                                    |
| Captions           | Built-in block, word-timed, presets                                                                                          | `@remotion/captions` plus your component [5]                                                           |
| Speaker framing    | Seven built-in shots, face-aware checks                                                                                      | Layout you write                                                                                       |
| Sound              | Effects on words, music on bars, -14 LUFS mix                                                                                | Audio components you place, with volume per frame [10]                                                 |
| Formats            | 9:16, 4:5, 1:1, 16:9 from one program, with safe zones per platform                                                          | One composition can take its size from its input props; the layout for each size is yours to write [8] |
| Editor GUI         | None for programs                                                                                                            | Remotion Studio [1]                                                                                    |
| Rendering          | Local headless Chromium, CPU only                                                                                            | Local, server, AWS Lambda [7]                                                                          |
| Agent support      | Skill in the package, `llms.txt`, loud CLI checks                                                                            | Official agent skills [2]                                                                              |
| Licence            | MIT                                                                                                                          | Remotion licence: free up to 3 employees, paid above [3] [4]                                           |

## Coming from Remotion

1. Install: `npm install visualfries svelte playwright`, then `npx visualfries doctor`.
2. Bring a word-level transcript of your recording. The JSON your speech-to-text provider returns is close to what VisualFries reads; see [Transcripts](/docs/transcripts).
3. Give your agent the recording, the transcript and the skill that ships inside the package, and ask for a reel.
4. Run `npx visualfries check`, look at the stills, render.

The [quickstart](/docs/quickstart) is six steps, and [Programs](/docs/programs) explains the whole edit format. Also weighing an HTML-based tool? See [VisualFries as a HyperFrames alternative](/alternatives/hyperframes) or [all three side by side](/alternatives).

## Sources

Facts about Remotion come from its own pages, read on 14 November 2026. Tools and prices change; if something here is out of date, open an issue and we fix it.

1. [Remotion repository and README](https://github.com/remotion-dev/remotion)
2. [Remotion docs: Agent Skills](https://www.remotion.dev/docs/ai/skills)
3. [Remotion LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
4. [Remotion docs: licence and pricing](https://www.remotion.dev/docs/license/pricing)
5. [Remotion docs: captions](https://www.remotion.dev/docs/captions), with [transcribing](https://www.remotion.dev/docs/captions/transcribing) and [displaying](https://www.remotion.dev/docs/captions/displaying)
6. [Remotion docs: Player](https://www.remotion.dev/docs/player)
7. [Remotion docs: Lambda](https://www.remotion.dev/docs/lambda)
8. [Remotion docs: variable duration and dimensions](https://www.remotion.dev/docs/dynamic-metadata)
9. [Remotion docs: Recorder](https://www.remotion.dev/docs/recorder)
10. [Remotion docs: audio](https://www.remotion.dev/docs/audio)
