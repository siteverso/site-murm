import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('home mantém raízes como cards e carrega somente duas respostas diretas por pai', async () => {
  const source = await read('src/lib/server/repositories/posts.ts');
  const listPosts = source.slice(source.indexOf('export async function listPosts'), source.indexOf('type PostRow'));

  assert.match(listPosts, /AND p\.parent_post_id IS NULL/);
  assert.match(listPosts, /PARTITION BY reply\.parent_post_id/);
  assert.match(listPosts, /WHERE preview_rank <= 2/);
  assert.match(listPosts, /if \(profileUsername \|\| roots\.length === 0\) return roots/);
  assert.doesNotMatch(listPosts, /CONNECT BY/i);
});

test('prévia compacta mostra no máximo duas respostas e link para a conversa completa', async () => {
  const source = await read('public/js/posts/posts-and-replies.js');

  assert.match(source, /function selectVisibleReplies\(replies, limit = 2\)/);
  assert.match(source, /selectVisibleReplies\(replies, 2\)/);
  assert.match(source, /reply-preview-more/);
  assert.match(source, /Ver todas as \$\{post\.replyCount\} respostas/);
});
