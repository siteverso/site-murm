import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('limite de respostas vem do ambiente com fallback 10', () => {
  const config = read('src/lib/config/replies.ts');
  const layout = read('src/layouts/AppLayout.astro');
  assert.match(config, /PUBLIC_MURMUR_REPLY_MAX_DEPTH/);
  assert.match(config, /DEFAULT_REPLY_MAX_DEPTH = 10/);
  assert.match(layout, /__MURMUR_REPLY_MAX_DEPTH__/);
});

test('front bloqueia novo filho no limite e sugere novo tópico', () => {
  const renderer = read('public/js/posts/posts-and-replies.js');
  const interactions = read('public/js/feed/feed-interactions.js');
  assert.match(renderer, /depth >= REPLY_MAX_DEPTH/);
  assert.match(renderer, /Criar novo tópico a partir daqui/);
  assert.match(interactions, /parentDepth >= REPLY_MAX_DEPTH/);
  assert.match(interactions, /openComposer\(`Continuação da conversa/);
});

test('servidor valida profundidade antes do insert', () => {
  const repository = read('src/lib/server/repositories/posts.ts');
  const http = read('src/lib/server/http.ts');
  assert.match(repository, /SELECT max\(level\) AS depth/);
  assert.match(repository, /LIMITE_PROFUNDIDADE_RESPOSTA/);
  assert.match(http, /LIMITE_PROFUNDIDADE_RESPOSTA: \[422/);
});
