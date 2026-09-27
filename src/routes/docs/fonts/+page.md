---
title: Fonts
description: How VisualFries loads fonts. Motion projects declare font files in the project; scene apps use a chain of font providers with Google Fonts as the default.
updated: 2026-09-27
---

Text in VisualFries is real HTML and CSS, so it needs real font files. A missing font is an error, never a silent fallback that changes line breaks.

## Motion projects

Declare every font in the project file. Fonts load before any block mounts, and the render fails if one cannot be loaded.

```json
"fonts": [
  { "family": "Futura", "src": "fonts/Jost.ttf", "weight": "100 900" },
  { "family": "Avenir Next", "src": "fonts/NunitoSans.ttf", "weight": "200 1000" }
]
```

`family` is the name your CSS uses, so a licensed or substitute file can stand in for a system font name. Variable fonts declare their weight range.

## Scene apps: font providers

Scenes load fonts through a chain of providers. With no configuration, fonts come from Google Fonts. Add your own provider in front of it:

```ts
import { createSceneBuilder, createGoogleFontsProvider, type FontProvider } from 'visualfries';

const localFonts: FontProvider = async (family) => {
	if (!family.startsWith('local://')) return null; // let the next provider try
	const res = await fetch(`/fonts/${family.replace('local://', '')}.ttf`);
	return res.ok ? res.arrayBuffer() : null;
};

const builder = await createSceneBuilder(scene, container, {
	environment: 'client',
	fontProviders: [localFonts, createGoogleFontsProvider()]
});
```

A provider returns the font file as an `ArrayBuffer`, or `null` to pass to the next one.
