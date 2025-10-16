# VisualFries

[![npm version](https://badge.fury.io/js/visualfries.svg)](https://badge.fury.io/js/visualfries)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**VisualFries** is a **Svelte 5** library for programmatically creating (not just) bite-sized video content for social media. Built on PIXI.js and GSAP (for powerful animations), it's designed primarily for headless rendering of dynamic scenes.

A key feature of VisualFries is its unique approach to text rendering. It uses SVG `<foreignObject>` to render standard HTML and CSS, allowing you to style scenes and create complex text animations with familiar tools and the full power of GSAP.

> ⚠️ **Alpha Software Notice** ⚠️
>
> This library is currently in an **alpha** stage. It is not recommended for production use. The API is unstable and may change without notice. There are known bugs and likely many unknown ones. I welcome feedback and bug reports, but please be aware of its experimental nature.

## Project Philosophy & Status

**VisualFries is currently a solo project maintained by me, its creator.** I use this as a backbone of my SaaS, ContentFries.

This means development is driven by a singular vision and you have a direct line to the person who built it. It also means resources are limited. I'm opening this up to the community to share what I've built, get feedback, and see where it goes. I wholeheartedly welcome contributions, bug reports, and ideas.

## Key Features

- **Built for Svelte 5:**
- **Declarative, JSON-based Scenes:** Define your entire video as a structured, type-safe JSON object.
- **HTML & CSS for Text:** Style text and overlays with standard CSS. No need to learn a proprietary canvas styling API.
- **Powerful Animation Engine:** Leverage the full GSAP ecosystem for complex, timeline-based animations.
- **Component-Based Architecture:** Build scenes by composing Videos, Images, Text, Shapes, and Subtitles.
- **Fluent Scene Composition:** Use composer utilities to programmatically build scenes, layers, and components with a clean, chainable API.
- **Headless & Server-Side Ready:** Designed for automated, server-side video generation.
- **MIT Licensed:** Truly open-source and free for all uses.

## Installation

**Prerequisite:** Your project must be using **Svelte 5** or newer.

```bash
npm install visualfries
```

## Quick Start

The best way to use VisualFries is within a Svelte component.

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createSceneBuilder, type ISceneBuilder, type Scene } from 'visualfries';

	let canvasContainer: HTMLDivElement;
	let sceneBuilder: ISceneBuilder;

	// Define your scene using a declarative JSON object
	const myScene: Scene = {
		id: 'my-first-scene',
		version: '2.0',
		settings: {
			width: 1080,
			height: 1080,
			duration: 10,
			fps: 30,
			backgroundColor: '#1a1a1a'
		},
		layers: [
			// ... your layers and components defined here
		],
		assets: []
	};

	onMount(async () => {
		if (canvasContainer) {
			sceneBuilder = await createSceneBuilder(myScene, canvasContainer, {
				environment: 'client',
				autoPlay: true
			});
		}
	});

	onDestroy(() => {
		sceneBuilder?.destroy();
	});
</script>

<div class="scene-container" bind:this={canvasContainer} />

<style>
	.scene-container {
		width: 540px; /* Example scaled size */
		height: 540px;
		border: 1px solid #333;
	}
</style>
```

## Scene Composition API

While you can write the scene JSON by hand, the library includes a fluent API to make this process simple and type-safe.

```typescript
import { createSceneComposer, createLayerComposer, createComponentComposer } from 'visualfries';

// 1. Create a composer for a TEXT component
const headline = createComponentComposer('headline-text', 'TEXT', { startAt: 0, endAt: 5 })
	.setAppearance({
		x: 50,
		y: 100,
		width: 980,
		height: 250,
		text: {
			fontFamily: 'Montserrat',
			fontSize: 90,
			fontWeight: '800',
			color: '#FFFFFF',
			textAlign: 'center'
		}
	})
	.setText('Hello, VisualFries!')
	.compose();

// 2. Create a layer and add the component
const mainLayer = createLayerComposer('layer-1').addComponent(headline).compose();

// 3. Create the scene
const myScene = createSceneComposer('my-scene', {
	width: 1080,
	height: 1080,
	duration: 10,
	fps: 30
})
	.addLayer(mainLayer)
	.compose();
```

## Custom Fonts Support

VisualFries needs to load font files (.ttf, .woff2, etc.) to render text. The library uses a flexible font provider chain to allow you to load fonts from any source while retaining default support for Google Fonts.

### Default Behavior: Google Fonts

By default, with no configuration, VisualFries will automatically fetch fonts from Google Fonts. This works out of the box for any client-side application.

### Extending Font Loading

Instead of replacing the default behavior, you can add your own font providers to the front of the chain. This is the recommended approach for loading local or custom fonts.

A font provider is a simple async function that receives a font family and must return a Promise<ArrayBuffer | null>. If it returns null, the library will try the next provider in the chain.

**Example:** Adding a provider for local fonts while keeping Google Fonts as a fallback.

Create your custom provider:

```typescript
// src/lib/localFontProvider.ts
import type { FontProvider } from 'visualfries';

export const localFontProvider: FontProvider = async (fontFamily) => {
	// We only handle fonts that start with our special prefix
	if (!fontFamily.startsWith('local://')) {
		// For all other fonts (e.g., "Roboto"), we do nothing and
		// let the next provider in the chain (the Google provider) handle it.
		return null;
	}

	const fontName = fontFamily.replace('local://', '');
	const fontUrl = `/fonts/${fontName}.ttf`; // Assuming fonts are in /static/fonts

	try {
		const response = await fetch(fontUrl);
		if (!response.ok) {
			console.error(`Failed to load local font: ${fontUrl}`);
			return null;
		}
		return response.arrayBuffer();
	} catch (error) {
		console.error(`Error fetching local font: ${fontUrl}`, error);
		return null;
	}
};
```

Configure the fontProviders array:

When initializing the SceneBuilder, provide your custom provider and the default Google Fonts provider. The library will check yours first.

```typescript
// In your Svelte component
import { createSceneBuilder, createGoogleFontsProvider } from 'visualfries';
import { localFontProvider } from '$lib/localFontProvider';

const builder = await createSceneBuilder(sceneData, container, {
	environment: 'client',
	fontProviders: [
		// 1. Your provider is checked first.
		localFontProvider,

		// 2. If your provider returns null, the default provider is checked next.
		createGoogleFontsProvider()
	]
});
```

## Contributing

As an early-stage, solo-developed project, contributions are highly encouraged! The best way to contribute right now is by:

- Opening an issue to report a bug or suggest a feature
- Improving the documentation by clarifying confusing sections or adding new examples
- Sharing your creations! Seeing what people build is the best motivation

Please feel free to get in touch through GitHub Issues.

## License

VisualFries is licensed under the MIT License.
