import fs from 'node:fs/promises';
import { ANIMATABLE_KINDS } from './keys.js';
const where = (file) => `${file}: animatable`;
/** The object a declaration's initializer is, through `as const` and `satisfies`. */
function literal(node) {
    while (node && (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression'))
        node = node.expression;
    return node ?? null;
}
/** The initializer behind `export const animatable`, `export { animatable }` or `export { x as animatable }`. */
function findDeclaration(body) {
    const consts = new Map();
    for (const statement of body) {
        const declaration = statement.type === 'ExportNamedDeclaration'
            ? statement.declaration
            : statement.type === 'VariableDeclaration'
                ? statement
                : null;
        if (declaration?.type !== 'VariableDeclaration')
            continue;
        for (const d of declaration.declarations) {
            const id = d.id;
            if (id.type !== 'Identifier')
                continue;
            const name = id.name;
            consts.set(name, d.init ?? null);
            if (statement.type === 'ExportNamedDeclaration' && name === 'animatable')
                return { found: true, init: d.init ?? null };
        }
    }
    for (const statement of body) {
        if (statement.type !== 'ExportNamedDeclaration' || statement.source)
            continue;
        for (const spec of statement.specifiers ?? []) {
            const exported = spec.exported;
            const as = exported.type === 'Identifier' ? exported.name : exported.value;
            if (as !== 'animatable')
                continue;
            const local = spec.local.name;
            return { found: true, init: consts.get(local) ?? null };
        }
    }
    return { found: false, init: null };
}
/**
 * Reads the block's `animatable` export from its source: `{ props: {} }` when it has none, an
 * error when the source does not parse or the declaration is not a literal object of kinds.
 */
export async function readAnimatable(source, file) {
    if (!file.endsWith('.svelte'))
        return { props: {} };
    const { parse } = await import('svelte/compiler');
    let ast;
    try {
        ast = parse(source, { modern: true, filename: file });
    }
    catch (error) {
        return {
            error: `${file} does not parse, so its animatable props cannot be read: ${error.message.split('\n')[0]}`
        };
    }
    const { found, init: raw } = findDeclaration(ast.module?.content.body ?? []);
    if (!found)
        return { props: {} };
    const init = literal(raw);
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
/** `readAnimatable` of a block file; a missing file declares nothing (bundling reports it). */
export async function readBlockAnimatable(file) {
    const source = await fs.readFile(file, 'utf8').catch(() => null);
    return source === null ? { props: {} } : readAnimatable(source, file);
}
