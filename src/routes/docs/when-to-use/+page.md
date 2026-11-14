---
title: When to use VisualFries
description: VisualFries is the open-source engine for social media content. Use it when something spoken should become finished videos and stills, when timing comes from speech, and when an agent writes the edit. How it compares with Remotion and HyperFrames.
updated: 2026-11-14
---

VisualFries is the right choice when social content starts from something spoken, a camera recording, an AI voiceover or an avatar video: your agent edits and animates it into the YouTube video, the shorts and the reels, timed by the words that are said, and makes the stills that go with them.

## It fits when

- A **raw take should become a finished video**: pauses and retakes cut, the speaker framed, captions, transitions, sound and music, in every format. That is a [program](/docs/programs).
- You want a **motion promo** with no speech: an opener, a product film, kinetic type cut to the beat of the music.
- **Timing comes from speech**: transcripts, retakes, word-level captions, inserts that land on a spoken word.
- **An agent writes or repairs the edit**, so JSON plus a CLI that fails loudly beats a timeline GUI.
- You need **transparent inserts** (ProRes 4444) placed on an NLE timeline through `manifest.json`.
- You render on **CPU-only servers** and need the same frame every time.
- You build in **Svelte** and want an editor and a renderer to mount the same [scene document](/docs/scenes).

## Something else may fit better when

- Your team works in **React**, the video lives inside a product, or you want a large ecosystem of components and templates. Remotion is the natural choice there.
- You want **plain HTML compositions** with a large block catalog, a visual editor and hosted rendering. HyperFrames targets that.
- You need a **finished editing product** rather than an engine. VisualFries is a library; ContentFries is the product built on it.

## How they differ

All three render a browser page frame by frame. They differ in what the video starts from and what you write.

|                    | VisualFries                                                                                                                  | Remotion                            | HyperFrames                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------- |
| Built for          | Social content: videos edited from anything spoken, motion promos cut to music, and stills (covers, carousel slides, quotes) | Any video written in React          | Any video made from HTML        |
| You write          | One JSON program plus Svelte blocks                                                                                          | React components                    | HTML, CSS and JavaScript        |
| Primary timing     | Transcript phrases as anchors, plus seconds, frames, beats                                                                   | Frame numbers                       | Seconds in data attributes      |
| Cutting a raw take | Cut list with takes, retakes and order                                                                                       | Sequences and trims you write       | Pause removal through the agent |
| Editor GUI         | None for programs; scenes mount live in your app                                                                             | Remotion Studio                     | Studio app and browser editor   |
| Rendering          | Local headless Chromium, CPU only                                                                                            | Local, server, AWS Lambda           | Local, Docker, cloud            |
| Licence            | MIT                                                                                                                          | Own licence, paid above 3 employees | Apache 2.0                      |

The full comparisons, with sources and dates: [VisualFries vs HyperFrames vs Remotion](/alternatives), [VisualFries as a HyperFrames alternative](/alternatives/hyperframes) and [VisualFries as a Remotion alternative](/alternatives/remotion).
