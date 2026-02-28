# VisualFries Composer API Reference

## ComponentComposer

The `ComponentComposer` is a fluent interface for building component objects. It handles default value initialization, deep merging of appearance properties, and validation.

### Factory

```typescript
import { createComponentComposer } from "$lib/composers/componentComposer";

// Signature
function createComponentComposer(
  id: string,
  type: ComponentType,
  timeline: { startAt: number; endAt: number },
): ComponentComposer;
```

**Example:**

```typescript
const txt = createComponentComposer("txt-1", "TEXT", { startAt: 0, endAt: 5 });
```

### Safe Methods

These methods are the preferred way to interact with the composer.

| Method          | Signature                                         | Description                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `setAppearance` | `(appearance: Partial<AppearanceInput>) => this`  | **Deeply merges** the provided appearance object into the existing appearance. Use this for nested properties (e.g., updating `text.color` without erasing `text.fontFamily`).                               |
| `setText`       | `(text: string) => this`                          | Sets the `text` property (only for `TEXT` components).                                                                                                                                                       |
| `setSource`     | `(source: Partial<ComponentSourceInput>) => this` | Sets/Merges the method source object (for `IMAGE`, `VIDEO`, `GIF`, `AUDIO`, `SUBTITLES`).                                                                                                                    |
| `addAnimation`  | `(animation: AnimationInput) => this`             | Appends an animation to the `animations.list` array.                                                                                                                                                         |
| `addEffect`     | `(key: string, effect: ComponentEffect) => this`  | Adds or updates an effect in the `effects.map` object.                                                                                                                                                       |
| `setName`       | `(name: string) => this`                          | Sets the helpful display name of the component.                                                                                                                                                              |
| `setOrder`      | `(order: number) => this`                         | Sets the logic/layout order. **Note:** In layout contexts, lower values are typically prioritized (e.g., appear at the top).                                                                                 |
| `setVisible`    | `(visible: boolean) => this`                      | Toggles component visibility.                                                                                                                                                                                |
| `compose`       | `() => Component`                                 | Validates (Zod parse) and returns the final Component object. Throws if invalid.                                                                                                                             |
| `safeCompose`   | `() => Component \| undefined`                    | Validates and returns Component, or logs error and returns `undefined` if invalid.                                                                                                                           |
| `setProps`      | `(props: Partial<ComponentInput>) => this`        | **Shallow merges** properties into the component root. **Use with caution**: can overwrite entire objects if not careful. Required for properties not covered by specific methods (e.g., `shape`, `volume`). |

### Component Types

#### VIDEO

Displays a video file.

**Specific Properties** (use `setProps` or `setSource`):

- `source`: URL, assetId, and trim settings.
- `volume`: 0-1 (default 1).
- `muted`: boolean (default false).
- `playback`: Loop and autoplay settings.
- `crop`: Crop configuration.

**Usage:**

```typescript
videoComposer
  .setSource({
    url: "https://example.com/video.mp4",
    assetId: "asset-123", // Links to Scene Asset
    startAt: 10, // Start playing from 10s in source
    endAt: 20, // Stop playing at 20s in source
  })
  .setProps({
    volume: 0.8,
    muted: false,
    playback: {
      autoplay: true,
      loop: true,
      playbackRate: 1.0,
    },
    crop: { x: 0, y: 0, width: 1, height: 1 }, // Full frame
  });
```

#### SUBTITLES

Renders subtitles text. Use `timingAnchor` to link to an asset for future compatibility, but note that subtitle rendering currently relies on the scene timeline.

**Specific Properties**:

- `timingAnchor`: (Future Use) Connects the subtitle component to an audio/video asset.
- `appearance.text`: Standard text styling.
- `appearance.activeWord`: Highlighting for current spoken word.
- `appearance.aiEmojis`: Configuration for auto-generated emojis.

**Schema:**

```typescript
interface SubtitleComponentInput {
  type: "SUBTITLES";
  // timingAnchor is non-critical but good practice for ensuring future asset linkage
  timingAnchor: {
    mode: "ASSET_USAGE";
    assetId: string;
    offset?: number;
  };
  appearance: {
    text: TextAppearance;
    activeWord?: {
      enabled: boolean;
      color?: ColorType;
      backgroundColor?: ColorType;
      scale?: number;
    };
    hasAIEmojis?: boolean;
    aiEmojisPlacement?: "top" | "bottom";
    aiEmojis?: Array<{
      text: string;
      emoji: string;
      startAt: number;
      endAt: number;
    }>;
  };
}
```

**Usage:**

```typescript
subtitlesComposer
  .setProps({
    timingAnchor: {
      mode: "ASSET_USAGE",
      assetId: "linked-video-asset-id",
    },
  })
  .setAppearance({
    text: {
      fontFamily: "Montserrat",
      fontSize: { value: 60, unit: "px" },
      color: "#FFFFFF",
    },
    activeWord: {
      enabled: true,
      color: "#FFFF00",
    },
  });
```

#### TEXT

Displays static text or text with simple animations.

**Specific Properties**:

- `text`: The string content (use `setText`).
- `isAIEmoji`: boolean (internal use mostly).

**Appearance Schema (`appearance.text`)**:

- `fontFamily`: string
- `fontSize`: `{ value: number, unit: 'px'|'em' }`
- `fontWeight`: 'bold', '100'-'900', etc.
- `fontSource`: `{ source: 'google', family: '...' }`
- `color`: Hex, RGB, or Gradient.
- `textAlign`: 'left', 'center', 'right', 'justify'.
- `shadow`: `{ enabled: boolean, color: string, blur: number, ... }`
- `outline`: `{ enabled: boolean, color: string, size: number }`
- `background`: `{ enabled: boolean, color: string, target: 'wrapper'|'element' }`

**Usage:**

```typescript
textComposer.setText("Hello World").setAppearance({
  text: {
    fontFamily: "Roboto",
    fontSize: { value: 100, unit: "px" },
    color: "#000000",
    shadow: { enabled: true, color: "#FFFFFF", blur: 10 },
  },
});
```

#### IMAGE

Displays a static image.

**Specific Properties**:

- `source`: URL and assetId.
- `crop`: `{ xPercent: number, yPercent: number, widthPercent: number, heightPercent: number }`.

**Usage:**

```typescript
imageComposer.setSource({ url: "..." }).setAppearance({ opacity: 0.5 });
```

#### GIF

Displays an animated GIF.

**Specific Properties**:

- `playback`: `{ loop: boolean, speed: number }`.

**Usage:**

```typescript
gifComposer.setSource({ url: "..." }).setProps({
  playback: { loop: true, speed: 1.0 },
});
```

#### SHAPE

Displays geometric shapes, including dynamic progress bars.

**Specific Properties**:

- `shape`: Discriminated union object.

**Shape Types**:

1.  **Rectangle/Circle/Star/Polygon**:
    ```typescript
    {
      type: 'rectangle', // or 'circle', 'triangle', 'star'
      cornerRadius?: number
    }
    ```
2.  **Progress** (Dynamic loaders):
    ```typescript
    {
      type: 'progress',
      progressConfig: {
        type: 'linear' | 'perimeter' | 'radial' | 'custom';
        // Linear
        direction?: 'horizontal' | 'vertical';
        // Perimeter
        startCorner?: 'top-left' | 'top-right' | ...;
        clockwise?: boolean;
        strokeWidth?: number;
        // Radial
        startAngle?: number; // -90 for top
        innerRadius?: number; // 0 for pie, >0 for ring
      }
    }
    ```

**Usage:**

```typescript
shapeComposer
  .setProps({
    shape: {
      type: "progress",
      progressConfig: {
        type: "perimeter",
        strokeWidth: 20,
      },
    },
  })
  .setAppearance({
    color: "#FF0000", // Fill/Stroke color
    width: 500,
    height: 100,
  });
```

#### AUDIO

Plays audio without visual representation (ghost component).

**Specific Properties**:

- `volume`: 0-1.
- `muted`: boolean.
- `source`: Similar to VIDEO.

#### COLOR

Displays a solid color block (legacy/simple background).

**Specific Properties**:

- `appearance.background`: Color string.

#### GRADIENT

Displays a gradient block.

**Specific Properties**:

- `appearance.background`: `GradientDefinitionShape`.

**Schema:**

```typescript
{
  type: 'linear' | 'radial',
  colors: string[], // ['#FF0000', '#0000FF']
  stops?: number[], // [0, 100]
  angle?: number // for linear
}
```

### Effects Reference

Add effects using `addEffect(key, config)`.

| Effect Type          | Config Schema                                                                | Description                                                                                    |
| -------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `layoutSplit`        | `{ pieces: number, sceneWidth: number, sceneHeight: number, chunks: [...] }` | Splits component into pieces (e.g. for split screen).                                          |
| `fillBackgroundBlur` | `{ blurAmount: number }`                                                     | Fills empty space with a blurred version of the content (vertical video on horizontal canvas). |
| `rotationRandomizer` | `{ maxRotation: number, seed?: number }`                                     | Randomly rotates elements (e.g. subtitles).                                                    |
| `textShadow`         | `{ color: string, blur: number, offsetX: number, offsetY: number }`          | Applies drop shadow.                                                                           |
| `textOutline`        | `{ color: string, size: number }`                                            | Applies text stroke/outline.                                                                   |
| `blur`               | `{ radius: number }`                                                         | Simple gaussian blur.                                                                          |
| `colorAdjustment`    | `{ brightness: number, contrast: number, saturation: number, hue: number }`  | Adjusts color properties.                                                                      |

### Animations Reference

Add animations using `addAnimation(config)`.

**Schema:**

```typescript
interface AnimationInput {
  id: string; // Unique instance ID
  name: string; // Display name
  startAt?: number; // Relative start time
  enabled?: boolean;
  animation: {
    type: "preset";
    presetId: string; // The ID of the preset
    // ... overrides if available
  };
}
```

**Common Presets (Lines):**

- `lines-highlight`: Highlights lines (karaoke style).
- `lines-reveal-and-fade`: Scale up reveal.
- `lines-elastic`: Elastic bounce reveal.
- `lines-swipe-left`: Swipe transition.
- `lines-rolling`, `lines-spiral`, `lines-bounce`.

**Common Presets (Words):**

- `words-highlight`: Highlight words (karaoke).
- `words-1`: Bounce scale in.
- `words-no-overflow`: Slide up from bottom.
- `subtitles-rising-back`: Rising with back ease.
- `words-active-color`: Highlight active word.

### Custom Animations

You can define complex custom animations on the fly. The system supports a GSAP-like API structure, allowing you to define timelines, tweens, and target specific parts of the component (like splitting text).

**Structure:**

```typescript
{
  id: string,
  revertAfterComplete?: boolean,
  // position: 'in' | 'out' | string position
  timeline: [
    {
      // target: 'chars' | 'words' | 'lines' | 'container'
      target?: string,
      position?: string, // start time in timeline
      tweens: [
        {
          method: 'to' | 'from' | 'fromTo' | 'set',
          vars: {
            duration: number,
            ease?: string, // e.g. 'power4.inOut'
            stagger?: number | object,
            // Animatable properties
            opacity?: number,
            scale?: number,
            x?: number | string, // can be relative '-20'
            skewX?: number,
            textShadow?: string,
            clipPath?: string, // e.g. 'inset(50% 0 0 0)'
            // ... any other standard CSS/GSAP style property
          }
        }
      ]
    }
  ]
}
```

**Example: Glitch Effect**

```typescript
componentComposer.addAnimation({
  id: "custom-glitch-1",
  name: "Glitch Effect",
  enabled: true,
  startAt: 0,
  animation: {
    id: "cf-glitch-animation",
    revertAfterComplete: true,
    timeline: [
      {
        tweens: [
          // Skew and positional glitches
          {
            method: "to",
            vars: { duration: 0.1, skewX: 70, ease: "power4.inOut" },
          },
          {
            method: "to",
            vars: { duration: 0.04, skewX: 0, ease: "power4.inOut" },
          },
          { method: "to", vars: { duration: 0.04, x: -20 } },
          { method: "to", vars: { duration: 0.04, x: 0 } },

          // "Cut text" effect using clipPath
          {
            method: "to",
            vars: { duration: 0.05, clipPath: "inset(50% 0 0 0)" },
          },
          {
            method: "to",
            vars: { duration: 0.05, clipPath: "inset(0 0 50% 0)" },
          },
          {
            method: "to",
            vars: {
              duration: 0.03,
              clipPath: "inset(20% 0 60% 0)",
              textShadow:
                "0.03em 0.03em 0.015em rgba(255,0,0,0.7), -0.3em -0.3em 0.015em rgba(0,255,0,0.7)",
            },
          },
          {
            method: "to",
            vars: { duration: 0.03, clipPath: "inset(80% 0 10% 0)" },
          },

          // Recovery
          { method: "to", vars: { duration: 0.03, textShadow: "none" } },
          {
            method: "to",
            vars: { duration: 0.03, clipPath: "inset(0 0 0 0)" },
          },
        ],
      },
    ],
  },
});
```

---

## LayerComposer

Used to group components.

```typescript
import { createLayerComposer } from "$lib/composers/layerComposer";

const layer = createLayerComposer("layer-1");
```

**Methods:**

- `addComponent(component)`: Adds a composed component.
- `setVisible(bool)`: Toggles layer visibility.
- `setOrder(number)`: Z-index of the layer.
- `setName(string)`: Display name.
- `setMuted(bool)`: Mutes all components in layer.

**Note:** Layer order dictates rendering order. Higher order = on top (Z-Index). Component ordering **within** a layer often depends on start time (timeline), but `setOrder` on components is available for layout control.

---

## SceneComposer

The top-level object.

```typescript
import { createSceneComposer } from "$lib/composers/sceneComposer";

const scene = createSceneComposer("scene-1", {
  width: 1080,
  height: 1920,
  duration: 10,
  fps: 30,
  backgroundColor: "#000000",
});
```

**Methods:**

- `setSettings(settings)`: Update dimensions, fps, duration.
- `setSubtitles(subtitles)`: Global subtitle settings (if not using components).
- `addLayer(layer)`: Adds a composed layer.
- `addAsset(asset)`: Registers an asset (file) used by components. **Crucial** for `assetId` linking.
- `addAudioTrack(track)`: Global audio (BGM).
- `compose()`: Finalizes the scene.

---

## Complete Examples

### Example 1: Simple Background + Text

```typescript
import { createSceneComposer } from "$lib/composers/sceneComposer";
import { createLayerComposer } from "$lib/composers/layerComposer";
import { createComponentComposer } from "$lib/composers/componentComposer";
import { v4 as uuid } from "uuid";

// 1. Create Scene
const scene = createSceneComposer(uuid(), {
  width: 1080,
  height: 1920,
  duration: 5,
  fps: 30,
  backgroundColor: "#000000",
});

// 2. Create Background Layer
const bgLayer = createLayerComposer(uuid()).setName("Background");

// 3. Create Gradient Background Component
const bgComp = createComponentComposer(uuid(), "GRADIENT", {
  startAt: 0,
  endAt: 5,
});
bgComp.setAppearance({
  background: {
    type: "linear",
    colors: ["#1a2a6c", "#b21f1f", "#fdbb2d"],
    angle: 45,
  },
  width: 1080,
  height: 1920,
});
bgLayer.addComponent(bgComp.compose());

// 4. Create Text Layer
const textLayer = createLayerComposer(uuid()).setName("Text").setOrder(2);

// 5. Create Text Component
const textComp = createComponentComposer(uuid(), "TEXT", {
  startAt: 0,
  endAt: 5,
});
textComp
  .setText("Hello AI World")
  .setAppearance({
    text: {
      fontFamily: "Montserrat",
      fontSize: { value: 80, unit: "px" },
      color: "#FFFFFF",
      fontWeight: "bold",
      textAlign: "center",
    },
    x: 540, // Center X
    y: 960, // Center Y
    width: 800,
    height: 200,
    horizontalAlign: "center",
    verticalAlign: "center",
  })
  .addAnimation({
    id: uuid(),
    name: "Fade In",
    enabled: true,
    startAt: 0,
    animation: {
      type: "preset",
      presetId: "words-1", // Bounce scale in
    },
  });

textLayer.addComponent(textComp.compose());

// 6. Assemble Scene
scene.addLayer(bgLayer.compose());
scene.addLayer(textLayer.compose());

const finalScene = scene.compose();
```

### Example 2: Video with Subtitles

```typescript
// Assets must be defined for linking
const videoAssetId = uuid();
const videoUrl = "https://example.com/video.mp4";

// 1. Add Asset to Scene
scene.addAsset({
  id: videoAssetId,
  type: "VIDEO",
  url: videoUrl,
});

// 2. Video Component
const videoComp = createComponentComposer(uuid(), "VIDEO", {
  startAt: 0,
  endAt: 10,
});
videoComp
  .setSource({
    assetId: videoAssetId,
    url: videoUrl,
    startAt: 0, // Start from beginning of file
  })
  .setProps({
    volume: 1,
    playback: { autoplay: true, loop: true },
  })
  .setAppearance({
    width: 1080,
    height: 1920,
  });

// 3. Subtitles Component (Linked)
const subsComp = createComponentComposer(uuid(), "SUBTITLES", {
  startAt: 0,
  endAt: 10,
});
subsComp
  .setProps({
    // timingAnchor is optional but recommended for reference
    timingAnchor: {
      mode: "ASSET_USAGE",
      assetId: videoAssetId,
    },
  })
  .setAppearance({
    y: 1500, // Lower third
    width: 900,
    text: {
      fontFamily: "Roboto",
      fontSize: { value: 55, unit: "px" },
      color: "#FFFFFF",
      shadow: {
        enabled: true,
        color: "#000000",
        blur: 4,
        offsetX: 2,
        offsetY: 2,
      },
    },
    activeWord: {
      enabled: true,
      color: "#00FFFF", // Highlight word in Cyan
      scale: 1.1,
    },
  });
```

---

## Important Notes

> [!IMPORTANT]
> **Deep Merge vs Shallow Merge**
> `setAppearance` uses a deep merge (lodash recursive merge). This means `setAppearance({ text: { color: 'red' } })` preserves other text properties like font size.
> `setProps` and `setSource` use Object.assign (shallow copy). Passing `setProps({ playback: { loop: true } })` will **wipe out** any existing playback properties like `speed` if they aren't included!

> [!WARNING]
> **Asset Linking**
> Media components (Video/Audio) rely on `assetId`. You **MUST** add the asset to the scene using `scene.addAsset(...)` with the matching ID, otherwise the runtime cannot resolve the source.

> [!TIP]
> **Validation**
> Always use `safeCompose()` when processing user-generated input or uncertainty. It returns `undefined` and logs a Zod error instead of crashing the application.

> [!NOTE]
> **Progress Shapes**
> For `SHAPE` components with `type: 'progress'`, the appearance `width` and `height` control the bounding box, but `strokeWidth` in `progressConfig` controls the thickness of the line. Ensure the bounding box is large enough to contain the stroke.
