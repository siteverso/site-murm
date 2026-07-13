
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readGlobalCss, readGlobalCssSync } from './css-test-utils.mjs';
import { formatDateTime, getRelevanceColumnDefinitions, getSexColumnDefinitions, getUserColumnDefinitions, hasUnreadMessages } from '../public/app-utils.mjs';
import { readAppSource } from './js-source-test-utils.mjs';

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


test('colunas por sexo, relevância e usuários usam títulos no mesmo padrão', async () => {
  const source = await readAppSource();
  assert.match(source, /mode !== 'list'/);
  assert.deepEqual(getSexColumnDefinitions().map(item => item.label), ['Masculino', 'Feminino', 'Sem sexo']);
  assert.deepEqual(getUserColumnDefinitions().map(item => item.code), ['oldest', 'newest', 'active']);
});

test('envio de bilhete usa somente spinner e restaura o ícone original', async () => {
  const source = await readAppSource();
  assert.match(source, /setButtonLoading\(submit, true, ''\)/);
  assert.doesNotMatch(source, /Sending…|Enviando…/);
  assert.match(source, /button\.dataset\.originalContent = button\.innerHTML/);
  assert.match(source, /button\.innerHTML = button\.dataset\.originalContent/);
});

test('CSS global não mantém regras antigas duplicadas de exclusão de resposta', async () => {
  const css = await readGlobalCss();
  assert.equal((css.match(/\.reply-delete \{/g) || []).length, 1);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /button:focus-visible/);
});

test('não existe cópia obsoleta do aplicativo em public\/public', async () => {
  const { access } = await import('node:fs/promises');
  await assert.rejects(access(new URL('../public/public/app.js', import.meta.url)));
});

test('ícones de direct e exclusão do murmúrio aparecem juntos apenas no hover ou foco', () => {
  const css = readGlobalCssSync();
  assert.match(css, /\.murmur-head-actions \.direct-card-button \{ opacity: 0; pointer-events: none;/);
  assert.match(css, /\.murmur-card:hover \.murmur-head-actions \.direct-card-button,/);
  assert.match(css, /\.murmur-card:focus-within \.murmur-head-actions \.direct-card-button \{ opacity: 1; pointer-events: auto;/);
  assert.match(css, /@media \(hover: none\)[\s\S]*\.murmur-head-actions \.direct-card-button \{ opacity: 1; pointer-events: auto;/);
});

test('chat mostra bilhete pendente apenas ao remetente e remove ao desfazer', async () => {
  const source = await readAppSource();
  assert.match(source, /const pendingLabel = isEnglish \? 'Message sent\.' : 'Mensagem enviada\.'/);
  assert.match(source, /const addPendingDirect = contents =>/);
  assert.match(source, /pending: true/);
  assert.match(source, /data-direct-pending="true"/);
  assert.match(source, /onUndone: pendingId => \{[\s\S]*removePendingDirect\(pendingId\)/);
  assert.match(source, /existingNotes = \$\$\('\[data-direct-message\]:not\(\[data-direct-pending\]\)'/);
});


test('usuário do topo abre /perfil', async () => {
  const header = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/components/Header.astro', import.meta.url), 'utf8'));
  const source = await readAppSource();
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

test('perfil recursivo usa apenas o espaçamento do card pai nas laterais', () => {
  const css = readGlobalCssSync();
  assert.match(css, /\.replies\.replies-recursive \{ margin: 14px 0 0; padding: 0; border-left: 0; \}/);
});


test('perfil permite murmúrio específico, mostra o pai esmaecido e reinicia a recursão a cada quinto nível', async () => {
  const source = await readAppSource();
  const profile = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/pages/perfil/[username].astro', import.meta.url), 'utf8'));
  const css = await readGlobalCss();
  assert.match(source, /function collectPostSubtree\(items, rootPostId\)/);
  assert.match(source, /if \(root\.parentPostId != null\) \{/);
  // assert.doesNotMatch(source, /function getSpecificThreadContext\(posts, rootPostId\)/);
  assert.match(source, /contextParentId/);
  assert.match(source, /data-terminal-profile="\/murmurio\/\$\{encodeURIComponent\(post\.id\)\}"/);
  assert.match(css, /\.murmur-context-parent \{/);
  assert.match(profile, /<FeedBoard profileUsername=\{profile\.username\}/);
  assert.match(profile, /showRepliesPage/);
});

test('interna específica renderiza linhas de irmãs e permite inflar card por clique', async () => {
  const source = await readAppSource();
  const css = await readGlobalCss();
  assert.match(source, /const SPECIFIC_SIBLING_WINDOW = 5/);
  assert.match(source, /function renderSpecificThread\(parentPost, rootPost, allPosts, siblingStubs = \[\]\)/);
  assert.match(source, /data-inflate-post=/);
  assert.match(source, /data-thread-load-direction="before"/);
  assert.match(source, /data-thread-load-direction="after"/);
  assert.match(source, /state\.beforeExtra \+= SPECIFIC_SIBLING_WINDOW/);
  assert.match(source, /state\.afterExtra \+= SPECIFIC_SIBLING_WINDOW/);
  assert.match(source, /state\.expandedIds\.add\(String\(inflateId\)\)/);
  assert.match(css, /\.thread-sibling-line,/);
  assert.match(source, /function animateInflatedCard\(element, _?fromHeight = 36\)/);
  assert.match(source, /content\.animate\(\[/);
  assert.match(source, /clipPath: 'inset\(0 0 0 0 round 16px\)'/);
});

test('stub lazy é substituído pelos dados completos antes de inflar o card', async () => {
  const source = await readAppSource();
  assert.match(source, /const safePosts = Array\.isArray\(allPosts\) \? allPosts : \[\]/);
  assert.match(source, /const loadedById = new Map\(safePosts\.map\(post => \[String\(post\.id\), post\]\)\)/);
  assert.match(source, /\.map\(post => loadedById\.get\(String\(post\.id\)\) \|\| post\)/);
  assert.match(source, /const loadedPosts = Array\.isArray\(data\?\.posts\) \? data\.posts : \[\]/);
  assert.match(source, /if \(!loadedPosts\.length\) throw new Error\('Murmúrio não encontrado\.'\)/);
});

test('murmúrio específico mostra somente o pai direto e a mensagem selecionada, sem irmãos', async () => {
  const source = await readAppSource();
  assert.match(source, /visited\.add\(String\(parent\.id\)\);/);
  assert.match(source, /selected\.push\(parent\);/);
  assert.doesNotMatch(source, /if \(root\.parentPostId != null\) \{[\s\S]*visit\(parent\);/);
  assert.match(source, /visit\(root\);/);
});

test('texto de cada mensagem abre a home contextual do próprio murmúrio e não exibe contexto redundante', async () => {
  const source = await readAppSource();
  assert.match(source, /class="murmur-text-link" href="\/murmurio\/\$\{encodeURIComponent\(post\.id\)\}"/);
  assert.doesNotMatch(source, /Resposta para @/);
  assert.doesNotMatch(source, /murmur-reply-context/);
});


test('card inflado recolhe fora das hot areas e preserva links e ações', async () => {
  const source = await readAppSource();
  const css = await readGlobalCss();
  assert.match(source, /collapsibleHeader = false/);
  assert.match(source, /data-collapse-expanded-post=/);
  assert.match(source, /murmur-card-collapsible/);
  assert.match(source, /event\.target\.closest\('\.murmur-profile-link, \.murmur-author a, \.murmur-text-link, \.murmur-head-actions, \.murmur-actions, button/);
  assert.match(source, /async function collapseExpandedSpecificPost/);
  assert.match(source, /height: '36px'/);
  assert.match(source, /state\.expandedIds\.delete\(String\(postId\)\)/);
  assert.match(css, /\.murmur-card-collapsible \{ cursor: default; \}/);
});

test('link do usuário ocupa somente avatar e texto do nome', () => {
  const css = readGlobalCssSync();
  assert.match(css, /\.murmur-author \{[^}]*display: flex;[^}]*align-items: flex-start;/s);
  assert.match(css, /\.murmur-author a \{[^}]*display: inline-flex;[^}]*width: fit-content;/s);
  assert.match(css, /\.murmur-author strong \{[^}]*display: inline;/s);
  assert.match(css, /\.murmur-card-collapsible \.murmur-text-link,[\s\S]*cursor: pointer;/);
});

test('feed força leitura sem cache e sincroniza exclusões entre abas', async () => {
  const source = await readAppSource();
  assert.match(source, /cache: 'no-store'/);
  assert.match(source, /new BroadcastChannel\('murmurinho-feed-sync'\)/);
  assert.match(source, /announceFeedChanged\(\)/);
  assert.match(source, /event\.data\?\.type === 'feed-changed'/);
  assert.match(source, /window\.addEventListener\('focus', refresh\)/);
  assert.match(source, /window\.addEventListener\('pageshow', refresh\)/);
});


test('define as três colunas independentes de relevância', () => {
  assert.deepEqual(getRelevanceColumnDefinitions().map(item => item.code), ['pulse', 'echoes', 'silences']);
  assert.deepEqual(getRelevanceColumnDefinitions().map(item => item.label), ['Mais pulsos', 'Mais ecos', 'Mais silenciados']);
});
