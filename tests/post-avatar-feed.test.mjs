import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('feed e threads usam o contrato compartilhado de avatar do usuário', async () => {
  const repository = await read('src/lib/server/repositories/posts.ts');

  assert.match(repository, /import \{avatarSql, getUserSchema\} from '\.\.\/user-schema';/);
  assert.match(repository, /const userAvatarSql = avatarSql\(userSchema, 'u'\)/);
  assert.match(repository, /\$\{userAvatarSql\} AS avatar_url/);
  assert.match(repository, /avatarUrl: String\(row\.AVATAR_URL \|\| ''\)/);
  assert.doesNotMatch(repository, /'' AS avatar_url/);
});

test('renderizador mantém foto com fallback para iniciais', async () => {
  const renderer = await read('public/js/posts/posts-and-replies.js');

  assert.match(renderer, /post\.avatarUrl \? `<img class="lazy-media"/);
  assert.match(renderer, /: escapeHtml\(userInitials\(post\.author\)\)/);
});
