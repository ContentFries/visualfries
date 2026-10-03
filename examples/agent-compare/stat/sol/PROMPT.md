Make a single-image social post for VisualFries, 1080×1350 (4:5), that also works as a 4-second video post: everything animates in during the first ~3 seconds and the last frame is the finished static post.

Message: "One take becomes 13 finished assets." (1 reel, 5 caption styles, 1 cover, 1 quote card, 5 carousel slides). Do not invent any other numbers.
Style: bold and scroll-stopping. Dark background with yellow #ffe100 as the accent.
Use the speaker footage `talk` (it has a matte), cut out from the room, as a visual element.

## Setup (the same for every model)

- You are in a starter folder. `fonts/` holds Bricolage Grotesque (`Bricolage.ttf`, variable 200–800), `Inter.ttf` (variable 100–900), `JetBrainsMono.ttf` (100–800), `Anton-Regular.ttf`, `InstrumentSerif-Italic.ttf` and `InstrumentSerif-Regular.ttf`. Use any of them.
- `talk.mp4` is a talking-head take (1000×1080, 17 s), `talk.matte.mp4` its matte and `talk.transcript.json` its word transcript.
- Learn VisualFries from its agent skill: skills/visualfries/SKILL.md (in the VisualFries repository) (read it and the docs it points to under <visualfries repo>/docs and <visualfries repo>/src/routes/docs).
- The CLI is `node <visualfries repo>/bin/visualfries.js` (commands: `clips`, `check [--determinism]`, `still --clip <id> --at <2.5s> --output x.png`, `render --output out.mp4`). Blocks import from `visualfries/motion`.
- Write `project.vf.json` and your blocks in this folder. Check your work with `check` and look at stills, and fix what you see. Then render to `out/` with `render --output out/out.mp4`. If rendering is impossible in your sandbox, stop once `check` passes and say so.
- Work in English. Do not edit anything outside this folder.
