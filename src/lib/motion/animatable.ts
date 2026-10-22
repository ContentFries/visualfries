import fs from 'node:fs/promises';
import type { BlockAnimatable, BlockEvents } from './cutlist.js';
import type { AnimatableKind } from './interpolate.js';
import { ANIMATABLE_KINDS } from './keys.js';

/**
 * Node side: what a block marks animatable, read from its source without running it. A block
 * declares it in its module script as a literal object of prop names and kinds:
 *
 *   <script module>
 *     export const animatable = { color: 'color', bg: 'gradient', glow: 'shadow', size: 'number' };
 *   </script>
 *
 * The stage reads the same export from the bundled block; this reading lets `check` and
 * `program` report keys on props the block does not mark, before any page opens.
 */

type Node = { type: string; [key: string]: unknown };

const where = (file: string) => `${file}: animatable`;

/** The object a declaration's initializer is, through `as const` and `satisfies`. */
function literal(node: Node | null | undefined): Node | null {
	while (node && (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression'))
		node = node.expression as Node;
	return node ?? null;
}

/** The initializer behind `export const <name>`, `export { <name> }` or `export { x as <name> }`. */
function findDeclaration(
	body: Node[],
	exportName = 'animatable'
): { found: boolean; init: Node | null } {
	const consts = new Map<string, Node | null>();
	for (const statement of body) {
		const declaration =
			statement.type === 'ExportNamedDeclaration'
				? (statement.declaration as Node | null)
				: statement.type === 'VariableDeclaration'
					? statement
					: null;
		if (declaration?.type !== 'VariableDeclaration') continue;
		for (const d of declaration.declarations as Node[]) {
			const id = d.id as Node;
			if (id.type !== 'Identifier') continue;
			const name = id.name as string;
			consts.set(name, (d.init as Node | null) ?? null);
			if (statement.type === 'ExportNamedDeclaration' && name === exportName)
				return { found: true, init: (d.init as Node | null) ?? null };
		}
	}
	for (const statement of body) {
		if (statement.type !== 'ExportNamedDeclaration' || statement.source) continue;
		for (const spec of (statement.specifiers as Node[]) ?? []) {
			const exported = spec.exported as Node;
			const as = exported.type === 'Identifier' ? exported.name : exported.value;
			if (as !== exportName) continue;
			const local = (spec.local as Node).name as string;
			return { found: true, init: consts.get(local) ?? null };
		}
	}
	return { found: false, init: null };
}

/** The module script's top-level statements, or why the source does not parse. */
async function moduleBody(
	source: string,
	file: string,
	what: string
): Promise<{ body: Node[] } | { error: string }> {
	const { parse } = await import('svelte/compiler');
	try {
		const ast = parse(source, { modern: true, filename: file }) as unknown as {
			module: { content: { body: Node[] } } | null;
		};
		return { body: ast.module?.content.body ?? [] };
	} catch (error) {
		return {
			error: `${file} does not parse, so its ${what} cannot be read: ${(error as Error).message.split('\n')[0]}`
		};
	}
}

/** A property's name when it is a plain identifier or string key. */
function keyName(p: Node): string | null {
	const key = p.key as Node | undefined;
	if (p.type !== 'Property' || p.computed || !key) return null;
	if (key.type === 'Identifier') return key.name as string;
	return key.type === 'Literal' && typeof key.value === 'string' ? key.value : null;
}

/**
 * Reads the events a block declares for anchors (`{ "event": "land", "clip": "kick" }` in sfx,
 * shots and music keys) from its module script, without running it:
 *
 *   <script module>
 *     export const events = { land: 'tail+0.98', bonk: 'end-0.2' };
 *   </script>
 *
 * Each value is a moment of the clip (the grammar of `clip.at`) or clip seconds. The block reads
 * the same moments (`clip.at(events.land)`), so the program and the block agree by construction.
 */
export async function readEvents(source: string, file: string): Promise<BlockEvents> {
	if (!file.endsWith('.svelte')) return { events: {} };
	const parsed = await moduleBody(source, file, 'events');
	if ('error' in parsed) return parsed;
	const { found, init: raw } = findDeclaration(parsed.body, 'events');
	if (!found) return { events: {} };
	const init = literal(raw);
	const rule = `${file}: events: write each entry as name: 'moment' or a number of clip seconds (no spreads or computed values).`;
	if (init?.type !== 'ObjectExpression') return { error: rule };
	const events: Record<string, string | number> = {};
	for (const p of init.properties as Node[]) {
		const name = keyName(p);
		const value = literal(p.value as Node | undefined);
		const moment = value?.type === 'Literal' ? value.value : undefined;
		if (name === null || (typeof moment !== 'string' && typeof moment !== 'number'))
			return { error: rule };
		events[name] = moment;
	}
	return { events };
}

/** `readEvents` of a block file; a missing file declares nothing (bundling reports it). */
export async function readBlockEvents(file: string): Promise<BlockEvents> {
	const source = await fs.readFile(file, 'utf8').catch(() => null);
	return source === null ? { events: {} } : readEvents(source, file);
}

/**
 * Reads the block's `animatable` export from its source: `{ props: {} }` when it has none, an
 * error when the source does not parse or the declaration is not a literal object of kinds.
 */
export async function readAnimatable(source: string, file: string): Promise<BlockAnimatable> {
	if (!file.endsWith('.svelte')) return { props: {} };
	const { parse } = await import('svelte/compiler');
	let ast: { module: { content: { body: Node[] } } | null };
	try {
		ast = parse(source, { modern: true, filename: file }) as unknown as typeof ast;
	} catch (error) {
		return {
			error: `${file} does not parse, so its animatable props cannot be read: ${(error as Error).message.split('\n')[0]}`
		};
	}
	const { found, init: raw } = findDeclaration(ast.module?.content.body ?? []);
	if (!found) return { props: {} };
	const init = literal(raw);
	if (init?.type !== 'ObjectExpression')
		return {
			error: `${where(file)} must be a literal object of prop names and kinds, e.g. { color: 'color' }.`
		};
	const props: Record<string, AnimatableKind> = {};
	for (const p of init.properties as Node[]) {
		const key = p.key as Node | undefined;
		const name =
			p.type === 'Property' && !p.computed && key
				? key.type === 'Identifier'
					? (key.name as string)
					: key.type === 'Literal' && typeof key.value === 'string'
						? key.value
						: null
				: null;
		const value = literal(p.value as Node | undefined);
		const kind = value?.type === 'Literal' ? value.value : undefined;
		if (name === null || typeof kind !== 'string')
			return {
				error: `${where(file)}: write each entry as name: 'kind' (no spreads or computed values).`
			};
		if (!(ANIMATABLE_KINDS as readonly string[]).includes(kind))
			return {
				error: `${where(file)}: "${name}" has unknown kind "${kind}". Use ${ANIMATABLE_KINDS.join(', ')}.`
			};
		props[name] = kind as AnimatableKind;
	}
	return { props };
}

/** `readAnimatable` of a block file; a missing file declares nothing (bundling reports it). */
export async function readBlockAnimatable(file: string): Promise<BlockAnimatable> {
	const source = await fs.readFile(file, 'utf8').catch(() => null);
	return source === null ? { props: {} } : readAnimatable(source, file);
}
