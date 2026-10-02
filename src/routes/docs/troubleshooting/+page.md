---
title: Troubleshooting
description: The VisualFries errors you are most likely to meet and how to fix them. Chromium or Playwright not found, fonts that fail to load, phrases not found or ambiguous, unknown cues and eases, paint timeouts, frames that change with seek order, stale renders.
updated: 2026-09-27
---

Every VisualFries error names what went wrong and, where possible, what to change. This page collects the common ones with their fixes.

## Setup

| Message                                | Fix                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `playwright is required for rendering` | `npm install playwright`. It is an optional peer dependency that npm does not install on its own. |
| `FAIL chromiumExecutable`              | `npx playwright install chromium`, or `export VISUALFRIES_CHROMIUM_PATH=/path/to/chromium`.       |
| `ffmpeg failed` or `FAIL ffmpeg`       | Install ffmpeg and make sure it is on `PATH`, or set `FFMPEG_PATH`.                               |
| `Fonts failed to load: Newsreader`     | The file in `fonts[].src` is missing or unreadable. Paths are relative to the project file.       |

## Timing

| Message                                                               | Fix                                                                                    |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Phrase "extra" not found inside the clip. Did you mean "spare" …?` | The words changed. Use the suggested phrase, or check you passed the right transcript. |
| `Phrase "small" is ambiguous: #1 at 79.09s …; #2 at 83.61s …`          | Use a longer phrase, or `{ "say": "small", "occurrence": 2 }`.                          |
| `One-word anchor "things" … easily becomes ambiguous`                   | A warning. Anchor `from`/`until` with two or three words.                              |
| `Cue at 65.10s is never shown`                                        | The cue lands after the last frame. Move it, or extend the clip with `tail`.           |
| `Unknown clip "B". Clips: …`                                          | A typo in `--clip`. The message lists the ids that exist.                              |

## Blocks

| Message                                                 | Fix                                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `unknown moment "extar"`                                | The cue name in the block does not exist in the project. The message lists valid names.                     |
| `Unknown ease "power2.Out"`                             | Ease names are case-sensitive: `power2.out`.                                                                |
| `map() moments must not go back in time`                | The points of `clip.map` are out of order, often after a re-take moved cues. Reorder them.                  |
| `CSS animation(s)/transition(s) run on wall-clock time` | Remove the CSS animation and drive the property from clip time.                                             |
| `Frames … look different depending on seek order`       | The block keeps state between frames or uses `random()`/timers. See [Determinism rules](/docs/determinism). |
| A value never changes                                   | A plain `const` computed from `clip`. Use `$derived(...)` or read it in markup.                             |

## Rendering

| Message                                      | Fix                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Paint did not happen within 2000 ms`        | The page is overloaded or stuck. Lower `--jobs`, and check the block for heavy work in `useFrame`. |
| `rendered 470 of 471 frames`                 | A capture failed mid-render. Re-run the clip; the error above it names the cause.                  |
| `… were rendered against another transcript` | Stale clips in `manifest.json`. Re-render the listed clips.                                        |
