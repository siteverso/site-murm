import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('public/app.js', 'utf8');
const query = fs.readFileSync('public/js/feed/core/feed-query.js', 'utf8');
const grouping = fs.readFileSync('public/js/feed/core/feed-grouping.js', 'utf8');
const renderer = fs.readFileSync('public/js/feed/feed-renderer.js', 'utf8');

test('carrega contratos de consulta e agrupamento antes do runtime', () => {
  assert.ok(app.indexOf('/js/feed/core/feed-query.js') < app.indexOf('/js/core/runtime.js'));
  assert.ok(app.indexOf('/js/feed/core/feed-grouping.js') < app.indexOf('/js/core/runtime.js'));
});

test('consulta aceita parentId sem acoplar ao renderizador', () => {
  assert.match(query, /params\.set\('parentId'/);
  assert.match(renderer, /buildFeedEndpoint\(/);
  assert.doesNotMatch(renderer, /\?parentId=\$\{/);
});

test('agrupamento fica independente do DOM', () => {
  assert.match(grouping, /getColumnItems/);
  assert.doesNotMatch(grouping, /querySelector|innerHTML|document\./);
  assert.match(renderer, /feedGrouping\.getColumnItems/);
});
