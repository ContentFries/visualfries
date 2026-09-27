---
title: VisualFries for agents
description: How AI coding agents should use VisualFries. The loop for motion projects (clips, check, still, render), the loop for scene JSON (validate, inspect, qa, render), rules for blocks, example requests, the scene skill and machine-readable docs.
updated: 2026-09-27
---

VisualFries is built to be operated by AI agents as well as people. Documents are JSON, visuals are ordinary Svelte, and the commands report what to fix. This page is the working agreement for an agent. Pick the branch that matches the document you are working on.

## Motion projects (.vf.json)

Follow this loop for every change, in this order:

1. **`clips`**: confirm where every clip and cue lands. Fix phrase errors first; when similar words were spoken the message suggests them.
2. **`check --determinism`**: runs every block in seconds. Do not render while it reports errors.
3. **`still`**: look at the contact sheet (frame 0, frame 10, each cue + 0.6 s, the last frame). Review the image before rendering.
4. **`render`**: only after the stills look right.

```bash
npx visualfries clips project.vf.json
npx visualfries check project.vf.json --determinism
npx visualfries still project.vf.json --clip B --output qa/B.png
npx visualfries render project.vf.json --output out/
```

### Rules for blocks

- Take time only from the clip: `clip.t`, `clip.p()`, `useTimeline`, `useFrame`.
- Compute time-dependent values with `$derived` or in markup; a plain `const` is frozen.
- No CSS transitions or animations, no timers, no `Date.now()`; randomness through `noise(...keys)`.
- Anchor clip ranges with two or three words; cues may be single words.
- Keep visuals in the project (`blocks/`, `theme/`), data in the JSON. Change a phrase in the JSON, not a number in a block.
- Ship fonts with the project.

## Scene JSON (scene.json)

```bash
npx visualfries validate scene.json --strict-runtime-support
npx visualfries inspect scene.json --json
npx visualfries qa scene.json --output qa/
npx visualfries render scene.json --output out.mp4
```

Validate first, look at the QA frames around every authored event, then render. Use native TEXT for visible typography and give media a `source.url`. The package includes an agent skill for this workflow in `skills/visualfries/SKILL.md`; point your agent at it. Details: [Scene CLI and captions](/docs/scene-cli).

## Things you can ask for

| Request                                                       | What the agent does                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| "Make explainer inserts for this video, exactly on my words." | Writes blocks and a `.vf.json` with cues from the transcript, then runs the motion loop. |
| "I re-recorded that sentence, fix the timing."                | Runs `clips --transcript new.json`; updates phrases only where the words changed.        |
| "Make the headline land on 'extra' instead."                  | Changes one cue in the JSON, checks, looks at the still.                                 |
| "Give me a transparent sign-off for the end."                 | Adds a clip with `"alpha": true` anchored to the closing words.                          |
| "Caption this talking-head video."                            | Runs `caption-scene` with a preset, validates, checks QA frames, renders.                |
| "Turn this quote into a 4:5 post."                            | <span class="tag plan">planned</span> Stills and AI backgrounds.                         |

## Docs for machines

| URL                              | Content                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| [/llms.txt](/llms.txt)           | Index of every page with a one-line summary.                           |
| [/llms-full.txt](/llms-full.txt) | The whole documentation as one Markdown file.                          |
| any docs URL + `.md`             | That page as Markdown, for example [/docs/agents.md](/docs/agents.md). |

Every docs page also has a **Copy page as Markdown** button.

## Motion skill and setup <span class="tag plan">planned</span>

A motion-project skill and `visualfries setup` (speech-to-text providers, API keys in `.env`, brand fonts) are planned. Until then, point your agent at `/llms.txt` or add this page to its instructions.
