import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repository = await readFile(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8');

test('consulta da thread específica envia somente binds existentes no SQL', () => {
  const start = repository.indexOf('const fullResult = await connection.execute<PostRow>');
  const end = repository.indexOf('let siblingStubs', start);
  const queryBlock = repository.slice(start, end);
  assert.match(queryBlock, /\{post_id: postId\}/);
  assert.doesNotMatch(queryBlock, /parent_id: parentId/);
});
