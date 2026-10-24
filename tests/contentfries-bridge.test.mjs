import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
test('homepage bridge uses existing styles and preserves engine install and docs destinations', () => {
  const html = read('src/site/home.html');
  const section = html.match(/<section class="install" id="contentfries"[\s\S]+?<\/section>/)?.[0];
  assert.ok(section);
  assert.ok(section.includes('Want it done for you?'));
  assert.ok(section.includes('https://www.contentfries.com/agents'));
  assert.ok(section.includes('href="/docs/agents"'));
  assert.ok(html.includes('id="install-cmd"'));
  assert.ok(html.includes('href="/docs/quickstart"'));
  assert.ok(read('src/routes/+page.svelte').includes("../site/home.html?raw"));
});
test('docs bridge separates approval-gated workflow from arbitrary rendering', () => {
  const docs = read('src/routes/docs/+page.md');
  assert.ok(docs.includes('https://www.contentfries.com/agents'));
  assert.ok(docs.includes('not\nan arbitrary scene'));
});
