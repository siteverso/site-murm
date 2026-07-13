import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const component = fs.readFileSync('src/components/FeedBoard.astro', 'utf8');
const home = fs.readFileSync('src/pages/index.astro', 'utf8');
const parentPage = fs.readFileSync('src/pages/murmurio/[id].astro', 'utf8');
const api = fs.readFileSync('src/pages/api/posts/index.ts', 'utf8');
const query = fs.readFileSync('public/js/feed/core/feed-query.js', 'utf8');
const cards = fs.readFileSync('public/js/posts/posts-and-replies.js', 'utf8');

test('home e murmúrio pai reutilizam o mesmo FeedBoard', () => {
  assert.match(home, /<FeedBoard parentId=\{null\}/);
  assert.match(parentPage, /<FeedBoard parentId=\{parentId\}/);
  assert.match(component, /data-parent-id=\{parentId \?\? undefined\}/);
});

test('feed contextual altera somente parentId na consulta', () => {
  assert.match(query, /params\.set\('parentId', String\(safeContext\.parentId\)\)/);
  assert.match(api, /url\.searchParams\.get\('parentId'\)/);
  assert.match(api, /postParentId === String\(parentId\)/);
});

test('página do murmúrio exibe o perfil do autor à esquerda', () => {
  assert.match(parentPage, /<ProfileSidebar/);
  assert.match(parentPage, /findPublicProfileByUsername/);
  assert.match(parentPage, /profile-grid public-profile-grid/);
});

test('cards abrem a rota contextual canônica em qualquer nível', () => {
  assert.match(cards, /`\/murmurio\/\$\{encodeURIComponent\(post\.id\)\}`/);
});
