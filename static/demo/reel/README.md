# reel — a talking-head reel from one raw take

A 9:16 short cut from a single 45-second phone take: the speaker tried one sentence three times,
paused between thoughts and turned the camera away at the end. One project file holds the whole
edit, and every timing in it is a spoken phrase, so a different take or a re-cut needs no other
change:

- a **cut list** over the raw take that keeps the third try of "AI cut the silences" and drops
  the pauses;
- **shots**: a quick pull-out on the first frame, a word **behind** the head ("AI", then
  "1 prompt") with a punch-in on "prompt", a **strip** with a checklist panel, a second behind word
  ("everything"), a slow drift and a **punch**, a **whip** to a full-screen card and back, and a
  **window** with a kinetic end card;
- **transitions with sound**: a `wipe` into the strip and a `push` across the cut away from the
  walk;
- **captions** low on the chest, left out while the checklist repeats the words;
- **sound effects** on every hit and a **music bed** that ends on a bar.

The media is not in the repository. Bring your own take and swap the phrases for yours;
`take.transcript.json` is a sample transcript of the raw take (three tries of one sentence
included) to show the format.

## Files you add

```
reel/
  talk.mp4              the raw take, constant frame rate
  talk.matte.mp4        its matte (white = speaker)
  take.transcript.json  its transcript, words with times (replace the sample)
  music/bed.mp3         a music bed, and music/bed.beats.json from `visualfries beats`
  sfx/*.wav             transition, wipe, whip, slam, pop, tick, punch, enter
```

```bash
ffmpeg -i IMG_0001.MOV -vf fps=30 -c:v libx264 -crf 14 -pix_fmt yuv420p -c:a copy talk.mp4
npx visualfries matte talk.mp4 --output talk.matte.mp4 --provider rvm
npx visualfries beats music/bed.mp3
```

Phone recordings often have a variable frame rate; `matte` needs a constant one, hence the
`fps=30` copy. The whole take stays one file: the cut list picks the ranges.

## Make it yours

1. Read the transcript and pick the ranges to keep. Each cut's `in` and `out` is a phrase of
   the take, with `offset` for a breath of room (-0.1 s before the first word, +0.1 s after the
   last). When a phrase repeats (a retake), `occurrence` picks the try, on `in` and on `out`.
2. Replace the phrases in `shots`, `clips` and `sfx` with words of your take, and the texts in
   the clips' `props`.
3. `npx visualfries program reel.vf.json` prints every cut, shot, clip and transition with its
   frames; fix every error and read every warning.
4. `npx visualfries check reel.vf.json --determinism`, then look at stills around every cut,
   transition window and event: `npx visualfries still reel.vf.json --at f95 --at f107 --at f118
   --output sheet.png`.
5. `npx visualfries render reel.vf.json --output out/` (add `--format 1920x1080` for 16:9; the
   blocks lay out for both).

## A retake

Change the try the second cut keeps, from the third to the second:

```json
{ "id": "take", "source": "talk",
  "in": { "say": "AI cut the silences", "occurrence": 2, "offset": -0.1 },
  "out": { "say": "the silences", "edge": "end", "offset": 0.1, "occurrence": 1 } }
```

`out` searches from `in`, so `occurrence: 1` is the first "the silences" after it. Nothing else
changes: shots, clips, captions, sound effects and the transitions move with their words, and the
music ends on the bar nearest the new end. See "Programs" in `docs/MOTION.md`.

## Blocks

- `BehindWord.svelte`: huge words that slam in behind the head, one after another on cues.
- `Checklist.svelte`: a title and items that tick on cues, for a strip's panel.
- `PromptCard.svelte`: a prompt that types itself and tiles that flip in, for a whip's card.
- `EndCard.svelte`: lines of heavy type that slam in word by word, and a call to action.

They take colours and fonts from the brand tokens and lay out for portrait and landscape.
