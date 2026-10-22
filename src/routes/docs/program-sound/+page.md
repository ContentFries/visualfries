---
title: Program sound
description: A program render mixes its own sound. Speech comes from the cut list with click-free edit points and J and L cuts. Sound effects land on words, beats and block events, music ends on a bar, and the whole mix is normalised to -14 LUFS at -1 dBTP, with optional stems.
updated: 2026-10-22
---

A [program](/docs/programs) render mixes its own sound. The mix depends only on the program: never on segments, the cache or transitions. The same project gives the same samples on every render.

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

## Speech

Each cut's sound plays at its program time.

- **Crossfades.** An equal-power crossfade (`audio.crossfade`, default 0.01 s) is centred on each audio edit point, so cuts never click.
- **J and L cuts.** `audio.split` moves the edit point while the sound stays in sync with the picture. A negative value is a J cut (the sound leads); a positive one is an L cut.
- **Per-cut level.** `audio.gain` (dB) and `audio.mute` work per cut.
- **Continuous takes.** Two cuts that continue the same take meet without a fade, so splitting a take leaves its sound unchanged.
- **Separate sound file.** `footage.<name>.audio` names a separate sound file (the microphone), or `false` for none.

Every audio edit point is also measured on this sound; `program` says how far to move a point that cuts through a word ([Programs](/docs/programs#edit-points-measured-on-the-sound)).

## Sound effects

`sfx` items play a sound file (relative to the project) at any program anchor, rounded to a frame:

- a phrase;
- a beat;
- `{ "program": "end", "offset": -0.5 }`;
- an event a clip's block declares, `{ "event": "land", "clip": "kick" }`.

A transition with `"sound"` plays it on the transition's event, halfway through its window.

Each effect's loudest 100 ms sits `mix.sfx` dB (default −10) under the speech, plus its own `gain`.

A block names the moments its sounds should hit in its module script, so the timing lives in one place:

```svelte
<script module>
	export const events = { land: 'tail+0.98', bonk: 'end-0.2' };
</script>
```

When a sound library's `sounds.json` (`{ "sounds": [{ "file", "hitMs" }] }`, in the sound's folder or up to three folders above) lists the file, its hit lands on the moment instead of its first sample.

Shots emit events too but carry no sound yet. Put an `sfx` item on the shot's anchor plus half its move ([Shots and transitions](/docs/shots-and-transitions)).

## Music

Analyse the music once with `visualfries beats music.mp3` ([CLI](/docs/cli#beats)), then declare it:

```json
"music": [{ "id": "bed", "src": "bed.mp3", "beats": "bed.beats.json", "from": 0.5, "in": 8 }]
```

**Placement.**

- `from` is where the music starts in the program: seconds, a frame, a phrase, `{ "program": "end", "offset": -8 }`, or a beat of a music item listed before it.
- `in` is the second of the file that plays at `from`.
- `until` is where it stops.
- The beats move with the music, so every beat anchor in the project lands on the frame nearest its beat.

**Cuts on beats.** A cut's `out` can be a beat instead of a point in its source: `{ "bar": 5 }`, `{ "beat": 17 }`, or `{ "downbeat": "after", "at": "the settings" }`. The cut then ends, and the next one starts, on the frame nearest that beat.

**Ending on a bar.** By default the music ends, its fade-out done, on the bar end nearest to `until` or to the program end, never after the program end. The end is worked out on every resolve, so when a retake makes the program longer or shorter, the music snaps to the bar end that is now nearest.

- `"snap": false` keeps the exact end.
- `"snap": "bar"` insists on a bar end, and is an error without beats.
- `visualfries program` prints which bar each music item ends on.

**Level.** The music plays at one steady level: its integrated loudness `mix.music` dB (default −15) under the speech, plus its `gain`. It never rises in pauses on its own; `keys` change the level explicitly (dB on top of `gain`, in straight lines from key to key). `fade` defaults to `{ "in": 0.01, "out": 1 }`.

Unknown fields on a music item, in `fade` or in `mix` are errors, so a typo never passes silently.

## The master

- **Loudness.** The sum goes to `mix.loudness` LUFS integrated (default −14), with every true peak at or under `mix.truePeak` dBTP (default −1). One gain applies to the whole mix, and a true-peak limiter acts only where a peak would pass the ceiling.
- **Measurement.** Loudness is measured as ITU-R BS.1770-4 does: K-weighted, gated, with 4× oversampled true peak.
- **Delivery.** The mix is encoded to AAC 192 kbit/s, decoded and measured again. If the encoded true peak still passes the ceiling, the mix is limited lower and encoded again. The render reports what it delivered:

  ```
  mix in 1.8 s: speech -20.37 LUFS, delivered -14.05 LUFS and -1.15 dBTP after 6.97 dB (limiter -5.33 dB)
  ```

- **Order.** The sound is mixed and encoded before any picture is drawn, so an unreadable sound file fails the render at once.
- **Check.** `check` mixes the sound too and prints its loudness before encoding, with any warning.

## Stems

```bash
npx visualfries render reel.vf.json --output out/ --stems
```

`--stems` also writes `<name>.speech.wav`, `<name>.sfx.wav` and `<name>.music.wav` beside the video. They are 48 kHz 32-bit float with the master gain and limiter applied, so they add up to the mix before encoding. A render without `--stems` removes stems of the same name left by an earlier render, because they would no longer match the video.
