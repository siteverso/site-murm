import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('home mantém sexo e lista e acrescenta relevância', async () => {
  const page = await read('src/pages/index.astro');
  assert.match(page, /data-feed-view="split"/);
  assert.match(page, /data-feed-view="relevance"/);
  assert.match(page, /data-feed-view="list"/);
  assert.match(page, /data-feed-relevance-columns/);
});

test('ranking de relevância usa pulso, ecos e silenciamentos', async () => {
  const renderer = await read('public/js/feed/feed-renderer.js');
  assert.match(renderer, /positive \|\| 0\) - Number\(post\.negative/);
  assert.match(renderer, /post\.shares/);
  assert.match(renderer, /post\.negative/);
  assert.match(renderer, /renderColumnGroup\(\$\('\[data-feed-columns\]'\), 'sex'\)/);
  assert.match(renderer, /renderColumnGroup\(\$\('\[data-feed-relevance-columns\]'\), 'relevance'\)/);
});
