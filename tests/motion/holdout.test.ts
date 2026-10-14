import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { MotionProjectShape } from '$lib/motion/project.js';
import { resolveMotionProject } from '$lib/motion/resolve.js';
import { encodeInputs } from '$lib/motion/node.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

function project(clip: Record<string, unknown>, footage: Record<string, unknown> = {}) {
	return MotionProjectShape.parse({
		size: [64, 36],
		fps: 25,
		footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4', start: 0 }, ...footage },
		clips: [{ id: 'c', block: 'b.svelte', from: 0, until: 1, ...clip }]
	});
}

const errors = (p: ReturnType<typeof project>) =>
	resolveMotionProject(p, []).diagnostics.filter((d) => d.field === 'holdout').map((d) => d.message);

describe('holdout', () => {
	it('needs a known footage with a matte and an alpha clip', () => {
		expect(errors(project({ alpha: true, holdout: 'talk' }))).toEqual([]);
		expect(errors(project({ alpha: true, holdout: 'nope' }))[0]).toMatch(/Unknown footage "nope"/);
		expect(errors(project({ alpha: true, holdout: 'plain' }, { plain: { src: 'p.mp4' } }))[0]).toMatch(
			/has no matte/
		);
		expect(errors(project({ holdout: 'talk' }))[0]).toMatch(/"alpha": true/);
	});

	it('aligns the matte to the program frame and keeps audio mapping', () => {
		const p = project({ alpha: true, holdout: 'talk', audio: 'talk' }, { talk: { src: 't.mp4', matte: 't.matte.mp4', start: 0.5 } });
		const clip = { ...resolveMotionProject(p, []).clips[0], start: 0.2, startFrame: 5, frames: 10, duration: 0.4 };
		const args = encodeInputs({ project: p, dir: '/x' }, clip);
		// footage starts at program frame 13 (0.5 s → round(12.5)); the clip starts at frame 5 → 8 frames of padding
		expect(args.slice(0, 4)).toEqual(['-ss', '0.000000', '-i', '/x/t.matte.mp4']);
		expect(args.join(' ')).toContain('tpad=start=8:');
		expect(args).toContain('[vf_v]');
		expect(args[args.indexOf('-map', args.indexOf('[vf_v]') - 2) + 1]).toBe('[vf_v]');
		expect(args).toContain('2:a:0');
	});

	it.skipIf(!hasFfmpeg)('cuts the alpha where the matte is white, frame-exact', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-holdout-'));
		const ff = (a: string[]) => {
			const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
			if (r.status !== 0) throw new Error(String(r.stderr));
			return r.stdout;
		};
		// matte: frame n has a white bar on the left from x = 0 to 4·n (64×36, 25 fps, 10 frames)
		const matte = path.join(dir, 'talk.matte.mp4'); // written as lossless .mkv below
		ff(['-f', 'lavfi', '-i', 'color=black:s=64x36:r=25:d=0.4', '-vf', "format=gray,geq=lum='if(lt(X,4*N+1),255,0)'", '-c:v', 'ffv1', matte.replace('.mp4', '.mkv')]);
		const p = project({ alpha: true, holdout: 'talk' }, { talk: { src: 'talk.mp4', matte: 'talk.matte.mkv', start: 0.08 } });
		const clip = { ...resolveMotionProject(p, []).clips[0], startFrame: 0, frames: 10, start: 0, duration: 0.4 };
		const out = path.join(dir, 'out.mov');
		// input 0 stands in for the piped frames: opaque red with full alpha
		ff(['-f', 'lavfi', '-i', 'color=red:s=64x36:r=25:d=0.4,format=rgba', ...encodeInputs({ project: p, dir }, clip),
			'-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', out]);
		const alpha = (n: number) =>
			ff(['-i', out, '-vf', `select=eq(n\\,${n}),format=rgba,alphaextract,format=gray`, '-frames:v', '1', '-f', 'rawvideo', '-'])
				.subarray(18 * 64, 19 * 64); // one row
		// clip frames 0–1 come before the footage (start 0.08 s = frame 2): nothing cut
		expect(Math.min(...alpha(1))).toBeGreaterThan(250);
		// clip frame 5 shows footage frame 3: the bar covers x < 13
		const row = alpha(5);
		expect(Math.max(...row.subarray(0, 11))).toBeLessThan(5);
		expect(Math.min(...row.subarray(15))).toBeGreaterThan(250);
		await fs.rm(dir, { recursive: true, force: true });
	});
});
