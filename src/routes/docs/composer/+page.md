---
title: Composer API
description: Build VisualFries scenes in TypeScript with createComponentComposer, createLayerComposer and createSceneComposer. Deep-merged appearance, validated components, and safe composition.
updated: 2026-09-27
---

The composer API builds scene JSON in TypeScript with defaults, deep merging and Zod validation, so a scene is valid before it is mounted or saved.

## Example

```ts
import { createSceneComposer, createLayerComposer, createComponentComposer } from 'visualfries';

const headline = createComponentComposer('headline', 'TEXT', { startAt: 0, endAt: 5 })
	.setAppearance({
		x: 50,
		y: 100,
		width: 980,
		height: 250,
		text: {
			fontFamily: 'Montserrat',
			fontSource: { source: 'google', family: 'Montserrat' },
			fontSize: { value: 90, unit: 'px' },
			fontWeight: '800',
			color: '#FFFFFF',
			textAlign: 'center'
		}
	})
	.setText('Hello, VisualFries!')
	.compose();

const layer = createLayerComposer('text-layer').setOrder(2).addComponent(headline).compose();

const scene = createSceneComposer('my-scene', {
	width: 1080,
	height: 1920,
	duration: 10,
	fps: 30,
	backgroundColor: '#000000'
})
	.addLayer(layer)
	.compose();
```

## ComponentComposer

`createComponentComposer(id, type, { startAt, endAt })`

| Method                              | Meaning                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `setAppearance(appearance)`         | Deep merge, so `text.color` does not erase `text.fontFamily`.                                                              |
| `setText(text)`                     | Text of a TEXT component.                                                                                                  |
| `setSource(source)`                 | `url`, `assetId` and trim for IMAGE, VIDEO, GIF and SUBTITLES. For AUDIO use `setProps({ source })`.                       |
| `addAnimation(animation)`           | Append a preset or custom animation.                                                                                       |
| `addEffect(key, effect)`            | Add or replace an effect.                                                                                                  |
| `setName`, `setOrder`, `setVisible` | Display name, order, visibility.                                                                                           |
| `setProps(props)`                   | Shallow merge into the component root. Use for fields without a dedicated method; nested objects are replaced, not merged. |
| `compose()`                         | Validate and return the component; throws when invalid.                                                                    |
| `safeCompose()`                     | Validate and return the component, or `undefined` with a logged error.                                                     |

## LayerComposer

`createLayerComposer(id)` with `addComponent`, `setOrder` (higher draws on top), `setVisible`, `setName`, `setMuted`, `compose`.

## SceneComposer

`createSceneComposer(id, settings)` with `setSettings`, `addLayer`, `addAsset` (register files that components reference by `assetId`), `addAudioTrack`, `setSubtitles`, `compose`.

Keep asset ids consistent across video, subtitles and the asset list, and give media a `url` too: in an app, files load from `source.url`, while `assetId` links components to the asset list used by the Node render path and subtitles.
