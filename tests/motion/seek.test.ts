import { describe, expect, it } from 'vitest';
import { gsap } from 'gsap';
import { seekTimeline } from '../../src/lib/motion/seek.js';

// Overlaps the way blocks produce them: a hold under an exit, two tweens starting together (an
// intro and a hit), a delayed fromTo, and sets at 0 and later.
function build() {
	const o = { scale: 1, cam: 1.5, flash: 0, mode: 0 };
	const tl = gsap.timeline({ paused: true });
	tl.to(o, { scale: 2, duration: 1, ease: 'none' }, 0);
	tl.to(o, { scale: 0.5, duration: 0.2, ease: 'none' }, 0.5);
	tl.to(o, { scale: 1.2, duration: 1, ease: 'none' }, 1.2);
	tl.to(o, { cam: 1, duration: 1.15, ease: 'expo.inOut' }, 0.3);
	tl.to(o, { cam: 1.12, duration: 0.5, ease: 'expo.out' }, 0.3);
	tl.fromTo(o, { flash: 0.6 }, { flash: 0, duration: 0.55, immediateRender: false }, 0.3);
	tl.fromTo(o, { flash: 0.4 }, { flash: 0, duration: 0.55, immediateRender: false }, 0.5);
	tl.set(o, { mode: 1 }, 0);
	tl.set(o, { mode: 2 }, 0.3);
	// what useTimeline does after build: record every start value once
	tl.progress(1, true).progress(0, true);
	return { o, tl };
}

const snap = (o: { scale: number; cam: number; flash: number; mode: number }) => ({
	scale: o.scale,
	cam: o.cam,
	flash: o.flash,
	mode: o.mode
});

const times = [0, 0.3, 0.3 + 1 / 30, 0.5, 0.55, 0.6, 1, 1.2, 1.5, 2.2, 2.5];

// Ground truth: a fresh page per frame, which is what `visualfries still` does.
const fresh = times.map((t) => {
	const { o, tl } = build();
	seekTimeline(tl, t);
	return snap(o);
});

function visit(order: number[]) {
	const { o, tl } = build();
	const out = new Map<number, ReturnType<typeof snap>>();
	for (const t of order) {
		seekTimeline(tl, t);
		out.set(t, snap(o));
	}
	return times.map((t) => out.get(t));
}

describe('seekTimeline', () => {
	it('matches a freshly built timeline for every frame, whatever the visiting order', () => {
		expect(visit(times)).toEqual(fresh);
		expect(visit([...times].reverse())).toEqual(fresh);
		expect(visit([0.3, 0, 2.5, 0.3, 0, 0.55, 1, 0.5, 0.6, 1.2, 1.5, 2.2, 1 / 30 + 0.3])).toEqual(fresh);
	});

	it('restores frame 0 after visiting tweens that start together', () => {
		const { o, tl } = build();
		seekTimeline(tl, 0);
		const first = snap(o);
		seekTimeline(tl, 0.3);
		seekTimeline(tl, 0);
		expect(snap(o)).toEqual(first);
		expect(o.cam).toBe(1.5);
	});

	it('fixes what a plain seek gets wrong', () => {
		const { o, tl } = build();
		tl.seek(2.5, true);
		tl.seek(0.6, true);
		const plain = o.scale;
		seekTimeline(tl, 0.6);
		expect(o.scale).not.toBe(plain);
	});

	// Known limit, documented in /docs/determinism: GSAP's iteration bookkeeping inside a repeating
	// child timeline is not reset by rewinding the parent. Kept as a test so a change shows up here.
	it('does not cover overlapping repeat/yoyo child timelines (documented limit)', () => {
		const make = () => {
			const o = { x: 0 };
			const tl = gsap.timeline({ paused: true });
			tl.add(
				gsap
					.timeline({ repeat: 1 })
					.fromTo(o, { x: 0 }, { x: 1, duration: 0.5, ease: 'none', immediateRender: false }, 0.5),
				0
			);
			tl.add(gsap.timeline({ repeat: 1, yoyo: true }).to(o, { x: 0, duration: 0.5, ease: 'none' }, 0.5), 0.5);
			tl.to({}, { duration: 5 - tl.duration() });
			tl.progress(1, true).progress(0, true);
			return { o, tl };
		};
		const fresh = make();
		seekTimeline(fresh.tl, 40 / 30);
		const reused = make();
		seekTimeline(reused.tl, 30 / 30);
		seekTimeline(reused.tl, 40 / 30);
		expect(reused.o.x).not.toBe(fresh.o.x);
	});
});
