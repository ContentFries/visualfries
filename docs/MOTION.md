# Motion projects

Explainer inserts, lower thirds and title cards written as Svelte components ("blocks"),
timed by the words of a transcript instead of hand-typed seconds. A project can also describe
a whole edit, from raw takes to a finished reel: see [Programs](#programs).

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
- **A phrase in `until` is the end of its last word**, not its start. Music, a clip or a shot
  meant to stop dead on a word runs on to the end of that word unless it says
  `"until": { "say": "kicked", "edge": "start" }`. The same holds for `out` of a cut, for the
  `at` of a `{ "downbeat": "after" }` inside `until`, and for any other field that ends something.
- **`"end"`** in a program (a project with `cuts` or `shots`) is the program's last frame:
  `"until": "end"` for a clip, a shot or music, and `{ "program": "end", "offset": -1.5 }` for a
  moment before it (`from`, an `sfx` `at`, a key). The end is the cut list's length, or
  `duration`; a program with neither (shots only) has no fixed end, and an `"end"` anchor is an
  error there. For the spoken word "end", write `{ "say": "end" }`. Without `cuts` or `shots`,
  `"end"` stays a phrase.
  _Changed in behaviour:_ in a program, `"end"` used to be searched as a spoken phrase; a
  program that anchored on the word must now write `{ "say": "end" }`.
- **`cues`** are named moments inside the clip. Names may use any language and inner spaces
  (`"nových odberateľov": "nových odberateľov"`), but not start with a digit or contain `+ - .`, and `bar 5` / `beat 17` read as music beats. Phrases are searched only inside the clip;
  numbers and `{ "frame": n }` are clip-local. `start` and `end` are built in and cannot be
  redefined. A missing phrase suggests the closest spoken ones ("Did you mean …"); an
  ambiguous phrase lists every occurrence with its time. Nothing is ever matched silently.
- One-word `from`/`until` anchors produce a warning: they are searched in the whole
  transcript and easily become ambiguous after a re-take.
- **A phrase said more than once resolves by program order** in `from` of clips and shots and
  in `at` of `sfx`: a repeated phrase is its first occurrence that starts, or puts the item, at
  or after the previous item of the same kind. That item counts from where its phrase is said
  when it stands on one (also through an offset or a nearest beat), else from its time. In
  `until` of clips and shots it is the first occurrence at or after the item's start. The rule
  reads the order the items are written in, so write each kind in the order it plays: a project
  that lists clips grouped by kind (all lower thirds, then all cards) gets wrong picks. `check`
  and `program` print each phrase picked this way as an info line with the other occurrences,
  so a wrong pick is easy to spot; `occurrence` always wins. The phrase stays ambiguous for the
  first item of its kind, when every occurrence lands before the previous item, in cues, `words`
  and keys (inside one item a repeat is a real choice), and in cut points, where a repeated
  sentence is usually a retake and the try is yours to pick.
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
| `clip.programTime`, `clip.programFrame`         | program seconds / frame (see below)                  |
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
| `clip.shown(name?, frame?)`                     | the footage frame on screen (cut list, holds)        |
| `clip.picture(layer, opts?)`                    | that frame decoded, for a canvas (Subject layers)    |
| `clip.camera`                                   | where the stage shows the footage (program mode)     |
| `clip.slotArea`                                 | where a slotted clip's slot is and its safe insets   |

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

`clip.programTime` and `clip.programFrame` are the program's clock: `clip.programStartFrame +
clip.frame` (seconds: that over `fps`), reactive like `clip.t`. Without a program (clips
rendered alone, inserts) they are the time on the project's timeline, where `from` and `until`
place the clip; in an excerpt they are the excerpt's own time, 0 at its first frame, like
`clip.programStart` and the beats' `time`. Cues and `clip.t` stay the same in an excerpt, so a
block that must look exactly as in the full video reads those.

Other styles, all seek-safe:

```js
useTimeline(({ tl, at, q, clip }) => {
	// paused GSAP timeline in clip seconds; q() is scoped to this clip
	tl.from(q('.card'), { y: 30, opacity: 0, stagger: 0.1 }, at('extra'));
});

useFrame(({ t, frame, programTime, programFrame, clip }) => {
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
on the CPU (see 3D blocks for the cost).

### Packages in blocks

A block imports npm packages like any module, subpaths a package exports included:
`import * as THREE from 'three'`, `import { RoomEnvironment } from
'three/addons/environments/RoomEnvironment.js'`. They are found as Node finds them from the
block's file: in `node_modules` of the project folder or of any folder above it, so install
them there (`npm install three` in the project folder). A package that is not installed fails
the bundle with the file that imports it and the command that installs it. `svelte` and `gsap`
are always VisualFries's own copies, even when the project has others installed (the page runs
one Svelte and one GSAP), and `visualfries/motion` needs no install. Every file a block
imports, the packages' files included, is part of its hash, so a new version of a package
renders the segments that show the block again.

### 3D blocks

Three.js in a block: install `three` in the project, build the world once at mount, and render
it in `useFrame` with every frame a function of time alone (no clock, no animation mixer
running on its own; set the poses from `t` or `clip.map`, then render).

```svelte
<script>
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { useClip, useFrame } from 'visualfries/motion';
	const clip = useClip();
	const W = clip.width;
	const H = clip.height;
	let canvas;
	let world;

	onMount(() => {
		const renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
			preserveDrawingBuffer: true
		});
		renderer.setPixelRatio(1);
		renderer.setSize(W, H, false);
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
		const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshNormalMaterial());
		scene.add(cube);
		world = { renderer, scene, camera, cube };
		return () => renderer.dispose();
	});

	useFrame(({ t }) => {
		const { renderer, scene, camera, cube } = world;
		cube.rotation.y = clip.map([[0, 0], ['turn', 0], ['turn+0.8', Math.PI]], 'power2.inOut');
		camera.position.set(0, 2, 12 - t * 0.3);
		camera.lookAt(0, 0, 0);
		// What the camera looks at lands at (cx, cy) of the frame, the perspective unchanged.
		const [cx, cy] = [0.5, 0.3];
		camera.setViewOffset(W, H, (0.5 - cx) * W, (0.5 - cy) * H, W, H);
		renderer.render(scene, camera);
	});
</script>

<canvas bind:this={canvas} style="position:absolute;inset:0;width:100%;height:100%"></canvas>
```

- `setPixelRatio(1)` and `setSize(W, H, false)`: the drawing buffer is exactly the clip's
  pixels and the canvas keeps its CSS size.
- `preserveDrawingBuffer: true`: the capture itself does not need it (frames rendered with
  and without it come out identical, through HTML-in-Canvas and in programs), but it keeps the
  frame in the canvas after the browser has shown it, so anything that reads the canvas later
  (`drawImage` or `texElementImage2D` of it, `toDataURL`, a GPU driver that clears the buffer
  once it is shown) still gets this frame instead of an empty one. One frame per capture makes
  it free.
- `camera.setViewOffset(…)` moves the scene in the frame (beside a speaker, above captions)
  without turning the camera, so its perspective does not change.
- Behind the speaker: in a program, give the clip `"layer": "behind"`. It is drawn between the
  footage and the speaker cut out by the matte, so give the block its own background (an opaque
  element under the canvas) when the world should replace the footage, and put labels that
  must stay in front of the speaker in a second clip without `layer`.
- Nothing may carry over from the frames drawn before: pages draw frames in any order. A
  geometry whose vertices you move every frame (a water surface, a cloth) needs
  `geometry.computeBoundingSphere()` after the move, as Three.js culls and sorts transparent
  objects by bounds it computes once; with stale bounds a transparent surface draws in front of
  or behind another depending on which frames came first. `check --determinism` finds this.
- Hardware: without a GPU, Chromium renders WebGL on the CPU. A 1080×1920 frame of a
  modest scene costs roughly 0.5 s per job (a 1 395-frame 3D program took about 700 s with
  `--jobs 2`), as much as or more than local matting (about 0.36 s per 1920×1080 frame on four
  CPU threads). Look at stills first and render the whole program once.

### A world clip across the program

One clip can run a world through the whole program (`"from": 0, "until": "end"`) and time
every beat of it with cues by phrase, instead of seconds computed beforehand and passed in
`props`:

```json
{ "id": "world", "block": "blocks/World.svelte", "from": 0, "until": "end", "layer": "behind",
  "cues": { "engine": "engine", "wheels": "no wheels", "skill": "skill",
            "skill2": { "say": "skill", "occurrence": 2 }, "garage": "smart garage" } }
```

In the block, `clip.at('skill2')` (or `clip.cue.skill2.start`) is the moment in clip seconds,
which is program seconds for a clip that starts at 0. A phrase is searched inside the clip, so
in a clip that spans the program `occurrence` counts through the whole program; a repeated
phrase without `occurrence` is an error that lists every occurrence. `visualfries clips`
prints where each cue landed. A second instance of the block (the labels in front, without
`layer`) declares the same cues. `clip.programTime` is the program's clock for a world clip
that starts later than 0 and still has to run on program seconds.

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
Those are recorded in the page while the block runs, so the program cannot place sound on them.
For a moment the program's sound should hit, declare it in the block's module script (below).
Worked example: `static/demo/motion`.

### Events a block declares

A block can name moments of its clip that sound effects, shots and music keys anchor on, so the
timing lives in one place:

```svelte
<script module>
	export const events = { land: 'tail+0.98', bonk: 'end-0.2' };
</script>

<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
	const land = clip.at(events.land); // the block reads the same moment
</script>
```

```json
"clips": [{ "id": "kick", "block": "blocks/Kick.svelte", "from": "kicked me", "until": "end",
            "cues": { "tail": { "say": "kicked me", "edge": "end" } } }],
"sfx": [{ "at": { "event": "land", "clip": "kick" }, "sound": "sfx/bonk.wav" },
        { "at": { "event": "land", "clip": "kick", "offset": -0.4 }, "sound": "sfx/whistle.wav" }]
```

Each value is a moment of the clip in the grammar above (a cue, `end-0.2`, `f12`, `bar 5`) or
clip seconds as a number. `program` reads the declaration from the block's source without running
it, like `animatable`, so it must be a literal object of names and literal values. `{ "event",
"clip", "offset"? }` works in `sfx` `at`, in shot `from`/`until` and in music `keys`; a clip's
own `from`, `until` and cues cannot use it (the clip it names is placed first). An unknown clip
or an event its block does not declare is an error that lists what it declares. Every declared
event is checked, used or not: one that does not resolve, or lies outside its clip or after the
program end, is a warning of the clip.

### Images

An `<img>` decodes its picture in the background. Mounted once and left alone, it is ready
before the first frame is drawn; one whose `src` changes during the clip (a pose swapped on a
cue) may still be decoding when a frame is captured, and that frame then depends on seek order
(`check --determinism` fails on it). Keep every picture mounted and switch between them with
`opacity`, never with `src` or `{#if}`, and wait for them before the first frame:

```svelte
<script>
	import { useClip, useReady } from 'visualfries/motion';
	import idle from './poses/idle.png';
	import shout from './poses/shout.png';
	const clip = useClip();
	const poses = { idle, shout };
	useReady(
		Promise.all(
			Object.values(poses).map((src) => {
				const img = new Image();
				img.src = src;
				return img.decode();
			})
		)
	);
	const pose = $derived(clip.after('shout') ? 'shout' : 'idle');
</script>

{#each Object.entries(poses) as [name, src] (name)}
	<img {src} alt="" style:opacity={name === pose ? 1 : 0} />
{/each}
```

A picture chosen per clip can come from `props` instead of an import: write
`{ "file": "<path>" }` anywhere in `props` (also inside arrays and objects), with the path
relative to the project, and the block reads a URL for its `src`:

```json
"clips": [{ "id": "home", "block": "blocks/Web.svelte", "from": "our website", "until": "end",
            "props": { "shot": { "file": "assets/web/home.png" }, "caption": "The home page" } }]
```

```svelte
<img src={clip.props.shot} alt="" />
```

An object whose only key is `file` is reserved for this anywhere in `props`; one with other
keys next to `file` reaches the block as it is, with a warning. The file must be inside the
project folder. A missing file, a path that leads out of the project folder, or a URL (put a
URL in props as a plain string) is an error of the clip that names it (`props.shot`), in
`check`, `program`, `still` and `render`. The page is served that one file and nothing else
around it; the check is on the path, so a symlinked folder inside the project is served as part
of it. The resolved program keeps the path as written, and editing the file redraws the
segments that show the clip.

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

**Words behind the speaker, as an overlay.** To lay a clip _behind_ the speaker over the
original video in an editor, give an `alpha` clip `"layer": "behind"`. While encoding, its alpha
is multiplied by the inverse of the matte of the project's one footage with a matte, aligned to
the program frame by that footage's `start`: wherever the speaker is, the clip is transparent
and the real footage shows through. No plate is drawn, so nothing is resampled; before and
after the footage nothing is cut. The matte is scaled to the clip's size, so it lines up when
the footage has the clip's aspect ratio; `check` and `render` warn when it does not. The alpha is straight:
set the editor's alpha mode to straight. Everything in such a clip is held out; put what must
stay in front of the speaker in a second clip on a higher track.

```json
"footage": { "talk": { "src": "talk.mp4", "matte": "talk.matte.mp4", "start": 0 } },
"clips": [{ "id": "behind", "block": "blocks/BigWord.svelte", "from": "it was", "until": "amazing",
            "alpha": true, "layer": "behind" }]
```

A project can also describe the whole program. `cuts` lists ranges of raw footage in order,
`{ "source": "talk", "in": "today we fix", "out": "the slow export" }`: `in` and `out` are
seconds of that file or words of its own transcript (`footage.talk.transcript`), and every
other second, frame or phrase in the project then means program time. The program transcript
comes from the cut list, so a re-take that keeps the words keeps every cue; for a new take,
point `footage.<name>.transcript` at its transcript (`--transcript` only replaces the transcript
of a project without `cuts` or `shots`). `in` rounds to the nearest frame and `out` up to the
next, so the last word is never clipped. A cut's `transition` belongs to the incoming range and
never changes program time or sound; `audio: { split }` makes a J or L cut.

`"hold": 1.7` on a cut freezes its last frame for 1.7 s after `out` (rounded to frames), as the
picture to end on after the last word or to let a gag land. The hold is program time: everything
after it moves on, `"end"` includes it, clips and shots run through it. It is silent: the cut's
sound stops at its `out` with its anti-click fade and the next cut's sound starts at its own
first frame, while sound effects and music play on. No words fall into it, so captions pause. A
transition out of a held cut shows the frozen frame as its outgoing side. A hold is at most 60 s;
one under half a frame holds nothing (a warning). `check --export inserts` notes every hold: the
rough cut in the editor needs the same freeze frame, or the inserts after it land late.

`check` and `program` warn about a word an audio edit point cuts through. `program`, `check` and
`render` also measure every edit point on the cut's sound where it can be read
(`footage.<name>.audio` or the file's own sound track): around each point the voice level is the
loudest 5 % of the sound within 1.5 s and the floor (room noise, a music bed) its quietest 10 %.
Quiet is 24 dB under the voice but never less than 6 dB over the floor, and the voice runs
through a point when the 10 ms on both sides of it are louder than quiet. The warning then says
how far to move the point, in whole frames (`move "out" 0.30 s later`, `move "in" 0.07 s
earlier`, or the `audio.split` that put it there); a voice that stops within half a frame of the
point counts as clean. A transcript word that only seems cut (a transcript often times an onset
a little early or a ringing end a little short) is no longer reported, unless the point lies
more than 0.1 s inside the word, where a quiet stop consonant can measure clean. Where the voice
cannot be told from the floor, the sound cannot be decoded or nothing was measured (`still`,
`clips`), the transcript's times decide. Measurements are cached per sound file and point in
`.visualfries/edit-points.json`. A cut can also end on the music:
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
  in pixels at 1080 px of the frame's shorter side (default 4; 0: none). `params.aspect` is the
  window's width over height: `"4:5"`, `"1:1"`, `"16:9"` or a number (default 16:9 in
  landscape, 1:1 in square and portrait); without `size` a window of another aspect keeps the
  default window's area, so `"4:5"` gives a close selfie's head more height at the same size on
  screen. A window that would leave the frame (in portrait: the safe area, less 15 % of it kept
  for the panel) shrinks to fit, keeping its aspect.
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

**The speaker away.** A shot that cuts the speaker out by the matte (`behind`) takes `away`:
stretches where the speaker is off the frame, so they are on screen only while they talk to the
camera and the world behind them carries the rest.

```json
{
	"id": "speaker",
	"shot": "behind",
	"from": 0,
	"until": "end",
	"away": [
		{
			"from": { "say": "the answer", "edge": "end" },
			"until": { "say": "Now", "edge": "start" },
			"side": "left"
		},
		{ "from": { "say": "harness", "occurrence": 2, "edge": "end" }, "until": "end" }
	]
}
```

- `from` is where the speaker is wholly gone (the exit ends there) and `until` where they start
  coming back; both are program moments in the usual grammar, so a phrase in `until` is the end of
  its last word: write `"edge": "start"` to be back for a word. A repeated phrase resolves in
  program order: `from` to the first occurrence at or after the previous range's `until` (the
  shot's start for the first range), `until` at or after `from`. `"until": "end"` (or the shot's
  own end) keeps the speaker away to the end of the shot and through a morph out of it, which then
  brings them in; a range from the shot's first frame starts away (a morph into the shot takes
  them out).
- `exit` and `enter` are seconds (`0.3`) or `{ "seconds": 0.3, "ease": "power3.in" }`; default
  0.16 s `power2.in` out and 0.22 s `expo.out` back in.
- `side`: `left`, `right` or `bottom`; default the edge the speaker reaches by the shortest way,
  decided where each move starts (or, for the way back, where it lands) by the footage the whole
  program shows there, framed as the shot frames it there: a speaker near the middle never
  changes sides mid-move (across a cut to other footage either), and an excerpt that starts
  inside a move slides them the way the full video does (the decision reads only the frames
  shown in one run around that moment, which every render extracts). A range from the shot's first frame
  decides at that frame.
- How far the picture moves comes from the matte: the boxes of the frames around each frame
  (half a second either way, so a raised arm counts), where the shot, its keys (`x`, `y`, `scale`,
  `rotation`) and its morph put them, plus a small margin past what the room's blur still
  shows of them; under footage that leaves its window open, the speaker of the bigger blurred
  backdrop clears it too, blur included. The speaker just clears the
  frame in any format, and keys and morphs go on moving the camera under the slide.
- What moves is the footage picture inside the camera window: the room, the cut-out speaker, a
  blurred backdrop and subject layers of clips (`<Footage layer="subject">`, `<Subject>`) that
  follow the camera. Clips with `"layer": "behind"`, front clips and the shot's slots (the `word`
  slot too, also through a morph into or out of the shot) stay where they are: the room leaves with the speaker, so give the shot a behind clip
  that covers the frame (a scene, a colour) for the world they leave, or the background shows.
  A word in the `word` slot stays put; end its clip at the exit if it should go.
- `full`, `punch`, `strip`, `window`, `whip` and custom shots reject `away`: there the speaker
  is the whole picture, and sliding it off leaves an empty frame. Move the picture with shot keys
  there, or use `behind`.
- Errors: `until` not after `from`, a range outside the shot, an exit that would start before
  the shot (unless `from` is its first frame), a way back that would outlast it, and a range
  that starts leaving before the one before it is back. `program` warns where the speaker is
  gone while still saying a word (at least 0.1 s of it off the frame), or starts coming back
  0.1 s or more after a word began. `check` warns (once per range) where a piece of the speaker
  is still in the frame inside a range: it reads the cut-out's pixels in the frame after the exit
  at full size, under a turned camera too (an arm or hair the matte's boxes miss, a speck the
  matte keeps). Head-crop warnings skip the
  ranges and their moves.

**Keeping the head in.** Shots frame the face a third from the top of their camera window
(`full`, `punch`, `strip`, `window`, `behind`, `whip`). That suits most footage, but a close
handheld selfie, where the head fills half the frame, can lose the top of the head in a strip or
a small window. `params.headroom` (off by default; 0.06 is a good start) keeps the whole head in
the shot's camera window, from the matte: the footage moves down until that share of the window
is free above the head (or up until the chin is in), a head too tall for the window makes the
camera back off (to 0.7 of covering it at most), and where the footage then leaves the window
open, the same footage fills it, blurred and dimmed, never the fill. Footage with less room
above the head than asked keeps covering the window: the head touches its top, uncut. A punch
with `headroom` goes no closer than keeps the head in. A portrait `strip` with `headroom` and no
`size` grows from 0.45 to at most 0.55 of the frame height for a tall head, so the footage keeps
filling the strip's width. The head's size is measured once per shot (a high percentile over its
frames, so the framing does not breathe with every lean); the headroom is kept above how high
the head gets within half a second of each frame, so a bob of a handheld shot stays in. Keys
compose on top: a `scale` key can still push the head out, which is the program's choice.

`check` warns wherever a shot's camera window cuts the speaker's head for more than a few frames,
keys included, from each frame's matte: the top of the head past the window's top edge or
touching it, or the face cut at the bottom (more than a quarter of the head below the window).
It names the shot, the time range, how much is cut and what to try (`headroom`, a taller window
`aspect`, a larger strip `size`, a lower `zoom`, `scale` or `scale` key). It stays a warning:
look at a still and decide, since some creators want a tight crop.

`check` also warns where a clip's text covers the speaker's face. At the frames it checks
(every fifth, plus edges and cues) it measures in the page every text of each front clip: its
line boxes, or the box of the opaque card it sits on (a background at least half opaque over
less than 80 % of the frame), cut to ancestors that clip their overflow. It compares them with the
head where the shot's camera puts it that frame (the matte's head box, keys and rotation
included); only the part of the face inside the camera window can be covered. A clip warns
once, when its text has covered at least a tenth of the face (the ellipse inside the head box)
for half a second of checked frames: below a tenth the glyphs only touch the hair, an ear or the
room beside the chin, and a word flying past the face on its way in is not worth a warning. The
warning names the clip and its block, the first program time, the largest share covered and the
side of the frame that is clear of the head (`Clip "k-habit" (blocks/Callout.svelte): its text
covers the speaker's face from 308.16 s … The right side of the frame (x 1097–1920 of 1920 px)
is clear of the head`). Left out:

- text under 0.1 opacity (its own times its ancestors'), hidden text, and text with a
  transparent fill and no stroke or `background-clip: text` (letters a typewriter has not typed
  yet);
- clips with `"layer": "behind"`;
- text under a subject layer that draws the speaker (`<Subject>` with `layer` `"subject"`, in
  the same clip after the text or in a later clip) over at least half of the face, read from
  the layer's pixels; a `"clean"` or `"plate"` layer, or one whose region misses the face, hides
  nothing;
- frames where a clip shows a full-frame card over the head: an element at least 0.9 opaque
  (its own opacity times its ancestors') covering the whole head and at least 80 % of the frame
  (inset or with round corners), with an opaque background colour or a gradient of opaque
  colours, or a loaded image whose drawn picture does that (an `object-fit: contain` letterbox
  only counts where the picture is). Canvases, videos and gradients with a transparent stop do
  not count: the face may show through them;
- cut and shot transition windows (a run of frames ends there), and footage without a matte.

Nothing moves by itself: look at a still at that time and decide (move the text to the free
side, put it behind the speaker, or give it a slot beside a `strip` or `window`). It adds well
under a millisecond per checked frame. Read the share as a measure, not a pixel count: text
boxes are the page's boxes around turned text, a clip transition's moves count as they are
drawn, a half-opaque chip that hugs the chin counts as its whole box, and inside one block the
order of its elements decides what is over what (a `z-index` there is not followed).

`check` warns, the other way round, where the speaker covers text placed behind them: the text
of a `"layer": "behind"` clip (a word slot behind the head), against the speaker as the matte
cuts them out that frame, and text under a subject layer (`<Subject>` with `layer` `"subject"`,
after the text in the same clip or in a later one), against that layer's pixels. A clip warns
once, when the head or body has covered more than half of its text (sampled over its line
boxes) for half a second of checked frames: the head over part of a word is the look, over most
of it the word cannot be read. The warning names the clip, the first time, the largest share
covered and the parts of the frame clear of the speaker (`the top 216 px of the frame, above the
speaker`; the clear span on the left or right at the text's height). On a portrait close-up the
face fills the width, so the room is above the head: align the words to the top, make them
smaller, or bring them in front. Transition windows, faded footage, footage without a matte and
frames with `<Subject hole>` are left out.

Captions that start inside a shot move get a hint too. A move is a shot's morph (a strip's panel
rising, a whip, the way back to `full`), two shot keys at most a second apart that move the
camera, or a cut or shot transition window. For each `@visualfries/captions` clip that starts
inside one, or up to two frames before it (`just before` in the warning), `check` measures at
the frames inside the move whether its text lies over a slotted clip's panel (a fifth of the
text or more) or covers the face on either side (a tenth, as above), and at the first frame
checked after the move that shows some of its text whether it is clear. Moves that overlap or
follow on count as one, so the suggested start is clear of all of them. Drawn over something
during the move and clear once it has landed warns once, with the time the move ends: `Captions
"cap-auto": they start at 4.76 s (program time), inside the strip shot "auto" morphing in
(4.76–5.48 s), and they are drawn over the moving panel and the speaker's face until it lands …
Start them when the move ends, at 5.48 s (0.72 s later)`. Captions that are over the panel or
the face after the move as well are a layout question, not a timing one, and get no hint;
captions that start on a cut and ride its incoming side move with it and are left out. Nothing
waits on its own: shift the captions' `from` or keep them out of the moving area, after a look
at stills of the move.

`check` also warns where a clip's content does not fit the frame, the sign of a block written
in fixed pixels for another size (a 1920 × 1080 layout in a 9:16 program). Every fifth frame it
measures in the page what each clip shows that carries content: the line boxes of its text, its
images and videos, and the cards, panels and SVGs (elements with a background or border) that
hold text. Each box is cut only to ancestors smaller than the frame that clip their overflow: a
block's frame-sized box with `overflow: hidden` hides what lies off the frame, which is what
counts here. Decoration without text (glows, dot patterns, a field of icons, canvases) is left
out, since it often bleeds past the edge on purpose; so are planes over most of the frame (a
card's background) and content parked off the frame (the next panel of a pan, a card waiting
to slide in): only boxes that reach into the frame count. A clip warns once for each of these:

- **Cut by the frame.** A quarter or more of that content lies past the frame edge for a second
  of checked frames. A card sliding in or a push passes the edge for less. Example:
  `Clip "hook-cards" (blocks/HookCards.svelte): 32 % of its content lies outside the frame (past the right edge of the 1080×1920 frame) from 10.80 s …`.
- **A mostly empty card.** The clip covers the whole frame with an opaque card (a background
  colour, or a gradient of opaque colours, at least 0.9 opaque; a scrim that fades to
  transparent is not a card, a photo or video over the frame fills it, and a full-frame SVG or
  canvas is decoration either way) but its content, summed over
  every frame it does so (a second or more, the outer 5 % of its area at each end left out, so a
  small label in a corner does not count), is laid out like a frame of the other orientation.
  Only the long axis is judged (the bottom of a portrait frame, the right of a landscape one):
  the content starts within its first 12 % and ends before 60 % of it and before the length of
  the short side, and it spans at least half the short side across and reaches at least half of
  its length along. A short list down the left of a portrait card, a 16:9 card that leaves the
  bottom for the captions, or a headline in a corner is not judged. Told when the clip leaves, or
  at the end of the segment it is checked in. Example:
  `it covers the whole frame but leaves the bottom 61 % of it empty: its content only reaches y 146–751 of 1920 px`.
- **Outside the safe zone,** with `check --format` only: half or more of its text inside the
  frame lies outside the format's safe zone (the `--safe-*` insets, notch included) for a
  second, where platform buttons and captions may cover it. A project's own check leaves this
  out: the published zones are wide (on 9:16 everything below y 1248 is outside) and captions
  low on the chest are a choice.

Cut and shot transition windows end a run. Read the share as a measure: boxes are the page's
boxes around turned or 3D-transformed elements, nested boxes count each, and text drawn on a
canvas is not seen. Content that crosses the edge on purpose warns too when it stays there for a
second: a ticker or marquee, a card with text that bleeds off the frame by design. Lay the block out from the clip's size (percentages, container units,
`--safe-*`, its own layout for `clip.format.class`), after a look at a still.

The layout moves from the previous shot's over `morph` seconds (default: 0.7 s into `full`,
`strip` and `window`, 0.3 s into `behind` from `full` (0.7 s from a framed shot), 0.16 s into
`punch`, 0.45 s out of a punch, 0.42 s
into and out of a whip; none under a shot `transition`). A window's ring and shadow and a dimmed
room fade with the move. A clip with `"slot": "panel"` fills that slot and moves with it; while
no shot frees its slot it is hidden and `check` warns. Its root also says how much of the slot
platform UI covers at that frame ([safe insets of a slot](#safe-insets-of-a-slot)). Shots add
events to the program for sounds to land on: `shot` halfway through a move into `strip` or
`window` and back out of them, `punch` on a punch-in's first frame, and `whip` halfway through the
whip out and the whip back (a punch after a whip hits when the camera lands). Nothing moves on the program's first frame,
so a shot there has no event. A shot may run across hard cuts (the jump cuts of a talking head);
`check` warns only when its morph, a change between two of its keys or its transition window is
under way on such a cut, because the move then goes on over different footage. `check` warns when a whip and a transition fall within three
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
  `stagger` (0.4: share of each half spent starting the slats one after another). The picture
  changes while every slat is closed, and it needs no handle. On a clip only the clip appears.
- `card` (0.9 s, `none`): the incoming picture arrives as a card (62 % of the frame, rounded
  corners, a shadow) that slides in along `direction` (as for `push`) or flips in
  (`params.motion: "flip"`), lands in the middle while the outgoing picture dims, and grows to
  fill the frame. `params.side: "out"` plays it backwards: the outgoing picture shrinks into the
  card and slides or flips away over the incoming one. `scale`, `radius` (44 px of a 1080 px
  frame), `shadow` (0.4) and `dim` (0.45) shape it. Clips riding the card (slotted ones too) move
  with it and are cut to its corners; clips riding the side under it are cut where it is. On a
  clip the clip arrives as the card, with its corners and a shadow that follows what it draws; the
  layers below it stay.

Every built-in's sound event is halfway through its window, on the cut of a centred window.
Colour params take CSS colours only: a value with `url(…)`, `image(…)` or more CSS in it is an
error. "The eyes" follow a shot's keys, rotation included.
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
(about 3 fps at 1080p on 12 cores). It needs `uv` and `ffmpeg` on the PATH, nothing else: `uv`
brings Python, torch, torchvision and numpy (current CPU wheels), and the first run downloads
them, the RobustVideoMatting v1.0.0 model code and its weights from the project's GitHub release
(checked against their SHA-256), a few hundred MB cached for later runs (`$TORCH_HOME`, default
`~/.cache/torch`). Any local tool works with
`--command "tool {input} {output}"`, and any `MatteProvider` in Node. It splits, checks and
joins the pieces frame-exact. Worked example: `static/demo/speaker-depth`.

## Subject layers

A matte cuts out the whole speaker. A **subject layer** takes a part of the speaker, a
**region**, as its own layer that can move, spin and fly away, and the stage can leave a
**hole** where that part was, filled with the background. That is the lid coming off a
head, a hole through the body, a word passing through the head, or the speaker shrinking away
from their own background. Subject layers need a program (`cuts` or `shots`) for the hole; the
region layer itself also works in inserts mode.

**Clean plate.** The hole shows the footage with the subject removed. Ask for it on the footage:

```json
"footage": { "talk": { "src": "talk.mp4", "matte": "talk.matte.mp4", "clean": true } }
```

`true` fills every frame from its own background: the matte's soft edge is grown by about 1 %
of the short side (12 px at 1080 × 1920, `"grow"` to change it), so the hair fringe and a
phone's sharpening halo go too, and the hole is filled by push-pull from all around it, then
relaxed so a gradient (sky toward the horizon) runs straight through. Outside the grown hole the
plate is the footage's own extracted frame, encoded once more: within a level of it on natural
colour (about two on a saturated one), so the edge of a hole in the background does not show
and no outline is left where the speaker was. It suits sky, walls, out-of-focus backgrounds and handheld footage (each frame is
filled from itself, so camera shake and parallax cost nothing); detail does not continue into the
hole (a branch behind the head comes out as soft green). `{ "image": "empty.jpg" }` shows a
still of the empty scene in the hole instead, scaled to cover the frame: best for a tripod shot
where you filmed the empty set. A plate taken from other frames where that area was background
would keep real detail on a tripod or a slow pan, but in a handheld selfie the camera shakes,
turns and changes exposure, so such pixels land a few pixels off with visible seams; it is not
built in (a block can still draw its own from `clip.picture()`). The plates are built in Node once, on worker threads, and cached
next to the extracted footage frames: 1116 frames of 1080 × 1920 took 44 s on 8 threads of a
busy 12-core server (70–160 ms a frame on one thread), about 100 MB of JPEG, and nothing on the
next run; a new matte, source, image or `grow` builds them again. A per-frame fill in the page
would cost that on every render and every seek. `check` warns about frames where the matte
covers the whole picture, which have no background to fill from.

**Regions** are in footage pixels:

| Region                                                    | What it takes                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `"all"`                                                   | the whole subject                                                                      |
| `{ "above": 0.3 }`, `{ "below": 0.6 }`                    | the subject above or below a level line 0.3 head heights under the top of the head     |
| `{ "above": { "head": 0.3, "tilt": -8 } }`                | the same line turned 8° anticlockwise; it follows the head from frame to frame         |
| `{ "above": { "through": [[x1, y1], [x2, y2]] } }`        | above a line through two points                                                        |
| `{ "path": "M 300 900 L 700 900 … Z", "origin": "head" }` | inside an SVG path; with `origin: "head"` its coordinates start at the top of the head |
| `{ "mask": url, "x", "y", "width", "height" }`            | where a picture is opaque (blocks; `origin: "head"` as for a path)                     |

A head line counts head heights down from the top of the head the matte measures: 0.3 is about
the forehead, 0.45 the eyes. The head is averaged over 0.1 s so the line does not jitter.

**In JSON**, the built-in block takes a region at the clip's first frame, keeps those pixels,
and leaves the hole while the clip is on screen. Placement keys move the piece and turn it about
the middle of the region, not the frame:

```json
{
	"id": "lid",
	"block": "@visualfries/subject",
	"from": "blew my lid",
	"until": "end",
	"props": { "region": { "above": { "head": 0.32, "tilt": -6 } }, "rim": { "opening": 0.2 } },
	"keys": [
		{ "at": 0, "x": 0, "y": 0, "rotation": 0 },
		{ "at": 0.9, "x": -500, "y": -1500, "rotation": -700, "ease": "power1.in" }
	]
}
```

Props: `region`, `footage`, `freeze` (the moment whose pixels the piece keeps, default
`"start"`; `false` keeps it live), `hole` (`false`: the speaker stays whole and a copy flies),
`rim` and `layer` (`"clean"` takes the background instead of the speaker). `check` reports a
missing matte or clean plate before anything is drawn.

**Rim.** `"rim": true` darkens the cut edge on the speaker that stays (a band of `width` px in
`color`, both optional). On a line, `{ "opening": 0.2 }` draws the open top of a cartoon head
instead: an ellipse across the speaker as wide as the cut (its soft hair edge included), 0.2
times as tall, dark `inside` with a light lip on its far edge, and a ring in the speaker's own
colour just below the cut (`color` sets it).

**In a block**, `<Subject>` is the same layer:

```svelte
<script>
	import { Subject, useClip } from 'visualfries/motion';
	const clip = useClip();
	const hit = clip.at('kicked');
	const off = $derived(clip.t >= hit);
	const k = $derived(Math.max(0, clip.t - hit));
</script>

<Subject
	region={{ above: { head: 0.3, tilt: -6 } }}
	freeze={hit}
	hole={off && { rim: { opening: 0.2 } }}
	x={-900 * k}
	y={-2300 * k + 1800 * k * k}
	rotation={-760 * k}
	opacity={off ? 1 : 0}
/>
```

It sits exactly on the picture the stage shows (`clip.camera`: the camera window, shot keys and
morphs included), so effects drawn in footage pixels can ride the camera too. Props: `region`
(or a function of `{ source, frame, clipFrame }` returning one per frame, e.g. a line from your
own face tracking), `name`, `layer` (`subject`, `clean`, `plate`),
`outside` (everything but the region), `freeze`, `hole`, `smooth` (seconds, default 0.1),
`pivot` (`[x, y]` footage pixels), `place` (`false`: fill the clip's frame), and the moves `x`, `y`
(clip pixels), `rotation`, `scale`, `opacity`. While `hole` is on, the stage draws, for the frame
it shows, the clean plate inside the region under the clips behind the speaker, and the speaker
without the region over them, so a word behind the speaker shows through the hole. The hole
follows the live frame; the piece keeps its frozen pixels, taken from the plate through the
matte so it has exactly the colours of the picture it leaves. With `outside`, the hole is
everything but the region. The inserts export carries the piece alone (the hole is part of
the footage picture); `check --export inserts` says so for `@visualfries/subject`. In inserts
mode there is no stage picture: draw `<Footage layer="plate">` and
`<Subject layer="clean" region={…}>` yourself.

**Canvas drawing.** Blocks never build footage URLs:

```js
useFrame(async () => {
	const pic = await clip.picture('plate'); // or 'subject' (alpha = matte), 'clean'
	ctx.drawImage(pic.image, 0, 0); // decoded, the frame on screen
});
```

`clip.picture(layer, { name, frame, offset })` gives the source frame the cut list shows at a
clip frame, holds and transition handles included, as a decoded image with its `source`, `frame`
and size; `clip.shown(name?, frame?)` gives just the source frame. Draw pictures at their own
size and scale the canvas with a CSS `transform` (`transform-origin: 0 0; transform:
scale(0.5)`), never with CSS `width` and `height`: frames are captured with HTML-in-Canvas,
which draws a canvas at its own size whatever its CSS size says, and a `drawImage` that
scales may resample differently depending on what was drawn before, which fails `check
--determinism`. On a program stage every canvas contains its paint (CSS `contain: paint`):
HTML-in-Canvas used to leave a canvas out of the frame unless it sat at the stage's top left
corner. A canvas therefore stacks like a positioned element: one in normal flow paints over
absolutely positioned elements before it, so give those a `z-index` or put them after it. The region helpers are
exported too (`placeRegion`, `drawRegion`, `drawRim`) for blocks that draw their own canvas.

`check` warns when a region holds none of the speaker in the frames it checks (every fifth
frame and the edges) for about half a second or more: a line above the head, a path off the
body. The warning gives the time it starts.

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

- **Where it starts.** `from` takes any program anchor: seconds, `{ "frame" }`, `{ "program":
  "end", "offset": -8 }`, a phrase of the program transcript, or a beat of a music item listed before it (`{ "bar": 9, "music":
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

`"block": "@visualfries/captions"`, `"block": "@visualfries/speaker-depth"`,
`"block": "@visualfries/subject"` (see [Subject layers](#subject-layers)) and
`"block": "@visualfries/end-card"` (see [Excerpts](#excerpts)) ship with VisualFries; their
`props` replace a hand-written block. In your own blocks, `<Captions>`
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
  `extra` holds any further named colours, named in lowercase letters, digits and dashes
  (`"wood-dark"`, not `"woodDark"`), as their custom property is `--brand-extra-wood-dark`. A
  value may be any CSS colour or a gradient.
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

### Safe insets of a slot

A clip in a shot's slot (`panel`, `card`, `word`) gets the slot's own safe insets on its root, in
px from the slot's edges: how far each edge of the slot lies outside the format's safe rectangle
(0 where it lies inside). The box they leave is the part of the slot no platform UI covers. In a
9:16 `strip` the panel is 1056 px tall from y 864 and the bottom inset is 672, so only its top
384 px are safe: `--slot-safe-bottom` is `672px`.

| CSS                                             | `clip.slotArea`             |                                     |
| ----------------------------------------------- | --------------------------- | ----------------------------------- |
| `--slot-safe-top`, `-right`, `-bottom`, `-left` | `safe.top`, `right` …       | px from the slot's edges            |
|                                                 | `x`, `y`, `width`, `height` | the slot itself, in stage pixels    |

They are set on every seek from the slot where the shot puts it, so they follow it through a
morph: while a strip's panel slides up, the safe part runs from the panel's top edge to the
bottom inset and grows with it, and a strip that morphs into a `window` hands over to the
window's panel frame by frame. A slot outside the safe area leaves an empty box (its insets add
up to its height or width). They are px like `--safe-*`, not container units: they are measured in the
slot and work in any container a block sets up. The right inset is the one of the whole
rectangle (`--safe-right`, TikTok's button column). Lay out in the box and size inside it with
container units:

```css
.safe {
	position: absolute;
	inset: var(--slot-safe-top, 0px) var(--slot-safe-right, 0px) var(--slot-safe-bottom, 0px)
		var(--slot-safe-left, 0px);
	container-type: size; /* cqw / cqh of the safe part, not of the whole slot */
}
```

Placement keys move the block inside its root, not the slot: the insets stay the slot's. For a
clip without a slot (outside program mode too) the properties are `0px`, so the same block fills
the frame, and `clip.slotArea` is null. Keep the `0px` fallback in `var()` anyway: without it a
missing property makes `inset` invalid, and a size-contained box collapses to nothing.

### Hashes

`render` records the brand and style it used: `brand` and `style` hashes (12 hex characters, or
`null` when the project names none) in `manifest.json` and on every rendered clip. The brand hash
covers its values and the contents of its font and logo files, not where they are. Re-rendering
some clips with another brand or style warns about the clips left from before.

## Programs

A program is one project that describes a whole edit: the cut list over the raw takes, how the
footage is framed (shots), what is drawn over and behind it (clips), the handoffs (transitions),
captions, sound effects and music. It renders as one video per format, and because every timing
is a phrase of the transcript, a retake or a re-cut follows without touching anything else. The
pieces are described above and below; this section is the order to use them in, from a raw take
to a finished reel. Worked example: [`static/demo/reel`](../static/demo/reel) (a 9:16 reel from
one 45-second take, also rendered as 16:9).

```
reel/
  reel.vf.json          cuts, shots, clips, sfx, music
  talk.mp4              the raw take (whole, uncut), its matte and its transcript
  blocks/…              the panel, card, end card and behind-word blocks
  music/bed.mp3         with bed.beats.json
  sfx/…                 sound effects
```

**1. Prepare the take.** Keep each take as one file; the cut list picks the ranges. Phone
recordings often have a variable frame rate: footage plays fine, but `matte` needs a constant
one, so make a copy with `ffmpeg -i take.mov -vf fps=30 … talk.mp4` first (rotation is handled).
Transcribe it into words with times ([transcript formats](#the-project-file)) and correct
misheard names in the transcript itself (`"Visual FRIESE"` → one word `"VisualFries"`): captions
show the transcript's words. Make the matte ([Footage and mattes](#footage-and-mattes)) if the
reel puts anything behind the speaker, and analyse the music once ([Music and
beats](#music-and-beats)).

**2. Plan.** Read the transcript and write the outline before the JSON: the hook, the sections,
which phrase each move lands on. A reel holds attention when the frame keeps moving and every
section changes how the speaker is framed: a word behind the head on the hook's key word, a strip
or window with a panel where they list or explain, a whip to a full-screen card for the one thing
worth showing, a punch-in on a claim, an end card on the call to action. Plan one move per spoken
beat, and say where captions sit and where they make way for a panel that repeats the words.

**3. Cut list.** One cut per kept range, `in` and `out` as phrases of that take (see [Footage
and mattes](#footage-and-mattes)). Leave a breath at each edge: `"offset": -0.1` on `in`,
`0.1` on `out` (transcripts often time a word's start a little late). For a sentence said
several times, `occurrence` picks the try on `in`; `out` is searched from `in`, but a phrase that
appears again later in the take is still ambiguous, so give `out` an `occurrence` too (`1` is the
first after `in`). A cut cannot run past the end of its source, so the last cut's `out` offset is
limited by what the camera recorded after the last word; for more picture after it, give the
last cut a `"hold"` (seconds of its last frame, silent). `visualfries program` prints every cut
with its source range and hold.

**4. Shots.** Chain shots end to start: give the next shot's `from` the same anchor as the
previous shot's `until`. A gap of a few frames between them is a `full` shot of its own, and the
move into it is squeezed into those frames. In `until` a phrase means the end of its last word;
to end a shot where a phrase starts, write `{ "say": …, "edge": "start" }`. End the last shot,
the music and the clips that run to the end with `"until": "end"` (the program's last frame,
holds included). A clip whose `until` lies past the program end is cut there, its own
`clip.frames` and `clip.duration` too, and `program` notes it. _Changed in behaviour:_ such a
clip used to keep its written length, so exits written as `'end-0.3'` never played; they play now.
Give every shot that holds longer than about two seconds `keys` that keep the camera moving (a
slow `scale` from 1 to 1.08). What depends on the footage (framing and headroom, window
aspect, strip size, text placement against the face, caption size) is decided per video from
stills of every shot; defaults are a starting point and `check` warnings are hints. A face that
fills half the frame needs `headroom`, a taller window `aspect` or a bigger strip `size`; a small
face needs nothing ([Keeping the head in](#footage-and-mattes)).
Shot layouts and defaults are under [Footage and mattes](#footage-and-mattes), keys under
[Keys](#keys).

**5. Clips.** A clip in a slot (`panel`, `card`, `word`) shows while a shot frees that slot and
rides the slot out: end it when the next shot's move is over, not when the shot ends, or the
panel slides away empty (`check` warns about frames where the slot is closed). Fade a panel's
content out just before the shot ends, so it never sits under the captions that come back.
Captions are a `@visualfries/captions` clip per stretch of speech they cover: put them low on
the chest (`"y": 0.85` in portrait, below the face of a phone close-up), give them a fixed `size`
when the project renders several formats (the default scales with the frame width), and leave
them out where a panel repeats the words. Blocks that render in several formats read
`clip.format.class` or style `[data-format='landscape']`; a slotted clip's `clip.width` and
`clip.height` are the frame's, so size its content in CSS (container units or percentages). Lay a
panel out inside `var(--slot-safe-top|right|bottom|left)`: under a 9:16 `strip` most of the panel
lies under the platform's bottom UI, and these say how much of it does at every frame ([Safe
insets of a slot](#safe-insets-of-a-slot)).
Use the brand's tokens for colours and fonts, and declare the font files: the neutral brand names
Anton and Inter but loads neither. See [Brand, style and format](#brand-style-and-format).

**6. Transitions and sound.** A `transition` with `"sound"` plays it on the transition's event
(see the built-ins above). Shots emit events too (`program --json` lists them under `events` with
their frames) but carry no sound yet: put an `sfx` item on the shot's anchor plus half its move
(a whip 0.21 s, a strip or window 0.35 s; a punch hits on its first frame). A moment a block
computes (a landing, an impact) is an event it declares, and the `sfx` anchors on it
(`{ "event": "land", "clip": "kick" }`, see [Events a block declares](#events-a-block-declares)). Sound effects from a
library whose `sounds.json` lists hit offsets land their hit on the moment ([Program
sound](#program-sound)). Music plays at a steady level under the speech and ends on a bar
([Music in the program](#music-in-the-program)); its `in` places a downbeat on a visual hit.

**7. Check and look.** `visualfries program` after every edit until it shows no errors; then
`check --determinism`; then look at stills: every cut, the first, middle and last frame of every
transition window (`program` prints them), every event, and the first frames of every shot
move. Ask of each frame: is any text over the face, cut by the frame or covered where it should
be read, does a slot ever show empty, does the frame stand still for more than two seconds, do
accents and descenders keep their room. Add a still at every time `check` names (text over the
face, text the speaker covers, captions over a move, content cut by the frame or a half-empty
card), look, then decide: the warnings are hints, and the engine moves nothing on its own. They
only find what the page lays out (not text drawn on a canvas or baked into an image), so look
anyway. A sheet of about ten moments per `still` call stays quick. For every other format the
project renders, run `check --format 1080x1920` (any `WxH`): the program is checked as
`render --format` draws it, with the format's safe zone, and `still --format` draws its stills.

**8. Render.** `visualfries render reel.vf.json --output out/`, and `--format 1920x1080` for
16:9 from the same project. The render reports each segment as drawn or cached, the mix and the
time; the resolved program is saved beside the video. The cache works per segment (the range
between two hard cuts): an edit redraws the segments whose content changed. A clip that spans
several segments (a captions clip over the whole program) puts every one of them in play, and a
cut that gets longer or shorter moves everything after it, so those segments are drawn again. To
finish the edit in an editor instead, `--export inserts` renders each clip as its own file to lay over
the rough cut (see [Inserts from a program](#inserts-from-a-program)).

**9. Retake.** Point the footage at the new take and its transcript, or change which try a cut
keeps (`occurrence`), and render again. Cut points, shots, clips, captions, keys, sound effects
and transitions move with their words, and the music re-snaps to a bar. A phrase the new take no
longer says fails with the closest spoken ones; numbers in source seconds do not follow, so keep
cut points as phrases.

### Excerpts

A teaser cut from the same program as the long video: name a range, and VisualFries resolves the
whole program first and then slices it. Every phrase, `until`, repeated phrase and beat lands
exactly where it does in the full video, so nothing in the slice is missing and nothing needs
re-anchoring.

```json
"excerpts": [
	{
		"id": "teaser1",
		"from": 0,
		"until": { "say": "while my computer is off", "edge": "end", "offset": 0.15 },
		"format": "1080x1920",
		"end": {
			"duration": 3,
			"props": { "lines": ["Full video", "on YouTube"], "handle": "@channel" },
			"sound": "sfx/slam.wav",
			"gain": -4
		}
	}
]
```

```bash
visualfries program video.vf.json --excerpt teaser1    # its range, edges and end card
visualfries check video.vf.json --excerpt teaser1
visualfries still video.vf.json --excerpt teaser1 --at 2s --at end --output teaser1.png
visualfries render video.vf.json --excerpt teaser1 --output out/   # out/video.teaser1.mp4
```

- **Range.** `from` and `until` take program anchors: phrases, seconds, `{ "frame" }`, beats,
  `"end"`, `{ "program": "end", "offset": -5 }`. A phrase in `until` is the end of its last word,
  searched from `from` on; a repeated one is its first occurrence after `from`. Frame 0 of the
  excerpt is the program frame `from` lands on, and `until` past the program end stops at it.
- **Format.** `format` (`"WxH"`) is the frame the excerpt renders in, and the whole program is
  resolved in it before the slice: clips get its `clip.format` and safe insets, shots lay out for
  its class. Default: the project size; `--format` overrides it. Blocks that read
  `clip.format.class` and `--safe-*` carry over; a block laid out in fixed 16:9 pixels does not, so
  look at `still --excerpt` stills of every block.
- **Edges.** Items keep their own time. A clip running across `from` shows from where it is there
  (its cues, words and animation as in the full video), and one running across `until` stops
  there. A shot keeps its start: a move (a morph, a whip) cut by `from` plays on from its middle,
  and keys keep their frames. A cut or shot transition window across an edge plays as in the full
  video, with both its sides (also a side that lies outside the range). Cuts are trimmed to the
  range. Framing reads the footage around the edges, and a shot with `headroom` across an edge
  keeps the head size of the whole shot, so every frame of the excerpt is the full video's frame
  (in its format). In the excerpt's program JSON, an item cut by `from` has a negative
  `startFrame`. `program` and `check` warn when an edge falls inside a word, a shot's
  move or a transition window (the excerpt then starts or ends mid-word or mid-move), and name
  the clips running across an edge as `info`.
- **Sound.** Speech is cut at both edges with a 10 ms anti-click fade. An effect stays when its
  hit lands inside the range: its run-up before `from` is cut, one ringing on past `until` rings
  on under the end card, and one still ringing at the excerpt's last frame fades out over 10 ms.
  An effect whose hit is before `from` is left out, because only its tail would play and the
  mixer levels each effect by its loudest part. Music playing at
  `from` starts inside its file with a 0.25 s fade-in. Music playing at `until` goes on under the
  end card at the level its keys give it at `until`, and fades out over its `fade.out` (at least
  0.25 s) to the excerpt's last frame; music that ends sooner ends as in the full video, and music
  that starts at or after `until` is left out. The
  excerpt is mixed as a program of its own: the speech loudness, and with it the effect and music
  levels and the master gain, is measured on the excerpt's sound.
- **End card.** `end` adds `duration` seconds after the range. From its first frame the picture
  holds: the footage, shots, transitions and every clip stay as they are on the excerpt's last
  frame, and only the card plays over them. The card is `@visualfries/end-card` with `props`, or
  any block (`"block": "blocks/TeaserEnd.svelte"`); its clip id is `<excerpt>.end`. `sound` is
  an effect on its first frame (a `sounds.json` hit lands there) and `gain` its dB, as in `sfx`.
- **Errors.** An excerpt that does not resolve, or whose end card does not (a missing block or
  sound, a `{ "file" }` that is not there), is an error when it is asked for (`--excerpt`) and a
  warning in the whole program, so a typo in one teaser never stops the full video. The
  whole program has to resolve without errors, since the excerpt is its slice.
- **Cache.** An excerpt is drawn as a program of its own: its segments are cached in
  `.visualfries/segments/` under their own hashes, and each excerpt and format records its own
  files, so rendering one never prunes another's or the full video's. Rendering it again draws
  only what changed in it. It does not take segments from the full video's render: a teaser is
  usually another format, its edges rarely fall on the hard cuts between segments, and its
  hashes cover excerpt frames, so an edit that moves the range inside the program (a cut before
  it gets longer) draws the excerpt again.
- **Files.** `render --excerpt <id>` writes `<project>.<id>.mp4` (with `--format`,
  `<project>.<id>.<format>.mp4`) and `<project>.<id>.program.json`; `program --excerpt` saves
  `.visualfries/program/<id>.<format>.json`. The whole program lists `excerpts` (each `id`,
  `startFrame` and `frames` in program frames, `format`, `end`), and an excerpt's program carries
  its own as `excerpt`. Excerpts render as video only (no `--export inserts`).

One excerpt is one range: a teaser that drops a stretch from the middle of the range is still a
program of its own.

`@visualfries/end-card` dims the picture under it, lands its lines one by one and raises the
handle below them, all inside the safe zone, in the brand's colours and fonts, at any frame size:

| prop     |                                                                                    |
| -------- | ---------------------------------------------------------------------------------- |
| `lines`  | one string per line (default `["Full video", "on YouTube"]`)                       |
| `accent` | the line in the brand's primary colour (default the last; `-1`: none)              |
| `handle` | the channel under the lines (optional)                                             |
| `image`  | a round picture beside the handle: `{ "file" }` or a URL; default the brand's mark |
|          | logo when it has one, `false` for none                                             |
| `dim`    | how dark the picture under it gets, 0–1 (default 0.8)                              |

## CLI

```bash
visualfries clips video.vf.json                    # resolved times, cues, bound words, errors
visualfries check video.vf.json [--determinism]    # run every block without rendering (seconds)
visualfries still video.vf.json --clip B --output b.png            # sheet: start, every cue, end
visualfries still video.vf.json --clip B --at extra --at extra.end+0.5 --output b.png
visualfries render video.vf.json --output out/ [--clip B] [--jobs 6]   # MP4 / MOV + manifest.json
visualfries render video.vf.json --clip B --output b.mp4               # one clip straight to a file
visualfries render program.vf.json --output out/ [--format 1080x1920]   # a cut list or shots: one video
visualfries render program.vf.json --excerpt teaser1 --output out/      # one of its excerpts (teaser)
visualfries render program.vf.json --export inserts --output out/ [--handles 10]  # its clips, one file each
visualfries check program.vf.json --export inserts               # what inserts leave to the program render
visualfries check program.vf.json --format 1080x1920             # the program in another frame size, safe zone too
visualfries still program.vf.json --format 1080x1920 --output s.png   # its stills
visualfries clips video.vf.json --transcript retake.json         # re-time against a new voiceover
visualfries matte talk.mp4 --output talk.matte.mp4 --provider rvm   # subject matte (rvm local, fal.ai or --command)
visualfries beats music.mp3                                      # music.beats.json (beat_this or --command)
```

`check` prints the bar grid of the project's music, then mounts every block and runs it across the clip: unknown cues, bad eases, maps that go
back in time, `NaN`/`undefined`/`Infinity` in SVG geometry, transforms and raw `style` attributes
(broken math renders nothing and throws nothing — e.g. a shadowed variable in a `points`
formula; styles set through Svelte drop invalid values silently and are not seen), CSS
animations running on wall-clock time, and with `--determinism` frames
that differ between seek orders. In a program it also warns where a shot cuts the speaker's
head, where a clip's text covers the face, where the speaker covers text behind them, where
captions start inside a shot move, and where a clip's content does not fit the frame (see
[Footage and mattes](#footage-and-mattes)). `--format WxH` checks the program in another frame
size, as `render --format` draws it, and adds text outside that format's safe zone.
Run it after every edit; it takes seconds.

`manifest.json` lists every clip's program start frame for placing it on an NLE timeline and
the transcript it was timed against. Re-rendering some clips keeps the others; clips timed
against an older transcript are marked `stale`.

With `cuts` or `shots`, `render` makes the whole program one video (`--export video`, the
default there; `--export inserts` renders each clip as its own file, see
[Inserts from a program](#inserts-from-a-program)).
`--format WxH` renders another frame size from the same project; `--output` is an `.mp4` or a
directory that gets `<project>[.<format>].mp4`. Each segment (the range between two hard cuts)
is drawn in chunks of about 4 s (cut at every 4 s of program time, so the pieces stay put when
an edit moves a segment's edges; a piece under 2 s at an edge joins its neighbour), each on
pages of its segment and stored losslessly in `.visualfries/segments/<hash>-<engine>.mkv`; the
chunks are joined without re-encoding and encoded once with the clip settings. A chunk's hash
covers what its frames show, including every file its blocks import, the files project CSS
points to and project files named in clip props, so editing one clip or one helper draws only
the chunks it is on screen in (`--no-cache` draws everything again). Keys count by what they
draw in the chunk's own frames: moving the speaker's exit by a tenth of a second draws again
the chunks around the exit, not every chunk of the shot. A clip's other fields count whole: new
props of a block that runs across the program draw all of it again. After a render the folder
keeps only the intermediates the latest render of each project and format there uses; an
interrupted render removes its partial files, and the next render removes those of a render
that was killed. With at least as many chunks to draw as `--jobs` and none much longer than its
share, each page takes whole chunks, going on to the next chunk of the same segment; otherwise a
chunk's frames are spread over the pages. The resolved program, with every segment's `chunks`,
is saved beside the video as `<name>.program.json`.

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
  rounded to a frame: a phrase, a beat, `{ "program": "end", "offset": -0.5 }`, or an event a
  clip's block declares (`{ "event": "land", "clip": "kick" }`). A transition with `"sound"` plays it on its event (the middle of every
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

### Inserts from a program

`render <program> --export inserts --output out/` renders every clip of a program as its own
file for an editor to lay over the rough cut, with `manifest.json` as without a cut list
(`--clip` picks clips, `--output name.mov` names the file of one). An insert is the clip exactly
as the program draws it, alone:

- **Time:** the clip's program window plus `--handles` frames before and after it (default 10;
  never before the program's first frame or after its last), in which the clip holds its first
  or last frame, as it does inside a transition window. The file starts at `programStartFrame`.
  A clip in a `slot` shows only while the shot on screen frees the slot, handles included: where
  the shot before or after it has no such slot, that handle is empty (transparent).
- **Place:** frame coordinates. Every insert has the program's frame size, and the clip sits
  where the program draws it: placement keys move it, and a clip in a shot's `slot` follows the
  slot wherever the shot puts it, through morphs and whips. Laid over the program picture, an
  insert lines up pixel for pixel, except where the program moves the clip with a transition:
  a clip behind the subject inside a cut or shot transition window moves (or is covered) with
  the footage in the program and stays still in the insert, and `check --export inserts` names
  those frames. A slot-sized file would have no single size while a morph resizes the slot, and
  could not carry a whip's travel.
- **Alpha:** in a program every clip is drawn over the footage, so inserts are transparent
  (ProRes 4444 `.mov`) unless the clip says `"alpha": false`: it is then drawn over its
  `background` (or the project's) as an H.264 `.mp4`. A behind clip is always transparent;
  `"alpha": false` on it is a warning. The alpha is straight (colours not multiplied by it), as
  in every transparent clip VisualFries renders: set the editor's alpha mode to straight. Read as
  premultiplied, soft edges come out too bright (a halo of about 30 levels around a holdout).
- **Behind:** a clip with `"layer": "behind"` becomes a holdout insert. Each frame is drawn
  twice on the page: the clip, then the subject alone where the program draws it over the clip,
  which is erased from the first (alpha × (1 − subject alpha), colours kept). Laid over the
  footage, the clip sits behind the speaker exactly as in the program render. The cut list maps
  every frame, handles included, to its source frame, so the holdout follows the speaker across
  cuts.

Each manifest entry adds to the fields of a clip render: `handles` (`before`, `after`), `clip`
(the clip's own `startFrame` and `frames`), `layer`, `slot`, `holdout`, `sources` (the cut list
under the file: program frames `startFrame` to `startFrame + frames` show source frames `srcIn`
to `srcOut` of `source`, at the project rate; a piece with `"hold": true` is a cut's hold and
shows source frame `srcIn` throughout) and `notes`. The manifest itself adds
`"export": "inserts"` and the program's `frames`.

Not in inserts: the cut list itself (the editor has the rough cut), shots (the framing of the
footage, fills, a window's ring, a dimmed room, the footage's motion blur), cut and shot
transitions, a clip's own `transition`, the program's sound and a clip's `audio`. They stay in
the program render (`--export video`). `check --export inserts` lists, as `info`, where a
program relies on them: clips that arrive or leave with a cut or shot transition (the insert
cuts in or out), clips with their own transition, clips in a slot of a shot that reframes the
footage (`punch`, `strip`, `window`, `whip`, a shot with keys or `away`; such an insert lines up with the
program's framing, so frame the footage like the shot or use the program render), behind clips
under such a shot, behind clips inside a cut or shot transition window, and clips with `audio`;
as a `warning`, `"alpha": false` on a behind clip. `render` prints the same notes and writes
them into the manifest. A render that was killed leaves its partial encode
(`.<clip>.partial-<pid>.mov`); the next render into that folder removes it.

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
