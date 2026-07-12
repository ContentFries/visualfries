import { describe, expect, it, vi } from 'vitest';
import {
	BROWSER_EXPORT_FALLBACK,
	exportCanvasToMp4,
	mixBrowserAudio,
	probeBrowserExportCapabilities
} from '../../src/lib/browser/browserExport.js';

describe('probeBrowserExportCapabilities', () => {
	it('accepts the exact AVC + AAC MP4 request', async () => {
		const report = await probeBrowserExportCapabilities(
			{ width: 1080, height: 1920, fps: 30, audio: true },
			{
				getVideoCodec: vi.fn(async () => 'avc'),
				getAudioCodec: vi.fn(async () => 'aac')
			}
		);

		expect(report).toMatchObject({
			supported: true,
			container: 'mp4',
			videoCodec: 'avc',
			audioCodec: 'aac',
			reasons: []
		});
	});

	it('reports codec failures and preserves the FFmpeg fallback', async () => {
		const report = await probeBrowserExportCapabilities(
			{ width: 1080, height: 1920, fps: 30, audio: true },
			{
				getVideoCodec: vi.fn(async () => null),
				getAudioCodec: vi.fn(async () => null)
			}
		);

		expect(report.supported).toBe(false);
		expect(report.reasons).toEqual([
			'AVC/H.264 encoding unavailable at 1080x1920',
			'AAC encoding unavailable'
		]);
		expect(report.fallback).toBe(BROWSER_EXPORT_FALLBACK);
	});

	it('does not require AAC for a deliberately silent export', async () => {
		const getAudioCodec = vi.fn(async () => null);
		const report = await probeBrowserExportCapabilities(
			{ width: 1080, height: 1920, fps: 30, audio: false },
			{
				getVideoCodec: vi.fn(async () => 'avc'),
				getAudioCodec
			}
		);

		expect(report.supported).toBe(true);
		expect(report.audioCodec).toBeNull();
		expect(getAudioCodec).not.toHaveBeenCalled();
	});

	it('does not require AAC when audio is omitted', async () => {
		const getAudioCodec = vi.fn(async () => null);
		const report = await probeBrowserExportCapabilities(
			{ width: 1080, height: 1920, fps: 30 },
			{
				getVideoCodec: vi.fn(async () => 'avc'),
				getAudioCodec
			}
		);

		expect(report.supported).toBe(true);
		expect(report.audioCodec).toBeNull();
		expect(getAudioCodec).not.toHaveBeenCalled();
	});

	it('rejects audio longer than the frame-index video window', async () => {
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;

		await expect(
			exportCanvasToMp4({
				canvas,
				width: 1,
				height: 1,
				fps: 30,
				duration: 1,
				audioBuffer: { duration: 2, sampleRate: 48_000 } as AudioBuffer,
				renderFrame: () => {}
			})
		).rejects.toThrow('exceeds video duration');
	});

	it.each([0, -1, Number.NaN])('rejects invalid browser audio duration %s', async (duration) => {
		await expect(mixBrowserAudio({ duration })).rejects.toThrow(
			'Browser audio duration must be a positive finite number'
		);
	});
});
