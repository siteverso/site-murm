import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../public/js/feed/published-reply-controller.js', import.meta.url), 'utf8');

test('recibo de resposta profunda abre a conversa no perfil do autor raiz', () => {
  assert.match(source, /const conversationRoot = path\[0\] \|\| null/);
  assert.match(source, /conversationRoot\?\.author \|\| author/);
  assert.match(source, /conversationRoot\?\.id \|\| replyId/);
  assert.match(source, /#murmurio-\$\{encodeURIComponent\(replyId\)\}/);
});
