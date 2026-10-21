// Style layering. The style file schema (`StyleShape`) lives in project.ts.
import { StyleShape, type Style } from './project.js';
import type { Energy } from './energy.js';

/**
 * Built-in styles. Each is an example of a good style, not a fixed set; for now they fill only
 * `energy`. Style names never reuse energy names.
 */
export const BUILTIN_STYLES = {
	solid: { name: 'solid', energy: 'balanced' },
	glass: { name: 'glass', energy: 'balanced' },
	clean: { name: 'clean', energy: 'calm' },
	editorial: { name: 'editorial', energy: 'calm' },
	kinetic: { name: 'kinetic', energy: 'punchy' },
	depth: { name: 'depth', energy: 'balanced' },
	brutal: { name: 'brutal', energy: 'punchy' }
} satisfies Record<string, Style>;
export type BuiltinStyleName = keyof typeof BUILTIN_STYLES;

export function isBuiltinStyle(name: string): name is BuiltinStyleName {
	return Object.hasOwn(BUILTIN_STYLES, name);
}

export type ResolvedStyle = Omit<Style, 'extends' | 'energy'> & {
	/** True when the project names no style. */
	neutral: boolean;
	energy: Energy;
	/** The layers, base first: built-in names, style files, "(project)" for an inline style. */
	layers: string[];
};

/** Energy of a project without a style, or of a style chain that sets none. */
export const DEFAULT_ENERGY: Energy = 'balanced';

export const NEUTRAL_STYLE: ResolvedStyle = {
	neutral: true,
	energy: DEFAULT_ENERGY,
	layers: []
};

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain =>
	!!v &&
	typeof v === 'object' &&
	!Array.isArray(v) &&
	Object.getPrototypeOf(v) === Object.prototype;

/** `over` on top of `base`: objects merge key by key, everything else (arrays too) replaces. */
export function mergeLayers(base: Plain, over: Plain): Plain {
	const out: Plain = { ...base };
	for (const [key, value] of Object.entries(over)) {
		if (value === undefined) continue;
		out[key] = isPlain(value) && isPlain(out[key]) ? mergeLayers(out[key] as Plain, value) : value;
	}
	return out;
}

/**
 * Reads a style file. `from` is the file that names it (null for the project), `ref` the path as
 * written. Returns the parsed JSON and a stable id for messages and cycle detection.
 */
export type StyleLoader = (ref: string, from: string | null) => { id: string; data: unknown };

/**
 * Resolve a style reference into one style: the built-in, then every `extends` layer, then the
 * project's own. A string is a built-in name or a style file.
 */
export function resolveStyle(spec: string | Style, load: StyleLoader): ResolvedStyle {
	const layers: { id: string; style: Style }[] = [];
	const seen = new Set<string>();
	let next: { ref: string | Style; from: string | null } | null = { ref: spec, from: null };
	while (next) {
		const { ref, from }: { ref: string | Style; from: string | null } = next;
		next = null;
		if (typeof ref === 'string' && isBuiltinStyle(ref)) {
			layers.push({ id: ref, style: BUILTIN_STYLES[ref] });
			break;
		}
		let id: string;
		let style: Style;
		if (typeof ref === 'string') {
			const file = load(ref, from);
			id = file.id;
			if (seen.has(id))
				throw new Error(
					`Style "${id}" extends itself: ${[...layers.map((l) => l.id), id].join(' → ')}.`
				);
			const parsed = StyleShape.safeParse(file.data);
			if (!parsed.success)
				throw new Error(
					`Style "${id}": ${parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}`
				);
			style = parsed.data;
		} else {
			id = '(project)';
			style = ref;
		}
		seen.add(id);
		layers.push({ id, style });
		if (style.extends) next = { ref: style.extends, from: id === '(project)' ? null : id };
	}
	let merged: Plain = {};
	for (const layer of [...layers].reverse()) merged = mergeLayers(merged, layer.style);
	delete merged.extends;
	return {
		...(merged as Omit<Style, 'extends'>),
		neutral: false,
		energy: (merged.energy as Energy | undefined) ?? DEFAULT_ENERGY,
		layers: layers.map((l) => l.id).reverse()
	};
}
