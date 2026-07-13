import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readProjectFile = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('estado do voto renderiza o LED ativo sem criar estado paralelo', () => {
  const source = readProjectFile('public/js/posts/posts-and-replies.js');

  assert.match(source, /action-button--echo \$\{post\.myVote === 1 \? 'active is-led-active' : ''\}/);
  assert.match(source, /action-button--ignore \$\{post\.myVote === -1 \? 'active is-led-active' : ''\}/);
  assert.match(source, /aria-pressed="\$\{post\.myVote === 1 \? 'true' : 'false'\}"/);
  assert.match(source, /aria-pressed="\$\{post\.myVote === -1 \? 'true' : 'false'\}"/);
});

test('LED possui contorno, glow e blur visual para eco e ignorar', () => {
  const css = readProjectFile('src/styles/components/murmur-card.css');

  assert.match(css, /\.action-button\.is-led-active\s*\{/);
  assert.match(css, /border:\s*1px solid currentColor/);
  assert.match(css, /box-shadow:/);
  assert.match(css, /filter:\s*drop-shadow/);
  assert.match(css, /\.action-button--echo\.is-led-active/);
  assert.match(css, /\.action-button--ignore\.is-led-active/);
});


test('feed consulta o voto do usuário atual em vez de zerar myVote', () => {
  const source = readProjectFile('src/lib/server/repositories/posts.ts');
  assert.match(source, /FROM murm_vote v/);
  assert.match(source, /v\.post_id = p\.id/);
  assert.match(source, /v\.user_id = :current_user_id/);
  assert.match(source, /myVote: Number\(row\.MY_VOTE \|\| 0\)/);
  assert.doesNotMatch(source, /export async function listPosts\(_currentUserId/);
});

test('clique aplica o LED imediatamente antes da atualização do feed', () => {
  const source = [
    readProjectFile('public/js/feed/inline-post-editor.js'),
    readProjectFile('public/js/feed/feed-interactions.js'),
  ].join('\n');
  assert.match(source, /function applyOptimisticVoteState\(card, selectedButton\)/);
  assert.match(source, /button\.classList\.toggle\('is-led-active', active\)/);
  assert.match(source, /applyOptimisticVoteState\(card, target\);\s*await api/);
});
