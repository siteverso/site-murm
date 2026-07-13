import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const board = read('../src/components/FeedBoard.astro');
const controller = read('../public/js/feed/feed-view-controller.js');
const css = read('../src/styles/pages/profile-feed.css');

test('FeedBoard identifica independentemente Home, perfil e mensagem', () => {
  assert.match(board, /`message:\$\{String\(parentId\)\}`/);
  assert.match(board, /`profile:\$\{normalizedProfileUsername\}`/);
  assert.match(board, /: 'home'/);
  assert.match(board, /data-feed-context-key=\{feedContextKey\}/);
});

test('modo de visualização é salvo por contexto e não globalmente', () => {
  assert.match(controller, /murmur_feed_view:\$\{contextKey\}/);
  assert.match(controller, /readStoredFeedView\(board\)/);
  assert.match(controller, /storeFeedView\(board, mode\)/);
  assert.doesNotMatch(controller, /localStorage\.setItem\('murmur_feed_view', mode\)/);
});

test('preferência global antiga é migrada somente para Home', () => {
  assert.match(controller, /feedContextKey === 'home'/);
  assert.match(controller, /localStorage\.getItem\('murmur_feed_view'\)/);
});

test('Pulso do pai é compacto e não sofre stretch', () => {
  assert.match(css, /\.parent-message-panel \.murmur-pulse[\s\S]*width: fit-content/);
  assert.match(css, /\.parent-message-panel \.murmur-pulse[\s\S]*align-self: flex-start/);
  assert.match(css, /\.parent-message-panel \.score-line[\s\S]*flex-direction: column/);
});

test('feed embutido normaliza o topo e a altura inicial das colunas', () => {
  assert.match(css, /\.feed-board--embedded \.network-board-heading[\s\S]*min-height: 48px/);
  assert.match(css, /\.feed-board--embedded \.split-view \.lane-heading[\s\S]*min-height: 56px/);
  assert.match(css, /grid-template-rows: auto 1fr/);
});
