import { describe, expect, it } from 'vitest';
import { createFfmpegImagePipeArgs, createMuxAudioArgs, PipeFrameEncoder } from '$lib/agent';

describe('agent streaming encoder helpers', () => {
	it('builds image2pipe args for jpg frames', () => {
		const args = createFfmpegImagePipeArgs({
			fps: 30,
			inputExt: 'jpg',
			outputPath: '/tmp/out.mp4',
			crf: 16,
			preset: 'veryfast'
		});

		expect(args).toContain('image2pipe');
		expect(args).toContain('mjpeg');
		expect(args).toContain('libx264');
		expect(args).toContain('/tmp/out.mp4');
	});

	it('builds image2pipe args for png frames', () => {
		const args = createFfmpegImagePipeArgs({
			fps: 25,
			inputExt: 'png',
			outputPath: '/tmp/out.mp4'
		});

		expect(args).toContain('png');
		expect(args).toContain('18');
		expect(args).toContain('veryfast');
	});

	it('builds audio mux args without re-encoding video', () => {
		const args = createMuxAudioArgs({
			videoPath: '/tmp/silent.mp4',
			audioPath: '/tmp/audio.wav',
			outputPath: '/tmp/final.mp4'
		});

		expect(args).toContain('copy');
		expect(args).toContain('aac');
		expect(args).toContain('apad');
		expect(args).toContain('/tmp/final.mp4');
	});

	it('rejects cleanly when ffmpeg cannot be spawned', async () => {
		const previous = process.env.FFMPEG_PATH;
		process.env.FFMPEG_PATH = '/tmp/visualfries-missing-ffmpeg-binary';
		try {
			const encoder = new PipeFrameEncoder({
				fps: 30,
				inputExt: 'png',
				outputPath: '/tmp/out.mp4'
			});

			let writeError: unknown;
			try {
				await encoder.writeFrame(Buffer.from('not an image'));
			} catch (error) {
				writeError = error;
			}

			if (writeError) {
				expect(String(writeError)).toMatch(/failed to start ffmpeg|ENOENT/);
			} else {
				await expect(encoder.finish()).rejects.toThrow(/failed to start ffmpeg|ENOENT/);
			}
		} finally {
			if (previous === undefined) delete process.env.FFMPEG_PATH;
			else process.env.FFMPEG_PATH = previous;
		}
	});
});
