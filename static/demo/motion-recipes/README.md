# motion-recipes — the built-in moves on one talking-head video

`recipes.vf.json` uses all five motion-recipe blocks on one 16:9 talking-head recording with a
screen recording and three rendered inserts as wall tiles. The media are not in the repository;
point the footage paths at your own files (the transcript must be in program seconds).

| clip | block | try it on |
|---|---|---|
| `wall` | `@visualfries/wall` | the first sentence of a hook ("this video was edited by AI") |
| `type` | `@visualfries/kinetic` | an emotional sentence; add `"holdout": "talk"` for words behind the speaker |
| `zoom` | `@visualfries/zoom-through` | across a jump cut (`cut` = clip-local second of the cut) |
| `screen` + `arrows` | `@visualfries/screen`, `@visualfries/arrows` | a dashboard or app you talk through |

```bash
visualfries check recipes.vf.json --determinism
visualfries still recipes.vf.json --clip type --at 2s --at 5s --at 8s --output type.png
visualfries render recipes.vf.json --output out/
visualfries place recipes.vf.json --fcpxml timeline.fcpxml     # snap to the editor's cuts
visualfries preview recipes.vf.json --base roughcut.mp4        # review the whole program
```

Verified on a 10:58 CodingFry episode (1080p, 53 inserts): `check --determinism` passes for all
five blocks.
