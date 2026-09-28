---
title: Scene JSON
description: The scene document used by VisualFries apps and by ContentFries. Settings, layers of components with timelines, and an asset registry; validated with Zod and editable live.
updated: 2026-09-27
---

A scene is the document format of VisualFries apps. It describes a fixed-length composition as layers of components (video, images, text, subtitles, shapes), each with its own timeline. ContentFries stores, edits and renders its videos as scenes.

## Structure

```json
{
	"id": "my-first-scene",
	"version": "2.0",
	"settings": {
		"width": 1080,
		"height": 1920,
		"duration": 10,
		"fps": 30,
		"backgroundColor": "#000000"
	},
	"layers": [
		{
			"id": "text-layer",
			"order": 2,
			"components": [
				{
					"id": "headline",
					"type": "TEXT",
					"timeline": { "startAt": 0, "endAt": 5 },
					"text": "Hello, VisualFries!",
					"appearance": {
						"x": 50,
						"y": 100,
						"width": 980,
						"height": 250,
						"text": {
							"fontFamily": "Montserrat",
							"fontSource": { "source": "google", "family": "Montserrat" },
							"fontSize": 90,
							"fontWeight": "800",
							"color": "#FFFFFF",
							"textAlign": "center"
						}
					}
				}
			]
		}
	],
	"assets": []
}
```

This example passes `visualfries validate --strict-runtime-support`.

| Part         | Meaning                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `settings`   | Size, duration in seconds, fps, background.                                                           |
| `layers`     | Stacked groups of components. A higher `order` draws on top.                                          |
| `components` | Typed items with a `timeline` (`startAt`, `endAt` in seconds), `appearance` and type-specific fields. |
| `assets`     | Files used by components, linked by `assetId`. In an app, media still load from `source.url`.         |

Component types are VIDEO, IMAGE, GIF, TEXT, SUBTITLES, SHAPE, COLOR, GRADIENT and AUDIO. Each is described in [Scene components](/docs/components).

## Scenes or motion projects?

|          | Scene                                  | Motion project                                       |
| -------- | -------------------------------------- | ---------------------------------------------------- |
| Visuals  | Built-in component types               | Your own Svelte components                           |
| Timing   | Seconds per component                  | Transcript phrases, cues, seconds                    |
| Editing  | Live in an app, component by component | JSON plus code, re-timed from transcripts            |
| Best for | Captioned clips, templates, editors    | Explainer inserts, custom motion, agent-made content |

Both render deterministically, and a product can use both: ContentFries edits scenes in its editor while motion projects produce custom inserts.

## Validate a scene

```bash
npx visualfries validate scene.json --strict-runtime-support
npx visualfries inspect scene.json --json
```

`--strict-runtime-support` also reports fields the schema accepts but the runtime is known not to support. It checks a catalogue of known limits, so keep looking at QA frames. See [Scene CLI and captions](/docs/scene-cli).
