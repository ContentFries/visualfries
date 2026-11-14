---
title: What is VisualFries
description: VisualFries is the open-source engine for social media content, driven by an AI agent. Anything spoken and a JSON program in; YouTube videos, shorts, reels and stills out, with cuts, shots, captions and sound anchored to the words of the transcript. Motion projects and scene documents use the same engine.
updated: 2026-11-14
---

VisualFries is the open-source (MIT) engine for social media content: your agent edits anything spoken (a camera recording, an AI voiceover, an avatar video) into YouTube videos, shorts and reels, timed by the words that are said, and renders covers, posts and carousel slides from the same blocks. A JSON document is the source of truth, visuals are Svelte components and HTML/CSS, animation is GSAP. Motion blocks are functions of time, so with the same document, fonts and browser a frame is meant to look the same whenever it is rendered; `check --determinism` verifies that ([rules](/docs/determinism)). It is the engine behind [ContentFries](https://contentfries.com), which turns one long video into a week of clips, captions and posts.

## Three ways to use it

**Programs** edit a raw recording into a finished video. One `.vf.json` holds the cut list over the takes, the shots that frame the speaker, the clips, the transitions, the captions, the sound effects and the music, with every timing a phrase of the transcript. This is the path for reels, shorts and talking-head explainers, and the one an agent should pick first. Start with [Programs](/docs/programs).

**Scenes** are JSON documents with layers of VIDEO, IMAGE, TEXT, SUBTITLES, SHAPE, GIF and AUDIO components. You mount a scene in a Svelte app with `createSceneBuilder`, edit it live, and render it headless. This is how the ContentFries editor works. Start with [Scenes in an app](/docs/scenes).

**Motion projects** are `.vf.json` documents whose clips are your own Svelte components ("blocks"), timed by the words of a transcript instead of typed seconds. They are made for explainer inserts, lower thirds and title cards that follow a voiceover, and for agents that write and repair them. Start with the [Quickstart](/docs/quickstart).

## The five ideas

Every VisualFries file is read the same way. The docs follow this order.

|     | Idea                           | What it means                                                                        |
| --- | ------------------------------ | ------------------------------------------------------------------------------------ |
| 01  | [Document](/docs/project-file) | JSON describes the output. An app or an agent writes it; a diff reviews it.          |
| 02  | [Blocks](/docs/blocks)         | Any visual is a Svelte component. Text is real DOM, so it wraps and reflows.         |
| 03  | [Time](/docs/time-and-cues)    | Cues are spoken words from a transcript. A new voiceover re-times everything.        |
| 04  | [Surfaces](/docs/surfaces)     | Size, frame rate and transparency come from the document.                            |
| 05  | [Render](/docs/cli)            | A frame does not depend on which frames came before it. MP4, ProRes 4444 with alpha. |

## What works today

| Feature                                                                          | Status                                |
| -------------------------------------------------------------------------------- | ------------------------------------- |
| Scene JSON, composer API, live editing in an app                                 | Works today                           |
| Motion projects: blocks, transcript cues, `clips`, `check`, `still`, `render`    | Works today (experimental)            |
| New voiceover re-timing with `--transcript` and "Did you mean" suggestions       | Works today                           |
| Deterministic render on a CPU-only server, alpha output, NLE manifest            | Works today                           |
| Agent skill for scene JSON (`skills/visualfries`)                                | Works today                           |
| Stills, carousels and quote cards on AI-generated backgrounds                    | <span class="tag plan">planned</span> |
| Editing text of a still by drag and drop without re-rendering                    | <span class="tag plan">planned</span> |
| `visualfries setup` with speech-to-text providers and keys; a motion agent skill | <span class="tag plan">planned</span> |
| Live motion preview with a scrubber                                              | <span class="tag plan">planned</span> |
| Export in the viewer's browser                                                   | <span class="tag plan">planned</span> |

## Where next

- [Install and doctor](/docs/install): what the renderer needs.
- [Quickstart](/docs/quickstart): a motion project from zero to MP4 in six steps.
- [VisualFries for agents](/docs/agents): how an AI agent should work with VisualFries.
- [Troubleshooting](/docs/troubleshooting): the errors you are most likely to meet.
