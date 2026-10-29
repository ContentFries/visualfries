import path from 'node:path';

/**
 * The deepest folder that holds every one of `folders` (absolute paths), or null when none
 * does (folders on different Windows drives).
 */
function commonFolder(folders: string[], p: path.PlatformPath): string | null {
	const holds = (at: string) =>
		folders.every((f) => f === at || f.startsWith(at.endsWith(p.sep) ? at : at + p.sep));
	for (let at = folders[0]; ; at = p.dirname(at)) {
		if (holds(at)) return at;
		if (p.dirname(at) === at) return null;
	}
}

/**
 * `folder` as a shell argument: quoted when it holds more than plain path characters, in
 * single quotes for a POSIX shell and double quotes for Windows (where `"` cannot be in a path).
 */
const shellArg = (folder: string, p: path.PlatformPath) =>
	/^[\w./\\:@+-]+$/.test(folder)
		? folder
		: p.sep === '\\'
			? `"${folder}"`
			: `'${folder.replace(/'/g, `'\\''`)}'`;

/**
 * The line of a bundle error for package `name`, which `files` (absolute paths) import but do
 * not find installed: the files, relative to the project folder `dir`, and where to install it.
 * `p` is the path flavour (`path.win32` in tests).
 */
export function missingPackageLine(
	name: string,
	files: string[],
	dir: string,
	p: path.PlatformPath = path
): string {
	const importers = files.map((f) => p.relative(dir, f));
	const who =
		importers.length === 1
			? `${importers[0]} imports`
			: `${importers.slice(0, -1).join(', ')} and ${importers.at(-1)} import`;
	const inside = importers.every(
		(f) => f !== '..' && !f.startsWith(`..${p.sep}`) && !p.isAbsolute(f)
	);
	if (inside)
		return `${who} "${name}", which is not installed for this project. Install it in the project folder: npm install ${name} (blocks find packages in node_modules of the project folder or a folder above it).`;
	// A file outside the project finds packages from its own folder up, not from the project.
	const common = commonFolder(
		files.map((f) => p.dirname(f)),
		p
	);
	const folders = common ? [common] : [...new Set(files.map((f) => p.dirname(f)))];
	const where = folders.map((f) => p.relative(dir, f) || '.');
	// On Windows a folder on another drive needs `cd /d`, or cmd stays on the current drive.
	const cd = (f: string) => (p.sep === '\\' && p.isAbsolute(f) ? 'cd /d' : 'cd');
	const how = where.map((f) => `${cd(f)} ${shellArg(f, p)} && npm install ${name}`).join(', and ');
	const place =
		where.length === 1
			? `${where[0] === '.' ? 'the project folder' : where[0]} or a folder above it`
			: `each of ${where.join(', ')} (or a folder above it)`;
	return `${who} "${name}", which is not installed where ${importers.length === 1 ? 'that file finds' : 'those files find'} packages. Install it in ${place}: ${how} (each from the project folder; a file finds packages in node_modules of its own folder or a folder above it).`;
}
