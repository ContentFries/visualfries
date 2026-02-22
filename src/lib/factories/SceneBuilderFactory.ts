import type {
	Scene,
	RenderEnvironment,
	Subtitle,
	FontType,
	SubtitleCollection
} from '$lib';
import type { DeterministicMediaConfig } from '$lib/schemas/runtime/deterministic.js';
import {
	DeterministicMediaConfigShape,
	defaultDeterministicMediaConfig
} from '$lib/schemas/runtime/deterministic.js';
import { asClass, Lifetime } from 'awilix/browser';
import { registerNewContainer } from '$lib/DIContainer.js';
import { SceneBuilder } from '$lib/SceneBuilder.svelte.js';
import { get } from 'lodash-es';
import type { FontProvider } from '$lib/fonts/types.js';
import { setFontProviders } from '$lib/fonts/fontLoader.js';

class SceneBuilderFactory {
	private scene: SceneBuilder;

	constructor(cradle: { sceneBuilder: SceneBuilder }) {
		this.scene = cradle.sceneBuilder;
	}

	getInstance() {
		return this.scene;
	}
}

type Config = {
	environment: RenderEnvironment;
	subtitles: Record<string, Subtitle[]> | Record<string, SubtitleCollection>;
	fonts: FontType[];
	forceCanvas: boolean;
	serverRendererMode: 'canvas' | 'webgl';
	preferWebGL2: boolean;
	powerPreference: 'default' | 'high-performance' | 'low-power';
	scale: number;
	autoPlay?: boolean;
	loop?: boolean;
	fontProviders?: FontProvider[];
	deterministicMedia: DeterministicMediaConfig;
};

const defaultConfig: Config = {
	environment: 'client',
	subtitles: {},
	fonts: [],
	forceCanvas: false,
	serverRendererMode: 'canvas',
	preferWebGL2: true,
	powerPreference: 'high-performance',
	scale: 1,
	autoPlay: false,
	loop: false,
	deterministicMedia: defaultDeterministicMediaConfig
};

export const createSceneBuilder = async function (
	sceneData: Scene,
	container: HTMLDivElement,
	config?: Partial<Config>
) {
	setFontProviders(config?.fontProviders);
	const sceneConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
	sceneConfig.deterministicMedia = DeterministicMediaConfigShape.parse(
		config?.deterministicMedia ?? defaultConfig.deterministicMedia
	);
	const sceneSubs = get(sceneData, 'settings.subtitles.data', null);
	const subs = sceneSubs ? sceneSubs : sceneConfig.subtitles;

	const childContainer = registerNewContainer(sceneData, [
		['environment', sceneConfig.environment],
		['containerElement', container],
		['subtitles', subs],
		['fonts', sceneConfig.fonts],
		['forceCanvas', sceneConfig.forceCanvas],
		['serverRendererMode', sceneConfig.serverRendererMode],
		['preferWebGL2', sceneConfig.preferWebGL2],
		['powerPreference', sceneConfig.powerPreference],
		['scale', sceneConfig.scale],
		['autoPlay', sceneConfig.autoPlay],
		['loop', sceneConfig.loop],
		['deterministicMediaConfig', sceneConfig.deterministicMedia]
	] as const);

	// Register the factory
	childContainer.register({
		sceneBuilderFactory: asClass(SceneBuilderFactory, { lifetime: Lifetime.SINGLETON })
	});

	const factory = childContainer.resolve<SceneBuilderFactory>('sceneBuilderFactory');
	const instance = factory.getInstance();
	instance.buildCharactersList();
	await instance.initialize();

	if (sceneConfig.autoPlay) {
		instance.play();
	}

	return instance;
};
