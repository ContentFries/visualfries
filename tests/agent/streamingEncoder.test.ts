import { describe, expect, it } from 'vitest';
import { createFfmpegImagePipeArgs, createMuxAudioArgs } from '$lib/agent';

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
		expect(args).toContain('/tmp/final.mp4');
	});
});
