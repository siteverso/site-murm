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


test('colunas do feed não renderizam títulos visuais', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.doesNotMatch(source, /lane-inline-head/);
  assert.doesNotMatch(source, /<strong>\$\{definition\.label\}<\/strong>/);
});

test('envio de bilhete usa somente spinner e restaura o ícone original', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /setButtonLoading\(submit, true, ''\)/);
  assert.doesNotMatch(source, /Sending…|Enviando…/);
  assert.match(source, /button\.dataset\.originalContent = button\.innerHTML/);
  assert.match(source, /button\.innerHTML = button\.dataset\.originalContent/);
});

test('CSS global não mantém regras antigas duplicadas de exclusão de resposta', async () => {
  const css = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'));
  assert.equal((css.match(/\.reply-delete \{/g) || []).length, 1);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /button:focus-visible/);
});

test('duplo clique no card abre o mesmo formulário de resposta usado pelo botão', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /function openReplyForm\(card/);
  assert.match(source, /addEventListener\('dblclick'/);
  assert.match(source, /openReplyForm\(event\.target\.closest\('\[data-post-id\]'\)\)/);
  assert.match(source, /openReplyForm\(card, \{ toggle: true \}\)/);
});

test('não existe cópia obsoleta do aplicativo em public\/public', async () => {
  const { access } = await import('node:fs/promises');
  await assert.rejects(access(new URL('../public/public/app.js', import.meta.url)));
});

test('respostas são agrupadas e renderizadas dentro do murmúrio pai', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /function groupPostsByParent\(items\)/);
  assert.match(source, /function getRootPosts\(items\)/);
  assert.match(source, /data-replies-for=/);
  assert.match(source, /renderPost\(reply, childrenByParent, nextAncestry\)/);
  assert.match(source, /roots\.map\(post => renderPost\(post, childrenByParent\)\)/);
});
