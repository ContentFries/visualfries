import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RenderFrameCommand } from '$lib/commands/RenderFrameCommand.ts';

describe('RenderFrameCommand deterministic cache guard', () => {
	let stateManager: any;
	let domManager: any;
	let appManager: any;
	let deterministicMediaManager: any;
	let command: RenderFrameCommand;
	let toDataUrlSpy: any;
	let toBlobSpy: any;

	const toBytes = async (blob: Blob): Promise<Uint8Array> =>
		new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
			reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
			reader.readAsArrayBuffer(blob);
		});

	beforeEach(() => {
		toDataUrlSpy = vi.fn(() => 'data:image/png;base64,frame');
		toBlobSpy = vi.fn((callback: BlobCallback, mimeType?: string) => {
			const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
			callback(new Blob([pngSignature], { type: mimeType ?? 'image/png' }));
		});
		stateManager = {
			environment: 'server',
			isDirty: false,
			clearDirty: vi.fn()
		};
		domManager = {
			canvas: {
				toDataURL: toDataUrlSpy,
				toBlob: toBlobSpy
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

	it('encodes blob as JPEG when imageFormat is jpg', async () => {
		toBlobSpy.mockImplementation((callback: BlobCallback, mimeType?: string) => {
			const jpegSignature = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
			callback(new Blob([jpegSignature], { type: mimeType ?? 'image/jpeg' }));
		});

		const blob = (await command.execute({
			format: 'blob',
			quality: 1,
			imageFormat: 'jpg',
			imageQuality: 0.72,
			target: null
		})) as Blob;

		expect(blob).toBeInstanceOf(Blob);
		expect(blob.type).toBe('image/jpeg');
		expect(toBlobSpy).toHaveBeenCalled();
		const call = toBlobSpy.mock.calls[0];
		expect(call[1]).toBe('image/jpeg');
		expect(call[2]).toBe(0.72);
		const bytes = await toBytes(blob);
		expect(bytes[0]).toBe(0xff);
		expect(bytes[1]).toBe(0xd8);
		expect(bytes[2]).toBe(0xff);
	});

	it('encodes blob as PNG when imageFormat is png', async () => {
		toBlobSpy.mockImplementation((callback: BlobCallback, mimeType?: string) => {
			const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
			callback(new Blob([pngSignature], { type: mimeType ?? 'image/png' }));
		});

		const blob = (await command.execute({
			format: 'blob',
			quality: 1,
			imageFormat: 'png',
			target: null
		})) as Blob;

		expect(blob.type).toBe('image/png');
		const call = toBlobSpy.mock.calls[0];
		expect(call[1]).toBe('image/png');
		const bytes = await toBytes(blob);
		expect(bytes[0]).toBe(0x89);
		expect(bytes[1]).toBe(0x50);
		expect(bytes[2]).toBe(0x4e);
		expect(bytes[3]).toBe(0x47);
	});

	it('keeps backward-compatible default blob behavior when imageFormat is omitted', async () => {
		const blob = (await command.execute({
			format: 'blob',
			quality: 1,
			target: null
		})) as Blob;

		const call = toBlobSpy.mock.calls[0];
		expect(call[1]).toBeUndefined();
		expect(blob.type).toBe('image/png');
		const bytes = await toBytes(blob);
		expect(bytes[0]).toBe(0x89);
		expect(bytes[1]).toBe(0x50);
		expect(bytes[2]).toBe(0x4e);
		expect(bytes[3]).toBe(0x47);
	});

	it('throws clear error when canvas.toBlob returns null', async () => {
		toBlobSpy.mockImplementation((callback: BlobCallback) => {
			callback(null);
		});

		await expect(
			command.execute({
				format: 'blob',
				quality: 1,
				imageFormat: 'jpg',
				target: null
			})
		).rejects.toThrow(/canvas\.toBlob returned null/);
	});
});
