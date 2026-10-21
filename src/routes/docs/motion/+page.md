---
title: Motion primitives
description: Named entrances, exits and emphasis moves for motion blocks in one line with use:motion. Text splits with stagger, typewriter, SVG draw-on and counters, scaled by the clip's energy, seek-safe, and recorded as events for sound effects.
updated: 2026-10-21
---

`use:motion` gives any element of a [motion block](/docs/blocks) a named entrance, exit or emphasis, timed by a [moment](/docs/clip-api#moments). No GSAP to write, and every frame is a pure function of clip time, so it renders the same in any seek order.

```svelte
<script>
	import { motion } from 'visualfries/motion';
</script>

<h1 use:motion={{ enter: 'pop', at: 'title', exit: 'fade', emphasis: 'pulse' }}>Motion</h1>
<p use:motion={{ enter: 'rise', split: 'words', at: 'list' }}>Three short words</p>
<span use:motion={{ count: 12400, at: 'stat' }}>0</span>
```

## The moves

| Kind      | Names                                                                                         |
| --------- | --------------------------------------------------------------------------------------------- |
| Entrances | `fade`, `pop`, `slide`, `scale`, `rise`, `drop`, `reveal`, `blur-in`, `spring`                |
| Exits     | the same names, mirrored: `slide`, `rise`, `drop` and `reveal` keep travelling the same way   |
| Emphasis  | `pulse`, `shake`, `wiggle`, `punch`, `highlight`, `underline`, `strike`, `glow`               |
| Text      | `split` by `words`, `chars` or `lines` with `stagger`; `enter: 'typewriter'`                  |
| Other     | `enter: 'draw'` draws SVG strokes on (`exit: 'draw'` erases them); `count` counts a number up |

`reveal` is a mask from a side; `blur-in` is the only entrance that blurs. `highlight`, `underline`, `strike` and `glow` stay once drawn; the others settle back.

## Options

| Option      | Default                        | Meaning                                                                                                      |
| ----------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `enter`     | none                           | The entrance.                                                                                                |
| `at`        | `'start'`                      | When the entrance starts (without one: when the emphasis or the count starts).                               |
| `exit`      | none                           | The exit.                                                                                                    |
| `until`     | `'end'`                        | When the element is gone; the exit ends here, so it follows a longer voiceover.                              |
| `emphasis`  | none                           | A name, `{ move, at?, duration?, color? }`, or a list of them. Default moment: when the entrance has landed. |
| `duration`  | from the energy                | Seconds of the entrance and the exit.                                                                        |
| `direction` | `'left'`                       | The side `slide` and `reveal` come from (`left`, `right`, `up`, `down`); also where a highlight starts.      |
| `split`     | none                           | Animate each word, character or line; `typewriter` always splits characters.                                 |
| `stagger`   | from the energy                | Seconds between split items, or between the strokes of a drawn SVG.                                          |
| `intensity` | `1`                            | Multiplies distances, scales and shakes.                                                                     |
| `energy`    | the clip's                     | `calm`, `balanced` or `punchy` for this element only.                                                        |
| `count`     | none                           | A number, or `{ from, to, decimals, format }`. The element's text becomes the counter.                       |
| `color`     | `var(--brand-accent, #fbc42d)` | Colour of highlight, underline and glow (strike uses the text colour).                                       |
| `ease`      | per move                       | A GSAP ease name or a function, replacing the move's own.                                                    |

Unknown names are errors listing the valid ones, never a silent default.

## Energy

Defaults come from the clip's energy: `"props": { "energy": "punchy" }` in the project file, else the energy of the project's style (`"style": "kinetic"` is punchy), else `balanced`. Any other value of `props.energy` (say a block's own `0.8`) is left to the block and counts as `balanced`. One table (`ENERGY`, exported from `visualfries/motion`) holds every number energy changes:

| Energy     | Entrance | Word stagger | Amount | Ease         |
| ---------- | -------- | ------------ | ------ | ------------ |
| `calm`     | 0.8 s    | 0.12 s       | 0.6    | `power2.out` |
| `balanced` | 0.55 s   | 0.08 s       | 1      | `power3.out` |
| `punchy`   | 0.35 s   | 0.05 s       | 1.5    | `expo.out`   |

Distances are fractions of the shorter side of the clip, so a resized render keeps the same feel.

## Events for sound

Each move records an event on the clip at its visual moment: one per stagger item, one per emphasis, a `tick` on every frame where a counter's number changes. `clip.events()` lists them in time order:

```js
clip.events();
// [{ name: 'pop', t: 1.19, frame: 36, move: 'pop', phase: 'enter', item: 0, items: 3, intensity: 1 }, …]
```

Names describe what happens: `enter`, `exit`, `pop`, `whoosh` (slide), `slam` (a `drop` landing, `punch`), `wipe` (reveal), `type`, `draw`, `tick`, and each emphasis by its own name. Nothing plays yet; the list is what sound effects will be placed on. Your own code can add events the same way: `clip.event('riser', 'drop-0.5')`.

## Rules

- `use:motion` owns these properties of its element and of its split items: `transform`, `transform-box`, `transform-origin`, `opacity`, `filter`, `clip-path`, `visibility`, `display` (inline elements become `inline-block`), `stroke-dasharray` and `stroke-dashoffset` (with `draw`), and `background-image`, `background-size`, `background-position`, `background-repeat` and `box-decoration-break` (with `highlight`, `underline`, `strike`). Each is written on every frame. Inline transform, opacity and filter values the block sets itself are kept underneath, and the others return to the block's inline value while no move uses them; do not also animate any of them from markup or a timeline. Put a second motion on a wrapper element.
- The first start state is applied when the element mounts, so frame 0 never flashes the finished layout. Keep elements with motion mounted for the whole clip (no `{#if}` around them): their events are recorded when they mount.
- Split text is read once, when the element mounts. Inline markup such as `<em>` is kept, `&nbsp;` and a word split by markup (`foo<em>bar</em>`) stay on one line, and the element gets the text as its `aria-label` while the pieces are `aria-hidden`.
- Masks reach 0.35em past the element's box, so italic overhang and descenders are not cut.
- Transforms need a box: inline elements become `inline-block`. Highlight, underline and strike draw across the element's box, so use them on an inline element or one sized to its text.
- `draw` sets `pathLength="1"` on each shape and owns its `stroke-dasharray`.

Worked example: `static/demo/motion` in the repository.
