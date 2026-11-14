---
layout: comparison
title: 'VisualFries vs HyperFrames vs Remotion: which engine for which video'
heading: VisualFries vs HyperFrames vs Remotion
description: Remotion is React, HyperFrames is HTML, VisualFries turns a raw talking-head recording into a finished reel. A fair comparison of the three, with sources.
updated: 2026-11-14
faq:
  - q: What is the best alternative to HyperFrames or Remotion for talking-head videos?
    a: VisualFries. It is the only one of the three whose main job is editing a raw recording of a person talking into a finished video, with the cut list, shots, captions and sound anchored to the words of the transcript.
  - q: Are all three open source?
    a: VisualFries is MIT and HyperFrames is Apache 2.0; both are free for any use. Remotion has its own licence, free for individuals, non-profits and for-profit organisations with up to 3 employees, and paid above that.
  - q: Do all three work with AI coding agents?
    a: Yes. Each ships skills or guides for agents such as Claude Code and Codex. They differ in what the agent writes. Remotion means React components, HyperFrames means HTML, and VisualFries means a JSON program plus Svelte blocks.
  - q: Which one renders in the cloud?
    a: Remotion documents AWS Lambda. HyperFrames documents HeyGen cloud, AWS Lambda and Google Cloud Run. VisualFries renders on the machine you run it on, CPU only.
---

All three render a web page frame by frame into video, and all three are made to be driven by a coding agent. They are built for different videos. Here is the honest split.

## Pick by the video you are making

- **A person talking to a camera** (reel, short, YouTube explainer, course lesson): **VisualFries**. One raw take in, a finished edit out, cut by the words that were said.
- **Motion design from scratch** (launch film, chart race, website promo), written as plain HTML: **HyperFrames**.
- **Video inside a React product** (embedded player, templates, renders at scale): **Remotion**.

## What makes VisualFries different

The other two start from a blank canvas. VisualFries starts from your recording.

- **The whole edit is one program**: cut list, shots, clips, transitions, captions, sound effects, music.
- **Time is the words**: every timing is a phrase of the transcript, so a retake re-renders without editing anything.
- **The engine knows where the speaker is**: seven built-in shots, words behind the head, checks that catch text over the face.
- **The mix is done**: effects on words, music on bars, -14 LUFS.
- **MIT**: no seats, no accounts, no render fees.

## Side by side

|                    | VisualFries                                             | HyperFrames                                             | Remotion                                             |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| Built for          | Talking-head video: raw recording to finished edit      | Any video made from HTML                                | Any video written in React                           |
| You write          | One JSON program plus Svelte blocks                     | HTML, CSS and JavaScript                                | React components                                     |
| Timing             | Transcript phrases; seconds, frames and beats also work | Seconds in data attributes                              | Frame numbers                                        |
| Cutting a raw take | Cut list with takes, retakes and order                  | Pause removal through the agent                         | Sequences and trims you write                        |
| After a retake     | Pass the new transcript                                 | Cut first, then caption again                           | Update the timings in code                           |
| Speaker framing    | Seven built-in shots, face-aware checks                 | Layout and keyframes you write                          | Layout you write                                     |
| Sound              | Effects on words, music on bars, -14 LUFS mix           | Audio tracks and effects, music catalog with an account | Audio components you place                           |
| Editor GUI         | None for programs                                       | Studio app and browser editor                           | Remotion Studio                                      |
| Rendering          | Local headless Chromium, CPU only                       | Local, Docker, HeyGen cloud, Lambda, Cloud Run          | Local, server, AWS Lambda                            |
| Ready-made parts   | A small set of built-in blocks                          | About 450 blocks and components                         | Templates and packages                               |
| Licence            | MIT                                                     | Apache 2.0                                              | Remotion licence: free up to 3 employees, paid above |
| Maturity           | Alpha, one maintainer, in production at ContentFries    | 80,000+ GitHub stars, backed by HeyGen                  | 70,000+ GitHub stars, years in production            |

## The detailed comparisons

- [VisualFries as a HyperFrames alternative](/alternatives/hyperframes): where each wins, row by row, with sources.
- [VisualFries as a Remotion alternative](/alternatives/remotion): licence, timing model, what you write, with sources.
- [When to use VisualFries](/docs/when-to-use): the short checklist in the docs.

## Sources

Facts about HyperFrames and Remotion come from their own repositories and documentation, read on 14 November 2026; each detailed page lists its sources. If something here is out of date, open an issue and we fix it.
