import fs from 'node:fs/promises';
import { ANIMATABLE_KINDS } from './keys.js';
const where = (file) => `${file}: export const animatable`;
/** The object a declaration's initializer is, through `as const` and `satisfies`. */
function literal(node) {
    while (node && (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression'))
        node = node.expression;
    return node ?? null;
}
/** Reads `export const animatable` from a block's source; `{ props: {} }` when it has none. */
export async function readAnimatable(source, file) {
    if (!file.endsWith('.svelte'))
        return { props: {} };
    const { parse } = await import('svelte/compiler');
    let ast;
    try {
        ast = parse(source, { modern: true, filename: file });
    }
    catch {
        // A block that does not compile fails with a better message when it is bundled.
        return { props: {} };
    }
    for (const statement of ast.module?.content.body ?? []) {
        if (statement.type !== 'ExportNamedDeclaration')
            continue;
        const declaration = statement.declaration;
        if (declaration?.type !== 'VariableDeclaration')
            continue;
        for (const d of declaration.declarations) {
            if (d.id.type !== 'Identifier' || d.id.name !== 'animatable')
                continue;
            const init = literal(d.init);
            if (init?.type !== 'ObjectExpression')
                return {
                    error: `${where(file)} must be a literal object of prop names and kinds, e.g. { color: 'color' }.`
                };
            const props = {};
            for (const p of init.properties) {
                const key = p.key;
                const name = p.type === 'Property' && !p.computed && key
                    ? key.type === 'Identifier'
                        ? key.name
                        : key.type === 'Literal' && typeof key.value === 'string'
                            ? key.value
                            : null
                    : null;
                const value = literal(p.value);
                const kind = value?.type === 'Literal' ? value.value : undefined;
                if (name === null || typeof kind !== 'string')
                    return {
                        error: `${where(file)}: write each entry as name: 'kind' (no spreads or computed values).`
                    };
                if (!ANIMATABLE_KINDS.includes(kind))
                    return {
                        error: `${where(file)}: "${name}" has unknown kind "${kind}". Use ${ANIMATABLE_KINDS.join(', ')}.`
                    };
                props[name] = kind;
            }
            return { props };
        }
    }
    return { props: {} };
}
/** `readAnimatable` of a block file; a missing file declares nothing (bundling reports it). */
export async function readBlockAnimatable(file) {
    const source = await fs.readFile(file, 'utf8').catch(() => null);
    return source === null ? { props: {} } : readAnimatable(source, file);
}
