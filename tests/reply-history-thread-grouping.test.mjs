import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const component = await readFile(new URL('../src/components/ReplyHistorySection.astro', import.meta.url), 'utf8');
const repository = await readFile(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8');

test('historico de respostas envia a thread completa para manter cada resposta dentro do card pai', () => {
  assert.match(component, /rootPostId/);
  assert.match(component, /const posts = Array\.isArray/);
  assert.match(repository, /CONNECT BY PRIOR parent_post_id = id/);
  assert.match(repository, /CONNECT BY PRIOR id = parent_post_id/);
  assert.match(repository, /rootPostId: group\.rootPostId/);
});

test('agrupa respostas por raiz da thread e nao apenas pelo pai imediato', () => {
  assert.match(repository, /const groups = new Map<number, \{ rootPostId: number; posts: Map<string, ReplyHistoryPost>; latestActivity: number \}>\(\);/);
  assert.match(repository, /const rootPostId = findReplyHistoryRootId\(branchPosts, replyId\)/);
  assert.match(repository, /branchPosts\.forEach\(post => existing\.posts\.set\(String\(post\.id\), post\)\)/);
});
