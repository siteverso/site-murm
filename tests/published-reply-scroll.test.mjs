import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../public/js/feed/published-reply-controller.js', import.meta.url), 'utf8');
const interactions = await readFile(new URL('../public/js/feed/feed-interactions.js', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../public/js/feed/feed-renderer.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');

test('resposta é montada localmente no ramo correto antes do retorno do banco', () => {
  assert.match(source, /function createOptimisticReply\(parentId, text, isPrivate = false\)/);
  assert.match(source, /insertOptimisticReplyCard\(reply, parentId\)/);
  assert.match(source, /ensureReplyContainer\(parentCard, parentId\)/);
  assert.match(source, /replies\.prepend\(card\)/);
  assert.match(interactions, /const optimisticReply = createOptimisticReply\(parentId, text, isPrivate\)/);
  assert.match(interactions, /await api\(`\/api\/posts\/\$\{parentId\}\/reply`/);
});

test('retorno do banco apenas troca o id temporário sem reconstruir o feed', () => {
  assert.match(source, /function commitOptimisticReply\(reply, realId\)/);
  assert.match(source, /card\.dataset\.postId = String\(realId\)/);
  assert.match(source, /reply\.id = Number\(realId\)/);
  assert.doesNotMatch(interactions, /revealPublishedReply/);
  assert.doesNotMatch(source, /loadFeed\(/);
  assert.doesNotMatch(source, /scrollTo|scrollBy|scrollIntoView/);
});

test('falha de persistência remove somente a resposta otimista e restaura o contador', () => {
  assert.match(source, /function rollbackOptimisticReply\(reply\)/);
  assert.match(source, /posts = posts\.filter/);
  assert.match(interactions, /rollbackOptimisticReply\(optimisticReply\)/);
  assert.match(interactions, /Math\.max\(0, Number\(replyCount\.textContent \|\| 0\) - 1\)/);
});

test('polling ignora diferenças exclusivas de horário para não redesenhar resposta já reconciliada', () => {
  const signatureBody = renderer.match(/function getFeedSignature\(items\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.doesNotMatch(signatureBody, /post\.createdAt/);
  assert.match(source, /feedSignature = getFeedSignature\(posts\)/);
});

test('não existe mais bloqueio contínuo de viewport', () => {
  assert.doesNotMatch(source, /reply-viewport-locked|keepReplyViewportAnchorStable|requestAnimationFrame\(correctPosition\)/);
  assert.doesNotMatch(css, /html\.reply-viewport-locked/);
  assert.match(css, /\.reply-optimistic[\s\S]*overflow-anchor:\s*none/);
});
