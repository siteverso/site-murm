import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const renderer = readFileSync(new URL('../public/js/feed/feed-renderer.js', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../public/js/core/runtime.js', import.meta.url), 'utf8');

test('thread feeds keep synchronization enabled in deck mode', () => {
  const start = renderer.indexOf('function startFeedPolling()');
  const end = renderer.indexOf('\n}\n', start);
  const block = renderer.slice(start, end + 3);
  assert.match(block, /bindFeedSyncEvents\(\)/);
  assert.doesNotMatch(block, /if \(\$\('\[data-feed-deck\]'\)\)[\s\S]*?return/);
});

test('thread feeds poll the database so deletion reflects across different browsers', () => {
  assert.match(renderer, /feedTimer = setInterval\([\s\S]*loadFeed\(\)/);
  assert.match(renderer, /MIN_SITE_REFRESH_INTERVAL_MS/);
});

test('deleted post synchronization still removes local cards immediately', () => {
  assert.match(runtime, /removeDeletedPostFromLocalState\(deletedId\)/);
  assert.match(runtime, /await loadFeed\(true\)/);
});
