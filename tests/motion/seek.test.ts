import { describe, expect, it } from 'vitest';
import { gsap } from 'gsap';
import { seekTimeline } from '../../src/lib/motion/seek.js';

// Two tweens overlap on one property, as a short word's hold and exit did in speaker-depth.
function build() {
	const o = { scale: 1 };
	const tl = gsap.timeline({ paused: true });
	tl.to(o, { scale: 2, duration: 1, ease: 'none' }, 0);
	tl.to(o, { scale: 0.5, duration: 0.2, ease: 'none' }, 0.5);
	tl.to(o, { scale: 1.2, duration: 1, ease: 'none' }, 1.2);
	tl.progress(1, true).progress(0, true);
	return { o, tl };
}

const times = Array.from({ length: 31 }, (_, i) => i / 12);

function valuesIn(order: number[]) {
	const { o, tl } = build();
	const out = new Map<number, number>();
	for (const t of order) {
		seekTimeline(tl, t);
		out.set(t, o.scale);
	}
	return times.map((t) => out.get(t));
}

describe('seekTimeline', () => {
	it('gives the same value for a time whatever order the frames are visited in', () => {
		const forward = valuesIn(times);
		const backward = valuesIn([...times].reverse());
		const shuffled = valuesIn(times.map((_, i) => times[(i * 7) % times.length]));
		expect(backward).toEqual(forward);
		expect(shuffled).toEqual(forward);
	});

	it('differs from a plain seek on overlapping tweens (the case it exists for)', () => {
		const { o, tl } = build();
		tl.seek(2.5, true);
		tl.seek(0.6, true);
		const plain = o.scale;
		seekTimeline(tl, 0.6);
		expect(o.scale).not.toBe(plain);
	});
});
