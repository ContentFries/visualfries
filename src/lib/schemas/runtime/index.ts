// Runtime types for the SceneBuilder application
// These represent runtime interfaces for class instances
// They are prefixed with "I" to distinguish from data schemas

// Re-export all event types and enums without prefix
export type {
	BuilderState,
	StateEvents,
	TimelineEvents,
	RenderEvents,
	PlaybackEvents,
	LayerEvents,
	ComponentEvents,
	SubtitlesEvents,
	EventMap,
	EventType,
	EventPayload,
	ComponentRefreshType,
	HookType,
	SceneLayerComponentType,
	SplitScreenChunk,
	SplitScreen,
} from './types.js';

// Re-export utility types without prefix
export type {
	MediaComponent,
	ResourceManager,
	ComponentData,
	ComponentProps,
	PixiComponent,
	ResourceTypes,
	HookHandler,
	HookHandlers,
} from './types.js';

// Main runtime interfaces - prefixed with "I" for clarity
export type {
	Component as IComponent,
	Layer as ILayer,
	SceneBuilder as ISceneBuilder,
	ComponentContext as IComponentContext,
	ComponentBuilder as IComponentBuilder,
	StateManager as IStateManager,
	ComponentHook as IComponentHook,
	ComponentBuildStrategy as IComponentBuildStrategy,
} from './types.js';

