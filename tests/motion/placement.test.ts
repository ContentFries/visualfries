import { describe, expect, it } from 'vitest';
import { parseFcpxmlCuts, placeClips } from '$lib/motion/placement.js';

// shape of a DaVinci Resolve 19 export: spine clips with nested audio-only connected clips,
// plus a connected B-roll (video) on lane 1
const FCPXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources><format id="r0" frameDuration="1/25s" width="1920" height="1080"/></resources>
  <library><event><project name="t"><sequence duration="250/25s" format="r0">
    <spine>
      <clip offset="0/1s" duration="101/25s" start="459/5s" name="kamera1.MP4">
        <video ref="r1" offset="0/1s" start="0/1s" duration="44706/25s"/>
        <clip lane="3" offset="459/5s" duration="101/25s" start="2569/25s" name="mic"><audio ref="r2" offset="0/1s" duration="8954/5s"/></clip>
      </clip>
      <clip offset="101/25s" duration="73/25s" start="3398/25s" name="kamera1.MP4">
        <video ref="r1" offset="0/1s" duration="44706/25s"/>
        <asset-clip lane="1" offset="3448/25s" duration="25/25s" start="0s" name="broll.mp4" ref="r9"/>
        <asset-clip lane="-1" offset="3398/25s" duration="73/25s" start="0s" name="audio" ref="r9" srcEnable="audio"/>
      </clip>
      <gap offset="174/25s" duration="76/25s" start="0s"/>
    </spine>
  </sequence></project></event></library>
</fcpxml>`;

describe('parseFcpxmlCuts', () => {
	it('reads spine boundaries and connected picture, not audio', () => {
		const { cuts, duration } = parseFcpxmlCuts(FCPXML);
		// spine: 4.04, 6.96; connected B-roll at 4.04 + (137.92 − 135.92) = 6.04 → 7.04 (past the clip, still a cut)
		expect(cuts).toEqual([4.04, 6.04, 6.96, 7.04]);
		expect(duration).toBeCloseTo(10);
	});

	it('explains a missing spine', () => {
		expect(() => parseFcpxmlCuts('<fcpxml version="1.9"><library/></fcpxml>')).toThrow(/no <spine>/);
	});
});

describe('placeClips', () => {
	const fps = 25;
	it('snaps an edge onto a cut inside the handle (no stray camera frames)', () => {
		// words start at 4.12, the editor's cut is at 4.04 → 2 frames of the old shot without snapping
		const [p] = placeClips([{ id: 'a', programStart: 3.72, programEnd: 12.72, alpha: false }], { fps, cuts: [4.04] });
		expect(p.in).toBe(4.04);
		expect(p.snapIn).toBeCloseTo(-0.08);
	});

	it('leaves edges alone when no cut is near, and when snap is false', () => {
		const [a, b] = placeClips(
			[
				{ id: 'a', programStart: 10, programEnd: 15, alpha: false },
				{ id: 'b', programStart: 20, programEnd: 25, alpha: true, snap: false }
			],
			{ fps, cuts: [12, 20.2] }
		);
		expect([a.in, a.out]).toEqual([10.4, 14.6]);
		expect([b.in, b.out]).toEqual([20.4, 24.6]);
		expect(b.track).toBe('V4');
	});

	it('joins full-screen neighbours whose handles overlap, alternating tracks', () => {
		const [a, b, c] = placeClips(
			[
				{ id: 'a', programStart: 0, programEnd: 5, alpha: false },
				{ id: 'b', programStart: 4.6, programEnd: 9, alpha: false },
				{ id: 'c', programStart: 20, programEnd: 25, alpha: false }
			],
			{ fps }
		);
		expect(a.out).toBe(b.in);
		expect(a.joinedOut && b.joinedIn).toBe(true);
		expect([a.track, b.track, c.track]).toEqual(['V2', 'V3', 'V2']);
	});

	it('does not join across a gap wider than the handles', () => {
		const [a, b] = placeClips(
			[
				{ id: 'a', programStart: 0, programEnd: 3.2, alpha: false },
				{ id: 'b', programStart: 3.72, programEnd: 12, alpha: false }
			],
			{ fps }
		);
		expect(a.out).toBeLessThanOrEqual(3.2);
		expect(a.joinedOut).toBeUndefined();
	});
});
