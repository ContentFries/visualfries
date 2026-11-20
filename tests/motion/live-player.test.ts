import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StageSegment } from '../../src/lib/motion/segments.js';

// The player's page shell, with the scene and the proxy videos stubbed: what it does with the
// clock, the sound and the footage when the host plays, pauses, seeks and destroys it.

const footage = {
	stats: { resyncs: 0, drift: [], stalls: 0 },
	live: true,
	tick: vi.fn(),
	align: vi.fn(),
	preroll: vi.fn(),
	settled: vi.fn(async () => {}),
	picture: vi.fn(),
	reset: vi.fn(),
	destroy: vi.fn(),
	create: vi.fn(),
	show: vi.fn()
};

vi.mock('../../src/lib/motion/program-stage.js', () => ({
	createProgramScene: () => ({
		ready: [],
		seek() {},
		draw: async () => {},
		destroy() {}
	})
}));
vi.mock('../../src/lib/motion/live-footage.js', () => ({
	createLiveFootage: () => footage
}));

const { createProgramPlayer } = await import('../../src/lib/motion/live-player.js');

/** An <audio> whose `play()` the test settles (`started`), like a browser waiting for data. */
class FakeAudio {
	static last: FakeAudio;
	currentTime = 0;
	paused = true;
	readyState = 4;
	src = '';
	crossOrigin = '';
	preload = '';
	#pending: { resolve(): void; reject(e: Error): void } | null = null;
	constructor() {
		FakeAudio.last = this;
	}
	play() {
		return new Promise<void>((resolve, reject) => {
			this.#pending = {
				resolve: () => {
					this.paused = false;
					resolve();
				},
				reject
			};
		});
	}
	/** The sound starts playing. */
	started() {
		this.#pending?.resolve();
		this.#pending = null;
	}
	pause() {
		this.paused = true;
		this.#pending?.reject(new Error('AbortError'));
		this.#pending = null;
	}
	removeAttribute() {}
}

const fps = 25;
const segment = {
	id: 'all',
	fps,
	startFrame: 0,
	frames: 250,
	size: [1920, 1080],
	clips: [],
	shots: [],
	transitions: [],
	footage: {},
	footageMap: null
} as unknown as StageSegment;

async function player(audio = true) {
	const host = document.createElement('div');
	document.body.appendChild(host);
	return createProgramPlayer(host, segment, {}, {}, { footage: {}, audio: audio ? 'a.m4a' : null });
}

/** Lets pending promises run. */
const flush = async () => {
	for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
	vi.stubGlobal('Audio', FakeAudio);
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		}
	);
	Object.defineProperty(document, 'fonts', {
		configurable: true,
		value: { ready: Promise.resolve(), add() {}, delete() {}, load: async () => [] }
	});
	for (const fn of Object.values(footage)) if (vi.isMockFunction(fn)) fn.mockClear();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('live player: starting with the sound', () => {
	it('plays once the sound does, from where the sound is', async () => {
		const p = await player();
		const playing = p.play();
		FakeAudio.last.currentTime = 0.04;
		FakeAudio.last.started();
		await playing;
		expect(p.playing).toBe(true);
		expect(p.time).toBeCloseTo(0.04);
		p.destroy();
	});

	it('does not start after a pause while the sound was starting', async () => {
		const p = await player();
		const playing = p.play();
		p.pause();
		await playing;
		expect(p.playing).toBe(false);
		vi.advanceTimersByTime(500);
		expect(p.time).toBe(0);
		p.destroy();
	});

	it('does not start after destroy while the sound was starting', async () => {
		const p = await player();
		const playing = p.play();
		p.destroy();
		FakeAudio.last.started();
		await playing;
		expect(p.playing).toBe(false);
		await p.play();
		expect(p.playing).toBe(false);
	});

	it('starts where a seek while the sound was starting put it', async () => {
		const p = await player();
		const playing = p.play();
		const seeking = p.seek(3);
		await flush();
		vi.advanceTimersByTime(50);
		await seeking;
		FakeAudio.last.started();
		await playing;
		expect(p.playing).toBe(true);
		expect(p.time).toBeCloseTo(3);
		p.destroy();
	});
});

describe('live player: a buffering sound', () => {
	it('holds the picture at the sound while it buffers, and the videos with it', async () => {
		const p = await player();
		const playing = p.play();
		FakeAudio.last.started();
		await playing;
		const audio = FakeAudio.last;
		audio.currentTime = 9.5;
		audio.readyState = 2;
		footage.tick.mockClear();
		// Two seconds of buffering at the end of a ten-second program: no running on to the end.
		for (let i = 0; i < 125; i++) vi.advanceTimersByTime(16);
		expect(p.playing).toBe(true);
		expect(p.time).toBeCloseTo(9.5);
		expect(footage.tick.mock.calls.at(-1)?.[2]).toBe(false);
		// Data again: the clock follows the sound on.
		audio.readyState = 4;
		audio.currentTime = 9.6;
		vi.advanceTimersByTime(16);
		expect(p.time).toBeCloseTo(9.6, 1);
		expect(footage.tick.mock.calls.at(-1)?.[2]).toBe(true);
		p.destroy();
	});
});

describe('live player: explicit seeks', () => {
	it('jumps the videos too while playing and waits for them', async () => {
		const p = await player(false);
		await p.play();
		vi.advanceTimersByTime(1000);
		let settle = () => {};
		footage.settled.mockImplementationOnce(() => new Promise<void>((r) => (settle = r)));
		let done = false;
		const seeking = p.seek(p.time + 0.2).then(() => (done = true));
		expect(footage.align).toHaveBeenCalledTimes(1);
		expect(footage.align.mock.calls[0][0]).toBeCloseTo(1.2, 1);
		vi.advanceTimersByTime(100);
		await flush();
		expect(done).toBe(false);
		settle();
		await flush();
		vi.advanceTimersByTime(50);
		await seeking;
		expect(done).toBe(true);
		p.destroy();
	});
});
