import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const controller = read('../public/js/feed/published-reply-controller.js');
const interactions = read('../public/js/feed/feed-interactions.js');
const board = read('../src/components/FeedBoard.astro');
const messagePage = read('../src/pages/murmurio/[id].astro');
const profilePage = read('../src/pages/perfil/[username].astro');
const profileCss = read('../src/styles/pages/profile-feed.css');

test('resposta publicada possui revelação definida e atualiza o feed contextual', () => {
  assert.match(interactions, /await revealPublishedReply\(result\.id, parentId, text\)/);
  assert.match(controller, /async function revealPublishedReply\(/);
  assert.match(controller, /await loadFeed\(true\)/);
  assert.match(controller, /data-feed-board/);
});

test('FeedBoard pode ser embutido sem criar uma segunda shell', () => {
  assert.match(board, /embedded = false/);
  assert.match(board, /feed-board--embedded/);
  assert.match(messagePage, /embedded=\{true\}/);
  assert.match(profilePage, /embedded=\{true\}/);
});

test('painel-pai separa pulso e ações e preserva largura do feed', () => {
  assert.match(profileCss, /\.parent-message-panel \.score-line/);
  assert.match(profileCss, /\.parent-message-panel \.murmur-actions/);
  assert.match(profileCss, /\.feed-board--embedded/);
});
