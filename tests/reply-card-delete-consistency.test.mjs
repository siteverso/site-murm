import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readAppSource } from './js-source-test-utils.mjs';

const app = await readAppSource();
const css = await readFile(new URL('../src/styles/components/murmur-card.css', import.meta.url), 'utf8');

test('card completo de resposta pede confirmação antes de apagar', () => {
  assert.match(app, /if \(target\.matches\('\[data-delete-reply\]'\)\) \{/);
  assert.match(app, /<h2>Apagar resposta\?<\/h2>/);
  assert.match(app, /data-confirm-delete-reply-card=/);
  assert.doesNotMatch(app, /if \(target\.matches\('\[data-delete-reply\]'\)\) \{ await api/);
});

test('exclusão confirmada atualiza somente o grupo afetado na página de respostas e o feed normal', () => {
  assert.match(app, /await api\(`\/api\/replies\/\$\{replyId\}`/);
  assert.match(app, /await refreshReplyHistoryPage\(replyId\)/);
  assert.match(app, /data-reply-history-root/);
  assert.match(app, /currentGroup\.outerHTML = renderReplyHistoryGroup\(nextGroup\)/);
  assert.doesNotMatch(app, /window\.location\.reload\(\)/);
  assert.match(app, /toast\('Resposta apagada\.'\)/);
  assert.match(css, /\.murmur-card\.is-deleting/);
});
