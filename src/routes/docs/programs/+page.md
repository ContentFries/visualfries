---
title: 'Programs: from a raw take to a finished reel'
description: A program is one motion project that describes a whole edit. It holds the cut list over raw takes, the shots that frame the speaker, the clips, the transitions, the captions and the sound, and it renders as one video per format. Retakes follow without edits.
updated: 2026-10-22
---

A program is one project that describes a whole edit:

- the cut list over the raw takes;
- how the footage is framed (shots);
- what is drawn over and behind it (clips);
- the handoffs (transitions);
- captions, sound effects and music.

It renders as one video per format. Every timing is a phrase of the transcript, so a retake or a re-cut follows without touching anything else.

A project becomes a program as soon as it has `cuts` or `shots`. Without them it stays a set of clips that render one by one ([CLI](/docs/cli)), exactly as before.

The worked example is [`static/demo/reel`](https://github.com/ContentFries/visualfries/tree/main/static/demo/reel) in the repository: a 9:16 reel from one 45-second take, also rendered as 16:9. Shots, transitions and keys are on [Shots and transitions](/docs/shots-and-transitions); effects, music and the mix are on [Program sound](/docs/program-sound).

## The project

```
reel/
  reel.vf.json          cuts, shots, clips, sfx, music
  talk.mp4              the raw take (whole, uncut), its matte and its transcript
  blocks/…              the panel, card, end card and behind-word blocks
  music/bed.mp3         with bed.beats.json
  sfx/…                 sound effects
```

```json
{
	"size": [1080, 1920],
	"fps": 30,
	"brand": "brand.json",
	"footage": {
		"talk": { "src": "talk.mp4", "matte": "talk.matte.mp4", "transcript": "take.transcript.json" }
	},
	"cuts": [
		{ "id": "hook", "source": "talk", "in": { "say": "This whole video", "offset": -0.2 }, "out": { "say": "one prompt", "edge": "end", "offset": 0.12 } },
		{ "id": "take", "source": "talk", "in": { "say": "AI cut the silences", "occurrence": 3, "offset": -0.1 }, "out": { "say": "the silences", "edge": "end", "offset": 0.1, "occurrence": 1 } }
	],
	"shots": [
		{ "id": "tools-whip", "shot": "whip", "from": { "say": "is the open-source", "offset": -0.1 }, "until": { "say": "Opus 5.5", "edge": "end", "offset": 0.12 }, "params": { "direction": "left" } }
	],
	"clips": [
		{ "id": "tools-card", "block": "blocks/PromptCard.svelte", "slot": "card", "from": { "say": "is the open-source", "offset": -0.1 }, "until": { "say": "Opus 5.5", "edge": "end", "offset": 0.55 } },
		{ "id": "captions-a", "block": "@visualfries/captions", "from": 0, "until": { "say": "AI cut the silences", "edge": "start", "offset": -0.1 }, "words": { "captions": "clip" }, "props": { "preset": "bold", "y": 0.85, "size": 95 } }
	],
	"sfx": [{ "at": "VisualFries", "sound": "sfx/pop.wav", "gain": -5 }],
	"music": [{ "id": "bed", "src": "music/bed.mp3", "beats": "music/bed.beats.json", "in": 3.1, "fade": { "out": 0.8 } }]
}
```

## The cut list

`cuts` lists ranges of raw footage in order: `{ "source": "talk", "in": "today we fix", "out": "the slow export" }`.

- `in` and `out` are seconds of that file or words of its own transcript (`footage.talk.transcript`). Every other second, frame or phrase in the project then means program time.
- The program transcript comes from the cut list, so a retake that keeps the words keeps every cue.
- For a new take, point `footage.<name>.transcript` at its transcript. `--transcript` only replaces the transcript of a project without `cuts` or `shots`.
- `in` rounds to the nearest frame and `out` up to the next, so the last word is never clipped.
- A cut's `transition` belongs to the incoming range and never changes program time or sound.
- `audio.split` makes a J or L cut (see [Program sound](/docs/program-sound)).

**Repeated sentences.** For a sentence said several times, `occurrence` on `in` picks the try. `out` is searched from `in`, but a phrase that appears again later in the take is still ambiguous, so give `out` an `occurrence` too: `1` is the first match after `in`.

**Breathing room.** Leave a breath at each edge, `"offset": -0.1` on `in` and `0.1` on `out`; transcripts often time a word's start a little late. A cut cannot run past the end of its source, so the last cut's `out` offset is limited by what the camera recorded after the last word.

**Holds.** `"hold": 1.7` on a cut freezes its last frame for 1.7 s after `out`, as the picture to end on or to let a gag land. A hold is program time:

- everything after it moves on, `"end"` includes it, and clips and shots run through it;
- it is silent: the cut's sound stops at its `out`, while sound effects and music play on;
- no words fall into it, so captions pause;
- it is at most 60 s.

**The end of the program.** In a program, `"end"` is the program's last frame, holds included: `"until": "end"` for a clip, a shot or music, and `{ "program": "end", "offset": -1.5 }` for a moment before it. For the spoken word "end", write `{ "say": "end" }`.

A clip whose `until` lies past the program end is cut there, and its `clip.duration` with it, so exits written as `'end-0.3'` play.

**A phrase in `until` is the end of its last word.** A shot or clip meant to stop where a phrase starts needs `{ "say": …, "edge": "start" }`. The same holds for `out` and for any other field that ends something.

## Edit points measured on the sound

`program`, `check` and `render` measure every audio edit point on the cut's sound, from `footage.<name>.audio` or the file's own sound track. When the voice is still sounding where a cut's sound stops, the warning says how far to move the point, in whole frames:

```
WARNING list cuts[2].out: cut 3: the voice is still sounding where the cut's sound stops (28.90 s of "talk"); move "out" 0.13 s later.
```

A voice that stops within half a frame of the point counts as clean. Where the voice cannot be told from the room noise, or the sound cannot be decoded, the transcript's times decide. Measurements are cached in `.visualfries/edit-points.json`.

## Footage in a program

With a cut list, the cut list decides which source frame plays at each program frame, including the handles a transition shows. Where a source runs out, its edge frame holds.

- `<Footage name="talk">` draws that source while a cut or shot shows it.
- `<Footage program>` draws whatever is on screen.
- `clip.subject('talk')` follows the same mapping.

Only the source ranges the program shows are extracted, plus each footage's `margin` (default 2 s), each range cached on its own. Phone recordings often have a variable frame rate; `matte` needs a constant one, so make a copy first:

```bash
ffmpeg -i IMG_0001.MOV -vf fps=30 -c:v libx264 -crf 14 -pix_fmt yuv420p -c:a copy talk.mp4
npx visualfries matte talk.mp4 --output talk.matte.mp4 --provider rvm
npx visualfries beats music/bed.mp3
```

## Build it in this order

1. **Prepare the take.** Keep each take as one file; the cut list picks the ranges. Transcribe it into words with times ([Transcripts](/docs/transcripts)) and correct misheard names in the transcript itself, because captions show the transcript's words. Make the matte if anything goes behind the speaker, and analyse the music once.
2. **Plan.** Read the transcript and write the outline before the JSON: the hook, the sections, and which phrase each move lands on. Plan one move per spoken beat; no stretch should hold a still frame longer than about two seconds.
3. **Cut list.** One cut per kept range, `in` and `out` as phrases. Run `visualfries program` until every cut resolves.
4. **Shots.** Chain them end to start: the next shot's `from` gets the same anchor as the previous shot's `until`. A gap of a few frames between two shots is a `full` shot of its own, and the move into it is squeezed into those frames. Give shots that hold longer than about two seconds `keys` that keep the camera moving. See [Shots and transitions](/docs/shots-and-transitions).
5. **Clips.** A clip in a slot (`panel`, `card`, `word`) shows while a shot frees that slot. End it when the next shot's move is over, not when the shot ends. Captions are a `@visualfries/captions` clip per stretch of speech they cover: put them low on the chest, give them a fixed `size` when the project renders several formats, and leave them out where a panel repeats the words.
6. **Transitions and sound.** See [Program sound](/docs/program-sound).
7. **Check and look.** Run `visualfries program` after every edit until it shows no errors, then `check --determinism`. Look at stills of:
   - every cut;
   - the first, middle and last frame of every transition window;
   - every event and the first frames of every shot move.

   Ten moments per `still` call is a good size.
8. **Render.** Run `visualfries render reel.vf.json --output out/`, adding `--format 1920x1080` for 16:9 from the same project.
9. **Retake.** See below.

## Check, stills and render

```bash
npx visualfries program reel.vf.json [--format 1920x1080] [--json]
npx visualfries check reel.vf.json --determinism
npx visualfries still reel.vf.json --at f95 --at f107 --at 7.5s --output sheet.png
npx visualfries render reel.vf.json --output out/ [--format 1920x1080] [--stems]
```

**`program`** resolves cuts, program words, shots, clips, transitions, audio pieces and segments into `.visualfries/program/<format>.json`. It prints every item with its frames:

```
program mode  1080x1920 (portrait)  716 frames  23.87s  30 fps
cut hook       0.00s  109 frames  talk 0.57s–4.20s
cut take       3.63s  44 frames  talk 17.87s–19.33s
shot tools-whip 15.40s  100 frames  whip  morph 13 frames power3.inOut
clip checklist 3.63s  176 frames  blocks/Checklist.svelte  slot panel
transition push into tools  frames 426–442 (cut 434)
music bed      0.00s–23.86s  music/bed.mp3 from 3.10s  ends on bar 11 (unsnapped 23.87s)
segment seg1  frames 0–152  3c9aad249c2b  hook, take, open, hook-behind, list-strip, word-ai, checklist, captions-a, list-strip.transition
```

`--json` prints the whole resolved program, including the `events` that shots and transitions add for sounds to land on.

**`still` and `check`** draw the whole program on one stage: the footage the cut list shows, clips with `"layer": "behind"` between the footage and the speaker, then the other clips in project order. Each page holds one segment (a range between hard cuts). `still` takes program moments (`--at 2.5s`, `--at f120`, `--at end`); with `--clip` it takes that clip's moments. `check --determinism` compares every segment forward, backward, scrambled and against a page holding the whole program, and prints the mix's loudness.

`still` and `check` draw the project's own size. To look at another format, copy the project with another `size`.

**`render`** makes the whole program one video. The output is an `.mp4`, or a directory that gets `<project>[.<format>].mp4`.

- **Segments.** Each segment is drawn on its own pages and stored losslessly in `.visualfries/segments/`. The segments are joined without re-encoding and encoded once, and the resolved program is saved beside the video as `<name>.program.json`.
- **Cache.** A segment's hash covers what is on screen in it, including every file its blocks import. Editing one clip draws only the segments it is on screen in; `--no-cache` draws everything again.
- **What makes a segment redraw.** A clip that spans several segments (a captions clip over the whole program) puts all of them in play. A cut that gets longer or shorter moves everything after it.
- **Housekeeping.** `visualfries cache reel.vf.json` shows the cache's size, and `--clear` drops it.

## Retakes

Point the footage at the new take and its transcript, or change which try a cut keeps (`occurrence`), and render again:

```json
{
	"id": "take",
	"source": "talk",
	"in": { "say": "AI cut the silences", "occurrence": 2, "offset": -0.1 },
	"out": { "say": "the silences", "edge": "end", "offset": 0.1, "occurrence": 1 }
}
```

Cut points, shots, clips, captions, keys, sound effects and transitions move with their words, and the music snaps to the nearest bar again. A phrase the new take no longer says fails with the closest spoken ones. Numbers in source seconds do not follow, so keep cut points as phrases.

## Inserts for an editor

To finish the edit in an editor instead, render every clip of the program as its own file to lay over the rough cut:

```bash
npx visualfries check reel.vf.json --export inserts                     # what inserts leave to the program render
npx visualfries render reel.vf.json --export inserts --output inserts/ [--handles 10] [--clip <id>]...
```

An insert is the clip exactly as the program draws it, alone:

- **Size and position.** Every insert has the program's frame size, and the clip sits where the program draws it, slots and keys included.
- **Handles.** `--handles` frames before and after (default 10), in which the clip holds its first or last frame.
- **Alpha.** Inserts are transparent ProRes 4444 `.mov` files with straight alpha, unless the clip says `"alpha": false`.
- **Behind clips.** A clip with `"layer": "behind"` becomes a holdout: the speaker is erased from it frame by frame, across cuts.

`manifest.json` lists each insert's program start frame, handles and the cut list under it (`sources`). The cut list, shots, transitions and the program's sound stay in the program render; `check --export inserts` lists every place where the program relies on them.
