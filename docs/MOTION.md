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
	"styles": ["theme/film.css"],
	"background": "#17120e",
	"clips": [
		{
			"id": "B-word-timestamps",
			"block": "blocks/WordStamps.svelte",
			"from": "jediné čo potrebuje",
			"until": "videa vyhodiť",
			"cues": { "stamps": "časové", "extra": "naviac", "duplicate": "duplicitné" },
			"words": { "row": "ktoré sú naviac ktoré sú duplicitné", "extra": "naviac" },
			"props": { "title": "Prepis po slovách" }
		}
	]
}
```

- **`from` / `until`** place the clip in the program. A phrase anchors to its first word
  (`from`) or its last word's end (`until`). Also: program seconds (`12.5`), `{ "frame": 274 }`,
  or `{ "say": "…", "edge": "start"|"last"|"end", "occurrence": 2, "offset": -0.1 }`
  (`last` = when the phrase's last word starts).
- **`cues`** are named moments inside the clip. Phrases are searched only inside the clip;
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

`at` uses the same grammar everywhere (blocks and `still --at`): a cue (`'extra'`), a cue
edge (`'extra.end'`), a cue with offset (`'extra+0.4'`, `'extra.end-0.2'`), `'2.5s'`, `'f120'`,
`'mid'`, or clip-local seconds as a number. `start` and `end` always exist, so an exit written
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

`start` is the program second at which the footage's first frame plays; `offset` shifts a layer
in seconds. A clip's `audio` muxes that footage's sound into the rendered clip. Frames are
extracted once into `.visualfries/footage/` (JPEG plates, PNG cut-outs) and loaded before each
frame is captured, so footage is frame-accurate in any seek order.

`visualfries matte talk.mp4 --output talk.matte.mp4` makes the matte: BiRefNet v2 on fal.ai
(`FAL_KEY`) by default, or any local tool with `--command "tool {input} {output}"`, or any
`MatteProvider` in Node. It splits, checks and joins the pieces frame-exact. Worked example:
`static/demo/speaker-depth`.

## CLI

```bash
visualfries clips video.vf.json                    # resolved times, cues, bound words, errors
visualfries check video.vf.json [--determinism]    # run every block without rendering (seconds)
visualfries still video.vf.json --clip B --output b.png            # sheet: start, every cue, end
visualfries still video.vf.json --clip B --at extra --at extra.end+0.5 --output b.png
visualfries render video.vf.json --output out/ [--clip B] [--jobs 6]   # MP4 / MOV + manifest.json
visualfries clips video.vf.json --transcript retake.json         # re-time against a new voiceover
visualfries matte talk.mp4 --output talk.matte.mp4               # subject matte (fal.ai or --command)
```

`check` mounts every block and runs it across the clip: unknown cues, bad eases, maps that go
back in time, CSS animations running on wall-clock time, and with `--determinism` frames
that differ between seek orders. Run it after every edit; it takes seconds.

`manifest.json` lists every clip's program start frame for placing it on an NLE timeline and
the transcript it was timed against. Re-rendering some clips keeps the others; clips timed
against an older transcript are marked `stale`.

A re-take that changes words (not just timing) makes the affected cues fail with a suggestion,
e.g. `"naviac" not found … Did you mean "navyše" at 59.80s?`. Update the phrase in the JSON;
the block stays untouched.

## How frames are made

The page renders the block into a `<canvas layoutsubtree>` and captures it with
HTML-in-Canvas (`drawElementImage`, Chromium flag `CanvasDrawElement`). Without it the
stage falls back to DOM screenshots. Each frame: set time → flush Svelte → seek GSAP
timelines → run `useFrame` callbacks and wait for the promises they return (footage frames)
→ force a fresh raster → wait for the paint (an error after 2 s, never a silent timeout) →
capture. The page loads the bundle, fonts and footage from one origin served from disk, because
HTML-in-Canvas leaves cross-origin images out of the capture. Any frame can be rendered in any order with
identical pixels; `render` splits clips into ranges across pages.
