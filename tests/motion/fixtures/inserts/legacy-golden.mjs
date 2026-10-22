// Writes the legacy goldens from a build's dist, e.g. main's:
//   node tests/motion/fixtures/inserts/legacy-golden.mjs ../visualfries/dist
// - legacy-stage.snapshot.json: clip data, diagnostics and encode arguments of every project
//   without "cuts" or "shots" in this repository, as that build gives them (no browser needed);
// - legacy.golden.json: file hashes and manifests of rendered legacy projects (needs Chromium).
// Then format them: pnpm exec prettier --write tests/motion/fixtures/inserts/*.json
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
	legacyProjects,
	legacyStageData,
	prepareLegacy,
	renderLegacy,
	toolchain
} from './legacy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../..');
const dist = path.resolve(process.argv[2] ?? 'dist');
const node = await import(pathToFileURL(path.join(dist, 'motion/node.js')).href);

// Before encodeInputs existed, the encode arguments came from a private audioInput.
let encode = node.encodeInputs;
if (!encode) {
	const src = await fs.readFile(path.join(dist, 'motion/node.js'), 'utf8');
	const start = src.indexOf('function audioInput(');
	let end = src.indexOf('{', start);
	for (let i = end, depth = 0; i < src.length; i++) {
		if (src[i] === '{') depth++;
		if (src[i] === '}' && --depth === 0) {
			end = i + 1;
			break;
		}
	}
	encode = new Function('path', `${src.slice(start, end)}\nreturn audioInput;`)(path);
}
const stage = await legacyStageData(node, REPO, await legacyProjects(REPO), encode);
await fs.writeFile(
	path.join(HERE, 'legacy-stage.snapshot.json'),
	JSON.stringify(stage, null, '\t') + '\n'
);
console.log(`${Object.keys(stage).length} legacy projects`);

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
