# Motion projects

Explainer inserts, lower thirds and title cards written as Svelte components ("blocks"),
timed by the words of a transcript instead of hand-typed seconds.

```
my-video/
  video.vf.json        clips: which block, when, cues, bound words
  blocks/Words.svelte  what a clip looks like and how it moves
  theme/…              shared components and CSS
  fonts/…              font files (never rely on system fonts)
```

## The project file

```json
{
	"size": [1920, 1080],
	"fps": 30,
	"transcript": "voice.transcript.json",
	"fonts": [{ "family": "Futura", "src": "fonts/Jost.ttf", "weight": "100 900" }],
	"css": ["theme/film.css"],
	"background": "#17120e",
	"clips": [
		{
			"id": "B-word-timestamps",
			"block": "blocks/WordStamps.svelte",
			"from": "all it needs is",
			"until": "cut from the video",
			"cues": { "stamps": "timestamps", "extra": "extra", "duplicate": "duplicated" },
			"words": { "row": "words that are extra and words that are duplicated", "extra": "extra" },
			"props": { "title": "Transcript by words" }
		}
	]
}
```

- **`from` / `until`** place the clip in the program. A phrase anchors to its first word
  (`from`) or its last word's end (`until`). Also: program seconds (`12.5`), `{ "frame": 274 }`,
  or `{ "say": "…", "edge": "start"|"last"|"end", "occurrence": 2, "offset": -0.1 }`
  (`last` = when the phrase's last word starts).
- **`cues`** are named moments inside the clip. Names may use any language and inner spaces
  (`"nových odberateľov": "nových odberateľov"`), but not start with a digit or contain `+ - .`, and `bar 5` / `beat 17` read as music beats. Phrases are searched only inside the clip;
  numbers and `{ "frame": n }` are clip-local. `start` and `end` are built in and cannot be
  redefined. A missing phrase suggests the closest spoken ones ("Did you mean …"); an
  ambiguous phrase lists every occurrence with its time. Nothing is ever matched silently.
- One-word `from`/`until` anchors produce a warning: they are searched in the whole
  transcript and easily become ambiguous after a re-take.
- A cue keeps its phrase's words: `clip.has('duplicate', word)` tells whether a word belongs
  to the cue, so a phrase is declared once.
- **`words`** binds transcript words for the block: a phrase, `"clip"` (every word in the
  clip) or `{ "from": …, "until": … }`. Each word has `id`, `text`, `raw`, program `start`/`end`
  and clip-local `localStart`/`localEnd`.
- **`tail`** extends (or trims) the end in seconds. **`alpha: true`** renders a transparent
  ProRes 4444 `.mov`.

`css` lists global CSS files (themes, shared classes); relative `url()` references keep working.
Its old name `styles` is still read the same way (not both at once); `style` is the video style
(see Brand, style and format).

Transcripts: Soniox-style `{ "words": [{ "text", "startMs", "endMs" }] }` or
`[{ "text", "start", "end" }]` in seconds.

## Blocks

```svelte
<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<h1 style:opacity={clip.p('extra')}>…</h1>
```

`useClip()` returns the clip. Everything on it is reactive, so markup can read time directly:

|                                                 |                                                      |
| ----------------------------------------------- | ---------------------------------------------------- |
| `clip.t`, `clip.frame`                          | clip-local seconds / frame                           |
| `clip.p(at, dur = 0.6, ease = 'power2.out')`    | eased 0→1 starting at `at`                           |
| `clip.out(at, dur, ease)`                       | eased 1→0                                            |
| `clip.after(at)`, `before(at)`, `between(a, b)` | booleans                                             |
| `clip.step(a, b, c)`                            | index of the last passed moment, −1 before the first |
| `clip.map([[at, value], …], ease?)`             | piecewise-linear map; equal values hold              |
| `clip.speaking(word)`, `spoken(word)`           | word is being said / has started                     |
| `clip.has('extra', word)`                       | word is in the `extra` binding                       |
| `clip.cue.extra`                                | `{ start, end, frame, words }`                       |
| `clip.words.row`, `clip.props`                  | bound words, props from the project                  |
| `clip.pulse(on = 'beat')`, `clip.beats`         | phase in the beat (or `'bar'`), the music's beats    |

`at` uses the same grammar everywhere (blocks and `still --at`): a cue (`'extra'`), a cue
edge (`'extra.end'`), a cue with offset (`'extra+0.4'`, `'extra.end-0.2'`), `'2.5s'` or `'2.5'`, `'f120'`,
`'mid'`, music beats (`'bar 5'`, `'beat 17'`, `'downbeat > extra'`, `'extra.end - 1b'`, see
[Music and beats](#music-and-beats)), or clip-local seconds as a number. `start` and `end` always exist, so an exit written
as `'end-0.3'` follows the clip when a new voiceover makes it longer. Eases are GSAP names or
functions; an unknown name is an error, never a silent linear ease.

**Svelte is not React.** A plain `const` in `<script>` is computed once:

```svelte
const late = clip.p('stable');            // ✗ frozen at 0
const late = $derived(clip.p('stable'));  // ✓ follows time
<div style:opacity={clip.p('stable')}>    // ✓ markup is always live
```

Functions called from markup (`const lit = (w) => clip.p(...)`) are live too.

Other styles, all seek-safe:

```js
useTimeline(({ tl, at, q, clip }) => {
	// paused GSAP timeline in clip seconds; q() is scoped to this clip
	tl.from(q('.card'), { y: 30, opacity: 0, stagger: 0.1 }, at('extra'));
});

useFrame(({ t, frame, clip }) => {
	engine.render(t); // imperative drawing: canvas, procedural SVG, existing engines
});

useReady(fetchSomething()); // delay the first frame until it settles
```

Rules: no wall-clock animation (CSS `transition`/`animation`, `setTimeout`, `Date.now()`),
randomness via `noise(...keys)` (same keys → same value, safe per frame; `random(seed)` only
for one-off setup), text layout measured after mount (fonts are loaded
before blocks mount). Svelte drops leading whitespace inside an element: write
`<span>{' / FCPXML'}</span>`, not `<span> / FCPXML</span>`.

A block can own a WebGL canvas, also a `<canvas layoutsubtree>` whose shader samples the
block's own HTML: in `useFrame`, `requestPaint()` the canvas and await its `paint` event, then
`texElementImage2D` and draw (`tests/motion/fixtures/webgl-block`). Put no CSS `filter` or
`mask` on such a canvas or any element around it (Chromium crashes on that, so the frame fails
with the element's name); filter its children or in the shader instead. Without a GPU WebGL runs
on the CPU and roughly doubles the cost of a 1080p frame.

## Motion primitives

Named entrances, exits and emphasis in one line, seek-safe and without GSAP:

```svelte
<script>
	import { motion } from 'visualfries/motion';
</script>

<h1 use:motion={{ enter: 'pop', at: 'extra', exit: 'fade', emphasis: 'pulse' }}>…</h1>
<p use:motion={{ enter: 'rise', split: 'words', at: 'stamps' }}>…</p>
<svg use:motion={{ enter: 'draw', at: 'extra' }}>…</svg>
<span use:motion={{ count: 12400, at: 'duplicate' }}>0</span>
```

Entrances `fade`, `pop`, `slide`, `scale`, `rise`, `drop`, `reveal` (mask from a side),
`blur-in`, `spring`, `typewriter`, `draw`; exits mirror them (`exit`, gone by `until`, default
`end`). Emphasis `pulse`, `shake`, `wiggle`, `punch`, `highlight`, `underline`, `strike`, `glow`
(a name, `{ move, at }` or a list). Text splits by `words`, `chars` or `lines` with `stagger`.
Also `duration`, `direction`, `intensity`, `color`, `ease`. Defaults scale with the clip's
energy, `"props": { "energy": "calm" | "balanced" | "punchy" }`, else the project style's energy
(`"style": "kinetic"` is punchy), else `balanced`; other values of `props.energy` are left to
the block.

Each frame is computed from clip time alone; the first start state is applied when the element
mounts. `use:motion` owns its element's transform (with transform-box/-origin), opacity,
filter, clip-path, visibility, display, stroke-dash\* and, for marks, background-\* and
box-decoration-break, so do not animate those from markup or a timeline on the same element.
Every move records events (`pop`, `slam`, `whoosh`, `type`, a counter `tick` …, one per stagger
item) that `clip.events()` lists for sound effects; `clip.event(name, at)` adds your own.
Worked example: `static/demo/motion`.

## Footage and mattes

A project can declare a video the blocks draw frame by frame, with an optional matte (greyscale,
white = subject) for cutting the subject out:

```json
"footage": { "talk": { "src": "talk.mp4", "matte": "talk.matte.mp4", "start": 0 } },
"clips": [{ "id": "depth", "block": "blocks/Depth.svelte", "from": 0, "until": 17, "audio": "talk" }]
```

```svelte
<script>
	import { Footage } from 'visualfries/motion';
</script>

<Footage name="talk" layer="plate" />
<!-- original picture -->
<h1>BEHIND</h1>
<!-- covered by the head -->
<Footage name="talk" layer="subject" />
<!-- the speaker only -->
<Footage name="talk" layer="subject" offset={-0.4} />
<!-- 0.4 s earlier: an echo -->
```

Frames are extracted around the clips that use a footage (2 s margin); a block that jumps far
into it (video tiles with big `offset`s) sets `"margin": 12` or `"margin": "all"`. The cache lives in
`.visualfries/`; `visualfries cache <project>` shows its size and `--clear` drops the footage
frames and rendered program segments.

`start` is the program second at which the footage's first frame plays; `offset` shifts a layer
in seconds. A clip's `audio` muxes that footage's sound into the rendered clip. Frames are
extracted once into `.visualfries/footage/` (JPEG plates, PNG cut-outs) and loaded before each
frame is captured, so footage is frame-accurate in any seek order.

A project can also describe the whole program. `cuts` lists ranges of raw footage in order,
`{ "source": "talk", "in": "today we fix", "out": "the slow export" }`: `in` and `out` are
seconds of that file or words of its own transcript (`footage.talk.transcript`), and every
other second, frame or phrase in the project then means program time. The program transcript
comes from the cut list, so a re-take that keeps the words keeps every cue; for a new take,
point `footage.<name>.transcript` at its transcript (`--transcript` only replaces the transcript
of a project without `cuts` or `shots`). `in` rounds to the nearest frame and `out` up to the
next, so the last word is never clipped. A cut's `transition` belongs to the incoming range and
never changes program time or sound; `audio: { split }` makes a J or L cut, and `check` warns
about a word an audio edit point cuts through. A cut can also end on the music:
`"out": { "bar": 5 }` (see [Music in the program](#music-in-the-program)). `visualfries program` resolves cuts, program words,
shots, clips, transitions, audio pieces and segments into `.visualfries/program/<format>.json`,
and `check` reports what is wrong with them (a phrase that moved, a transition longer than its
neighbour, missing handles).

With a cut list (`cuts`), the cut list decides which source frame plays at each program frame,
including the handles a transition shows; where a source runs out its edge frame holds.
`<Footage name="talk">` then draws that source while a cut or shot shows it (anything else is an
error), `<Footage program>` draws whatever is on screen, `offset` shifts inside the source, and
`clip.subject('talk')` follows the same mapping. Only the source ranges the program shows are
extracted, plus each footage's `margin` (default 2 s) around what the clips show, each range
cached on its own.

In program mode `still` and `check` draw the whole program on one stage: the footage the cut
list shows, clips with `"layer": "behind"` between the footage and the speaker cut out by the
matte, then the other clips in project order. Each page holds one segment of the program (a
range between hard cuts) with every clip on screen in it; a clip is hidden and not run outside
its window, and inside a transition window it holds its first or last frame. `still` takes
program moments (`--at 2.5s`, `--at f120`) or, with `--clip`, that clip's moments, and
`check --determinism` compares every segment forward, backward, scrambled and against a page
holding the whole program.

`shots` frame the footage over time: `{ "shot": "punch", "from": "today we fix", "until": "slow export" }`.
Gaps between shots are `full`. Each shot lays out per format class (landscape, square, portrait):

- `full`: the footage fills the frame; when its aspect differs from the format's it is cropped
  around the speaker's head (from the matte, smoothed). Portrait footage in a landscape frame
  stands in a full-height window over the style's surface.
- `punch`: `full`, `params.scale` (default 1.45) times closer, toward the head.
- `strip`: the camera narrows into a strip and a `panel` slot opens beside it: camera left and
  panel right in landscape and square, camera on top and panel below in portrait.
  `params.side: "right"` swaps them; `params.size` is the camera's share of the frame.
- `window`: the speaker in a rounded window over the style's surface, with a ring in the
  brand's primary colour and a soft shadow, and a `panel` slot beside it. Landscape and square:
  the window sits in a corner (`params.corner`: `bottom-right` by default, `bottom-left`,
  `top-right`, `top-left`) and the panel takes the full height on the other side. Portrait: the
  window is centred at the top of the format's safe area and the panel takes the rest of it
  below (`corner: "bottom-…"` puts the window at the bottom of the safe area, the panel above
  it), so neither sits under platform buttons or in the caption band. `params.size` is the
  window's width as a share of the frame (default 0.3 landscape, 0.4 square, 0.44 portrait),
  `params.zoom` how much closer the camera goes inside it (1.2), `params.ring` the ring's width
  in pixels at 1080 px of the frame's shorter side (default 4; 0: none).
- `behind`: the stage for a word behind the speaker's head. The footage stays framed like
  `full` (`params.scale` goes closer), the room dims and blurs (`params.dim`, default 0.55;
  `params.blur`, 12 px at 1080 px) while the speaker, cut out by the matte, stays sharp in front,
  and a `word` slot follows the head: from a little above it to below the face, across the
  frame. The word itself is a clip with `"layer": "behind"` and `"slot": "word"`; the shot only
  sets the stage, and a behind clip also works without it. In a morph out of the shot (or into
  it) the slot rides the camera, so a word still on screen leaves with the head. The speaker's
  soft edge dims with the room, so the matte's fringe never outlines them. Needs a matte
  (`check` reports footage without one).
- `whip`: the camera whips off the frame with motion blur while a frame-sized `card` slot flies
  in from the other side; the morph out of the shot whips back. `params.direction` is where the
  camera goes (`left`, `right`, `up`, `down`, or `forward`/`back`: left/right in landscape and
  square, up/down in portrait; default `forward`), `params.blur` the peak blur in pixels of a
  1920 px move (default 48; 0: none). The footage stays solid inside its window and a clip in
  the slot smears over it, so no seam opens between them; the move lands on whole pixels.
  Inside a transition window there is no motion blur (the transition owns the move). Without a
  clip in the slot the style's surface shows. A whip right after a whip does not move, so it
  has no event and `check` warns.

The layout moves from the previous shot's over `morph` seconds (default: 0.7 s into `full`,
`strip` and `window`, 0.3 s into `behind` from `full` (0.7 s from a framed shot), 0.16 s into
`punch`, 0.45 s out of a punch, 0.42 s
into and out of a whip; none under a shot `transition`). A window's ring and shadow and a dimmed
room fade with the move. A clip with `"slot": "panel"` fills that slot and moves with it; while
no shot frees its slot it is hidden and `check` warns. Shots add events to the program for
sounds to land on: `shot` halfway through a move into `strip` or `window` and back out of them,
`punch` on a punch-in's first frame, and `whip` halfway through the whip out and the whip back
(a punch after a whip hits when the camera lands). Nothing moves on the program's first frame,
so a shot there has no event. `check` warns when a whip and a transition fall within three
frames of each other: two sounds on one move.

A `transition` on a cut, a shot or a clip hands the frame over inside a window around the cut:
`{ "type": "push", "duration": 0.5, "align": "center", "ease": "expo.inOut", "direction":
"left", "params": { … } }`, or just the type as a string. `align` puts the window's middle
(`center`), start or end on the cut; `duration` and `ease` default per type. A transition never
changes program time or sound; where a side runs out of handle its edge frame holds (`check`
counts only the frames a transition shows of each side). Built in:

- `push` (0.55 s, `expo.inOut`): the incoming picture pushes the outgoing one off the frame,
  with a blur along the travel that peaks halfway. `direction` is `left`, `right`, `up` or
  `down`, or `forward`/`back` (left/right in landscape and square, up/down in portrait;
  default `forward`). `params.blur` is the peak blur in pixels of a 1920 px travel (default 50;
  0 for none). On a clip everything below it is pushed out, so the clip should cover the frame:
  `check` warns about a push on a slotted clip, a clip behind the subject, or a clip that leaves
  part of the frame empty.
- `wipe` (0.8 s, `none`): slanted bars in the brand's primary, accent and a third colour sweep
  across along `direction` (as for `push`); the picture changes halfway, while the last bar
  covers the frame, and the bars sweep on out in reverse order. `params.colors` replaces the bar
  colours (a list of CSS colours, first bar first). On a clip only the clip appears; the layers
  below it stay.

- `zoom-through` (0.6 s, `none`): the camera rushes into the outgoing picture, toward the
  speaker's eyes, and comes out of the incoming one as it settles back to full frame, with a zoom
  blur and a soft flash on the change. `params.at` is `"face"` (the default: the eyes, from the
  matte; the frame centre slightly high without one), `"center"` or `[x, y]` in fractions of the
  frame; `zoom` (2.4) is the scale at the change, `blur` (18) the streak length in percent of the
  distance to that point (0: none), `flash` (0.25) the flash's peak opacity and `color` its colour
  (white). Both sides only scale up, so the frame stays covered; it needs about a frame of handle
  on each side. On a clip only the clip zooms in; the layers below it stay.
- `shape-mask` (0.7 s, `power3.inOut`): the incoming picture shows through a circle that grows
  from the outgoing speaker's eyes until it covers the frame, a ring in the brand's accent riding
  its edge; the outgoing picture drifts a little closer behind it. `params.shape` is `"circle"`
  or `"rect"` (rounded corners, `radius` 64 px of a 1080 px frame, squaring off as it reaches the
  frame's), `at` as for zoom-through, `ring` its width (10 px of a 1080 px frame; 0: none) and
  `color` its colour. Clips leaving with the outgoing side are cut out where the shape is.
- `blinds` (0.8 s, `none`): slats in the brand's primary (every other one a shade darker) close
  over the outgoing picture one after another along `direction`, the picture changes while they
  cover the frame, and they open the same way: columns that drop for `left`/`right`, rows that
  sweep across for `up`/`down` (`forward`: left in landscape and square, up in portrait).
  `params.count` (8 in landscape, 6 in square, 7 in portrait), `colors` (used in turn) and
  `stagger` (0.4: share of each half spent starting the slats one after another). It needs no
  handle. On a clip only the clip appears.
- `card` (0.9 s, `none`): the incoming picture arrives as a card (62 % of the frame, rounded
  corners, a shadow) that slides in along `direction` (as for `push`) or flips in
  (`params.motion: "flip"`), lands in the middle while the outgoing picture dims, and grows to
  fill the frame. `params.side: "out"` plays it backwards: the outgoing picture shrinks into the
  card and slides or flips away over the incoming one. `scale`, `radius` (44 px of a 1080 px
  frame), `shadow` (0.4) and `dim` (0.45) shape it. Clips riding the side under the card are cut
  where the card is. On a clip the clip arrives as the card; the layers below it stay.

Every built-in's sound event is halfway through its window, on the cut of a centred window.
Custom `.svelte` transitions resolve into the program but cut on the cut for now; `check` warns
about them.

### Keys

In a program (`cuts` or `shots`), shots and clips take `keys`: values the item reaches at a
moment, with the frames in between interpolated. Placement keys move the whole item, props keys
change what a block draws:

```json
"shots": [{ "shot": "full", "from": "today we fix", "until": "slow export",
	"keys": [{ "at": 0, "scale": 1 }, { "at": "slow export", "scale": 1.3, "x": "-4%" }] }],
"clips": [{ "id": "card", "block": "blocks/Card.svelte", "from": 2, "until": 6,
	"keys": [
		{ "at": 0, "x": -300, "scale": 0.8, "props": { "bg": "brand.primary" } },
		{ "at": "fix", "x": 0, "scale": 1, "ease": "expo.out", "props": { "bg": "brand.accent" } }
	] }]
```

- **`at`** is inside the item: seconds and `{ "frame": n }` from its start, a phrase searched
  only inside it, or `{ "moment": … }` with the moment grammar (`"mid"`, `"end-0.5"`, a cue of
  the clip, `"bar 2"`). A key outside the item is a warning.
- **Placement:** `x`, `y` (pixels of the format frame, or `"12%"` of its width and height),
  `scale`, `rotation` (degrees) and `opacity` (0–1). On a shot they move the camera: the footage
  is scaled and turned about the speaker's face (from the matte; without one, the point the shot
  frames) and moved inside the shot's window, which stays where the shot put it; inside a morph
  both shots' keys blend. A shot's `opacity` fades the footage as one picture, with the subject
  cut-out and any clip behind the subject in it, over the fill or the stage background. A
  `rotation` turns the footage inside the window without growing it, so the window's corners
  show what is behind the footage unless `scale` covers them (about 1 + |angle in radians| ×
  the window's aspect ratio). On a clip they move a box around the block about the clip's
  centre (the slot's centre for a slotted clip); the clip's root stays the transitions', so
  keys and transitions combine. `scale` never goes below 0 and `opacity` stays within 0–1,
  also where an ease overshoots.
- **Props:** only props the block marks animatable, with their kind, in its module script:

  ```svelte
  <script module>
  	export const animatable = { color: 'color', bg: 'gradient', glow: 'shadow', size: 'number' };
  </script>
  ```

  Kinds: `number`, `length` (px or `%`), `color`, `gradient` (a solid colour counts as a
  gradient) and `shadow`. The declaration must be a literal object, exported as above or as
  `const animatable = { … }; export { animatable }` (also `export { keyed as animatable }`); a
  block that does not parse is reported as such. On every frame the stage
  sets the keyed props on `clip.props`, so the block must read them live (in markup, `$derived`
  or `useFrame`), not copy them once at setup; before the first frame they hold the value of
  the clip's first frame. Built-in `@visualfries/captions` and `@visualfries/speaker-depth`
  mark `background` animatable.

- **Brand colours:** `"brand.primary"`, `"brand.accent"`, `"brand.background"`,
  `"brand.surface"`, `"brand.text"`, `"brand.muted"`, `"brand.onPrimary"`, `"brand.onAccent"`
  and `"brand.extra.<name>"` are replaced by the brand's colours before anything mixes, also
  inside gradients and shadows (`"linear-gradient(90deg, brand.primary, brand.accent)"`). A
  brand colour that is itself a gradient works only as the whole value.
- **Tracks:** every property has its own track. Before its first key a property holds that
  key's value and after its last key the last value, so give the first key every property you
  move later (a lone `"y": 100` at the second key holds 100 from the start; `check` warns).
- **Easing:** `ease` (a GSAP name) shapes the move arriving at that key. Without it the style's
  energy decides: `sine.inOut` (calm), `power2.inOut` (balanced, also without a style) or
  `expo.inOut` (punchy); a clip's `props.energy` wins for its own keys.
- **Mixing:** numbers and lengths in straight lines (px and `%` must match between keys);
  colours, gradient stops and shadow colours in OKLCH along the shorter hue arc, which keeps
  the midpoint saturated (`"mix": "oklab"` on the arriving key for a straight OKLab line).
  Alpha is premultiplied and the hue moves by the alpha-weighted progress, so a transparent or
  nearly transparent end only fades and never passes through a hue of its own (CSS
  `color-mix()` moves the hue unweighted). Gradients pair their stops (the shorter one
  resampled at the longer one's positions) and must be the same type; shadow lists pad the
  shorter with transparent shadows.

`check` and `program` report keys that cannot be drawn as errors, each at the key as written
(`keys[2].props.bg`): a prop the block does not mark animatable, `props` on a shot, px against
`%`, a linear against a radial gradient, an unknown ease or brand colour; every bad property is
reported, not only the first. The resolved program holds every key at its program frame with
brand colours filled in and its ease; changing a key changes the hash of the segments the item
is on screen in, and `check --determinism` samples the frames at and between keys. Keys have
no effect on a project without `cuts` or `shots` (a warning).

`visualfries matte talk.mp4 --output talk.matte.mp4` makes the matte: BiRefNet v2 on fal.ai
(`FAL_KEY`) by default; `--provider rvm` runs RobustVideoMatting locally on the CPU with no key
(needs `uv`; about 3 fps at 1080p on 12 cores); any local tool works with
`--command "tool {input} {output}"`, and any `MatteProvider` in Node. It splits, checks and
joins the pieces frame-exact. Worked example: `static/demo/speaker-depth`.

## Music and beats

A music-driven edit times clips to the beats of a track the way a talking-head edit times them
to words. Analyse the music once; everything else reads the result:

```bash
visualfries beats music.mp3            # writes music.beats.json next to it
```

```json
"music": [
	{ "src": "music.mp3", "beats": "music.beats.json", "from": 0 }
],
"clips": [
	{
		"id": "hook",
		"block": "blocks/Hook.svelte",
		"from": { "bar": 2 },
		"until": { "downbeat": "after", "at": "that is the trick" },
		"cues": { "hit": { "bar": 5, "offset": "-1b" }, "fill": { "bar": 4, "beat": 3 } }
	}
]
```

**Beat anchors** work wherever word anchors do (`from`, `until`, `cues`, `words` ranges) and
mix with them:

| Anchor                                    | Means                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `{ "beat": 17 }`                          | the 17th beat of the music (1-based from its first beat, counted after corrections)       |
| `{ "bar": 5 }`, `{ "bar": 5, "beat": 3 }` | the downbeat of bar 5; its 3rd beat. Bar 0 holds pickup beats before the first downbeat   |
| `{ "downbeat": "after", "at": … }`        | the first downbeat at or after another anchor (seconds, a phrase, a frame, a beat anchor) |
| `{ "beat": "before", "at": … }`           | the last beat at or before it (`"after"`/`"before"` work for both)                        |
| `"offset": -0.03` / `"offset": "-1b"`     | on any object anchor: seconds, or beats along the grid (`"0.5b"` = half a beat)           |

Beats are numbered after the corrections below: with `"tempo": "double"`, `{ "beat": 17 }` is
the 17th beat of the doubled grid. A phrase in `at` takes the edge of the field it sits in: in
`until` it is the phrase's end, so `"until": { "downbeat": "after", "at": "that is the trick" }`
never cuts the phrase short; in `from` and `cues` it is the start. `{ "say": …, "edge": … }`
picks another edge. `bar` does not mix with `at`: `{ "bar": 2, "beat": "after", "at": … }` is an
error.

As with words, numbers inside `cues` (also in `at`) are clip-local; beats themselves are
absolute, so `{ "bar": 5 }` is bar 5 wherever the clip is. A bar that does not exist, a beat
the music does not play (in the part `in` skips, or after its end) or a missing beats file is
an error that names the valid range, never a silent guess. With several music items with beats, give each an `id` and pick one per
anchor (`"music": "bed"`) or per clip (`"music": "bed"` on the clip).

In blocks and `--at`, the same as strings: `'bar 5'`, `'bar 5.3'` (beat 3 of bar 5), `'beat 17'`,
`'downbeat > extra'` (first downbeat at or after a moment), `'beat < end'` (last beat at or
before), and a beat offset on any moment: `'extra.end - 1b'`, `'bar 5 + 0.5b'`. After `>` or `<`
the rest is the moment it searches from: `'downbeat > extra - 1b'` is the first downbeat after
one beat before `extra`. A beat outside the clip still resolves.

```svelte
<!-- a bump on every beat, a flash on every bar: seek-safe, they depend only on time -->
<div style:transform="scale({1 + 0.15 * (1 - clip.pulse())})"></div>
<div style:opacity={1 - clip.pulse('bar')}></div>
```

`clip.pulse()` is the phase within the current beat: 0 on the beat, rising to 1 just before
the next (`'bar'`: within the bar). The frame nearest a beat counts as the beat, even when the
beat falls a few milliseconds after it. `clip.beats` lists every beat of the music with
`index`, program `time`, clip-local `local`, `bar` and `beat` (1 = downbeat).

**The music item:** `src`, `beats`, `from` (where the music starts in the program, default 0),
`in` (seconds into the music file that play at `from`, default 0) and `until` (where it stops).
Its beats exist only while it plays: none in the part `in` skips (a search such as
`{ "downbeat": "after", "at": 1 }` from before the music starts finds its first beat), and none
after its end: in a program with a cut list or `duration`, the bar end it snaps to (below);
otherwise `until`. A program render (`cuts` or `shots`) also mixes it, with `gain`,
`fade` and `keys` (see "Program sound" under CLI), and ends it on a bar (below); rendering
clips one by one does not.

**Corrections.** Beat trackers are reliable within a frame, but they can pick the wrong
level: half or double the tempo you hear, or the wrong beat as the downbeat. Fix it on the music
item; the beats file stays as analysed, so re-analysis keeps the fix:

- `"tempo": "double"` (the analyzer found half the tempo: beats are added between beats) or
  `"half"` (every second beat is dropped);
- `"downbeat": 3`: the 3rd beat of each bar is really beat 1 (counted after `tempo`);
- `"shift": -0.02`: seconds added to every beat.

`visualfries check` prints the bar grid of every music item before checking the clips. A BPM
column at twice the tempo you tap along to means `"tempo": "half"`; bars that start on the
wrong hit mean `"downbeat"`:

```
music music.mp3 · music.beats.json (beat_this 1.1.0 final0) · from 0s
  127.9 BPM · 4 beats per bar · 48 beats · 12 bars
   bar      start    bpm   energy  first beats
     1     0.600s  127.7  -18.6dB  0.600 1.080 1.540 2.020
     2     2.480s  129.0  -19.5dB  2.480 2.940 3.420 3.880
     6     9.980s  127.7  -21.7dB  9.980 10.460 10.920 11.400
```

**The beats file** (`music.beats.json`), in seconds of the music file:

```json
{
	"version": 1,
	"source": { "file": "music.mp3", "sha256": "5d0c84…", "duration": 25.1 },
	"analyzer": { "name": "beat_this", "version": "1.1.0", "model": "final0" },
	"tempo": 127.9,
	"beatsPerBar": 4,
	"beats": [
		{ "time": 0.6, "bar": 1, "beat": 1, "energy": -15.7 },
		{ "time": 1.08, "bar": 1, "beat": 2, "energy": -21 }
	],
	"bars": [{ "bar": 1, "start": 0.6, "energy": -18.6 }]
}
```

Downbeats are the beats with `beat: 1`; `bars` repeats them with the bar's energy (RMS dBFS).
`energy` per beat lets `check` measure bars after a correction. When the music file changes
(its SHA-256 differs), loading the project fails and asks to run `visualfries beats` again;
nothing is ever re-analysed at render time. Beats the tracker placed in silence before or
after the music are left out.

**The analyzer.** `visualfries beats` decodes the music once (mono 44.1 kHz WAV), runs the
analyzer, measures energy and writes the file. The default analyzer is
[beat_this](https://github.com/CPJKU/beat_this) (MIT code and weights, beats and downbeats). It
needs PyTorch (about 800 MB), so it is an optional install. Keep it in its own virtual
environment under a cache directory, never in the system Python:

```bash
python3 -m venv ~/.cache/visualfries/beat_this
~/.cache/visualfries/beat_this/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
~/.cache/visualfries/beat_this/bin/pip install https://github.com/CPJKU/beat_this/archive/main.zip
export VISUALFRIES_BEAT_THIS=~/.cache/visualfries/beat_this/bin/beat_this
```

The model checkpoint (`final0`, about 80 MB; `--model small0` is about 8 MB and twice as fast)
downloads on first use into PyTorch's cache (`TORCH_HOME`). Threads are capped at 4
(`--threads n`): results are identical for any thread count, and a busy machine is much faster
with fewer. A 2-minute track takes a few seconds on a CPU.

Any other tracker plugs in with `--command "tool {input} {output}"`: `{input}` is the decoded
WAV, and the tool writes either lines of `time [position-in-bar]` (1 = downbeat) or JSON
(`{ "beats": [0.5, …], "downbeats": [...] }`). Name it with `--analyzer-name` and
`--analyzer-version`. In Node, `analyzeBeats(music, { analyzer })` from `visualfries/motion/beats`
takes `beatThis()`, `commandBeats(template)` or any `BeatAnalyzer`.

### Music in the program

The beats of a music item move with it: a beat at second `t` of the file plays at program
second `from + t − in`. Every beat anchor in the project reads that program time, so clips,
cues, shots, keys, `sfx` and the music's own gain keys land on the frame nearest their beat.

```json
"music": [
	{ "id": "bed", "src": "bed.mp3", "beats": "bed.beats.json", "from": 0.5, "in": 8 }
],
"cuts": [
	{ "source": "talk", "in": "hello and welcome", "out": { "bar": 3 } },
	{ "source": "talk", "in": "first open", "out": { "downbeat": "after", "at": "the settings" } },
	{ "source": "talk", "in": "then pick", "out": "for today" }
]
```

- **Where it starts.** `from` takes any program anchor: seconds, `{ "frame" }`, a phrase of the
  program transcript, or a beat of a music item listed before it (`{ "bar": 9, "music":
"intro" }`). A negative number starts inside the file, like `in`. `until` takes any anchor
  too; its beat anchors read the item's own beats unless they name another music. Music cannot
  start on its own beats (they move with it). A `from` that fails is reported once, and the
  music then starts at 0, so what sits on its beats still resolves.
- **Cuts on beats.** A cut's `out` can be a beat of the music instead of a point in its source:
  `{ "bar": 5 }`, `{ "bar": 5, "beat": 3 }`, `{ "beat": 17 }`, or `{ "downbeat": "after", "at":
"the settings" }` (the first downbeat at or after a point of the cut's own source; `"before"`,
  and `"beat"` instead of `"downbeat"`, work too), with `offset` and `music` as in other beat
  anchors. The cut then ends, and the next one starts, on the frame nearest that beat; its source
  `in` stays where it was. A retake that changes an earlier cut moves the cut's source end, not
  the beat. `in` is a point in the source and takes no beats (a cut starts where the one before
  it ends). Cut points read only music whose `from` is not a phrase (nor a beat of such music),
  because the cut list decides where phrases play; a phrase in `until` is fine.
- **Ending on a bar.** The music ends, its fade-out done, on the bar end nearest to `until` (or
  to the program end), never after the program end. A bar end up to half a frame after the
  program end still counts, since a cut on a beat rounds to the nearest frame; the music then
  ends, faded out, with the program. A bar ends on the next downbeat; the last
  bar of the file ends one bar after its downbeat. The end is worked out on every resolve, so
  when a retake or a changed cut makes the program longer or shorter, the music re-snaps to the
  bar end that is now nearest. This is the default for music whose beats have downbeats;
  `"snap": false` keeps the exact end, and `"snap": "bar"` insists on it (an error without beats
  or downbeats). `visualfries program` shows where each music item ends and which bar it snapped
  to, and the program file has the same as `audio.music[].snap: { bar, target }`. Without a cut
  list or shots nothing is mixed, and `snap` gives a warning.

`check` reports:

- beats used with no beats file (a beat anchor while the only music has no `beats`, or `"snap":
"bar"` on it): an error on the music that names the `visualfries beats` command to run;
- a snap that is impossible (no bar end between the music's start and the program end): a
  warning, and the music ends unsnapped;
- music shorter than needed (the file runs out before the bar end, `until` or program end it
  should reach): a warning, and the music ends on its last bar end inside the file (or where the
  file ends, without beats);
- music that starts on its own beats or on music listed after it, or would start past the end of
  its file (`in`, plus a negative `from`): errors;
- a cut `out` on a beat that lands before the cut starts, and beats in a cut's `in`: errors.

Snap warnings are left out while the cut list itself has errors.

## Built-in blocks and captions

`"block": "@visualfries/captions"` and `"block": "@visualfries/speaker-depth"` ship with
VisualFries; their `props` replace a hand-written block. In your own blocks, `<Captions>`
(`import { Captions } from 'visualfries/motion'`) draws word-timed captions with the presets
`bold`, `karaoke`, `pill`, `punch` and `neon`, and `clip.subject('talk')` returns where the
speaker is (box and top of the head, from the matte). See the Captions and Footage docs pages.

For outlined or hollow text, use the `outline` action instead of `-webkit-text-stroke`, which
draws the inner contours that variable fonts and many serifs keep inside their letters:

```svelte
<span style="display:inline-block" use:outline={{ width: '0.02em', color: '#fff' }}>AI</span>
<span use:outline={{ width: 4, color: '#000', mode: 'filled' }}>{word}</span>
```

`width` is the line's thickness outside the letters (px or a CSS length). `hollow` (default)
sets the element's text colours and a CSS `filter`, so put it on the text element itself (never
on an ancestor of a canvas) and animate blur on a parent. `filled` keeps the text colour.
When the options change or the element unmounts, the element's own inline values come back.

## Brand, style and format

A project may name a **brand** (who the creator is: colours, fonts, logo, corner radius) and a
**style** (how the edit moves) independently. Both are plain files next to the project or in a
shared folder, referenced by path; nothing comes from user-global settings. A project that names
neither renders exactly as before.

```json
{ "size": [1080, 1920], "fps": 30, "brand": "../brand/brand.json", "style": "kinetic", "clips": […] }
```

### Brand file

```json
{
	"name": "Acme",
	"colors": {
		"primary": "#0f62fe",
		"accent": "#ffb000",
		"background": "#0b0d12",
		"surface": "#161a22",
		"text": "#f5f7fa",
		"muted": "#9aa3b2",
		"extra": { "sunset": "linear-gradient(135deg, #ff6f00, #ff2d55)" }
	},
	"fonts": {
		"heading": { "family": "Anton", "src": "fonts/Anton-Regular.ttf" },
		"body": { "family": "Inter", "src": "fonts/Inter.ttf", "weight": "100 900" },
		"mono": { "family": "JetBrains Mono", "src": "fonts/JetBrainsMono.ttf" }
	},
	"logo": {
		"full": { "light": "logo/full-on-light.svg", "dark": "logo/full-on-dark.svg" },
		"mark": { "light": "logo/mark-on-light.svg", "dark": "logo/mark-on-dark.svg" }
	},
	"radius": 12
}
```

- The six colour roles are required, so every built-in block can place colours with any brand.
  `extra` holds any further named colours. A value may be any CSS colour or a gradient.
  `onPrimary` / `onAccent` (readable text on those colours) are optional; left out, the one of
  `text` and `background` with more contrast is used (black or white if neither reaches 4.5:1).
- `heading` and `body` are required, `mono` is optional. Each font is a file loaded like the
  project's `fonts`; paths are relative to the brand file.
- Logos are optional; `light` is the variant for light backgrounds, `dark` for dark ones.
- `radius`: px as a number, or a CSS length.
- `"brand"` may also be the object itself (paths then relative to the project). Unknown keys
  are errors, so a typo never goes unnoticed.

Every block's root element carries the brand as CSS custom properties, and `clip.brand` has
the same values in JS:

| CSS                                                                        | `clip.brand`                   |
| -------------------------------------------------------------------------- | ------------------------------ |
| `--brand-primary`, `-accent`, `-background`, `-surface`, `-text`, `-muted` | `colors.primary` …             |
| `--brand-on-primary`, `--brand-on-accent`                                  | `colors.onPrimary`, `onAccent` |
| `--brand-extra-<name>`                                                     | `colors.extra.<name>`          |
| `--brand-font-heading`, `-body`, `-mono` (font-family values)              | `fonts.heading` …              |
| `--brand-radius`                                                           | `radius`                       |
| `--brand-logo-full-light` … (`url(…)`, only for logos the brand has)       | `logo.full.light` … (URL/null) |

```svelte
<div class="card"><h1>{clip.props.title}</h1></div>

<style>
	.card {
		background: var(--brand-surface);
		color: var(--brand-text);
		border-radius: var(--brand-radius);
		font-family: var(--brand-font-body);
	}
	h1 {
		font-family: var(--brand-font-heading);
		color: var(--brand-accent);
	}
</style>
```

Without a brand, the tokens hold the **neutral brand**: the look of the built-in blocks (yellow
accent `#fbc42d`, rose primary `#f43f5e`, near-black `#08090c`, white text, Anton headings, Inter
body) and `clip.brand.neutral` is `true`. Built-in blocks and `<Captions>` take their colours and
fonts from the brand (captions: body font, text, accent, readable text on the accent); with the
neutral brand they keep their exact original pixels. Props still override everything.

A brand change applies to every project that references it on its next render, on purpose:
re-rendering an old video in a refreshed brand is a feature, and the exported video is the
frozen copy. To freeze a project, copy the brand next to it. `check` warns when a project with a
brand uses a custom block that hard-codes colours (hex, `rgb()`, `hsl()`; black, white and
`var(--x, fallback)` fallbacks are ignored), because a brand change would not reach them.

### Style

`"style"` is a built-in name, a style file, or an inline style. A style file changes only what
differs from what it `extends` (a built-in name or another style file, relative to the file):

```json
{ "name": "mine", "extends": "kinetic", "energy": "balanced", "captions": { "preset": "pill" } }
```

Layers: built-in, then each `extends` file, then the project. A project overrides its style by
writing it inline: `"style": { "extends": "styles/mine.json", "energy": "calm" }`. Later layers
win; objects merge key by key; arrays (such as a transition set) replace whole.

- `energy`: `calm`, `balanced` (default) or `punchy`; `clip.style.energy` in blocks, and the
  default energy of `use:motion` in every clip (a clip's `props.energy` still wins).
- `transitions`, `shots`, `captions`, `sounds`, `emphasis`, `overlays`: reserved sections, kept
  in `clip.style` but not read by VisualFries yet.
- Built-in styles (examples, not a fixed set): `solid`, `glass`, `depth` (balanced); `clean`,
  `editorial` (calm); `kinetic`, `brutal` (punchy). Only their energy is filled in so far.

`clip.style.layers` lists the layers, base first. Stills ignore what does not apply to them.

### Format and safe insets

`clip.format.class` is `landscape`, `square` or `portrait` from the project size (4:5 and 3:4
are portrait). The clip root has `data-format="portrait"` (etc.) for CSS, and safe insets in px:

| CSS                                        | `clip.format.safe` |                                                    |
| ------------------------------------------ | ------------------ | -------------------------------------------------- |
| `--safe-top`, `-right`, `-bottom`, `-left` | `top`, `right` …   | a rectangle no platform UI covers on any row       |
| `--safe-notch-y`                           | `notchY`           | from this y down the right inset is `--safe-right` |
| `--safe-right-upper`                       | `rightUpper`       | right inset above the notch (wider room for faces) |

The default zone is `all`: safe on TikTok, Instagram/Facebook (Meta) and YouTube at once. At
1080×1920 that is top 288, bottom 672, left 120, right 300 (192 above y 840, where TikTok's
button column starts). 1:1 is 106/236/501/101 and 4:5 68/65/68/65 (top/right/bottom/left).
16:9 is 184/162/386/38: landscape players only, which means YouTube's player, the one that
publishes a figure; LinkedIn, X and Facebook feed video publish none and are not measured.
`"safeZone": "tiktok"` on 16:9 gives the zone of a landscape video inside TikTok's vertical feed
(right 424, left 200). 4:5 is not measured either: no platform publishes a 4:5 zone. Other sizes
scale from the nearest reference of their class (1440×2560 gets ×4/3).
`"safeZone": "tiktok" | "meta" | "youtube"` uses one platform's zone; where a platform publishes
none for the ratio, `all` is used and `clips`/`check` warn once. The figures are one dated table
(`SAFE_ZONES`, read 2026-10-20 from the platforms' ad safe-zone specs, each with its source).

```css
.title {
	position: absolute;
	top: var(--safe-top);
	left: var(--safe-left);
	right: var(--safe-right-upper);
}
.lower-third {
	position: absolute;
	bottom: var(--safe-bottom);
	left: var(--safe-left);
	right: var(--safe-right);
}
```

### Hashes

`render` records the brand and style it used: `brand` and `style` hashes (12 hex characters, or
`null` when the project names none) in `manifest.json` and on every rendered clip. The brand hash
covers its values and the contents of its font and logo files, not where they are. Re-rendering
some clips with another brand or style warns about the clips left from before.

## CLI

```bash
visualfries clips video.vf.json                    # resolved times, cues, bound words, errors
visualfries check video.vf.json [--determinism]    # run every block without rendering (seconds)
visualfries still video.vf.json --clip B --output b.png            # sheet: start, every cue, end
visualfries still video.vf.json --clip B --at extra --at extra.end+0.5 --output b.png
visualfries render video.vf.json --output out/ [--clip B] [--jobs 6]   # MP4 / MOV + manifest.json
visualfries render video.vf.json --clip B --output b.mp4               # one clip straight to a file
visualfries render program.vf.json --output out/ [--format 1080x1920]   # a cut list or shots: one video
visualfries clips video.vf.json --transcript retake.json         # re-time against a new voiceover
visualfries matte talk.mp4 --output talk.matte.mp4 --provider rvm   # subject matte (rvm local, fal.ai or --command)
visualfries beats music.mp3                                      # music.beats.json (beat_this or --command)
```

`check` prints the bar grid of the project's music, then mounts every block and runs it across the clip: unknown cues, bad eases, maps that go
back in time, `NaN`/`undefined`/`Infinity` in SVG geometry, transforms and raw `style` attributes
(broken math renders nothing and throws nothing — e.g. a shadowed variable in a `points`
formula; styles set through Svelte drop invalid values silently and are not seen), CSS
animations running on wall-clock time, and with `--determinism` frames
that differ between seek orders. Run it after every edit; it takes seconds.

`manifest.json` lists every clip's program start frame for placing it on an NLE timeline and
the transcript it was timed against. Re-rendering some clips keeps the others; clips timed
against an older transcript are marked `stale`.

With `cuts` or `shots`, `render` makes the whole program one video (`--export video`, the
default there; `--export inserts` renders the clips one by one as without a cut list).
`--format WxH` renders another frame size from the same project; `--output` is an `.mp4` or a
directory that gets `<project>[.<format>].mp4`. Each segment (the range between two hard cuts)
is drawn on its own pages and stored losslessly in `.visualfries/segments/<hash>-<engine>.mkv`;
the segments are joined without re-encoding and encoded once with the clip settings. A
segment's hash covers what is on screen in it, including every file its blocks import, the
files project CSS points to and project files named in clip props, so editing one clip or one
helper draws only the segments it is on screen in (`--no-cache` draws everything again). After
a render the folder keeps only the intermediates the latest render of each project and format
there uses; an interrupted render removes its partial files, and the next render removes those
of a render that was killed. With at least as many segments to draw as `--jobs` and none much
longer than its share, each page takes whole segments; otherwise a segment's frames are spread
over the pages. The resolved program is saved beside the video as `<name>.program.json`.

A re-take that changes words (not just timing) makes the affected cues fail with a suggestion,
e.g. `"extra" not found … Did you mean "spare" at 59.80s?`. Update the phrase in the JSON;
the block stays untouched.

### Program sound

A program render mixes its own sound. The mix depends only on the program: never on segments,
the cache or transitions, and the same project gives the same samples on every render.

```json
"footage": { "talk": { "src": "talk.mp4", "audio": "talk.mic.wav" } },
"cuts": [
	{ "source": "talk", "in": "today we fix", "out": "the slow export" },
	{ "source": "talk", "in": "first open", "out": "the settings",
	  "audio": { "split": -0.3 }, "transition": { "type": "push", "sound": "sfx/whoosh.wav" } }
],
"sfx": [{ "at": "faster codec", "sound": "sfx/pop.wav", "gain": -2 }],
"music": [{ "src": "bed.mp3", "fade": { "out": 2 }, "keys": [{ "at": 0, "gain": 6 }, { "at": 3, "gain": 0 }] }],
"mix": { "sfx": -10, "music": -15, "loudness": -14, "truePeak": -1 }
```

- **Speech:** each cut's sound at its program time, with an equal-power crossfade
  (`audio.crossfade`, default 0.01 s) centred on each audio edit point, so cuts never click.
  `audio.split` moves the edit point (negative: a J cut, the sound leads; positive: an L cut)
  while the sound stays in sync with the picture; `audio.gain` (dB) and `audio.mute` per cut.
  Two cuts that continue the same take (the second starts in the source where the first ends,
  same gain) meet without a fade, so splitting a take leaves its sound unchanged.
  `footage.<name>.audio` names a separate sound file (the microphone) or `false`.
- **Effects:** `sfx` items play a sound file (relative to the project) at any program anchor,
  rounded to a frame. A transition with `"sound"` plays it on its event (the middle of every
  built-in transition). When a sound library's `sounds.json` (`{ "sounds": [{ "file", "hitMs" }] }`, in
  the sound's folder or up to three folders above) lists the file, its hit lands on the moment
  instead of its first sample (a manifest that cannot be read, or a `hitMs` outside the sound,
  is a warning and the file start is used). Each effect's loudest 100 ms sits `mix.sfx` dB (default −10)
  under the speech, plus its own `gain`. Sounds chosen automatically from the style come later.
- **Music:** each music item plays from `from` (with `in`, or a negative `from`, it starts
  inside the file) until `until` or the program end, snapped to a bar end when its beats have
  downbeats (see [Music in the program](#music-in-the-program)), at one steady level: its integrated loudness `mix.music` dB (default
  −15) under the speech, plus its `gain`. It never rises in pauses on its own; `keys` change
  the level explicitly (dB on top of `gain`, in straight lines from key to key, holding before
  the first and after the last). `fade: { in, out }` defaults to 0.01 s and 1 s. Unknown
  fields on a music item, in `fade` or in `mix` are errors, so a typo never passes silently.
- **Master:** the sum goes to `mix.loudness` LUFS integrated (default −14) with every true peak
  at or under `mix.truePeak` dBTP (default −1): one gain for the whole mix, and a true-peak
  limiter only where a peak would pass the ceiling. The limiter holds each frame's needed gain
  over ±5 ms and smooths it over ±5 ms, so it starts 10 ms before a peak, and releases with a
  50 ms time constant (about 195 ms back from a 6 dB dip). Where it takes a lot, the gain is
  raised again until the loudness is reached; a result more than 0.5 LU off the target is a
  warning. Loudness is measured as ITU-R BS.1770-4 does (K-weighted, gated, 4× oversampled true
  peak). "The speech" above is the integrated loudness of the speech as cut; a program without
  speech measures from `mix.loudness`.
- **Delivery:** AAC raises peaks a little, so the mix is limited 0.5 dB under the ceiling,
  encoded (AAC 192 kbit/s), decoded and measured; if the encoded true peak still passes the
  ceiling, the mix is limited lower and encoded again. The video carries that encoded audio as
  measured, and the render reports what it measures (`mix.delivered`). The sound is mixed and
  encoded before any picture is drawn, so an unreadable sound file fails the render at once;
  `check` mixes it too and prints its loudness (before encoding) and any warning.

`--stems` also writes `<name>.speech.wav`, `<name>.sfx.wav` and `<name>.music.wav` beside the
video: 48 kHz 32-bit float with the master gain and limiter applied, so they add up to the
mix before encoding (within float rounding, about 1e-5). A render without `--stems` removes
stems of the same name left by an earlier render, since they no longer match the video. The
render result lists the mix: the speech loudness, each piece's gain, the master gain, the
limiter's largest reduction, the loudness and true peak of the mix and of the delivered audio,
and warnings.

## How frames are made

The page renders the block into a `<canvas layoutsubtree>` and captures it with HTML-in-Canvas
(`drawElementImage`, Chromium flag `CanvasDrawElement`). Without it the stage falls back to DOM
screenshots. Each frame: set time → flush Svelte → seek GSAP timelines → run `useFrame`
callbacks and wait for the promises they return (footage frames) → force a fresh raster (a
filter toggled on the stage, or re-inserting the stage before the seek when a block nests a
`<canvas layoutsubtree>`) → wait for the paint (an error after 2 s, never a silent timeout) →
capture. A page that crashes or stops answering fails the render with the clip and frame; it
never hangs it. The page loads the bundle, fonts and footage from one origin served from disk,
because HTML-in-Canvas leaves cross-origin images out of the capture. Any frame can be rendered
in any order with identical pixels; `render` deals frames out to several pages and pipes them
to ffmpeg in order, holding only a few frames in memory (frame files on disk are the fallback,
and `--keep-frames`).
