---
title: Shots, transitions and keys
description: How a program frames the speaker with shots (full, punch, strip, window, behind, whip), hands the frame over with transitions (push, wipe, zoom-through, shape-mask, blinds, card), and moves cameras, clips and block props with keys.
updated: 2026-10-22
---

Shots and keys work in a [program](/docs/programs), a project with `cuts` or `shots`. Every shot frames the speaker's head from the footage's matte ([Footage, mattes and speaker depth](/docs/footage)), so make the matte first.

## Shots

`shots` frame the footage over time:

```json
"shots": [
	{ "shot": "punch", "from": "today we fix", "until": "slow export" },
	{ "shot": "strip", "from": "first open", "until": "the settings", "params": { "side": "right" } }
]
```

Gaps between shots are `full`. Each shot lays out per format class (landscape, square, portrait), so one project renders 9:16 and 16:9.

| Shot     | What it does                                                                                                                                                                                                                         | Params                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`   | The footage fills the frame, cropped around the speaker's head when its aspect differs. Portrait footage in a landscape frame stands in a full-height window over the style's surface.                                                 | —                                                                                                                                                              |
| `punch`  | `full`, closer, toward the head.                                                                                                                                                                                                     | `scale` (1.45)                                                                                                                                                 |
| `strip`  | The camera narrows into a strip and a `panel` slot opens beside it: camera left, panel right in landscape and square; camera on top, panel below in portrait.                                                                        | `side: "right"` swaps them; `size` is the camera's share of the frame                                                                                          |
| `window` | The speaker in a rounded window with a ring in the brand's primary colour, and a `panel` slot beside it. In landscape and square the window sits in a corner; in portrait it is centred at the top of the safe area, the panel below. | `corner` (`bottom-right`), `size` (0.3 landscape, 0.4 square, 0.44 portrait), `zoom` (1.2), `ring` (4 px at 1080 px; 0: none), `aspect` (`"4:5"`, `"1:1"`, `"16:9"` or a number) |
| `behind` | The stage for a word behind the head: the room dims and blurs while the speaker, cut out by the matte, stays sharp in front, and a `word` slot follows the head. Needs a matte.                                                       | `scale`, `dim` (0.55), `blur` (12 px at 1080 px)                                                                                                               |
| `whip`   | The camera whips off the frame with motion blur while a frame-sized `card` slot flies in from the other side; the move out of the shot whips back.                                                                                   | `direction` (`left`, `right`, `up`, `down`, `forward`, `back`; default `forward`), `blur` (48 px of a 1920 px move; 0: none)                                     |

The word behind the head is a clip with `"layer": "behind"` and `"slot": "word"`; the shot only sets the stage. A clip with `"slot": "panel"` or `"slot": "card"` fills that slot and moves with it. While no shot frees its slot, the clip is hidden and `check` warns.

**The safe part of a slot.** A slot can reach under platform UI: in a 9:16 `strip` the panel is 1056 px tall and only its top 384 px lie above the bottom inset. A slotted clip's root carries `--slot-safe-top`, `--slot-safe-right`, `--slot-safe-bottom` and `--slot-safe-left`, in px from the slot's edges (0 where an edge is inside the safe area), and the block reads the same as `clip.slotArea.safe`. They are set on every frame from where the shot puts the slot, so they follow it while it slides in or morphs into another shot's slot. Lay the panel's content out in the box they leave:

```css
.safe {
	position: absolute;
	inset: var(--slot-safe-top, 0px) var(--slot-safe-right, 0px) var(--slot-safe-bottom, 0px)
		var(--slot-safe-left, 0px);
	container-type: size;
}
```

A clip without a slot has them at `0px`, so the same block fills the frame; keep the `0px` fallbacks, a missing property would collapse the box.

```json
"clips": [
	{ "id": "word", "block": "blocks/BehindWord.svelte", "layer": "behind", "slot": "word",
	  "from": { "say": "edited by AI", "edge": "last" }, "until": { "say": "one prompt", "edge": "end" } },
	{ "id": "list", "block": "blocks/Checklist.svelte", "slot": "panel",
	  "from": "AI cut the silences", "until": { "say": "different effects", "edge": "end", "offset": 0.7 } }
]
```

**Moves between shots.** The layout moves from the previous shot over `morph` seconds:

| Into or out of                          | Default `morph`                      |
| --------------------------------------- | ------------------------------------ |
| into `full`, `strip` and `window`       | 0.7 s                                |
| into `behind`                           | 0.3 s from `full`, 0.7 s from a framed shot |
| into a `punch`                          | 0.16 s                               |
| out of a `punch`                        | 0.45 s                               |
| into and out of a `whip`                | 0.42 s                               |
| under a shot `transition`               | none                                 |

Shots add events to the program for sounds to land on:

- `shot`, halfway through a move into or out of `strip` and `window`;
- `punch`, on a punch-in's first frame;
- `whip`, halfway through the whip out and the whip back.

`program --json` lists them under `events`. Shots carry no sound of their own yet: put an `sfx` item on the shot's anchor plus half its move (a whip 0.21 s, a strip or window 0.35 s).

**Keeping the head in.** Shots frame the face a third from the top of their camera window. A close handheld selfie, where the head fills half the frame, can lose the top of the head in a strip or a small window. `params.headroom` (off by default; 0.06 is a good start) keeps the whole head in the camera window, from the matte. Where the footage then leaves the window open, the same footage fills it, blurred and dimmed.

`check` warns wherever a shot's camera window cuts the speaker's head for more than a few frames, keys included. The warning names the shot, the time range, how much is cut and what to try: `headroom`, a taller window `aspect`, a larger strip `size`, a lower `zoom` or `scale`. It stays a warning: look at a still and decide, since a tight crop can be the creator's choice.

**Text over the face.** `check` also warns where a clip's text covers the speaker's face: it measures in the page the text of every front clip (its line boxes, or the opaque card it sits on) and compares it with the head where the shot's camera puts it (from the matte). A clip warns once, when its text has covered at least a tenth of the face for half a second, with the first program time, the share covered and the side of the frame clear of the head. Left out: text under 0.1 opacity, hidden text and transparent letters (a typewriter's), clips with `"layer": "behind"`, text under a `<Subject>` layer that draws the speaker over at least half of the face (in the same clip after the text, or in a later clip; `"clean"` and `"plate"` layers hide nothing), frames where a clip shows a full-frame card over the head (an opaque background colour or a loaded picture over the head and at least 80 % of the frame; canvases, videos and gradients do not count), and cut and shot transition windows. Look at a still at that time and decide: move the text to the free side, put it behind the speaker, or give it a slot beside a `strip` or `window`.

## Transitions

A `transition` on a cut, a shot or a clip hands the frame over inside a window around the cut. Write it as the type alone, or with options:

```json
"transition": { "type": "push", "duration": 0.5, "align": "center", "ease": "expo.inOut",
                "direction": "left", "sound": "sfx/whoosh.wav", "params": { "blur": 30 } }
```

`align` puts the window's middle (`center`), start or end on the cut; `duration` and `ease` default per type. A transition never changes program time or sound. Where a side runs out of handle, its edge frame holds. With `"sound"`, the file plays on the transition's event, halfway through its window.

| Type           | Default            | What it does                                                                                                                                                                                                  | Params                                                                                                     |
| -------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `push`         | 0.55 s, `expo.inOut` | The incoming picture pushes the outgoing one off the frame, with a blur along the travel.                                                                                                                     | `direction` (`left`, `right`, `up`, `down`, `forward`, `back`), `blur` (50)                                |
| `wipe`         | 0.8 s, `none`      | Slanted bars in the brand's colours sweep across; the picture changes while the last bar covers the frame.                                                                                                    | `direction`, `colors` (a list of CSS colours)                                                              |
| `zoom-through` | 0.6 s, `none`      | The camera rushes into the outgoing picture toward the speaker's eyes and comes out of the incoming one, with a zoom blur and a soft flash.                                                                   | `at` (`"face"`, `"center"` or `[x, y]`), `zoom` (2.4), `blur` (18), `flash` (0.25), `color`                |
| `shape-mask`   | 0.7 s, `power3.inOut` | The incoming picture shows through a circle that grows from the speaker's eyes, a ring in the brand's accent on its edge.                                                                                   | `shape` (`"circle"` or `"rect"`), `radius`, `at`, `ring` (10), `color`                                     |
| `blinds`       | 0.8 s, `none`      | Slats in the brand's primary close over the outgoing picture one after another and open on the incoming one.                                                                                                  | `direction`, `count` (8 landscape, 6 square, 7 portrait), `colors`, `stagger` (0.4)                        |
| `card`         | 0.9 s, `none`      | The incoming picture arrives as a card that slides or flips in, lands in the middle and grows to fill the frame. `side: "out"` plays it backwards.                                                            | `motion: "flip"`, `side`, `scale`, `radius` (44), `shadow` (0.4), `dim` (0.45)                             |

On a clip, `push` moves everything below the clip out, so such a clip should cover the frame; the other types bring in only the clip.

Colour params take CSS colours only. Custom `.svelte` transitions resolve into the program but cut on the cut for now, and `check` warns about them. `check` also warns when a whip and a transition fall within three frames of each other, because that puts two sounds on one move.

## Keys

In a program, shots and clips take `keys`: values the item reaches at a moment, with the frames in between interpolated. Placement keys move the whole item; props keys change what a block draws.

```json
"shots": [{ "shot": "full", "from": "today we fix", "until": "slow export",
	"keys": [{ "at": 0, "scale": 1 }, { "at": "slow export", "scale": 1.3, "x": "-4%" }] }],
"clips": [{ "id": "card", "block": "blocks/Card.svelte", "from": 2, "until": 6,
	"keys": [
		{ "at": 0, "x": -300, "scale": 0.8, "props": { "bg": "brand.primary" } },
		{ "at": "fix", "x": 0, "scale": 1, "ease": "expo.out", "props": { "bg": "brand.accent" } }
	] }]
```

- **`at`** is inside the item: seconds and `{ "frame": n }` from its start, a phrase searched only inside it, or `{ "moment": … }` (`"mid"`, `"end-0.5"`, a cue of the clip, `"bar 2"`).
- **Placement:** `x`, `y` (pixels of the format frame, or `"12%"`), `scale`, `rotation` (degrees) and `opacity`. On a shot they move the camera: the footage is scaled and turned about the speaker's face inside the shot's window. On a clip they move a box around the block.
- **Props:** only props the block marks animatable in its module script, with their kind (example below). Kinds are `number`, `length`, `color`, `gradient` and `shadow`. The block must read keyed props live (in markup, `$derived` or `useFrame`).
- **Brand colours:** `"brand.primary"`, `"brand.accent"`, `"brand.background"`, `"brand.surface"`, `"brand.text"`, `"brand.muted"`, `"brand.onPrimary"`, `"brand.onAccent"` and `"brand.extra.<name>"`. They work inside gradients and shadows too.
- **Tracks and easing:** every property has its own track. Before its first key a property holds that key's value, so give the first key every property you move later. `ease` shapes the move arriving at a key; without it, the style's energy decides.
- **Colour mixing:** colours, gradient stops and shadow colours mix in OKLCH along the shorter hue arc, which keeps the midpoint saturated. Write `"mix": "oklab"` on the arriving key for a straight OKLab line. A transparent end only fades; it never passes through a hue of its own.

```svelte
<script module>
	export const animatable = { color: 'color', bg: 'gradient', glow: 'shadow', size: 'number' };
</script>
```

`check` and `program` report keys that cannot be drawn as errors at the key as written (`keys[2].props.bg`). Keys have no effect on a project without `cuts` or `shots`.
