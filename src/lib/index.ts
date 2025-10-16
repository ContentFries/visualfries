// src/index.ts
export { createSceneBuilder } from './factories/SceneBuilderFactory.js';
export { createSceneComposer } from './composers/sceneComposer.js';
export { createLayerComposer } from './composers/layerComposer.js';
export { createComponentComposer } from './composers/componentComposer.js';
export { StyleBuilder } from './builders/html/StyleBuilder.js';
export { createGoogleFontsProvider } from './fonts/GoogleFontsProvider.js';
export type { FontProvider } from './fonts/types.js';

// Scene data schemas (Zod schemas and their inferred types)
export * from './schemas/scene/index.js';

// Runtime types (interfaces for class instances, prefixed with "I")
export * from './schemas/runtime/index.js';

// Seeds and animation presets
export * from './seeds/index.js';
export * from './animations/presets/index.js';
