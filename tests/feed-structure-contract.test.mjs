import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../public/js/core/runtime.js', import.meta.url), 'utf8');
const contracts = fs.readFileSync(new URL('../public/js/feed/core/feed-contracts.js', import.meta.url), 'utf8');
const context = fs.readFileSync(new URL('../public/js/feed/core/feed-context.js', import.meta.url), 'utf8');

test('feed structural contracts load before legacy runtime', () => {
  assert.ok(app.indexOf('/js/feed/core/feed-contracts.js') < app.indexOf('/js/core/runtime.js'));
  assert.ok(app.indexOf('/js/feed/core/feed-context.js') < app.indexOf('/js/core/runtime.js'));
});

test('runtime consumes centralized feed contracts without changing legacy names', () => {
  assert.match(runtime, /const FEED_BATCH_SIZE = window\.MurmFeedContracts\.batchSize/);
  assert.match(runtime, /const COLUMN_GROUPS = window\.MurmFeedContracts\.columnGroups/);
});

test('feed context is independent from sex grouping and accepts future view modes', () => {
  assert.match(contracts, /viewModes: Object\.freeze\(\['columns', 'deck', 'grid', 'list'\]\)/);
  assert.match(context, /parentId: normalizeParentId\(input\.parentId\)/);
  assert.match(context, /viewMode,/);
  assert.match(context, /groupBy,/);
});
