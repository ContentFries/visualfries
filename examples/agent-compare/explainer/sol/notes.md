# VisualFries render pipeline explainer

12 seconds · 1920 × 1080 · 16:9 · 30 fps · 360 frames · silent motion graphics.

The diagram builds from JSON to Svelte blocks, then timeline frames and an encoded MP4. Yellow `#ffe100` accents on a charcoal background. Bricolage headings, Inter descriptions, JetBrains Mono code. The Svelte tiles assemble into artwork that reappears in the timeline and MP4 preview. The completed pipeline holds through the end.

## Timing

| Seconds | Beat |
| --- | --- |
| 0–2.5 | Header and diagram enter; JSON syntax reveals |
| 2.5–5.05 | Build connector draws; Svelte tiles assemble into the visual |
| 5.05–7.9 | Render connector draws; frames populate and the playhead advances |
| 7.9–9.9 | Encode connector draws; MP4 preview and progress fill |
| 9.9–12 | Export complete; hold the finished diagram |

## Verification and limitation

Project resolution and native VisualFries client compilation passed. Svelte produced no warnings. Browser-free server evaluation succeeded for every frame in forward and reverse order, with matching HTML and no invalid numeric values. Details: `qa/source-verification.json`.

**VisualFries `check --determinism` could not run**: Chromium launch failed with `setsockopt: Operation not permitted`. Disabling its optional crash reporter revealed another denied socket call (`shutdown`). Stills and MP4 rendering require that same browser and remain unavailable. No visual inspection or pixel determinism is claimed, and no MP4 was produced.

## Finish in a browser-capable environment

Run from this folder:

```bash
node <visualfries repo>/bin/visualfries.js check project.vf.json --determinism
node <visualfries repo>/bin/visualfries.js still project.vf.json --clip out --at 1.8s --at 3.9s --at 4.95s --at 6.8s --at 9.1s --at 11s --output qa/stills.png
# Inspect the stills before encoding.
node <visualfries repo>/bin/visualfries.js render project.vf.json --output out/
```

For motion projects, the CLI accepts an output **directory** and names each MP4 after its clip. Clip `out` therefore produces the requested `out/out.mp4` and `out/manifest.json`.
