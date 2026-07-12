import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const postsSource = await readFile(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8');

test('não renderiza stub como card completo após recarregar thread específica', () => {
  assert.match(appSource, /state\.expandedIds\.has\(postId\) && loadedPost/);
  assert.match(appSource, /state\.expandedIds\.delete\(postId\)/);
  assert.match(appSource, /renderPost\(loadedPost,/);
});

test('cria mock neutro quando a FK aponta para pai removido fisicamente', () => {
  assert.match(postsSource, /parentId != null && !mappedPosts\.some/);
  assert.match(postsSource, /isDeleted: true/);
  assert.match(postsSource, /id: parentId/);
});
