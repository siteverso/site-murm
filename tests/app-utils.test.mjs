import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDateTime, getSexColumnDefinitions, hasUnreadMessages } from '../public/app-utils.mjs';

test('agrupamento por sexo inclui a terceira coluna para cadastros sem sexo', () => {
  assert.deepEqual(getSexColumnDefinitions().map(item => item.code), ['M', 'F', '']);
  assert.equal(getSexColumnDefinitions()[2].label, 'Sem sexo');
});

test('somente conversas com mensagens novas são marcadas como não lidas', () => {
  assert.equal(hasUnreadMessages(0), false);
  assert.equal(hasUnreadMessages(null), false);
  assert.equal(hasUnreadMessages(2), true);
});

test('data e hora da conversa são formatadas em conjunto', () => {
  const formatted = formatDateTime(Date.UTC(2026, 6, 11, 22, 30), 'pt-BR');
  assert.match(formatted, /11\/07\/2026/);
  assert.match(formatted, /22:30/);
});
