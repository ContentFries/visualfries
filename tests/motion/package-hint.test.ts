// @vitest-environment node
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { missingPackageLine } from '../../src/lib/motion/package-hint.js';

describe('the line for a missing package', () => {
	it('lists the folders of files on different Windows drives', () => {
		const line = missingPackageLine(
			'three',
			['C:\\shared\\A.svelte', 'D:\\shared\\B.svelte'],
			'C:\\video',
			path.win32
		);
		expect(line).toMatch(/^\.\.\\shared\\A\.svelte and D:\\shared\\B\.svelte import "three"/);
		expect(line).toContain('cd ..\\shared && npm install three');
		expect(line).toContain('cd /d D:\\shared && npm install three');
	});

	it('quotes a folder with a space in the cd it suggests', () => {
		const line = missingPackageLine('three', ['/p/Shared Blocks/A.svelte'], '/p/video');
		expect(line).toContain(`cd '../Shared Blocks' && npm install three`);
		const quote = missingPackageLine('three', ["/p/Bob's Blocks/A.svelte"], '/p/video');
		expect(quote).toContain(`cd '../Bob'\\''s Blocks' && npm install three`);
		const win = missingPackageLine(
			'three',
			['C:\\p\\Shared Blocks\\A.svelte'],
			'C:\\p\\video',
			path.win32
		);
		expect(win).toContain('cd "..\\Shared Blocks" && npm install three');
	});
});
