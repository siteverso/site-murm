import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/directs.astro', 'utf8');
const client = fs.readFileSync('public/js/directs/directs.js', 'utf8');
const repository = fs.readFileSync('src/lib/server/repositories/directs.ts', 'utf8');
const api = fs.readFileSync('src/pages/api/directs/conversation.ts', 'utf8');
const css = fs.readFileSync('src/styles/pages/directs.css', 'utf8');

test('lateral identifica conversas bloqueadas', () => {
  assert.match(client, /item\.blockedEither \? 'is-blocked'/);
  assert.match(client, /direct-thread-blocked/);
  assert.match(css, /\.direct-thread-blocked/);
});

test('rodapé alterna entre chats ativos e arquivados', () => {
  assert.match(page, /data-direct-archive-toggle/);
  assert.match(client, /archivedView/);
  assert.match(client, /Exibir chats arquivados/);
  assert.match(client, /Exibir chats ativos/);
  assert.match(repository, /:archived = 1/);
});

test('conversa arquivada pode ser restaurada', () => {
  assert.match(page, /data-restore-direct-conversation/);
  assert.match(api, /restoreConversation/);
  assert.match(repository, /export async function restoreConversation/);
});
