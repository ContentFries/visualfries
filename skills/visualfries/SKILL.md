---
name: visualfries
description: Edit raw talking-head takes into finished reels as one VisualFries program (cut list, shots, transitions, captions, sound effects, music, -14 LUFS mix), build transcript- and beat-timed motion projects (inserts, speaker-depth edits with type behind a talking head, edits cut to music beats), and, as a legacy path, create and validate scene JSON for captions and overlays without the ContentFries UI.
---

# VisualFries

VisualFries renders video from a JSON project and Svelte blocks, timed to the words of a transcript. Pick the path that matches the request before doing anything else:

| The user wants | Path | Read |
| --- | --- | --- |
| A raw recording edited into a finished video (cut the pauses and retakes, frame the speaker, captions, transitions, sound, music) | **Program**: one `.vf.json` with `cuts` and `shots` | "Reels from raw takes (programs)" below, then `docs/MOTION.md` → "Programs" |
| Inserts, overlays, title cards or explainers timed to a voiceover; words behind a talking head; edits cut to music | **Motion project**: a `.vf.json` with clips | "Speaker Depth", "Music-driven edits", "Motion primitives" and "Brand" below, `docs/MOTION.md` |
| Captions on a video through scene JSON, or a scene for the ContentFries editor | **Scene JSON (legacy)** | "Legacy: scene JSON" at the end |

Programs and motion projects are the current path for new work. The scene-JSON path (`compose`, `produce`, `caption-scene`, cue files) still works, but do not choose it for a new reel unless the user asks for scene JSON or a ContentFries scene.

The same guides are on the site: https://visualfries.com/docs/programs.md, https://visualfries.com/docs/shots-and-transitions.md and https://visualfries.com/docs/program-sound.md.

## Reels from raw takes (programs)

Use a **program** (a motion project with `cuts` and `shots`) when the input is a raw recording
and the output is the finished video: the cut list removes pauses and retakes, shots frame the
speaker (punch, strip, window, behind, whip), clips fill the shots' slots, transitions and sound
effects land on words, music ends on a bar, all in one `.vf.json`. Guide: `docs/MOTION.md` →
"Programs" (read it before building). Worked example: [`static/demo/reel`](https://github.com/ContentFries/visualfries/tree/main/static/demo/reel) in the
VisualFries repository (README, project, blocks, fonts, sample transcript); it is not in the npm
package, so fetch it from GitHub.

Decisions that depend on the footage (framing and headroom, window aspect, strip size, text
placement against the face, caption size) are made per video by looking at stills of every
shot. Defaults are a starting point and `check` warnings are hints; you decide. Example: a close
handheld selfie whose face fills half the frame needs `"headroom": 0.06`, a taller window
(`"aspect": "4:5"`) or a bigger strip `size`; footage where the face is small needs none of it.

Work like an editor, in this order; each step ends on its criterion:

1. **Brief.** What the reel is for, its platform and formats, the brand. If the creator gave no
   direction, propose two or three, each with one signature idea taken from the words (a number
   becomes a giant numeral, a list becomes a ticking checklist). Done when one direction is
   chosen.
2. **Plan.** Prepare the take as the guide's step 1 says: a constant-frame-rate copy of the
   whole take (`ffmpeg -i take.mov -vf fps=30 … talk.mp4`, which `matte` needs) and its matte
   (`visualfries matte talk.mp4 --output talk.matte.mp4 --provider rvm`) when anything goes
   behind the speaker. Transcribe the take, read every word, and write the outline: the ranges you keep
   (whole sentences; the best try of a repeated one), then per section the shot, the move on its
   key word, the transition into it and its sound. Done when every second of the kept speech has
   a planned frame and no stretch holds a still frame longer than about two seconds.
3. **Build.** Cut list first (`visualfries program` until every cut resolves), then shots, then
   clips, captions, `sfx`, music. Every timing is a phrase, never source seconds. Start from the
   blocks of the worked example; write a new block only for a look they cannot give.
4. **Check.** Run `visualfries program <project>` and `visualfries check <project>
--determinism`. Done when `program` prints no error, you can say why each warning is
   acceptable, and `check` reports every segment as passing.
5. **Framing.** Before the final render, look at a still of every shot, at its middle and its
   end, where its keys have moved the camera furthest
   (`visualfries still <project> --at 7.5s --at 9s --output framing.png`). Judge the framing for
   this footage: is the whole head in, is there a little room above it, does the face read at the
   window's size? Fix a cut head with the shot's params (`headroom`, `aspect` on a window, `size`
   on a strip) rather than `y` keys, and keep keys for motion. `check` warns where a shot cuts the
   head, at the top or the face below (shot, time range, how much, what to try); treat it as a
   hint and decide from the still, since a tight crop can be the creator's choice. Done when every
   shot frames the speaker the way you would defend.
6. **Frames.** Stills of every cut, the first, middle and last frame of every transition window,
   every event and every shot move, about ten moments per `still` call. `check` warns where a
   clip's text covers the speaker's face for half a second or more (clip, block, first time, share
   of the face, the side of the frame clear of the head); add a still at each time it names and
   decide there: move the text to the free side, put it `"layer": "behind"`, or give it a slot
   beside a `strip` or `window`. It only sees text the page lays out, so look at every frame
   anyway. Done when you have looked
   at each one and can answer for each: no text over a face, no text cut by the frame, accents and
   descenders whole, no empty slot, no flash of a bright colour longer than a few frames, no frame
   standing still.
7. **Fix.** Change the project or a block, then repeat from 4 for what changed. Done when a
   fresh pass of 4, 5 and 6 over everything the change touched finds nothing to fix.
8. **Render.** `visualfries render <project> --output out/` (and `--format WxH` for other
   formats). Done when the video plays to its last frame, a contact sheet of it shows what the
   stills showed, and the hand-over names the render time, the segments drawn and cached, the
   delivered loudness and the cut points the creator should listen to.
   When the creator finishes the edit in an editor, add `--export inserts` (one transparent file
   per clip, 10-frame handles, `manifest.json` with program and source frames; `check
--export inserts` lists what stays in the program render).
   Teasers of the same video are `excerpts` of the program, never a hand-cut copy of it (see
   below); render each with `--excerpt <id>`.

Traps the guide explains: a phrase in `until` means the end of its last word, so music or a clip
meant to stop dead on a word needs `{ "say": "…", "edge": "start" }`; a few frames between two
shots squeeze a move into them; a slotted clip should last until the next shot's move ends; shots
have events but no sound yet, so their effects are `sfx` items on the shot's anchor plus half its
move.

Program tools for common needs:

- Picture after the last word: `"hold": 1.7` on the cut freezes its last frame, silent, while
  effects and music play on. No extra muted cut, no frame offsets in a block.
- Running to the end: `"until": "end"` on clips, shots and music; `{ "program": "end", "offset":
-1 }` for a moment before it. Never `until: 99`.
- A teaser (9:16, 4:5) from the long video: add an excerpt to the same project,
  `"excerpts": [{ "id": "teaser1", "from": 0, "until": { "say": "…", "edge": "end", "offset":
0.15 }, "format": "1080x1920", "end": { "duration": 3, "props": { "lines": ["Full video", "on
YouTube"], "handle": "@channel" }, "sound": "sfx/slam.wav" } }]`. The whole program resolves
  first and is then sliced, so phrases, `until` and repeated phrases resolve as in the full video;
  never copy the project and cut its cuts, shots, clips and sfx by hand. Items cut by an edge keep
  their own time (a clip or move plays on mid-way), music fades at the edges and runs on under the
  end card, which plays over the held last frame (`@visualfries/end-card`, or any block in
  `end.block`). `program --excerpt teaser1` warns where an edge cuts a word, a shot's move or a
  transition window; move the edge rather than accept it. Then `check --excerpt`, stills with
  `still --excerpt` (blocks written in fixed 16:9 pixels show here), `render --excerpt` →
  `<project>.teaser1.mp4`. One excerpt is one range. Guide: `docs/MOTION.md` → "Excerpts".
- A sound on a moment a block computes: declare it in the block,
  `<script module> export const events = { land: 'tail+0.98' };</script>`, read it there with
  `clip.at(events.land)`, and anchor the `sfx` on `{ "event": "land", "clip": "kick" }`.
- Edit points: where the footage has sound, `program` measures the voice at every audio edit
  point and says how far to move a cut's `in` or `out`; listen to the ones it names.
- Gags on the speaker's body (the top of the head flying off, a hole through the body, a word
  passing through the head, the speaker shrinking away from the background): a subject layer,
  not a canvas compositor. Add `"clean": true` to the footage, then a clip
  `"block": "@visualfries/subject"` with a `region` (`{ "above": { "head": 0.3 } }` cuts at the
  forehead and follows the head) and placement keys to send the piece flying; the stage leaves a
  hole with the background in it (`"rim": { "opening": 0.2 }` for a cartoon open head). In a
  block, `<Subject region freeze hole x y rotation>` does the same, and `clip.picture()` gives
  footage frames for a canvas. Look at stills of the hole's first frames. Guide: `docs/MOTION.md`
  → "Subject layers".
- Images in blocks: keep every picture mounted and switch with `opacity`; never swap `src` per
  frame (it decodes late and fails `check --determinism`).
- A picture per clip (a screenshot, a photo) goes in `props` as a project file, not as an import:
  `"props": { "shot": { "file": "assets/web/home.png" } }`, and the block reads a URL:
  `<img src={clip.props.shot} alt="" />`. The path is relative to the project and must stay
  inside its folder; a missing file is an error of the clip that names the path. A single-key
  `{ "file" }` is reserved for this; a URL stays a plain string. No generated image modules.
- A phrase said twice: write shots, clips and `sfx` in the order they play (never grouped by
  kind). A repeated phrase in their `from` (sfx `at`) resolves to the first occurrence that
  starts or lands at or after the previous item of the same kind, in `until` to the first at or
  after the item's start. `program` and `check` print every
  pick as an `info` line with the other occurrences: read them, and pin a wrong one with
  `{ "say": …, "occurrence": n }`. Cues, keys and cut points stay strict.
- Brand `extra` colour names are kebab case (`wood-dark`).

## Speaker Depth (type behind a talking head)

Use a **motion project** (`docs/MOTION.md`), not scene JSON, when the user wants words, light or effects behind the speaker, a cut-out speaker, or a copy of the speaker on screen. Worked example: [`static/demo/speaker-depth`](https://github.com/ContentFries/visualfries/tree/main/static/demo/speaker-depth) in the VisualFries repository (README, project, block, fonts); it is not in the npm package, so fetch it from GitHub.

```text
recording -> crop -> visualfries matte -> transcript -> project.vf.json (footage + cues) -> block -> still sheet -> render
```

Start with the built-in block `"block": "@visualfries/speaker-depth"`: the words behind the head, the echo, the mood change and the captions are all props (see the Footage docs page and `static/demo/speaker-depth/template.vf.json`). Write your own block only for a look the props cannot express; then use `clip.subject('talk')` to place things relative to the speaker and `<Captions>` for captions.

1. Find a stretch with only the talking head (no screen recordings or cutaways); scene detection with ffmpeg helps (`select='gt(scene,0.25)'`).
2. Crop wider than 9:16 so the shoulders touch the left and right edges (e.g. `crop=1000:1080:x:0` from 1920×1080, face centred). Keep the sound.
3. `FAL_KEY=… visualfries matte talk.mp4 --output talk.matte.mp4` (BiRefNet v2, model `Matting`), or a local segmentation tool with `--command "tool --in {input} --out {output}"` (`--command-output alpha` if it writes transparency). Look at one frame of the matte over a solid colour before going on.
4. Transcript in seconds from the clip's first frame. Declare `"footage": { "talk": { "src": "talk.mp4", "matte": "talk.matte.mp4" } }` and the clip's `"audio": "talk"`.
5. Name each beat after its word in `cues` (`{ "say": "AI", "occurrence": 2 }` for repeats, `"edge": "last"` for the last word of a phrase). Run `visualfries clips` and fix every cue that resolves to the wrong word.
6. Block layers, back to front: backdrop → type layer → camera wrapper with `<Footage layer="plate">` (fade it out or keep it), optional `<Footage layer="subject" offset={-0.4}>` ghost, `<Footage layer="subject">` → captions on top.
7. Put behind-the-head words low enough that the head covers part of them; words fully above the head look like plain titles. Fit the frame width (scale font-size to the word length).
8. `visualfries check --determinism`, then `visualfries still … --output sheet.png` (start, every cue, end) and look at it: words clipped by the frame edge, unreadable words, matte errors around hands and microphone.
9. `visualfries render project.vf.json --output out/` → `out/<clip>.mp4` with sound (or `--clip <id> --output reel.mp4` for one file).

For outlined or hollow text in a block, use `use:outline={{ width, color, mode }}` from `visualfries/motion`, never `-webkit-text-stroke` alone: with variable fonts and many serifs a stroke draws the letters' inner contours.

Never use a `<video>` element in a block: it plays on wall-clock time. Animate on cues (`useTimeline` + `at('cue')`), keep randomness frame-keyed (`noise(frame, n)`).

## Music-driven edits (beats)

Time motion-project clips to a music track like to words (`docs/MOTION.md`, "Music and beats"):

1. `visualfries beats music.mp3` once → `music.beats.json` (beat_this, an optional install: `VISUALFRIES_BEAT_THIS=<venv>/bin/beat_this`; or `--command "tool {input} {output}"`). Never re-analyse at render time.
2. Declare `"music": [{ "src": "music.mp3", "beats": "music.beats.json" }]`.
3. Anchor with `{ "bar": 5 }`, `{ "beat": 17 }`, `{ "bar": 5, "beat": 3 }`, `{ "downbeat": "after", "at": "the drop" }`, `"offset": "-1b"`; in blocks `'bar 5'`, `'downbeat > extra'`, `'extra.end - 1b'` and `clip.pulse()` (0 on each beat → 1) for on-beat motion.
4. Run `visualfries check` and read the bar grid before anything else. If the BPM column is twice (or half) the tempo of the music, set `"tempo": "half"` (or `"double"`) on the music item; if bars start on the wrong hit, `"downbeat": n`; a constant offset, `"shift": seconds`. Never edit the beats file to fix this.

## Motion primitives in blocks

In a motion block, give elements named moves with one line instead of writing GSAP:

```svelte
<script>
	import { motion } from 'visualfries/motion';
</script>

<h1 use:motion={{ enter: 'pop', at: 'title', exit: 'fade', emphasis: 'punch' }}>…</h1>
<p use:motion={{ enter: 'rise', split: 'words', at: 'list' }}>…</p>
<span use:motion={{ count: 12400, at: 'stat' }}>0</span>
```

- Entrances (exits mirror them): `fade`, `pop`, `slide`, `scale`, `rise`, `drop`, `reveal`, `blur-in`, `spring`, `typewriter`, `draw` (SVG strokes). Emphasis: `pulse`, `shake`, `wiggle`, `punch`, `highlight`, `underline`, `strike`, `glow`. Options: `at`, `until`, `duration`, `direction`, `split: words|chars|lines`, `stagger`, `intensity`, `count`, `color`.
- Defaults scale with the clip's energy: `"props": { "energy": "calm" | "balanced" | "punchy" }` (other values are ignored), else the project style's energy (`"style": "kinetic"` → punchy), else `balanced`.
- `use:motion` owns transform (and transform-box/-origin), opacity, filter, clip-path, visibility, display, stroke-dash\* and background-\*/box-decoration-break of its element: do not animate those from markup or `useTimeline` on the same element; nest a wrapper instead. Keep moving elements mounted (no `{#if}`).
- Every move records events (`pop`, `slam`, `whoosh`, `type`, `tick` …) in `clip.events()` for sound effects; add your own with `clip.event(name, at)`.
- Run `visualfries check --determinism` after adding motion. Example: `static/demo/motion`; reference: the Motion primitives docs page.

## Brand, style and safe zones (motion projects)

- `"brand": "brand.json"` (colours `primary accent background surface text muted` + `extra`, fonts `heading body mono` with files, optional logo and `radius`). In blocks use the tokens, never literal colours or font names: `var(--brand-accent)`, `var(--brand-font-heading)`, `var(--brand-radius)`, `var(--brand-on-accent)` for text on the accent, or `clip.brand` in JS. Built-in blocks and `<Captions>` follow the brand on their own. `check` warns about hard-coded colours in custom blocks of a branded project.
- `"style": "kinetic"` (built-ins `solid glass clean editorial kinetic depth brutal`), a style file, or inline `{ "extends": "styles/mine.json", "energy": "calm" }` for per-project overrides. Read `clip.style.energy` (`calm | balanced | punchy`) to scale durations and overshoot. Global CSS files go in `"css": ["theme.css"]` (old name `styles`, still read).
- Keep text, logos and captions inside the safe insets: `var(--safe-top|right|bottom|left)` (all platforms by default, `"safeZone": "tiktok"` for one), `clip.format.class` (`landscape | square | portrait`) for layout. On 9:16 faces and titles may use `--safe-right-upper` above `--safe-notch-y`.
- `render` writes the brand and style hashes into `manifest.json`. Details: `docs/MOTION.md` → Brand, style and format.

## Legacy: scene JSON

The older path: typed scene JSON (`scene.json`) rendered by the scene renderer. Use it only when the user asks for scene JSON, caption-only work through `compose`/`caption-scene`, or a scene for the ContentFries editor. For a reel from a raw take, use a program instead.

Use this path when the user asks to:

- add captions/subtitles to a video through scene JSON without the ContentFries UI
- build a VisualFries scene from assets and a transcript
- create reusable overlays, text effects, b-roll layouts, or short-form scene JSON
- validate or inspect VisualFries scene JSON before sending it to a renderer

### Mental Model

VisualFries uses typed scene JSON as its authoring format:

```text
scene
  settings
  assets
  layers
    components
      VIDEO / IMAGE / TEXT / SHAPE / AUDIO / SUBTITLES
```

Agent rule:

```text
video/transcript/assets -> scene.json -> validate -> inspect -> render
```

Do not require the user to open ContentFries UI for captioning or scene creation.

For authored short-form edits with named beats, exact multi-track audio, source trims, freeze holds, proof cards, and timeline QA, use a production plan instead of raw component JSON:

```bash
visualfries produce ./production-plan.json \
  --scene-output ./scene.json \
  --generated-assets ./generated \
  --qa-output ./qa \
  --output ./final.mp4
```

`produce` is the preferred path for authored, production-ready edits. It compiles editable plan text into deterministic SVG overlays, extracts freeze frames, segments rendering at timeline event boundaries, mixes audio, writes exact QA frames, and enforces the declared leading-silence limit.

### First Commands

From a project with `visualfries` installed:

```bash
visualfries --help
visualfries doctor --json
visualfries catalog --json
visualfries validate-cues ./cues.json --duration 45 --json
visualfries validate scene.json
visualfries inspect scene.json --json
```

Create a caption scene:

```bash
visualfries compose \
  --video ./input.mp4 \
  --transcript ./captions.srt \
  --cue-preset hidden-engine-dynamic \
  --cues ./cues.json \
  --scene-output ./scene.json \
  --qa-output ./qa/frames \
  --output ./out.mp4
```

Or step-by-step:

```bash
visualfries init ./video-package \
  --video ./input.mp4 \
  --transcript ./captions.srt \
  --preset hidden-engine-center \
  --cue-preset hidden-engine-dynamic

visualfries caption-scene \
  --video ./input.mp4 \
  --transcript ./captions.srt \
  --preset hidden-engine-center \
  --output ./scene.json

visualfries preset-cues \
  --duration 45 \
  --preset hidden-engine-dynamic \
  --output ./cues.json

visualfries apply-cues ./scene.json \
  --cues ./cues.json \
  --output ./scene.with-cues.json
```

Then:

```bash
visualfries validate ./scene.json
visualfries inspect ./scene.json --json
visualfries qa ./scene.json --output ./qa
visualfries render ./scene.json --output ./qa-frames --frames-only --to-frame 3
visualfries render ./scene.json --render-mode preview --output ./preview.mp4
```

Important: browser media rendering is preview/QA only for scenes with `VIDEO` or `GIF` components. Final VIDEO/GIF output uses the local deterministic renderer path, which predecodes active media ranges into exact frame images before browser composition. Use `--render-mode preview` only for QA or rough checks.

For final contiguous MP4 renders after QA, prefer:

```bash
visualfries render ./scene.json --stream-encode --image-format jpg --output ./out.mp4
```

For static-heavy scenes after QA:

```bash
visualfries render ./scene.json --output ./out.mp4 --skip-duplicates
```

Contiguous renders use the browser-side `renderFrameRange()` path. Sparse QA screenshots still use direct sampled frame rendering.

Preferred full agent path:

```text
production plan -> produce   (authored edit)
compose                       (caption-first video)
```

Debug path:

```text
caption-scene -> preset-cues -> edit cues -> apply-cues -> qa -> render
```

### Caption Workflow

Inputs:

- video file or URL
- transcript JSON with one of:
  - `segments: [{ text, start, end, words }]`
  - `subtitles: [{ text, start_at, end_at, words }]`
  - `words: [{ text, start, end }]`
- or a plain subtitle file:
  - `.srt`
  - `.vtt`

Recommended presets:

- `hidden-engine-center` for Hidden Engine short videos with middle captions
- `reels-center` for default high-energy vertical captions
- `reels-lower` when the middle must stay clean
- `podcast-clean` for calmer interview clips

Caption constraints:

- Keep subtitles away from important faces, product UI, and proof overlays.
- For videos that will get ContentFries-style overlays, prefer center captions only if the overlay is top/bottom.
- Validate and inspect after generating the scene.

### Scene Rules

- All media components must reference assets with stable `assetId`.
- SUBTITLES must have `timingAnchor.assetId` matching `scene.settings.subtitles.data[assetId]`.
- Higher layer `order` renders above lower layers.
- Use `SceneShape` validation, never raw unvalidated JSON.
- For Node agents, prefer the agent-only subpath so Svelte/browser exports are not loaded:

```ts
import { createCaptionScene, inspectScene, normalizeTranscript } from 'visualfries/agent';
```

- Composer helpers are useful inside app/runtime code, but CLI and automation should stay on `visualfries/agent` unless they explicitly need full VisualFries UI/runtime exports.

### Overlay Workflow

For Hidden Engine / short-form reaction overlays, use cue files or timed overlay helpers instead of hand-building TEXT components:

```json
{
	"broll": [
		{ "url": "./assets/profile-scroll.mp4", "start": 2, "end": 5, "type": "VIDEO" },
		{ "url": "./assets/chart.png", "start": 5, "end": 7, "type": "IMAGE", "motion": "slow-zoom-in" }
	],
	"overlays": [
		{ "text": "LOVE THIS 😍", "start": 0.4, "end": 1.1, "style": "hook-punch" },
		{ "text": "NECK 🤯", "start": 1.1, "end": 1.7, "style": "shock-word" }
	],
	"transitions": [
		{ "time": 2, "style": "dip-to-black" },
		{ "time": 5, "style": "swipe-left", "color": "#04483D" }
	]
}
```

Apply it:

```bash
visualfries apply-cues ./scene.json --cues ./cues.json --output ./scene.with-cues.json
```

Relative b-roll URLs resolve relative to the cue file.

If the agent is starting from scratch, create a cue skeleton first:

```bash
visualfries preset-cues --duration 45 --preset hidden-engine-dynamic --output ./cues.json
```

Starter presets:

- `hidden-engine-dynamic`: 40-60s story-driven shorts with hook/proof/mechanism/choice/CTA overlay beats.
- `captioned-clean`: caption-first videos with minimal transitions.

For Node automations:

```ts
import {
	addAgentBrollSequence,
	addAgentTextOverlays,
	addAgentTransitions
} from 'visualfries/agent';

const sceneWithOverlays = addAgentTextOverlays({
	scene,
	overlays: [
		{ text: 'LOVE THIS 😍', start: 0.4, end: 1.1, style: 'pop-label' },
		{ text: 'NECK 🤯', start: 1.1, end: 1.7, style: 'shock-word' }
	]
});

const sceneWithBroll = addAgentBrollSequence({
	scene,
	cues: [
		{ url: './broll/profile.mp4', start: 2.0, end: 5.0, type: 'VIDEO' },
		{ url: './broll/chart.png', start: 5.0, end: 7.0, type: 'IMAGE', motion: 'slow-zoom-in' }
	]
});

const sceneWithTransitions = addAgentTransitions({
	scene,
	transitions: [
		{ time: 2.0, style: 'dip-to-black' },
		{ time: 5.0, style: 'swipe-left', color: '#04483D' }
	]
});
```

Available initial styles:

- `pop-label`: reaction label with fast pop animation.
- `shock-word`: large high-emphasis keyword reveal.
- `soft-card`: calmer context/proof card.
- `hook-punch`: loud yellow hook label for the first second.
- `proof-pill`: compact proof/credibility pill.
- `metric-badge`: big number/proof badge.
- `danger-crossout`: wrong-path or negative-beat callout.
- `cta-card`: final question/choice card.

Rules:

- One overlay idea per beat.
- Prefer 0.4-1.4 second overlay durations.
- Keep the caption lane clear. If captions sit in the middle, place overlays top/bottom or time them between caption-heavy beats.
- Render `--frames-only --to-frame 3` before encoding when a new overlay style or position is used.

For b-roll, use `addAgentBrollSequence` instead of manually creating media layers. It defaults to layer order `5`, which keeps it below captions and overlays.

B-roll image cues default to subtle `slow-zoom-in`. Available motion values: `none`, `slow-zoom-in`, `slow-zoom-out`, `drift-up`.

For transitions, use `addAgentTransitions` instead of manually creating SHAPE covers. It defaults to layer order `95`, so short transition covers can hide hard cuts. Available styles: `dip-to-black`, `flash`, `swipe-left`, `swipe-up`, `focus-pull`.

### Render Workflow

Use `visualfries render` after validation:

```bash
visualfries render scene.json --output out.mp4
```

For fast QA:

```bash
visualfries doctor --json
visualfries qa scene.json --output ./qa
visualfries render scene.json --output ./qa-frames --frames-only --to-frame 3
```

Renderer requirements:

- `ffmpeg` must be available on `PATH` for MP4 output.
- `vite`, `@sveltejs/vite-plugin-svelte`, and `playwright` must be resolvable. In agent environments, set `VISUALFRIES_NODE_MODULES=/path/to/node_modules` when Playwright is provided by a shared runtime.
- Local media files are copied into a temporary render root and served over the local Vite server so browser rendering does not depend on `file://` access.
- Audio is mapped from the first local VIDEO asset by default. Use `--audio none` for silent output or `--audio ./voiceover.wav` to override.

Run `visualfries doctor --json` before the first render in a new agent environment. It checks ffmpeg, Vite, Svelte Vite plugin, Playwright, Chromium executable resolution, and the temp directory.

Run `visualfries catalog --json` when an agent needs valid values for caption presets, cue presets, overlay styles, b-roll motions, transitions, transcript formats, or supported CLI commands.

Run `visualfries validate-cues ./cues.json --duration <seconds> --json` before applying hand-edited cues. It catches unknown overlay styles, b-roll motions, transition styles, invalid time ranges, and cues outside the scene duration.

Use `visualfries qa scene.json --output ./qa` as the normal agent quality gate. It writes `inspect.json`, `screenshots.json`, and sampled `frames/` into one QA directory.

### Agent Output Contract

For any generated VisualFries video package, produce:

```text
scene.json
cues.json
assets/
qa/
  inspect.json
  frames/
out.mp4
notes.md
```

For caption-only work, `scene.json` plus `inspect.json` is acceptable only when the user explicitly does not need a rendered asset yet.

## Current Coverage

The CLI covers programs (cut lists over raw takes, shots, transitions, keys, program sound with effects, music snapped to bars and a -14 LUFS mix, segment-cached rendering in any format, inserts for an editor), transcript- and beat-timed motion projects with footage and subject mattes, and the legacy scene-JSON path: JSON creation, validation, inspection, production plans, freeze holds, deterministic SVG overlays, exact audio tracks, QA frames, captions, b-roll, transitions, cue files, and one-command compose/produce.
