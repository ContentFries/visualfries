import { afterEach, describe, expect, it, vi } from 'vitest';
import { SceneBuilder } from '$lib/SceneBuilder.svelte.ts';

const originalFonts = (document as any).fonts;

const createBuilder = (overrides: {
	appManager?: any;
	layersManager?: any;
	commandRunner?: any;
} = {}) => {
	const stateManager = {
		environment: 'server',
		state: 'paused',
		isPlaying: false,
		duration: 10,
		currentTime: 0,
		scale: 1,
		isDirty: false,
		data: {
			id: 'scene-font-order',
			settings: {
				fps: 30,
				duration: 10,
				width: 1080,
				height: 1920,
				backgroundColor: '#000000'
			},
			assets: [],
			layers: [
				{
					id: 'layer-1',
					name: 'Layer 1',
					order: 0,
					visible: true,
					muted: false,
					components: [
						{
							id: 'text-1',
							type: 'TEXT',
							appearance: {
								text: {
									fontFamily: 'Raleway',
									fontWeight: '900',
									activeWord: {
										enabled: true,
										fontWeight: '700'
									}
								}
							}
						}
					]
				}
			],
			transitions: [],
			audioTracks: []
		},
		disabledTimeZones: [],
		updateLayers: vi.fn(),
		setStartAt: vi.fn(),
		setEndAt: vi.fn(),
		markDirty: vi.fn(),
		setRenderAfterLoadingFinished: vi.fn()
	};

	const appManager = overrides.appManager ?? {
		app: {},
		initialize: vi.fn(async () => undefined),
		render: vi.fn(),
		destroy: vi.fn(),
		scale: vi.fn()
	};
	const layersManager = overrides.layersManager ?? {
		setAppManager: vi.fn(),
		getAll: () => [],
		create: vi.fn(async () => undefined),
		getData: () => []
	};
	const commandRunner = overrides.commandRunner ?? {
		run: vi.fn(async () => undefined),
		runSync: vi.fn(() => true)
	};

	return {
		builder: new SceneBuilder({
			timelineManager: {
				timeline: { timeScale: vi.fn() },
				play: vi.fn(),
				pause: vi.fn(),
				destroy: vi.fn()
			} as any,
			eventManager: { emit: vi.fn(), isReady: false } as any,
			domManager: {
				canvas: { toDataURL: vi.fn() },
				htmlContainer: {},
				removeLoader: vi.fn(),
				destroy: vi.fn()
			} as any,
			appManager,
			layersManager,
			componentsManager: { destroy: vi.fn() } as any,
			stateManager: stateManager as any,
			commandRunner: commandRunner as any,
			mediaManager: { destroy: vi.fn() } as any,
			deterministicMediaManager: {
				config: { enabled: false, strict: false, diagnostics: false },
				setProvider: vi.fn(),
				getProvider: vi.fn(),
				getDiagnosticsReport: vi.fn(() => null),
				destroy: vi.fn()
			} as any,
			subtitlesManager: { getSubtitlesCharactersList: () => [] } as any,
			fonts: []
		}),
		appManager,
		layersManager
	};
};

afterEach(() => {
	vi.restoreAllMocks();
	Object.defineProperty(document, 'fonts', {
		configurable: true,
		value: originalFonts
	});
});

describe('SceneBuilder font preload ordering', () => {
	it('awaits descriptor preload before app initialization and scene build', async () => {
		let resolveDescriptorLoad: () => void = () => {};
		const descriptorGate = new Promise<void>((resolve) => {
			resolveDescriptorLoad = resolve;
		});

		Object.defineProperty(document, 'fonts', {
			configurable: true,
			value: {
				load: vi.fn(async () => {
					await descriptorGate;
					return [{}];
				}),
				ready: Promise.resolve([]),
				add: vi.fn()
			}
		});

		vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
			const element = node as HTMLLinkElement;
			if (element.tagName === 'LINK') {
				queueMicrotask(() => element.onload?.(new Event('load')));
			}
			return node;
		});

		const { builder, appManager, layersManager } = createBuilder();
		const initializePromise = builder.initialize();

		await Promise.resolve();
		await Promise.resolve();

		expect(appManager.initialize).not.toHaveBeenCalled();
		expect(layersManager.create).not.toHaveBeenCalled();

		resolveDescriptorLoad();
		await initializePromise;

		expect(appManager.initialize).toHaveBeenCalledTimes(1);
		expect(layersManager.create).toHaveBeenCalledTimes(1);
	});
});
