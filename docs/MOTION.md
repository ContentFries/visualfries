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
`.visualfries/`; `visualfries cache <project>` shows its size and `--clear` drops the footage frames.

`start` is the program second at which the footage's first frame plays; `offset` shifts a layer
in seconds. A clip's `audio` muxes that footage's sound into the rendered clip. Frames are
extracted once into `.visualfries/footage/` (JPEG plates, PNG cut-outs) and loaded before each
frame is captured, so footage is frame-accurate in any seek order.

`visualfries matte talk.mp4 --output talk.matte.mp4` makes the matte: BiRefNet v2 on fal.ai
(`FAL_KEY`) by default; `--provider rvm` runs RobustVideoMatting locally on the CPU with no key
(needs `uv`; about 3 fps at 1080p on 12 cores); any local tool works with
`--command "tool {input} {output}"`, and any `MatteProvider` in Node. It splits, checks and joins the pieces frame-exact. Worked example:
`static/demo/speaker-depth`.

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
after the music's `until` or a missing beats file is an error that names the valid range,
never a silent guess. With several music items with beats, give each an `id` and pick one per
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

**The music item:** `src`, `beats`, `from` (program second at which the music file starts,
default 0) and `until` (program second at which it stops; later beats do not exist). For now
music only times things: render does not mix it into the clips yet.

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

A re-take that changes words (not just timing) makes the affected cues fail with a suggestion,
e.g. `"extra" not found … Did you mean "spare" at 59.80s?`. Update the phrase in the JSON;
the block stays untouched.

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
