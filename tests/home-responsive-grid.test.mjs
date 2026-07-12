import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('home exposes a responsive grid view capped at four columns', async () => {
  const [page, css, interactions, renderer] = await Promise.all([
    read('src/pages/index.astro'),
    read('src/styles/pages/home.css'),
    read('public/js/feed/feed-interactions.js'),
    read('public/js/feed/feed-renderer.js'),
  ]);

  assert.match(page, /data-feed-view="grid"/);
  assert.match(page, /data-feed-view-panel="grid"/);
  assert.match(page, /data-feed-grid/);
  assert.match(interactions, /'grid'/);
  assert.match(renderer, /renderLane\(gridFeed, feedBuckets\.all, 'compact'\)/);
  assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/);
});
