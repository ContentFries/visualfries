// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { changedLines, crapScore, functionCoverage, scoreFunctions } from '../../scripts/crap.mjs';

describe('CRAP score', () => {
	it('is the complexity when every statement runs, and grows with the square when none do', () => {
		expect(crapScore(10, 1)).toBe(10);
		expect(crapScore(10, 0)).toBe(110);
		expect(crapScore(5, 0.5)).toBeCloseTo(25 * 0.125 + 5, 10);
	});
});

describe('changed lines of a diff', () => {
	it('lists the new-side lines of every hunk, per file', () => {
		const diff = [
			'diff --git a/src/a.ts b/src/a.ts',
			'--- a/src/a.ts',
			'+++ b/src/a.ts',
			'@@ -10,2 +10,3 @@ function a() {',
			'+x',
			'@@ -40 +41 @@',
			'+y',
			'diff --git a/src/gone.ts b/src/gone.ts',
			'+++ /dev/null',
			'@@ -1,3 +0,0 @@',
			'diff --git a/src/b.svelte b/src/b.svelte',
			'+++ b/src/b.svelte',
			'@@ -1 +1 @@'
		].join('\n');
		const lines = changedLines(diff);
		expect([...lines.keys()]).toEqual(['src/a.ts', 'src/b.svelte']);
		expect([...lines.get('src/a.ts')!]).toEqual([10, 11, 12, 41]);
		expect([...lines.get('src/b.svelte')!]).toEqual([1]);
	});

	it('counts a pure deletion as touching the line after it', () => {
		const lines = changedLines('+++ b/src/a.ts\n@@ -5,2 +4,0 @@');
		expect([...lines.get('src/a.ts')!]).toEqual([5]);
	});
});

describe('coverage of a function', () => {
	const file = {
		statementMap: {
			'0': { start: { line: 1 }, end: { line: 1 } },
			'1': { start: { line: 3 }, end: { line: 3 } },
			'2': { start: { line: 4 }, end: { line: 5 } },
			'3': { start: { line: 9 }, end: { line: 9 } }
		},
		s: { '0': 1, '1': 4, '2': 0, '3': 0 }
	};

	it('is the share of its statements that ran', () => {
		expect(functionCoverage(file, 2, 6)).toBe(0.5);
	});

	it('is null when coverage knows no statement of it', () => {
		expect(functionCoverage(file, 20, 30)).toBeNull();
		expect(functionCoverage(undefined, 1, 9)).toBeNull();
	});
});

describe('scored functions', () => {
	const fn = (line: number, endLine: number, complexity: number) => ({
		line,
		endLine,
		name: `fn${line}`,
		complexity
	});
	const coverage = {
		statementMap: {
			'0': { start: { line: 2 }, end: { line: 2 } },
			'1': { start: { line: 12 }, end: { line: 12 } }
		},
		s: { '0': 0, '1': 3 }
	};

	it('keeps only functions whose lines the change touches, and flags those over the limit', () => {
		const rows = scoreFunctions({
			file: 'src/lib/a.ts',
			functions: [fn(1, 5, 8), fn(10, 15, 8), fn(20, 25, 40)],
			touched: new Set([3, 12]),
			coverage,
			unmeasured: false,
			max: 30
		});
		expect(rows.map((r) => [r.name, r.coverage, r.crap, r.over])).toEqual([
			['fn1', 0, 72, true],
			['fn10', 1, 8, false]
		]);
	});

	it('scores code coverage cannot see by its complexity alone', () => {
		const rows = scoreFunctions({
			file: 'src/lib/motion/program-stage.ts',
			functions: [fn(1, 5, 12), fn(20, 25, 31)],
			touched: null,
			coverage: undefined,
			unmeasured: true,
			max: 30
		});
		expect(rows.map((r) => [r.coverage, r.crap, r.over])).toEqual([
			[null, 12, false],
			[null, 31, true]
		]);
	});

	it('scores a function with no measured statement as untested', () => {
		const rows = scoreFunctions({
			file: 'src/lib/a.ts',
			functions: [fn(40, 45, 3)],
			touched: null,
			coverage,
			unmeasured: false,
			max: 30
		});
		expect(rows.map((r) => [r.coverage, r.crap])).toEqual([[0, 12]]);
	});
});
