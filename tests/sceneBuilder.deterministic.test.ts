import { describe, expect, it, vi } from 'vitest';

import { SceneBuilder } from '$lib/SceneBuilder.svelte.ts';
import { CommandType } from '$lib/commands/CommandTypes.ts';

const blobToBytes = async (blob: Blob): Promise<Uint8Array> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
		reader.readAsArrayBuffer(blob);
	});

const createSceneBuilder = (
	stateOverrides: Partial<any> = {},
	runImpl?: (cmd: CommandType, props?: unknown) => unknown
) => {
	const stateManager = {
		environment: 'server',
		state: 'paused',
		isPlaying: false,
		duration: 10,
		currentTime: 0,
		scale: 1,
		isDirty: false,
		data: {
			id: 'scene-test',
			settings: {
				fps: 30,
				duration: 10,
				width: 1920,
				height: 1080,
				backgroundColor: '#000000'
			},
			layers: [],
			assets: [],
			transitions: [],
			audioTracks: []
		},
		disabledTimeZones: [],
		updateLayers: vi.fn(),
		setStartAt: vi.fn(),
		setEndAt: vi.fn(),
		markDirty: vi.fn(),
		setRenderAfterLoadingFinished: vi.fn(),
		...stateOverrides
	};

	const commandRunner = {
		run: vi.fn(async (commandType: CommandType, props?: unknown) => {
			if (commandType === CommandType.SEEK) {
				stateManager.currentTime = (props as { time?: number } | undefined)?.time ?? stateManager.currentTime;
			}
			if (runImpl) {
				return runImpl(commandType, props);
			}
			if (commandType === CommandType.RENDER_FRAME) {
				return 'frame';
			}
			return undefined;
		}),
		runSync: vi.fn(() => true)
	};

	return {
		builder: new SceneBuilder({
			timelineManager: { timeline: { timeScale: vi.fn() }, play: vi.fn(), pause: vi.fn() } as any,
			eventManager: { emit: vi.fn() } as any,
			domManager: { canvas: { toDataURL: vi.fn() }, htmlContainer: {}, removeLoader: vi.fn() } as any,
			appManager: { app: {}, initialize: vi.fn(), render: vi.fn(), destroy: vi.fn(), scale: vi.fn() } as any,
			layersManager: { setAppManager: vi.fn(), getAll: () => [], create: vi.fn(), getData: () => [] } as any,
			componentsManager: { destroy: vi.fn() } as any,
			stateManager,
			commandRunner: commandRunner as any,
			mediaManager: { destroy: vi.fn() } as any,
			deterministicMediaManager: {
				config: { enabled: true, strict: false, diagnostics: false },
				setProvider: vi.fn(),
				getProvider: vi.fn(),
				getDiagnosticsReport: vi.fn(() => null),
				destroy: vi.fn()
			} as any,
			subtitlesManager: { getSubtitlesCharactersList: () => [] } as any,
			fonts: []
		}),
		stateManager,
		commandRunner
	};
};

describe('SceneBuilder deterministic seek/readiness behavior', () => {
	it('seekAndRenderFrame in server mode avoids async render race and uses prepared seek state', async () => {
		const { builder, commandRunner } = createSceneBuilder();

		const frame = await builder.seekAndRenderFrame(1, undefined, 'png', 1);
		expect(frame).toBe('frame');
		expect(commandRunner.run).toHaveBeenCalledWith(CommandType.SEEK, { time: 1 });
		expect(commandRunner.run).toHaveBeenCalledWith(CommandType.RENDER_FRAME, {
			target: undefined,
			format: 'png',
			quality: 1,
			imageFormat: undefined,
			imageQuality: undefined
		});
		expect(commandRunner.runSync).not.toHaveBeenCalled();
	});

	it('isSceneDirty returns post-seek dirty state in server mode', async () => {
		const { builder, stateManager, commandRunner } = createSceneBuilder(
			{},
			(commandType: CommandType) => {
				if (commandType === CommandType.SEEK) {
					stateManager.isDirty = true;
				}
				return undefined;
			}
		);

		await expect(builder.isSceneDirty(2)).resolves.toBe(true);
		expect(commandRunner.run).toHaveBeenCalledWith(CommandType.SEEK, { time: 2 });
		expect(commandRunner.runSync).not.toHaveBeenCalled();
	});

	it('renderFrameRange skipDuplicates respects deterministic dirty updates without manual markDirty', async () => {
		const { builder, stateManager, commandRunner } = createSceneBuilder(
			{},
			(commandType: CommandType, props?: any) => {
				if (commandType === CommandType.SEEK) {
					const time = props?.time ?? 0;
					// Frame 0 changed, frame 1 unchanged.
					stateManager.isDirty = time === 0;
				}
				if (commandType === CommandType.RENDER_FRAME) {
					return `frame-${stateManager.currentTime}`;
				}
				return undefined;
			}
		);

		const received: Array<{ frameIndex: number; isDuplicate: boolean; frame: unknown }> = [];
		const summary = await builder.renderFrameRange({
			fromFrame: 0,
			toFrame: 2,
			skipDuplicates: true,
			format: 'png',
			onFrame: (item) => {
				received.push({ frameIndex: item.frameIndex, isDuplicate: item.isDuplicate, frame: item.frame });
			}
		});

		expect(summary.framesRendered).toBe(2);
		expect(summary.framesSkipped).toBe(1);
		const renderCalls = commandRunner.run.mock.calls.filter(
			([commandType]) => commandType === CommandType.RENDER_FRAME
		);
		const seekCalls = commandRunner.run.mock.calls.filter(
			([commandType]) => commandType === CommandType.SEEK
		);
		expect(renderCalls).toHaveLength(1);
		expect(seekCalls).toHaveLength(2);
		expect(received[0].isDuplicate).toBe(false);
		expect(received[1].isDuplicate).toBe(true);
		expect(received[0].frame).toBe(received[1].frame);
	});

	it('renderFrameRange forwards blob jpg encoding options and exposes mimeType for deterministic frames', async () => {
		const jpegSignature = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
		const { builder, commandRunner } = createSceneBuilder(
			{},
			(commandType: CommandType, props?: any) => {
				if (commandType === CommandType.RENDER_FRAME) {
					expect(props?.format).toBe('blob');
					expect(props?.imageFormat).toBe('jpg');
					expect(props?.imageQuality).toBe(0.68);
					return new Blob([jpegSignature], { type: 'image/jpeg' });
				}
				return undefined;
			}
		);

		const items: Array<{ frameIndex: number; mimeType?: string; frame: Blob }> = [];
		const summary = await builder.renderFrameRange({
			fromFrame: 0,
			toFrame: 2,
			format: 'blob',
			imageFormat: 'jpg',
			imageQuality: 0.68,
			onFrame: (item) => {
				items.push({
					frameIndex: item.frameIndex,
					mimeType: item.mimeType,
					frame: item.frame as Blob
				});
			}
		});

		expect(summary.framesRendered).toBe(2);
		expect(items).toHaveLength(2);
		expect(items[0].mimeType).toBe('image/jpeg');
		expect(items[1].mimeType).toBe('image/jpeg');

		const frameBytes = await blobToBytes(items[0].frame);
		expect(frameBytes[0]).toBe(0xff);
		expect(frameBytes[1]).toBe(0xd8);
		expect(frameBytes[2]).toBe(0xff);

		const renderCalls = commandRunner.run.mock.calls.filter(
			([commandType]) => commandType === CommandType.RENDER_FRAME
		);
		expect(renderCalls).toHaveLength(2);
	});

	it('renderFrameRange skipDuplicates=false performs exactly one seek and one render per frame', async () => {
		const { builder, commandRunner } = createSceneBuilder(
			{},
			(commandType: CommandType) => {
				if (commandType === CommandType.RENDER_FRAME) {
					return 'frame';
				}
				return undefined;
			}
		);

		await builder.renderFrameRange({
			fromFrame: 0,
			toFrame: 3,
			skipDuplicates: false,
			format: 'png',
			onFrame: () => {}
		});

		const seekCalls = commandRunner.run.mock.calls.filter(
			([commandType]) => commandType === CommandType.SEEK
		);
		const renderCalls = commandRunner.run.mock.calls.filter(
			([commandType]) => commandType === CommandType.RENDER_FRAME
		);
		expect(seekCalls).toHaveLength(3);
		expect(renderCalls).toHaveLength(3);
	});
});
