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

const where = (file: string) => `${file}: export const animatable`;

/** The object a declaration's initializer is, through `as const` and `satisfies`. */
function literal(node: Node | null | undefined): Node | null {
	while (node && (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression'))
		node = node.expression as Node;
	return node ?? null;
}

/** Reads `export const animatable` from a block's source; `{ props: {} }` when it has none. */
export async function readAnimatable(source: string, file: string): Promise<BlockAnimatable> {
	if (!file.endsWith('.svelte')) return { props: {} };
	const { parse } = await import('svelte/compiler');
	let ast: { module: { content: { body: Node[] } } | null };
	try {
		ast = parse(source, { modern: true, filename: file }) as unknown as typeof ast;
	} catch {
		// A block that does not compile fails with a better message when it is bundled.
		return { props: {} };
	}
	for (const statement of ast.module?.content.body ?? []) {
		if (statement.type !== 'ExportNamedDeclaration') continue;
		const declaration = statement.declaration as Node | null;
		if (declaration?.type !== 'VariableDeclaration') continue;
		for (const d of declaration.declarations as Node[]) {
			if ((d.id as Node).type !== 'Identifier' || (d.id as { name: string }).name !== 'animatable')
				continue;
			const init = literal(d.init as Node | null);
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
	}
	return { props: {} };
}

/** `readAnimatable` of a block file; a missing file declares nothing (bundling reports it). */
export async function readBlockAnimatable(file: string): Promise<BlockAnimatable> {
	const source = await fs.readFile(file, 'utf8').catch(() => null);
	return source === null ? { props: {} } : readAnimatable(source, file);
}
