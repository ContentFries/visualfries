---
title: The clip object
description: Reference for useClip() in VisualFries motion blocks. Clip time and frame, eased progress from cues, steps, piecewise maps, word helpers, bound words and props, plus the moment grammar and eases.
updated: 2026-09-27
---

`useClip()` returns the clip a block is drawing. Its time and frame are reactive, so anything computed from them in markup or in `$derived` follows the video.

## Members

| Member                                                    | Returns   | Meaning                                                                                                                            |
| --------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `clip.id`                                                 | string    | The clip's id.                                                                                                                     |
| `clip.t`, `clip.frame`                                    | number    | Clip-local seconds and frame.                                                                                                      |
| `clip.duration`, `clip.frames`, `clip.fps`                | number    | Length and rate of the clip.                                                                                                       |
| `clip.width`, `clip.height`                               | number    | Output size.                                                                                                                       |
| `clip.p(at, dur = 0.6, ease = 'power2.out')`              | 0 → 1     | Eased progress starting at `at`. `dur` 0 gives a step. Eases such as `back.out` overshoot past 1.                                  |
| `clip.out(at, dur = 0.4, ease = 'power2.in')`             | 1 → 0     | Eased exit.                                                                                                                        |
| `clip.after(at)`, `clip.before(at)`, `clip.between(a, b)` | boolean   | Compare the current time with moments. `between` includes `a`, excludes `b`.                                                       |
| `clip.step(a, b, c)`                                      | index     | The last moment passed, -1 before the first.                                                                                       |
| `clip.map([[at, value], …], ease?)`                       | number    | Piecewise map from time to a value. At least one point, in time order; equal values hold.                                          |
| `clip.at(at)`                                             | seconds   | Resolve a moment to clip seconds.                                                                                                  |
| `clip.speaking(word)`, `clip.spoken(word)`                | boolean   | The word is being said (start included, end excluded), or has started.                                                             |
| `clip.has(name, word)`                                    | boolean   | The word belongs to binding `name`, or to the words of cue `name`.                                                                 |
| `clip.cue.name`                                           | object    | `start`, `end`, `frame` of a project cue in clip time, plus its `words`. The built-in `start`/`end` are moments, not entries here. |
| `clip.words.name`                                         | word list | A word binding. Each word has program `start`/`end` and clip-local `localStart`/`localEnd`.                                        |
| `clip.props`                                              | object    | The clip's `props`.                                                                                                                |
| `clip.programStart`                                       | seconds   | Where the clip starts in the program.                                                                                              |

## Moments

Everywhere a moment is expected (`p`, `after`, `map`, `at`, and the CLI's `--at`) the same grammar applies:

| Moment                             | Meaning                                               |
| ---------------------------------- | ----------------------------------------------------- |
| `'extra'`                          | When cue `extra` starts.                              |
| `'extra.end'`                      | When the words of cue `extra` end.                    |
| `'extra+0.4'`, `'extra.end - 0.2'` | Offsets in seconds.                                   |
| `'start'`, `'end'`, `'end-0.3'`    | Built-in cues: the clip's first frame and its length. |
| `'2.5s'`, `'f120'`, `'mid'`        | Clip seconds, a clip frame, the middle of the clip.   |
| `1.5`                              | A number is clip seconds (in code).                   |

Because `end` follows the clip, an exit written as `clip.out('end-0.5')` still lands correctly when a slower voiceover makes the clip longer.

## Eases

Eases are GSAP names such as `power2.out`, `back.out(1.7)`, `expo.inOut` or `none`, or your own function. An unknown name is an error, so a typo never silently becomes a linear animation.

## Helpers

```js
import { clamp, lerp, noise, random } from 'visualfries/motion';
clamp(1.4); // 1
lerp(0, 100, 0.25); // 25
noise(i, clip.frame); // same keys → same value, safe per frame
const rnd = random(7); // seeded sequence for one-off setup only
```

Use `noise` for anything random that is computed per frame. `random` returns a sequence whose values depend on call order, so it only belongs in setup code.
