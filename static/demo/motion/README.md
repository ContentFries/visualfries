# motion — motion primitives

A 9:16 clip where every element moves with one `use:motion` line timed to a spoken word:
`pop`, `rise` and `slide` tiles, characters rising with a stagger, a typewriter line, an SVG
arrow drawn on, a counter, `shake` and `highlight` emphasis, and mirrored exits at the end.

```bash
npm install visualfries playwright
npx visualfries clips motion.vf.json
npx visualfries check motion.vf.json --determinism
npx visualfries still motion.vf.json --clip primitives --output sheet.png
npx visualfries render motion.vf.json --clip primitives --output motion.mp4
```

Change `"energy"` in the clip's props to `"calm"` or `"punchy"` to see every default
duration, stagger and distance change at once. `voice.transcript.json` is a sample script.

Fonts: Anton and Newsreader, SIL Open Font License 1.1 (`fonts/OFL-*.txt`).
