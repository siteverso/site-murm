import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/directs.astro', 'utf8');
const client = fs.readFileSync('public/js/directs/directs.js', 'utf8');
const repository = fs.readFileSync('src/lib/server/repositories/directs.ts', 'utf8');
const patch = fs.readFileSync('murm-oracle/database/patches/20260713-0015-add-direct-privacy-controls.sql', 'utf8');

test('menu oferece arquivar, bloquear, denunciar e excluir', () => {
  assert.match(page, /data-archive-direct-conversation/);
  assert.match(page, /data-block-direct-user/);
  assert.match(page, /data-report-direct/);
  assert.match(page, /data-delete-direct-conversation/);
});

test('ações de privacidade usam endpoints dedicados e confirmação', () => {
  assert.match(client, /\/api\/directs\/conversation/);
  assert.match(client, /\/api\/directs\/block/);
  assert.match(client, /data-direct-conversation-action/);
  assert.match(client, /setBlockedState/);
});

test('bloqueio é validado no backend antes do envio', () => {
  assert.match(repository, /FROM murm_user_block/);
  assert.match(repository, /DIRECT_BLOQUEADO/);
});

test('exclusão é individual e arquivamento reaparece com novo bilhete', () => {
  assert.match(repository, /deleted_before_id/);
  assert.match(repository, /archived_at/);
  assert.match(repository, /SET archived_at = NULL/);
  assert.match(patch, /CREATE TABLE murm_direct_user_state/);
  assert.match(patch, /CREATE TABLE murm_user_block/);
});
