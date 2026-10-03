# Homepage showcase

The sources of the examples on [visualfries.com](https://visualfries.com), all made from one 17-second take.
Written by Claude Opus 5.5 and rendered by VisualFries.

| folder | what |
| --- | --- |
| [`posts`](posts) | 1080×1350 cover, quote card, stat post and a five-slide carousel (one clip each; export a frame with `still`) |
| [`motion`](motion) | a 12-second 16:9 explainer (`motion.vf.json`) and 8-second 1:1 kinetic type (`kinetic.vf.json`) |
| [`layers`](layers) | the four layers of one speaker-depth frame, rendered separately for the exploded stack |

The reel itself is the built-in [`@visualfries/speaker-depth`](../../static/demo/speaker-depth/template.vf.json) block,
and the caption reels are [`@visualfries/captions`](../../static/demo/speaker-depth/captions.vf.json).

Footage and fonts are not in the repository. Copy `talk.mp4`, `talk.matte.mp4` and `talk.transcript.json` into a
folder, add a `fonts/` folder with Bricolage Grotesque (`Bricolage.ttf`), Inter, JetBrains Mono, Anton and Instrument
Serif (all on Google Fonts, OFL), then for example:

```bash
npx visualfries still posts.vf.json --clip cover --at 0.3s --output cover.png
npx visualfries render motion.vf.json --output out/
```
