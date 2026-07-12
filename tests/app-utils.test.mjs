import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('duplo clique abre a resposta e o próximo duplo clique entra no perfil', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /function openReplyForm\(card/);
  assert.match(source, /function openPostAuthorProfile\(card\)/);
  assert.match(source, /replyForm\?\.classList\.contains\('open'\)/);
  assert.match(source, /openPostAuthorProfile\(card\)/);
  assert.match(source, /openReplyForm\(card\)/);
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
  assert.match(source, /renderPost\(reply, childrenByParent, nextAncestry, true\)/);
  assert.match(source, /roots\.map\(post => renderPost\(post, childrenByParent, new Set\(\), includeReplies\)\)/);
});

test('ícones de direct e exclusão do murmúrio aparecem juntos apenas no hover ou foco', () => {
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.murmur-head-actions \.direct-card-button \{ opacity: 0; pointer-events: none;/);
  assert.match(css, /\.murmur-card:hover \.murmur-head-actions \.direct-card-button,/);
  assert.match(css, /\.murmur-card:focus-within \.murmur-head-actions \.direct-card-button \{ opacity: 1; pointer-events: auto;/);
  assert.match(css, /@media \(hover: none\)[\s\S]*\.murmur-head-actions \.direct-card-button \{ opacity: 1; pointer-events: auto;/);
});

test('bilhete só é enviado após cinco segundos sem desfazer', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /const scheduleDirectSend = \(\{ recipientId, contents, onPending, onSent, onUndone, onFailed \}\) =>/);
  assert.match(source, /const sendTimer = setTimeout\(async \(\) => \{[\s\S]*await api\('\/api\/directs',[\s\S]*method: 'POST'/);
  assert.match(source, /\}, 5000\);/);
  assert.match(source, /clearTimeout\(sendTimer\);[\s\S]*await onUndone\?\.\(pendingToken\)/);
  assert.doesNotMatch(source, /showSentDirectUndo|method: 'DELETE'[\s\S]*Bilhete enviado/);
  assert.match(source, /scheduleDirectSend\(\{[\s\S]*recipientId: Number\(activeUserId\),[\s\S]*onPending: \(\) => addPendingDirect\(contents\)/);
  assert.match(source, /scheduleDirectSend\(\{ recipientId, contents \}\);/);
});


test('chat mostra bilhete pendente apenas ao remetente e remove ao desfazer', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /const pendingLabel = isEnglish \? 'Message sent\.' : 'Mensagem enviada\.'/);
  assert.match(source, /const addPendingDirect = contents =>/);
  assert.match(source, /pending: true/);
  assert.match(source, /data-direct-pending="true"/);
  assert.match(source, /onUndone: pendingId => \{[\s\S]*removePendingDirect\(pendingId\)/);
  assert.match(source, /existingNotes = \$\$\('\[data-direct-message\]:not\(\[data-direct-pending\]\)'/);
});


test('usuário do topo abre /perfil', async () => {
  const header = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/components/Header.astro', import.meta.url), 'utf8'));
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(header, /data-own-profile-link/);
  assert.match(source, /el\.href = `\/perfil\/\$\{encodeURIComponent\(user\.username\)\}`/);
});


test('perfil próprio oferece edição da conta na coluna esquerda', async () => {
  const profile = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/pages/perfil.astro', import.meta.url), 'utf8'));
  const sidebar = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/components/ProfileSidebar.astro', import.meta.url), 'utf8'));
  assert.match(profile, /<ProfileSidebar profile=\{profile\} showEditAccount/);
  assert.match(sidebar, /public-profile-account-link/);
  assert.match(sidebar, /href="\/conta"/);
});


test('conta oferece acesso ao perfil público na coluna esquerda', async () => {
  const account = readFileSync(new URL('../src/pages/conta.astro', import.meta.url), 'utf8');
  const sidebar = readFileSync(new URL('../src/components/ProfileSidebar.astro', import.meta.url), 'utf8');
  assert.match(account, /<ProfileSidebar dynamic editableAvatar/);
  assert.match(sidebar, /account-profile-link/);
  assert.match(sidebar, /href="\/perfil"/);
});