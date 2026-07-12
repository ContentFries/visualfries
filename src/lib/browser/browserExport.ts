import {
	AudioBufferSource,
	BufferTarget,
	CanvasSource,
	Mp4OutputFormat,
	Output,
	QUALITY_HIGH,
	StreamTarget,
	getFirstEncodableAudioCodec,
	getFirstEncodableVideoCodec,
	type StreamTargetChunk
} from 'mediabunny';

export const BROWSER_EXPORT_FALLBACK = 'deterministic-local-ffmpeg' as const;

export type BrowserExportCapabilityRequest = {
	width: number;
	height: number;
	fps: number;
	videoBitrate?: number;
	audio?: boolean;
	audioBitrate?: number;
	sampleRate?: number;
	numberOfChannels?: number;
};

export type BrowserExportCapabilityReport = {
	supported: boolean;
	container: 'mp4';
	videoCodec: 'avc' | null;
	audioCodec: 'aac' | null;
	reasons: string[];
	fallback: typeof BROWSER_EXPORT_FALLBACK;
};

type CapabilityDependencies = {
	getVideoCodec: typeof getFirstEncodableVideoCodec;
	getAudioCodec: typeof getFirstEncodableAudioCodec;
};

const defaultCapabilityDependencies: CapabilityDependencies = {
	getVideoCodec: getFirstEncodableVideoCodec,
	getAudioCodec: getFirstEncodableAudioCodec
};

/** Probe exact MVP codecs. A different codec is not silently substituted into an MP4. */
export async function probeBrowserExportCapabilities(
	request: BrowserExportCapabilityRequest,
	dependencies: CapabilityDependencies = defaultCapabilityDependencies
): Promise<BrowserExportCapabilityReport> {
	const reasons: string[] = [];
	const videoCodec = await dependencies.getVideoCodec(['avc'], {
		width: request.width,
		height: request.height,
		bitrate: request.videoBitrate ?? QUALITY_HIGH
	});

	if (videoCodec !== 'avc') {
		reasons.push(`AVC/H.264 encoding unavailable at ${request.width}x${request.height}`);
	}

	let audioCodec: 'aac' | null = null;
	if (request.audio !== false) {
		const result = await dependencies.getAudioCodec(['aac'], {
			numberOfChannels: request.numberOfChannels ?? 2,
			sampleRate: request.sampleRate ?? 48_000,
			bitrate: request.audioBitrate ?? 192_000
		});
		audioCodec = result === 'aac' ? 'aac' : null;
		if (!audioCodec) {
			reasons.push('AAC encoding unavailable');
		}
	}

	return {
		supported: reasons.length === 0,
		container: 'mp4',
		videoCodec: videoCodec === 'avc' ? 'avc' : null,
		audioCodec,
		reasons,
		fallback: BROWSER_EXPORT_FALLBACK
	};
}

export type BrowserExportFrame = {
	frameIndex: number;
	timestamp: number;
	duration: number;
	progress: number;
};

export type BrowserExportOptions = Omit<BrowserExportCapabilityRequest, 'audio'> & {
	canvas: HTMLCanvasElement | OffscreenCanvas;
	duration: number;
	renderFrame: (frame: BrowserExportFrame) => void | Promise<void>;
	audioBuffer?: AudioBuffer;
	/** Positional stream: its sink must honor each StreamTargetChunk.position (not append blindly). */
	writable?: WritableStream<StreamTargetChunk>;
	onProgress?: (progress: number, frameIndex: number) => void;
};

export type BrowserExportResult = {
	buffer: ArrayBuffer | null;
	mimeType: 'video/mp4';
	frameCount: number;
	duration: number;
	capabilities: BrowserExportCapabilityReport;
};

export class BrowserExportUnsupportedError extends Error {
	readonly capabilities: BrowserExportCapabilityReport;

	constructor(capabilities: BrowserExportCapabilityReport) {
		super(
			`Browser export unavailable: ${capabilities.reasons.join('; ')}. ` +
				`Use ${capabilities.fallback}.`
		);
		this.name = 'BrowserExportUnsupportedError';
		this.capabilities = capabilities;
	}
}

/**
 * Deterministic canvas-to-MP4 path. Every await on source.add() propagates encoder/writer
 * backpressure; no image serialization or frame queue exists between compositor and encoder.
 */
export async function exportCanvasToMp4(
	options: BrowserExportOptions
): Promise<BrowserExportResult> {
	if (!Number.isFinite(options.duration) || options.duration <= 0) {
		throw new Error('Browser export duration must be a positive finite number');
	}
	if (!Number.isFinite(options.fps) || options.fps <= 0) {
		throw new Error('Browser export FPS must be a positive finite number');
	}
	if (
		options.audioBuffer &&
		options.audioBuffer.duration > options.duration + 1 / options.audioBuffer.sampleRate
	) {
		throw new Error(
			`Audio duration ${options.audioBuffer.duration.toFixed(6)}s exceeds video duration ` +
				`${options.duration.toFixed(6)}s`
		);
	}

	const capabilities = await probeBrowserExportCapabilities({
		width: options.width,
		height: options.height,
		fps: options.fps,
		videoBitrate: options.videoBitrate,
		audio: Boolean(options.audioBuffer),
		audioBitrate: options.audioBitrate,
		sampleRate: options.audioBuffer?.sampleRate ?? options.sampleRate,
		numberOfChannels: options.audioBuffer?.numberOfChannels ?? options.numberOfChannels
	});
	if (!capabilities.supported) {
		throw new BrowserExportUnsupportedError(capabilities);
	}

	if (options.canvas.width !== options.width || options.canvas.height !== options.height) {
		throw new Error(
			`Canvas size ${options.canvas.width}x${options.canvas.height} does not match export ` +
				`${options.width}x${options.height}`
		);
	}

	const frameCount = Math.round(options.duration * options.fps);
	const frameDuration = 1 / options.fps;
	const target = options.writable
		? new StreamTarget(options.writable, { chunked: true, chunkSize: 4 * 1024 * 1024 })
		: new BufferTarget();
	const output = new Output({
		// BufferTarget already owns the finished file. Avoid a second full media copy for fast-start.
		format: new Mp4OutputFormat({ fastStart: options.writable ? 'reserve' : false }),
		target
	});
	const videoSource = new CanvasSource(options.canvas, {
		codec: 'avc',
		bitrate: options.videoBitrate ?? QUALITY_HIGH,
		keyFrameInterval: 2
	});
	output.addVideoTrack(videoSource, {
		frameRate: options.fps,
		maximumPacketCount: Math.ceil(frameCount * 1.05)
	});

	let audioSource: AudioBufferSource | undefined;
	if (options.audioBuffer) {
		audioSource = new AudioBufferSource({
			codec: 'aac',
			bitrate: options.audioBitrate ?? 192_000
		});
		output.addAudioTrack(audioSource, {
			maximumPacketCount: Math.ceil(options.duration * 100 * 1.33)
		});
	}

	await output.start();
	try {
		// AudioBufferSource places its first sample at timestamp zero. It can encode in
		// parallel with video while both sources apply backpressure to the same output.
		// Audio is small relative to video and first AudioBuffer is guaranteed to start at zero.
		// Adding it first surfaces encoder failure before expensive video composition begins.
		if (audioSource) await audioSource.add(options.audioBuffer!);
		for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
			const timestamp = frameIndex / options.fps;
			await options.renderFrame({
				frameIndex,
				timestamp,
				duration: frameDuration,
				progress: frameCount <= 1 ? 1 : frameIndex / (frameCount - 1)
			});
			await videoSource.add(timestamp, frameDuration);
			options.onProgress?.((frameIndex + 1) / frameCount, frameIndex);
		}
		await output.finalize();
	} catch (error) {
		if (output.state !== 'finalized' && output.state !== 'canceled') {
			await output.cancel();
		}
		throw error;
	}

	return {
		buffer: target instanceof BufferTarget ? target.buffer : null,
		mimeType: 'video/mp4',
		frameCount,
		duration: frameCount / options.fps,
		capabilities
	};
}

export type BrowserAudioTone = {
	start: number;
	end: number;
	frequency: number;
	gain?: number;
	pan?: number;
};

/** Minimal deterministic in-browser MVP mix. First sample begins at t=0. */
export async function mixBrowserAudio(options: {
	duration: number;
	tone?: BrowserAudioTone[];
	source?: AudioBuffer;
	sourceGain?: number;
	sampleRate?: number;
}): Promise<AudioBuffer> {
	const sampleRate = options.sampleRate ?? 48_000;
	const context = new OfflineAudioContext(2, Math.ceil(options.duration * sampleRate), sampleRate);
	const master = context.createGain();
	master.gain.value = 0.92;
	master.connect(context.destination);

	if (options.source) {
		const source = context.createBufferSource();
		const gain = context.createGain();
		source.buffer = options.source;
		gain.gain.value = options.sourceGain ?? 1;
		source.connect(gain).connect(master);
		source.start(0);
	}

	for (const tone of options.tone ?? []) {
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		const panner = context.createStereoPanner();
		oscillator.frequency.value = tone.frequency;
		oscillator.type = 'sine';
		panner.pan.value = tone.pan ?? 0;
		const level = tone.gain ?? 0.08;
		gain.gain.setValueAtTime(0, tone.start);
		gain.gain.linearRampToValueAtTime(level, tone.start + 0.01);
		gain.gain.setValueAtTime(level, Math.max(tone.start + 0.01, tone.end - 0.03));
		gain.gain.linearRampToValueAtTime(0, tone.end);
		oscillator.connect(gain).connect(panner).connect(master);
		oscillator.start(tone.start);
		oscillator.stop(tone.end);
	}

	return context.startRendering();
}
