import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
test('ContentFries is a quiet link in the footer, not a homepage section', () => {
	assert.ok(read('src/site/Footer.svelte').includes('href="https://www.contentfries.com"'));
	assert.ok(!read('src/site/home.html').includes('id="contentfries"'));
});
