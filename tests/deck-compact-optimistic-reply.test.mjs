import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const controller = await readFile(new URL('../public/js/feed/published-reply-controller.js', import.meta.url), 'utf8');
const interactions = await readFile(new URL('../public/js/feed/feed-interactions.js', import.meta.url), 'utf8');

test('resposta otimista no modo cartas reutiliza a prévia compacta da home', () => {
  assert.match(controller, /renderReplyPreview\(reply\)/);
  assert.match(controller, /reply-preview-list/);
  assert.match(controller, /replies\.prepend\(card\)/);
  assert.doesNotMatch(controller.slice(controller.indexOf('function insertOptimisticReplyCard'), controller.indexOf('function commitOptimisticReply')), /renderPost\(/);
  assert.doesNotMatch(controller, /replies-recursive';\s*replies\.dataset/);
});

test('publicação aparece antes da API e é reconciliada sem refresh', () => {
  const createAt = interactions.indexOf('createOptimisticReply(parentId, text, isPrivate, replyRenderTarget)');
  const apiAt = interactions.indexOf('await api(`/api/posts/${parentId}/reply`');
  assert.ok(createAt >= 0 && apiAt > createAt);
  assert.match(interactions, /commitOptimisticReply\(optimisticReply, result\.id\)/);
  assert.match(interactions, /rollbackOptimisticReply\(optimisticReply\)/);
  assert.doesNotMatch(interactions.slice(createAt, interactions.indexOf("toast('Resposta publicada.')", createAt)), /loadFeed\(|revealPublishedReply/);
});
