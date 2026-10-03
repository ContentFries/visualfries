# Homepage showcase

The sources of the examples on [visualfries.com](https://visualfries.com), all made from one 17-second take.
Written by Claude Opus 5.5 and rendered by VisualFries.

| folder | what |
| --- | --- |
| [`reel`](reel) | the 21-second hero reel: the built-in `@visualfries/speaker-depth` block with an edited caption transcript, an end card (`blocks/Outro.svelte`), and the four caption-preset reels |
| [`posts`](posts) | 1080×1350 cover, quote card, stat post and a five-slide carousel (one clip each; export a frame with `still`) |
| [`motion`](motion) | a 12-second 16:9 explainer (`motion.vf.json`) and 8-second 1:1 kinetic type (`kinetic.vf.json`) |
| [`layers`](layers) | the four layers of one speaker-depth frame, rendered separately for the exploded stack |

The reel starts from the built-in [`@visualfries/speaker-depth`](../../static/demo/speaker-depth/template.vf.json) template.
`reel/reel.transcript.json` keeps the spoken timings but rewrites one phrase ("But we're still very far from" →
"We're getting closer and closer to"), so the captions and big words carry the new line while the audio does not;
the homepage plays it muted. `render reel.vf.json` writes `depth.mp4` and `outro.mp4`; join them for the full reel:

```bash
ffmpeg -i out/depth.mp4 -i out/outro.mp4 -filter_complex "[0:v][1:v]concat=n=2:v=1[v]" -map "[v]" reel.mp4
```

Footage and fonts are not in the repository. Bring your own take as `talk.mp4` with `talk.matte.mp4` and a
`talk.transcript.json` ([how](../../static/demo/speaker-depth/README.md)), add a `fonts/` folder with Bricolage Grotesque (`Bricolage.ttf`), Inter, JetBrains Mono, Anton and Instrument
Serif (all on Google Fonts, OFL), then for example:

```bash
npx visualfries still posts.vf.json --clip cover --at 0.3s --output cover.png
npx visualfries render motion.vf.json --output out/
```
