import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const postsSource = readFileSync(new URL('../public/js/posts/posts-and-replies.js', import.meta.url), 'utf8');
const interactionsSource = [
  '../public/js/feed/reply-thread-controller.js',
  '../public/js/feed/feed-interactions.js',
].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const runtimeSource = readFileSync(new URL('../public/js/core/runtime.js', import.meta.url), 'utf8');
const profileSource = readFileSync(new URL('../src/pages/perfil/[username].astro', import.meta.url), 'utf8');
const homeRendererSource = readFileSync(new URL('../public/js/feed/feed-renderer.js', import.meta.url), 'utf8');

test('respostas compactas do perfil usam o controlador reutilizável de expansão', () => {
  assert.match(runtimeSource, /const profileCompactExpandedIds = new Set\(\)/);
  assert.match(profileSource, /data-profile-compact-replies="true"/);
  assert.match(postsSource, /data-expand-profile-reply=/);
  assert.match(postsSource, /data-profile-expanded-reply=/);
  assert.match(interactionsSource, /profileCompactExpandedIds\.add\(replyId\)/);
  assert.match(interactionsSource, /profileCompactExpandedIds\.delete\(replyId\)/);
  assert.match(interactionsSource, /animateInflatedCard\(expandedCard, sourceHeight\)/);
});

test('home permanece com respostas compactas fixas', () => {
  assert.match(homeRendererSource, /renderPost\(post, childrenByParent, new Set\(\), \{repliesMode: 'compact'\}\)/);
  assert.doesNotMatch(homeRendererSource, /profileCompactReplies/);
});

test('link para ver todas as respostas continua levando à página da mensagem', () => {
  assert.match(postsSource, /reply-preview-more/);
  assert.match(postsSource, /\/murmurio\/\$\{encodeURIComponent\(post\.id\)\}/);
});
