import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RenderFrameCommand } from '$lib/commands/RenderFrameCommand.ts';

describe('RenderFrameCommand deterministic cache guard', () => {
	let stateManager: any;
	let domManager: any;
	let appManager: any;
	let deterministicMediaManager: any;
	let command: RenderFrameCommand;
	let toDataUrlSpy: any;

	beforeEach(() => {
		toDataUrlSpy = vi.fn(() => 'data:image/png;base64,frame');
		stateManager = {
			environment: 'server',
			isDirty: false,
			clearDirty: vi.fn()
		};
		domManager = {
			canvas: {
				toDataURL: toDataUrlSpy
			}
		};
		appManager = {
			render: vi.fn()
		};
		deterministicMediaManager = {
			isEnabled: vi.fn(() => true),
			getFingerprint: vi.fn(() => 'fingerprint-1')
		};

		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			callback(0);
			return 1;
		});

		command = new RenderFrameCommand({
			stateManager,
			domManager,
			appManager,
			deterministicMediaManager
		} as any);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reuses cached frame only when deterministic fingerprint matches', async () => {
		const args = { format: 'png', quality: 1, target: null };

		const first = await command.execute(args);
		const second = await command.execute(args);

		expect(first).toBe('data:image/png;base64,frame');
		expect(second).toBe('data:image/png;base64,frame');
		expect(toDataUrlSpy).toHaveBeenCalledTimes(1);

		deterministicMediaManager.getFingerprint.mockReturnValue('fingerprint-2');
		await command.execute(args);

		expect(toDataUrlSpy).toHaveBeenCalledTimes(2);
	});
});
