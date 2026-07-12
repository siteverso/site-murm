import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const renderer = await readFile(new URL('../public/js/posts/posts-and-replies.js', import.meta.url), 'utf8');
const repository = await readFile(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/components/murmur-card.css', import.meta.url), 'utf8');

test('botao responder permanece ligado quando o usuario ja respondeu', () => {
  assert.match(renderer, /action-button--reply \$\{post\.hasMyReply \? 'active is-led-active' : ''\}/);
  assert.match(renderer, /aria-pressed="\$\{post\.hasMyReply \? 'true' : 'false'\}"/);
  assert.match(css, /\.action-button--reply\.is-led-active/);
});

test('backend calcula resposta publicada do usuario para cada murmurio', () => {
  assert.match(repository, /own_reply\.parent_post_id = p\.id/);
  assert.match(repository, /own_reply\.user_id = :current_user_id/);
  assert.match(repository, /hasMyReply: Number\(row\.HAS_MY_REPLY \|\| 0\) === 1/);
});
