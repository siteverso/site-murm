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

test('respostas são agrupadas e renderizadas em lista compacta dentro do murmúrio pai', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  const css = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'));
  assert.match(source, /function groupPostsByParent\(items\)/);
  assert.match(source, /function getRootPosts\(items\)/);
  assert.match(source, /function renderReplyPreview\(reply, parentPost\)/);
  assert.match(source, /repliesMode === 'compact'/);
  assert.match(source, /<ul class="reply-preview-list">/);
  assert.match(source, /data-toggle-delete-reply=/);
  assert.match(source, /data-confirm-delete-reply=/);
  assert.match(source, /closeReplyDeleteConfirm\(/);
  assert.match(css, /\.reply-preview-item \{/);
  assert.match(css, /\.reply-inline-delete-confirm \{/);
  assert.match(source, /roots\.map\(post => renderPost\(post, childrenByParent, new Set\(\), \{ repliesMode, contextParentId \}\)\)/);
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

test('botao de resposta direciona o foco ao input de forma robusta', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /function focusReplyInput\(form\)/);
  assert.match(source, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /requestAnimationFrame\(focus\)/);
  assert.match(source, /setTimeout\(focus, 60\)/);
  assert.match(source, /if \(form\.classList\.contains\('open'\)\) focusReplyInput\(form\)/);
});


test('cards exibem três respostas recentes e preservam a resposta do usuário logado', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /function selectVisibleReplies\(replies, limit = 3\)/);
  assert.match(source, /newest\.find\(reply => sameId\(reply\.userId, currentUser\.id\)\)/);
  assert.match(source, /slice\(0, Math\.max\(0, limit - 1\)\)/);
  assert.match(source, /const visibleReplies = selectVisibleReplies\(replies\)/);
  assert.match(source, /repliesMode: 'compact'/);
  assert.match(source, /renderLane\(allListFeed, feedBuckets\.all, 'compact'\)/);
});

test('perfil renderiza cards recursivos até o quinto nível', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /repliesMode === 'recursive'/);
  assert.match(source, /depth < maxDepth/);
  assert.match(source, /depth: depth \+ 1/);
  assert.match(source, /maxDepth = 5/);
  assert.match(source, /data-terminal-profile=/);
  assert.match(source, /renderLane\(profileFeed, feedBuckets\.all, profileFeed\?\.dataset\.feedIncludeReplies === 'true' \? 'recursive' : 'none', profilePostId\)/);
});


test('perfil recursivo usa apenas o espaçamento do card pai nas laterais', () => {
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.replies\.replies-recursive \{ margin: 14px 0 0; padding: 0; border-left: 0; \}/);
});


test('home usa margens compactas equilibradas e abre a própria resposta clicada', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  const css = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'));
  assert.match(source, /function renderReplyPreview\(reply, parentPost\)/);
  assert.match(source, /\?murmurio=\$\{encodeURIComponent\(reply\.id\)\}/);
  assert.match(css, /\.replies-compact \{ margin: 12px 0 0; padding: 0; border-left: 0; \}/);
});

test('perfil permite murmúrio específico, mostra o pai esmaecido e reinicia a recursão a cada quinto nível', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  const profile = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/pages/perfil/[username].astro', import.meta.url), 'utf8'));
  const css = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'));
  assert.match(source, /function collectPostSubtree\(items, rootPostId\)/);
  assert.match(source, /if \(root\.parentPostId != null\) \{/);
  assert.match(source, /function getSpecificThreadContext\(posts, rootPostId\)/);
  assert.match(source, /contextParentId/);
  assert.match(source, /data-terminal-profile="\/perfil\/\$\{encodeURIComponent\(post\.author\)\}\?murmurio=\$\{encodeURIComponent\(post\.id\)\}"/);
  assert.match(css, /\.murmur-context-parent \{/);
  assert.match(profile, /data-profile-post-id=\{profilePostId \|\| undefined\}/);
  assert.match(profile, /Ver todos os murmúrios/);
});

test('murmúrio específico mostra somente o pai direto e a mensagem selecionada, sem irmãos', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /visited\.add\(String\(parent\.id\)\);/);
  assert.match(source, /selected\.push\(parent\);/);
  assert.doesNotMatch(source, /if \(root\.parentPostId != null\) \{[\s\S]*visit\(parent\);/);
  assert.match(source, /visit\(root\);/);
});

test('texto de cada mensagem abre o perfil no modo da própria mensagem e não exibe contexto redundante', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /class="murmur-text-link" href="\/perfil\/\$\{encodeURIComponent\(post\.author\)\}\?murmurio=\$\{encodeURIComponent\(post\.id\)\}"/);
  assert.doesNotMatch(source, /Resposta para @/);
  assert.doesNotMatch(source, /murmur-reply-context/);
});
