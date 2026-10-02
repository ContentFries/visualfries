---
title: Footage, mattes and speaker depth
description: Draw the source video inside a motion block, cut the speaker out with a matte, and put type, light or a copy of the speaker between the room and the speaker. Frame-accurate, cached, with the clip's sound.
updated: 2026-10-02
---

A motion project can declare **footage**: a video the blocks draw frame by frame, usually the talking head the transcript belongs to. With a **matte** (a greyscale video of the same footage, white = subject) a block can also draw the subject alone, so anything placed between the two layers ends up **behind the speaker**.

The [speaker-depth demo](https://github.com/ContentFries/visualfries/tree/main/static/demo/speaker-depth) uses this for type that slams in behind the head, a grey delayed copy of the speaker and a rim light that follows the speaker's outline.

## Declare footage

```json
{
	"size": [1080, 1920],
	"fps": 30,
	"transcript": "talk.transcript.json",
	"footage": {
		"talk": { "src": "talk.mp4", "matte": "talk.matte.mp4", "start": 0 }
	},
	"clips": [
		{ "id": "depth", "block": "blocks/Depth.svelte", "from": 0, "until": 17, "audio": "talk" }
	]
}
```

| Field    | Meaning                                                                                    |
| -------- | ------------------------------------------------------------------------------------------ |
| `src`    | The video, relative to the project file.                                                   |
| `matte`  | Optional greyscale video of the same footage; white = subject.                             |
| `start`  | Program seconds at which the footage's first frame plays. Default `0`.                     |
| `margin` | Seconds extracted before and after the clips. Default `2`; raise it for a larger `offset`. |

A clip's **`audio`** names a footage whose sound is muxed into the rendered clip, cut to the clip's program range.

## Draw it in a block

```svelte
<script>
	import { Footage, useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<Footage name="talk" layer="plate" class="fill" />
<h1 class="behind" style:opacity={clip.p('ai')}>AI</h1>
<Footage name="talk" layer="subject" class="fill" />
<Footage name="talk" layer="subject" offset={-0.4} class="ghost" />
```

`<Footage>` is an `<img>` that shows the footage frame playing at the current program frame. Size and place it with CSS, wrap it in elements for transforms, filters and masks.

| Prop             | Meaning                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`           | Footage name from the project.                                                                                                                                                            |
| `layer`          | `plate`: the original picture. `subject`: only the subject (needs a matte).                                                                                                               |
| `offset`         | Seconds; negative shows an earlier frame (a delayed echo). Before the footage starts and after it ends the nearest frame holds; an offset larger than the footage's `margin` is an error. |
| `class`, `style` | Passed to the `<img>`.                                                                                                                                                                    |

`clip.footage.talk` has the footage's `width` and `height` for layout. Frames are loaded before each frame is captured, so stills, checks and renders are frame-accurate in any order.

The first command that needs frames extracts the range the clips use (plus two seconds on each side) into `.visualfries/footage/` next to the project, as JPEG plates and PNG cut-outs, and reuses them until the video, matte, frame rate or range changes. Add `.visualfries/` to `.gitignore`.

## Make a matte

```bash
FAL_KEY=… npx visualfries matte talk.mp4 --output talk.matte.mp4
npx visualfries matte talk.mp4 --output talk.matte.mp4 --command "rvm --in {input} --out {output}"
```

[`visualfries matte`](/docs/cli#matte) does the bookkeeping every segmentation model needs: it splits the video into pieces the model accepts, checks each mask's frame count, scales and joins the masks, and verifies the result is frame-exact. Who segments is a **provider**: BiRefNet v2 on fal.ai by default (model `Matting` keeps hair and microphones; a 17-second 1000×1080 clip takes one to three minutes), or any local tool through `--command`. The input must have a constant frame rate; convert a variable-frame-rate recording first.

A provider is a small object, so another API or model plugs in without touching the rest:

```ts
import { createSubjectMatte, type MatteProvider } from 'visualfries/motion/matte';

const myModel: MatteProvider = {
	name: 'my segmenter',
	maxFrames: 900, // longest piece it accepts
	parallel: 2, // pieces at once
	output: 'luma', // or 'alpha' for a video with transparency
	async segment({ input, output, frames, fps, width, height }) {
		// read the piece at `input`, write its mask video to `output`
	}
};

await createSubjectMatte('talk.mp4', { output: 'talk.matte.mp4', provider: myModel });
```

A matte made anywhere else works too, as long as it has the same size, frame rate and frame count as the video.

## Speaker depth, step by step

1. **Pick a stretch without cutaways.** A matte of a screen recording or B-roll is meaningless.
2. **Crop wider than 9:16** (e.g. 1000×1080 from 1920×1080) so the shoulders touch the left and right edges: the cut-out then never shows a hard edge, and placing the footage at the bottom of a 1080×1920 frame leaves room above the head.
3. **Make the matte** with `visualfries matte`.
4. **Name beats after words** in `cues` and animate on them (`useTimeline` with `at('huge')`).
5. **Overlap the head.** Type placed above the head reads as an ordinary title; let the head cover part of each word. Long words read across the head (`NA…CH`), two-letter words need very large type.
6. **Check stills at every cue** (`visualfries still`), then render.

## Rules

- The subject layer is only as good as the matte: hands moving fast, hair against a busy background and a microphone in front of the face are the usual problems. Look at a still at every cue.
- Draw footage only through `<Footage>`. A `<video>` element plays on wall-clock time and gives different frames per render.
- Filters on the subject (`drop-shadow`, `blur`) follow the matte's outline; that is how the rim light in the demo works.
