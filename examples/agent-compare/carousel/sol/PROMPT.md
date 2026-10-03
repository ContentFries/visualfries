Make a 5-slide carousel for VisualFries, 1080×1350 (4:5) per slide, titled "How to turn one talking-head take into a week of content".
Each slide is its own clip, 3 seconds long, with an entrance animation; the last frame of each clip is the finished slide. Slides play back to back (15 seconds total).
Slide 1 is a hook, slides 2–4 are steps (record once; your agent reads the transcript and writes the blocks; VisualFries renders every format), slide 5 is a call to action: `npm i visualfries`.
Style: yellow #ffe100 and near-black, editorial, strong typography. Use the speaker footage `talk` (it has a matte) on at least one slide.

## Setup (the same for every model)

- You are in a starter folder. `fonts/` holds Bricolage Grotesque (`Bricolage.ttf`, variable 200–800), `Inter.ttf` (variable 100–900), `JetBrainsMono.ttf` (100–800), `Anton-Regular.ttf`, `InstrumentSerif-Italic.ttf` and `InstrumentSerif-Regular.ttf`. Use any of them.
- `talk.mp4` is a talking-head take (1000×1080, 17 s), `talk.matte.mp4` its matte and `talk.transcript.json` its word transcript.
- Learn VisualFries from its agent skill: skills/visualfries/SKILL.md (in the VisualFries repository) (read it and the docs it points to under <visualfries repo>/docs and <visualfries repo>/src/routes/docs).
- The CLI is `node <visualfries repo>/bin/visualfries.js` (commands: `clips`, `check [--determinism]`, `still --clip <id> --at <2.5s> --output x.png`, `render --output out.mp4`). Blocks import from `visualfries/motion`.
- Write `project.vf.json` and your blocks in this folder. Check your work with `check` and look at stills, and fix what you see. Then render to `out/` with `render --output out/out.mp4`. If rendering is impossible in your sandbox, stop once `check` passes and say so.
- Work in English. Do not edit anything outside this folder.
