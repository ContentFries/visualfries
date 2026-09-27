---
title: Fonts
description: How VisualFries loads fonts. Motion projects declare font files in the project and fail when one cannot load; scene text declares its source per component and can use a chain of font providers.
updated: 2026-09-27
---

Text in VisualFries is real HTML and CSS, so it needs real font files. How fonts are declared differs between motion projects and scenes.

## Motion projects

Declare every font in the project file. Fonts load before any block mounts, and the render fails if one cannot be loaded.

```json
"fonts": [
  { "family": "Futura", "src": "fonts/Jost.ttf", "weight": "100 900" },
  { "family": "Avenir Next", "src": "fonts/NunitoSans.ttf", "weight": "200 1000" }
]
```

`family` is the name your CSS uses, so a licensed or substitute file can stand in for a system font name. Variable fonts declare their weight range.

## Scenes

Scene text names its font in `appearance.text` and says where it comes from with `fontSource`:

```json
"text": {
  "fontFamily": "Montserrat",
  "fontSource": { "source": "google", "family": "Montserrat" },
  "fontWeight": "800"
}
```

| `fontSource`                             | Result                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `{ "source": "google" }`                 | The font is fetched through the provider chain (Google Fonts by default). |
| `{ "source": "custom", "fileUrl": "…" }` | The font is loaded from your file.                                        |
| none                                     | A browser or system font; nothing is downloaded.                          |

A font that cannot be loaded is logged and the text falls back to another font; scene rendering does not stop. Check QA frames when typography matters.

## Font providers

The provider chain decides how `source: "google"` fonts are fetched. Add your own provider in front of Google Fonts:

```ts
import { createSceneBuilder, createGoogleFontsProvider, type FontProvider } from 'visualfries';

const selfHosted: FontProvider = async (font) => {
	// `font` arrives normalized, e.g. "Montserrat:wght@800": capitalized, spaces as "+", weight appended
	const family = font.split(':')[0].replace(/\+/g, ' ');
	const res = await fetch(`/fonts/${family}.woff2`);
	return res.ok ? res.arrayBuffer() : null; // null lets the next provider try
};

const builder = await createSceneBuilder(scene, container, {
	environment: 'client',
	fontProviders: [selfHosted, createGoogleFontsProvider()]
});
```

The chain is global for the page: the last `fontProviders` passed to `createSceneBuilder` applies to every scene.
