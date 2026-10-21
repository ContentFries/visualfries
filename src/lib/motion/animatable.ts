import fs from 'node:fs/promises';
import type { BlockAnimatable } from './cutlist.js';
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

/** The initializer behind `export const animatable`, `export { animatable }` or `export { x as animatable }`. */
function findDeclaration(body: Node[]): { found: boolean; init: Node | null } {
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
			if (statement.type === 'ExportNamedDeclaration' && name === 'animatable')
				return { found: true, init: (d.init as Node | null) ?? null };
		}
	}
	for (const statement of body) {
		if (statement.type !== 'ExportNamedDeclaration' || statement.source) continue;
		for (const spec of (statement.specifiers as Node[]) ?? []) {
			const exported = spec.exported as Node;
			const as = exported.type === 'Identifier' ? exported.name : exported.value;
			if (as !== 'animatable') continue;
			const local = (spec.local as Node).name as string;
			return { found: true, init: consts.get(local) ?? null };
		}
	}
	return { found: false, init: null };
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
