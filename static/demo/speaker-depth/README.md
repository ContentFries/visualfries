# speaker-depth — type behind the speaker

A 9:16 talking-head clip where the room falls away, words slam in **behind** the speaker's
head, a grey copy of the speaker plays "the editor without AI", the mood turns blue on
"far from" and "REPLACE" gets struck out. Every beat is a cue on a spoken word.

It works because the footage has a **matte** (white = speaker): the block draws the original
picture, then type and light, then the speaker cut out by the matte on top.

The video itself is not in the repository. Bring your own talking head and follow the steps;
`talk.transcript.json` is a sample 17-second script to show the format and the cues.

## 1. Cut the clip

Short-form clips work best when the speaker's shoulders touch the left and right edges of the
crop, so the cut-out never shows a hard edge, and the crop is wider than 9:16 so there is room
above the head for type. This example uses a 1000×1080 crop of a 1920×1080 recording:

```bash
ffmpeg -ss 503.45 -i recording.mp4 -t 17 -vf "crop=1000:1080:524:0" \
  -c:v libx264 -crf 14 -pix_fmt yuv420p -c:a aac -b:a 192k talk.mp4
```

Use a stretch without cutaways: a matte of a screen recording is meaningless.

## 2. Make the matte

```bash
export FAL_KEY=…        # https://fal.ai/dashboard/keys
npx visualfries matte talk.mp4 --output talk.matte.mp4
```

`matte` runs BiRefNet v2 on fal.ai (model `Matting`, good on hair and microphones), splits
long videos into ≤512-frame requests and checks that the matte has exactly as many frames as
the clip. A 17-second clip takes one to three minutes. Any greyscale video of the same size and
frame count works too (white = subject), e.g. from your own matting model.

## 3. Transcript

Word timestamps of `talk.mp4`, in seconds from its first frame
(`[{ "text", "start", "end" }]` or Soniox-style `{ "words": [{ "text", "startMs", "endMs" }] }`).

## 4. Point the cues at your words

`speaker-depth.vf.json` names each beat after the word it lands on (`ai`, `huge`, `far`,
`replace`, …). Change the phrases to words from your transcript; the block stays as it is.
Rename or remove words in `blocks/SpeakerDepth.svelte` to match what is said.

```bash
npx visualfries clips speaker-depth.vf.json      # every cue with its time and words
npx visualfries check speaker-depth.vf.json --determinism
npx visualfries still speaker-depth.vf.json --clip depth --output sheet.png   # start, every cue, end
npx visualfries render speaker-depth.vf.json --output out/                     # out/depth.mp4 with sound
```

The first command that loads frames extracts them into `.visualfries/footage/` (cached).

## How the block is built

- `<Footage name="talk" layer="plate">` draws the original picture; it fades and blurs away at
  the start while the camera pulls back from a full-frame crop to the studio framing.
- Type sits in a layer **between** the plate and `<Footage name="talk" layer="subject">`, so the
  head covers it. Put words low enough that the head overlaps them; above the head they read as
  ordinary titles.
- The ghost is `<Footage layer="subject" offset={-0.4}>`: the same speaker 0.4 s earlier,
  greyed and shifted.
- The rim light is a CSS `drop-shadow` on the subject; it follows the matte's outline.
- A paused GSAP timeline (`useTimeline`) animates elements and a plain state object; `useFrame`
  applies the state (camera transform, filters) every frame. Shake and grain use frame-keyed
  randomness, so any frame renders the same in any order.

Fonts: Anton and Inter, SIL Open Font License 1.1 (`fonts/OFL-*.txt`).
