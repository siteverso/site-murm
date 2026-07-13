import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const postsSource = readFileSync(new URL('../public/js/posts/posts-and-replies.js', import.meta.url), 'utf8');
const interactionsSource = [
  '../public/js/feed/published-reply-controller.js',
  '../public/js/feed/feed-interactions.js',
].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const threadCss = readFileSync(new URL('../src/styles/components/thread.css', import.meta.url), 'utf8');

test('respostas profundas continuam recursivas sem corte visual no nível cinco', () => {
  assert.match(postsSource, /maxDepth = 100/);
  assert.match(postsSource, /repliesMode: 'recursive',[\s\S]*maxDepth: 100/);
});

test('resposta recém-publicada é localizada, expandida e destacada', () => {
  assert.match(interactionsSource, /async function revealPublishedReply\(replyId, parentId/);
  assert.match(interactionsSource, /profileCompactExpandedIds\.add\(String\(path\[1\]\.id\)\)/);
  assert.match(interactionsSource, /animatePublishedReply\(replyId\)/);
  assert.doesNotMatch(interactionsSource, /renderPublishedReplyReceipt/);
  assert.match(interactionsSource, /toast\('Resposta publicada\.'\)/);
});

test('contador e estado do botão de resposta atualizam sem F5', () => {
  assert.match(interactionsSource, /replyCount\.textContent = String\(Number\(replyCount\.textContent \|\| 0\) \+ 1\)/);
  assert.match(interactionsSource, /replyButton\?\.classList\.add\('active', 'is-led-active'\)/);
});

test('destaque temporário permanece sem recibo visual duplicado', () => {
  assert.match(threadCss, /\.reply-just-published/);
  assert.doesNotMatch(threadCss, /\.published-reply-receipt/);
  assert.match(threadCss, /@keyframes publishedReplyGlow/);
});
