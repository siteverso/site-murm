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
  assert.match(source, /roots\.map\(post => renderPost\(post, childrenByParent, new Set\(\), \{ repliesMode, contextParentId: '' \}\)\)/);
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

test('interna específica renderiza linhas de irmãs e permite inflar card por clique', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  const css = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'));
  assert.match(source, /const SPECIFIC_SIBLING_WINDOW = 5/);
  assert.match(source, /function renderSpecificThread\(parentPost, rootPost, allPosts, siblingStubs = \[\]\)/);
  assert.match(source, /data-inflate-post=/);
  assert.match(source, /data-thread-load-direction="before"/);
  assert.match(source, /data-thread-load-direction="after"/);
  assert.match(source, /state\.beforeExtra \+= SPECIFIC_SIBLING_WINDOW/);
  assert.match(source, /state\.afterExtra \+= SPECIFIC_SIBLING_WINDOW/);
  assert.match(source, /state\.expandedIds\.add\(String\(inflateId\)\)/);
  assert.match(css, /\.thread-sibling-line,/);
  assert.match(source, /function animateInflatedCard\(element, fromHeight = 36\)/);
  assert.match(source, /element\.animate\(\[/);
  assert.match(source, /height: `\$\{targetHeight\}px`/);
});

test('stub lazy é substituído pelos dados completos antes de inflar o card', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(source, /const safePosts = Array\.isArray\(allPosts\) \? allPosts : \[\]/);
  assert.match(source, /const loadedById = new Map\(safePosts\.map\(post => \[String\(post\.id\), post\]\)\)/);
  assert.match(source, /\.map\(post => loadedById\.get\(String\(post\.id\)\) \|\| post\)/);
  assert.match(source, /const loadedPosts = Array\.isArray\(data\?\.posts\) \? data\.posts : \[\]/);
  assert.match(source, /if \(!loadedPosts\.length\) throw new Error\('Murmúrio não encontrado\.'\)/);
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


test('irmãs minimizadas exibem somente data e prévia truncada e carregam o card no clique', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  const repository = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8'));
  const css = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'));
  assert.match(source, /thread-sibling-line__time/);
  assert.match(source, /thread-sibling-line__preview/);
  assert.match(repository, /textPreview: String\(row\.CONTENTS \|\| ''\)\.slice\(0, 140\)/);
  assert.match(css, /text-overflow: ellipsis/);
  assert.match(source, /loadAndExpandSpecificPost\(rootId, inflateId\)/);
  assert.match(source, /beforeExtra \+= SPECIFIC_SIBLING_WINDOW/);
  assert.match(source, /afterExtra \+= SPECIFIC_SIBLING_WINDOW/);
});

test('clique expande somente a linha escolhida e hover opcional usa espera curta', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  const profile = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/pages/perfil/[username].astro', import.meta.url), 'utf8'));
  assert.match(source, /async function expandOnlySpecificPost\(rootId, inflateId, sourceLine = null\)/);
  assert.match(source, /await loadAndExpandSpecificPost\(rootId, String\(inflateId\)\)/);
  assert.doesNotMatch(source, /expandSpecificContext/);
  assert.doesNotMatch(source, /await wait\(300\)/);
  assert.match(source, /const SPECIFIC_HOVER_DELAY_MS = 700/);
  assert.match(source, /setTimeout\(async \(\) => \{/);
  assert.match(source, /scheduleSpecificHoverExpansion\(line\)/);
  assert.match(source, /cancelSpecificHoverExpansion\(\)/);
  assert.match(profile, /data-expand-on-hover/);
  assert.match(profile, /data-expand-on-hover-label>Hover<\/span>/);
});


test('slide de inflação usa altura real e mantém estilo por sexo', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  const css = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'));
  const repository = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8'));
  assert.match(source, /sourceLine\?\.getBoundingClientRect\(\)\.height/);
  assert.match(source, /await animateInflatedCard\(expandedCard, sourceHeight\)/);
  assert.match(source, /const sexClass = post\.sexCode === 'M' \? ' sex-m'/);
  assert.match(css, /\.thread-sibling-line\.sex-m \{/);
  assert.match(css, /\.thread-sibling-line\.sex-f \{/);
  assert.doesNotMatch(css, /\.murmur-context-parent \{[\s\S]*?opacity: \.8;/);
  assert.match(repository, /NVL\(u\.sex_code, ''\) AS sex_code/);
});


test('perfil mantém lateral sticky rolável e não solta respostas de outros usuários', async () => {
  const css = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'));
  const repository = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8'));
  assert.match(css, /\.profile-card \{[^}]*position: sticky;[^}]*max-height: calc\(100dvh - 40px\);[^}]*overflow-y: auto;/s);
  assert.match(repository, /START WITH tree\.parent_post_id IS NULL/);
  assert.match(repository, /CONNECT BY NOCYCLE PRIOR tree\.id = tree\.parent_post_id/);
  assert.doesNotMatch(repository, /OR LOWER\(parent_user\.username\) = LOWER\(:profile_username\)/);
});

test('LED de hover só aparece quando existem linhas colapsadas', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  const css = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'));
  const profile = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/pages/perfil/[username].astro', import.meta.url), 'utf8'));
  assert.match(source, /function syncSpecificHoverControl\(\)/);
  assert.match(source, /profileFeed\?\.querySelector\('\[data-inflate-post\]'\)/);
  assert.match(source, /button\.hidden = !hasCollapsedLines/);
  assert.match(profile, /data-expand-on-hover[^>]*hidden/);
  assert.match(css, /\.profile-hover-expand\.active \.profile-hover-expand__dot \{[^}]*#39d7c5/s);
  assert.match(css, /background: #777/);
});


test('card inflado recolhe fora das hot areas e preserva links e ações', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  const css = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'));
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
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.murmur-author \{[^}]*display: flex;[^}]*align-items: flex-start;/s);
  assert.match(css, /\.murmur-author a \{[^}]*display: inline-flex;[^}]*width: fit-content;/s);
  assert.match(css, /\.murmur-author strong \{[^}]*display: inline;/s);
  assert.match(css, /\.murmur-card-collapsible \.murmur-text-link,[\s\S]*cursor: pointer;/);
});
