---
title: VisualFries for agents
description: How AI coding agents should use VisualFries. The clips, check, still, render loop, the rules for motion blocks, example requests, and machine-readable docs through llms.txt and Markdown pages.
updated: 2026-09-27
---

VisualFries is built to be operated by AI agents as well as people. Documents are JSON, visuals are ordinary Svelte, and every command fails loudly with a message that says what to fix. This page is the working agreement for an agent.

## The loop

Follow it for every change, in this order:

1. **`clips`**: confirm where every clip and cue lands. Fix phrase errors first; the message suggests the closest spoken words.
2. **`check --determinism`**: runs every block in seconds. Do not render while it reports errors.
3. **`still`**: look at the contact sheet (start, every cue, end). Review the image before rendering.
4. **`render`**: only after the stills look right.

```bash
npx visualfries clips project.vf.json
npx visualfries check project.vf.json --determinism
npx visualfries still project.vf.json --clip B --output qa/B.png
npx visualfries render project.vf.json --output out/
```

## Rules for blocks

- Take time only from the clip: `clip.t`, `clip.p()`, `useTimeline`, `useFrame`.
- Compute time-dependent values with `$derived` or in markup; a plain `const` is frozen.
- No CSS transitions or animations, no timers, no `Date.now()`; randomness through `noise(...keys)`.
- Anchor clip ranges with two or three words; cues may be single words.
- Keep visuals in the project (`blocks/`, `theme/`), data in the JSON. Change a phrase in the JSON, not a number in a block.
- Ship fonts with the project.

## Things you can ask for

| Request                                                       | What the agent does                                                               |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| "Make explainer inserts for this video, exactly on my words." | Writes blocks and a `.vf.json` with cues from the transcript, then runs the loop. |
| "I re-recorded that sentence, fix the timing."                | Runs `clips --transcript new.json`; updates phrases only where the words changed. |
| "Make the headline land on 'extra' instead."                  | Changes one cue in the JSON, checks, looks at the still.                          |
| "Give me a transparent sign-off for the end."                 | Adds a clip with `"alpha": true` anchored to the closing words.                   |
| "Turn this quote into a 4:5 post."                            | <span class="tag plan">planned</span> Stills and AI backgrounds.                  |

## Docs for machines

| URL                              | Content                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| [/llms.txt](/llms.txt)           | Index of every page with a one-line summary.                           |
| [/llms-full.txt](/llms-full.txt) | The whole documentation as one Markdown file.                          |
| any docs URL + `.md`             | That page as Markdown, for example [/docs/agents.md](/docs/agents.md). |

Every docs page also has a **Copy page as Markdown** button.

## Skill and setup <span class="tag plan">planned</span>

An installable agent skill and `visualfries setup` (speech-to-text providers, API keys in `.env`, brand fonts) are planned. Until then, point your agent at `/llms.txt` or add this page to its instructions.
