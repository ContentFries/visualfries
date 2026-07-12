import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const output = resolve(process.argv[2] ?? `${root}/artifacts/browser-export-spike/demo.mp4`);
await mkdir(resolve(output, '..'), { recursive: true });

const server = spawn('pnpm', ['exec', 'vite', 'dev', '--host', '127.0.0.1', '--port', '4174'], {
	cwd: root,
	stdio: ['ignore', 'pipe', 'pipe']
});

try {
	await waitForServer('http://127.0.0.1:4174/browser-export-spike');
	const browser = await chromium.launch({ headless: true, executablePath: chromium.executablePath() });
	try {
		const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
		page.on('console', (message) => console.log(`[browser:${message.type()}] ${message.text()}`));
		page.on('pageerror', (error) => console.error(`[browser:error] ${error.message}`));
		const downloadPromise = page.waitForEvent('download', { timeout: 10 * 60_000 });
		await page.goto('http://127.0.0.1:4174/browser-export-spike?autorun=1', {
			waitUntil: 'networkidle'
		});
		const download = await downloadPromise;
		await download.saveAs(output);
		const state = await page.evaluate(() => window.__VISUALFRIES_BROWSER_SPIKE__);
		console.log(JSON.stringify({ output, state }, null, 2));
	} finally {
		await browser.close();
	}
} finally {
	server.kill('SIGTERM');
}

async function waitForServer(url) {
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) return;
		} catch {}
		await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
	}
	throw new Error(`Timed out waiting for ${url}`);
}
