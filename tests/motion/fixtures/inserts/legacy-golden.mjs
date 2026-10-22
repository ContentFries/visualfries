// Writes legacy.golden.json from a build's dist, e.g. main's:
//   node tests/motion/fixtures/inserts/legacy-golden.mjs ../visualfries/dist
// then format it: pnpm exec prettier --write tests/motion/fixtures/inserts/legacy.golden.json
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prepareLegacy, renderLegacy, toolchain } from './legacy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.argv[2] ?? 'dist');
const node = await import(pathToFileURL(path.join(dist, 'motion/node.js')).href);
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-legacy-golden-'));
try {
	await prepareLegacy(path.join(tmp, 'fixture'));
	const root = path.resolve(dist, '..');
	const rendered = await renderLegacy(node, root, path.join(tmp, 'fixture'), path.join(tmp, 'out'));
	const golden = { toolchain: toolchain(await node.chromiumExecutable()), ...rendered };
	await fs.writeFile(
		path.join(HERE, 'legacy.golden.json'),
		JSON.stringify(golden, null, '\t') + '\n'
	);
	console.log(JSON.stringify(golden.files, null, 2));
} finally {
	await fs.rm(tmp, { recursive: true, force: true });
}
