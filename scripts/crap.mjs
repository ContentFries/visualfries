#!/usr/bin/env node
/**
 * CRAP (Change Risk Anti-Patterns) score of functions: complexity² · (1 − coverage)³ +
 * complexity, with complexity from ESLint's `complexity` rule and coverage from a vitest
 * `coverage-final.json`. A complex function needs tests to stay under the limit; a simple one
 * passes even untested.
 *
 *   node scripts/crap.mjs --coverage coverage/coverage-final.json [--base <commit>] [--all]
 *
 * With `--base`, only functions whose lines the change since that commit touches are scored
 * (the CI gate); with `--all`, every function. The limit and the files coverage cannot see
 * (code that runs in the browser page or the CLI's own process) come from `crap.config.json`:
 * those are scored by complexity alone. A function's coverage counts the statements inside
 * its lines, nested functions included. Exits 1 when a scored function is over the limit.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** The CRAP score of a function of complexity `c` with `covered` of its statements run (0–1). */
export const crapScore = (c, covered) => c * c * (1 - covered) ** 3 + c;

/**
 * A path as git writes it in a diff header: plain, or C-quoted (`"b/caf\303\251.ts"`) when it
 * holds special characters, with octal escapes for the UTF-8 bytes.
 */
function headerPath(raw) {
	// Git ends the header of a path with a space in it with a tab.
	const text = raw.replace(/\t$/, '');
	if (!text.startsWith('"')) return text;
	const bytes = [];
	const escapes = { n: 10, t: 9, r: 13, b: 8, f: 12, v: 11, a: 7, '"': 34, '\\': 92 };
	// Code points, not UTF-16 units: an emoji written as is must not split.
	for (const [, octal, escaped, plain] of text
		.slice(1, -1)
		.matchAll(/\\([0-7]{3})|\\(.)|([^\\])/gsu)) {
		if (octal) bytes.push(parseInt(octal, 8));
		else if (escaped) bytes.push(escapes[escaped] ?? escaped.charCodeAt(0));
		else bytes.push(...Buffer.from(plain, 'utf8'));
	}
	return Buffer.from(bytes).toString('utf8');
}

/**
 * New-side line numbers each file of a unified diff (`git diff -U0`) adds or changes. Inside a
 * hunk, the counts in its `@@` line say how many lines are code: an added `++ x;` reads as
 * `+++ x;` there, and only outside a hunk is that a file header.
 */
export function changedLines(diff) {
	const files = new Map();
	let lines = null;
	let oldLeft = 0;
	let newLeft = 0;
	for (const line of diff.split('\n')) {
		if (oldLeft > 0 || newLeft > 0) {
			if (line.startsWith('-')) oldLeft--;
			else if (line.startsWith('+')) newLeft--;
			else if (!line.startsWith('\\')) {
				oldLeft--;
				newLeft--;
			}
			continue;
		}
		if (line.startsWith('+++ ')) {
			// Any header ends the file before it: a deleted file (/dev/null) has no new lines.
			const target = headerPath(line.slice(4));
			const name = /^b\/(.+)$/s.exec(target)?.[1];
			lines = name ? new Set() : null;
			if (name) files.set(name, lines);
			continue;
		}
		const hunk = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
		if (!hunk) continue;
		oldLeft = hunk[1] === undefined ? 1 : Number(hunk[1]);
		newLeft = hunk[3] === undefined ? 1 : Number(hunk[3]);
		if (!lines) continue;
		const start = Number(hunk[2]);
		// A deletion adds no line: it touches the function around the line after it.
		if (!newLeft) lines.add(start + 1);
		for (let i = 0; i < newLeft; i++) lines.add(start + i);
	}
	return files;
}

/** The share of statements on lines `from`–`to` that ran; null when coverage knows none. */
export function functionCoverage(file, from, to) {
	if (!file) return null;
	let total = 0;
	let ran = 0;
	for (const [id, s] of Object.entries(file.statementMap)) {
		if (s.start.line < from || s.end.line > to) continue;
		total++;
		if (file.s[id] > 0) ran++;
	}
	return total ? ran / total : null;
}

/**
 * Scores the functions of one file. `touched`: the lines a change touches (null: every
 * function); `unmeasured`: coverage cannot see the file, so a function scores its complexity.
 * A function with no measured statement in a measured file counts as untested.
 */
export function scoreFunctions({ file, functions, touched, coverage, unmeasured, max }) {
	const rows = [];
	for (const f of functions) {
		if (touched && !lineIn(touched, f.line, f.endLine)) continue;
		const covered = unmeasured ? null : (functionCoverage(coverage, f.line, f.endLine) ?? 0);
		const score = crapScore(f.complexity, covered ?? 1);
		// Rounded for the table only: a score just over the limit still fails (with room for the
		// last bits of floating point, so one exactly at the limit passes).
		rows.push({
			file,
			...f,
			coverage: covered,
			crap: Math.round(score * 10) / 10,
			over: score > max + 1e-9
		});
	}
	return rows;
}

const lineIn = (lines, from, to) => {
	for (const l of lines) if (l >= from && l <= to) return true;
	return false;
};

/**
 * Every function of `files` with its complexity and lines. ESLint reports a function's
 * complexity at its head (a method's key, an arrow's `=>`); a small rule of our own reports
 * each function's whole range, and the innermost range around the head is the function.
 */
async function functionsOf(root, files) {
	const { ESLint } = await import('eslint');
	const spans = {
		create(context) {
			const report = (node) => {
				const owner = node.parent;
				const keyed =
					owner &&
					['MethodDefinition', 'Property', 'PropertyDefinition'].includes(owner.type) &&
					owner.value === node;
				const start = (keyed ? owner : node).loc.start;
				context.report({ node, message: JSON.stringify([start, node.loc.end]) });
			};
			return {
				FunctionDeclaration: report,
				FunctionExpression: report,
				ArrowFunctionExpression: report
			};
		}
	};
	const eslint = new ESLint({
		cwd: root,
		allowInlineConfig: false,
		overrideConfig: [
			{
				plugins: { crap: { rules: { spans } } },
				rules: { complexity: ['warn', 0], 'crap/spans': 'warn' }
			}
		]
	});
	const out = new Map();
	for (const result of await eslint.lintFiles(files)) {
		const ranges = result.messages
			.filter((m) => m.ruleId === 'crap/spans')
			.map((m) => JSON.parse(m.message));
		const inside = ([s, e], m) =>
			(m.line > s.line || (m.line === s.line && m.column - 1 >= s.column)) &&
			(m.line < e.line || (m.line === e.line && m.column - 1 <= e.column));
		const functions = [];
		for (const m of result.messages.filter((x) => x.ruleId === 'complexity')) {
			const around = ranges
				.filter((r) => inside(r, m))
				.sort((a, b) => b[0].line - a[0].line || b[0].column - a[0].column)[0];
			functions.push({
				line: around ? around[0].line : m.line,
				endLine: around ? around[1].line : (m.endLine ?? m.line),
				name: /^(.*?) has a complexity/.exec(m.message)?.[1] ?? 'function',
				complexity: Number(/complexity of (\d+)/.exec(m.message)?.[1])
			});
		}
		out.set(path.relative(root, result.filePath), functions);
	}
	return out;
}

function parseArgs(argv) {
	const args = { all: false, base: null, coverage: null, config: 'crap.config.json' };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--all') args.all = true;
		else if (a === '--base') args.base = argv[++i];
		else if (a === '--coverage') args.coverage = argv[++i];
		else if (a === '--config') args.config = argv[++i];
		else throw new Error(`Unknown argument ${a}`);
	}
	if (!args.coverage) throw new Error('--coverage <coverage-final.json> is required.');
	if (!args.all && !args.base) throw new Error('Give --base <commit> or --all.');
	return args;
}

const pct = (x) => (x === null ? 'n/a' : `${Math.round(x * 100)} %`);

async function main() {
	const root = process.cwd();
	const args = parseArgs(process.argv.slice(2));
	const config = JSON.parse(fs.readFileSync(path.resolve(root, args.config), 'utf8'));
	const inScope = (f) =>
		/\.(m?js|ts|svelte)$/.test(f) &&
		!f.endsWith('.d.ts') &&
		config.include.some((p) => f.startsWith(p)) &&
		!(config.exclude ?? []).some((p) => f.startsWith(p));
	const unmeasured = (f) =>
		config.unmeasured.some((p) => f === p || (p.endsWith('/') && f.startsWith(p))) ||
		(config.unmeasuredExtensions ?? []).some((ext) => f.endsWith(ext));
	const touched = args.all
		? new Map(
				execFileSync('git', ['ls-files'], { encoding: 'utf8' })
					.split('\n')
					.filter(inScope)
					.map((f) => [f, null])
			)
		: new Map(
				[
					...changedLines(
						execFileSync(
							'git',
							['-c', 'core.quotePath=false', 'diff', '-U0', `${args.base}`, 'HEAD'],
							{
								encoding: 'utf8',
								maxBuffer: 1 << 28
							}
						)
					)
				].filter(([f]) => inScope(f) && fs.existsSync(f))
			);
	const coverage = JSON.parse(fs.readFileSync(args.coverage, 'utf8'));
	const byFile = (f) => coverage[path.resolve(root, f)];
	const rows = [];
	const functions = touched.size ? await functionsOf(root, [...touched.keys()]) : new Map();
	for (const [file, lines] of touched)
		rows.push(
			...scoreFunctions({
				file,
				functions: functions.get(file) ?? [],
				touched: lines,
				coverage: byFile(file),
				unmeasured: unmeasured(file),
				max: config.max
			})
		);
	rows.sort((a, b) => b.crap - a.crap);
	const over = rows.filter((r) => r.over);
	const what = args.all ? 'all functions' : `functions changed since ${args.base.slice(0, 12)}`;
	const table = [
		`### CRAP score (limit ${config.max})`,
		'',
		`${rows.length} ${what}, ${over.length} over the limit.`,
		'',
		...(rows.length
			? [
					'| CRAP | Complexity | Coverage | Function |',
					'| ---: | ---: | ---: | --- |',
					...rows
						.slice(0, 50)
						.map(
							(r) =>
								`| ${r.over ? '**' + r.crap + '**' : r.crap} | ${r.complexity} | ${pct(r.coverage)} | \`${r.file}:${r.line}\` ${r.name} |`
						)
				]
			: [])
	].join('\n');
	console.log(table);
	if (process.env.GITHUB_STEP_SUMMARY)
		fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, table + '\n');
	if (over.length) {
		console.error(
			`\n${over.length} function(s) over CRAP ${config.max}: split them, or test them so their coverage rises.`
		);
		process.exitCode = 1;
	}
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
