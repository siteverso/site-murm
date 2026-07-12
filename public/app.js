import { formatDateTime, getSexColumnDefinitions, hasUnreadMessages } from '/app-utils.mjs';

const $ = (selector, root = document) => root?.querySelector?.(selector) ?? null;

const ICONS = {
  direct: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M4 4.5H16V13.2H9.2L5.3 16V13.2H4V4.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M7 8.8H13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </span>`,
  echo: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <circle cx="5" cy="10" r="1.55" fill="currentColor"/>
        <path d="M8 7.7C9.55 8.85 9.55 11.15 8 12.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M11.2 5.8C14.7 8.3 14.7 11.7 11.2 14.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
    </span>`,
  ignore: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M11.8 4.2C8.2 4.2 6.1 6.5 6.1 9.4C6.1 11.2 7 12.2 8.1 13.1C9 13.8 9.3 14.4 9.3 15.2C9.3 16.2 10.1 16.9 11.1 16.9C12.5 16.9 13.2 15.8 13.2 14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M9.1 9.7C9.1 8.2 10 7.2 11.4 7.2C12.7 7.2 13.6 8.1 13.6 9.3C13.6 10.2 13.1 10.8 12.4 11.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M4.2 4.3L15.8 15.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </span>`,
  reply: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M8.2 6L4.5 9.7L8.2 13.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5.1 9.7H11.4C13.9 9.7 15.5 11 15.5 13.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`,
  share: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M6 14L14 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M8 6H14V12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`,
  send: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <circle cx="5" cy="10" r="1.45" fill="currentColor"/>
        <path d="M8 7.85C9.25 8.85 9.25 11.15 8 12.15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M11.2 5.8C14.7 8.25 14.7 11.75 11.2 14.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
    </span>`,
  delete: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M6.5 7.2V15.2H13.5V7.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5.2 5.3H14.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M8 5.2V3.8H12V5.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8.5 9.2V13.2M11.5 9.2V13.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </span>`,
};

const $$ = (selector, root = document) => root?.querySelectorAll ? [...root.querySelectorAll(selector)] : [];
const sameId = (left, right) => left != null && right != null && String(left) === String(right);

const api = async (url, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Erro inesperado.');
    error.status = response.status;
    throw error;
  }
  return data;
};

const toast = (message) => {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3200);
};

const scheduleDirectSend = ({ recipientId, contents, onPending, onSent, onUndone, onFailed }) => {
  const el = $('[data-toast]');
  if (!el || !recipientId || !contents) return;

  const isEnglish = document.documentElement.lang?.toLowerCase().startsWith('en');
  const pendingLabel = isEnglish ? 'Message sent.' : 'Mensagem enviada.';
  const undoLabel = isEnglish ? 'Undo' : 'Desfazer';
  el.replaceChildren();

  const message = document.createElement('span');
  message.textContent = pendingLabel;
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.className = 'toast-action';
  undo.textContent = undoLabel;
  el.append(message, undo);
  el.classList.add('show');
  clearTimeout(el._timer);

  let pending = true;
  const pendingToken = onPending?.();
  const toastToken = Symbol('direct-send');
  el._directSendToken = toastToken;
  const dismiss = () => {
    if (el._directSendToken !== toastToken) return;
    el.classList.remove('show');
    el._timer = setTimeout(() => {
      if (el._directSendToken === toastToken) el.replaceChildren();
    }, 220);
  };

  const sendTimer = setTimeout(async () => {
    if (!pending) return;
    pending = false;
    undo.disabled = true;
    dismiss();

    try {
      const result = await api('/api/directs', {
        method: 'POST',
        body: JSON.stringify({ recipientId, contents }),
      });
      await onSent?.(result, pendingToken);
    } catch (error) {
      await onFailed?.(error, pendingToken);
      toast(error.message);
    }
  }, 5000);

  undo.addEventListener('click', async () => {
    if (!pending) return;
    pending = false;
    clearTimeout(sendTimer);
    dismiss();
    await onUndone?.(pendingToken);
  }, { once: true });
};


const setFormMessage = (element, message = '', type = 'info') => {
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
};

const setButtonLoading = (button, loading, label = 'Verificando…') => {
  if (!button) return;
  if (loading) {
    if (!button.hasAttribute('data-original-content')) {
      button.dataset.originalContent = button.innerHTML;
    }
    button.disabled = true;
    button.classList.add('is-loading');
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span>${label ? `<span>${label}</span>` : ''}`;
    return;
  }
  button.disabled = false;
  button.classList.remove('is-loading');
  button.removeAttribute('aria-busy');
  if (button.hasAttribute('data-original-content')) {
    button.innerHTML = button.dataset.originalContent;
    delete button.dataset.originalContent;
  }
};

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

let currentUser = null;
let posts = [];
let feedSignature = '';
let feedRequestRunning = false;
const MIN_SITE_REFRESH_INTERVAL_MS = 2000;
const FEED_BATCH_SIZE = 20;
const feedBuckets = { all: [] };
const splitFeedLimits = {};
const COLUMN_GROUPS = {
  sex: getSexColumnDefinitions(),
  region: [
    { code: 'N', label: 'Norte' },
    { code: 'NE', label: 'Nordeste' },
    { code: 'CO', label: 'Centro-Oeste' },
    { code: 'SE', label: 'Sudeste' },
    { code: 'S', label: 'Sul' },
  ],
};
let feedColumnObservers = [];
let feedTimer = null;

function userInitials(username = '') {
  return String(username).trim().slice(0, 2).toUpperCase() || 'MU';
}

function renderAvatar(el, user) {
  el.replaceChildren();
  if (user.avatarUrl) {
    const image = document.createElement('img');
    image.src = user.avatarUrl;
    image.alt = `Foto de @${user.username}`;
    image.loading = 'eager';
    el.append(image);
    return;
  }
  el.textContent = userInitials(user.username);
}

function renderUser(user) {
  if (!user) return;

  $$('[data-user-avatar]').forEach(el => renderAvatar(el, user));
  $$('[data-user-name]').forEach(el => { el.textContent = `@${user.username}`; });
  $$('[data-own-profile-link]').forEach(el => { el.href = `/perfil/${encodeURIComponent(user.username)}`; });
  $$('[data-profile-avatar]').forEach(el => renderAvatar(el, user));
  $$('[data-profile-username]').forEach(el => { el.textContent = `@${user.username}`; });
  $$('[data-profile-email]').forEach(el => { el.textContent = user.email; });
  $$('[data-profile-sex]').forEach(el => { el.textContent = user.sexCode === 'M' ? 'Macho' : user.sexCode === 'F' ? 'Fêmea' : 'Sexo não informado'; });
  const regionNames = { N: 'Norte', NE: 'Nordeste', CO: 'Centro-Oeste', SE: 'Sudeste', S: 'Sul' };
  $$('[data-profile-region]').forEach(el => { el.textContent = regionNames[user.regionCode] || ''; el.hidden = !user.regionCode; });
  $$('[data-profile-bio]').forEach(el => { el.textContent = user.bio || 'Sem biografia ainda.'; });
  $$('[data-profile-posts]').forEach(el => { el.textContent = user.postCount; });
  $$('[data-profile-positive]').forEach(el => { el.textContent = user.positiveCount; });
  $$('[data-profile-negative]').forEach(el => { el.textContent = user.negativeCount; });

  const profileForm = $('[data-profile-form]');
  if (profileForm) {
    const usernameInput = profileForm.username;
    const usernameRule = $('[data-username-rule]', profileForm);
    usernameInput.value = user.username;
    usernameInput.disabled = !user.usernameCanChange;

    if (user.usernameChangeCount >= 1) {
      usernameRule.textContent = 'Usuário bloqueado: a única correção permitida para esta conta já foi utilizada.';
      usernameRule.dataset.type = 'locked';
    } else if (!user.usernameCanChange && user.usernameChangeAvailableAt) {
      const availableDate = new Date(user.usernameChangeAvailableAt).toLocaleDateString();
      usernameRule.textContent = `A única correção do usuário ficará disponível em ${availableDate}.`;
      usernameRule.dataset.type = 'waiting';
    } else {
      usernameRule.textContent = 'Uma única correção está disponível. Depois de salvar, o usuário ficará bloqueado definitivamente.';
      usernameRule.dataset.type = 'warning';
    }

    const emailInput = profileForm.email;
    const emailRule = $('[data-email-rule]', profileForm);
    emailInput.value = user.email;
    emailInput.disabled = !user.emailCanChange;

    if (!user.emailCanChange && user.emailChangeAvailableAt) {
      const availableDate = new Date(user.emailChangeAvailableAt).toLocaleDateString();
      emailRule.textContent = `O e-mail poderá ser alterado novamente em ${availableDate}.`;
      emailRule.dataset.type = 'waiting';
    } else {
      emailRule.textContent = 'Você pode alterar o e-mail agora. Após salvar, uma nova troca só será permitida em 30 dias.';
      emailRule.dataset.type = 'warning';
    }
    const sexSelect = profileForm.sexCode;
    const sexRule = $('[data-sex-rule]', profileForm);
    sexSelect.value = user.sexCode || '';
    sexSelect.disabled = Boolean(user.sexCode && !user.sexCanChange);

    if (!user.sexCode) {
      sexRule.textContent = 'Defina com atenção. Depois, apenas uma correção será permitida, após 30 dias.';
      sexRule.dataset.type = 'info';
    } else if (user.sexChangeCount >= 1) {
      sexRule.textContent = 'Sexo bloqueado: a única correção permitida para esta conta já foi utilizada.';
      sexRule.dataset.type = 'locked';
    } else if (!user.sexCanChange && user.sexChangeAvailableAt) {
      const availableDate = new Date(user.sexChangeAvailableAt).toLocaleDateString();
      sexRule.textContent = `Você poderá fazer a única correção a partir de ${availableDate}.`;
      sexRule.dataset.type = 'waiting';
    } else {
      sexRule.textContent = 'Uma única correção está disponível. Depois de salvar, o sexo ficará bloqueado definitivamente.';
      sexRule.dataset.type = 'warning';
    }

    profileForm.regionCode.value = user.regionCode || '';
    profileForm.columnGroupCode.value = user.columnGroupCode || 'sex';
    profileForm.bio.value = user.bio || '';

    const columnGroupSelect = $('[data-column-group-select]');
    if (columnGroupSelect) columnGroupSelect.value = user.columnGroupCode || 'sex';
  }

  const methods = [];
  if (user.hasPassword) methods.push('Senha');
  if (user.hasGoogle) methods.push('Google');
  const methodsEl = $('[data-auth-methods]');
  if (methodsEl) methodsEl.textContent = methods.join(' + ') || 'Nenhum';

  const explanation = $('[data-auth-explanation]');
  if (explanation) {
    explanation.textContent = user.hasGoogle
      ? 'Sua conta pode ser acessada pelo Google. Você também pode definir ou trocar uma senha abaixo.'
      : 'Sua conta usa acesso por usuário/e-mail e senha.';
  }

  const passwordTitle = $('[data-password-title]');
  if (passwordTitle) passwordTitle.textContent = user.hasPassword ? 'Trocar senha' : 'Definir senha';
  const passwordButton = $('[data-password-form] button[type="submit"]');
  if (passwordButton) passwordButton.textContent = user.hasPassword ? 'Trocar senha' : 'Definir senha';
}

async function loadUser() {
  try {
    const data = await api('/api/auth/me');
    currentUser = data.user || null;
    renderUser(currentUser);
    return currentUser;
  } catch (error) {
    currentUser = null;
    if (error.status === 401 && document.body.dataset.authRequired === 'true' && !location.pathname.startsWith('/login')) {
      location.href = '/login';
    } else if (error.status !== 401) {
      toast(error.message);
    }
    return null;
  }
}

function renderPostHeaderActions(post) {
  const directButton = sameId(currentUser?.id, post.userId)
    ? ''
    : `<button class="direct-card-button" type="button" data-direct-user="${post.userId}" data-direct-name="${escapeHtml(post.author)}" title="Enviar bilhete" aria-label="Enviar bilhete">${ICONS.direct}</button>`;
  const deleteAttribute = post.parentPostId ? `data-delete-reply="${post.id}"` : `data-delete-post="${post.id}"`;
  const deleteButton = sameId(currentUser?.id, post.userId)
    ? `<button class="direct-card-button murmur-delete-button" type="button" ${deleteAttribute} title="Apagar murmúrio" aria-label="Apagar murmúrio">${ICONS.delete}</button>`
    : '';
  return `<div class="murmur-head-actions">${deleteButton}${directButton}</div>`;
}

function groupPostsByParent(items) {
  const childrenByParent = new Map();
  items.forEach(post => {
    if (post.parentPostId == null) return;
    const key = String(post.parentPostId);
    const children = childrenByParent.get(key) || [];
    children.push(post);
    childrenByParent.set(key, children);
  });
  return childrenByParent;
}

function getRootPosts(items) {
  const publishedIds = new Set(items.map(post => String(post.id)));
  return items.filter(post => post.parentPostId == null || !publishedIds.has(String(post.parentPostId)));
}

function renderPost(post, childrenByParent = new Map(), ancestry = new Set(), includeReplies = false) {
  const score = post.positive - post.negative;
  const sexClass = post.sexCode === 'M' ? 'sex-m' : post.sexCode === 'F' ? 'sex-f' : 'sex-u';
  const replyContext = post.parentPostId
    ? `<a class="murmur-reply-context" href="#murmurio-${post.parentPostId}">Resposta para @${escapeHtml(post.parentAuthor || 'murmúrio')}</a>`
    : '';
  const postKey = String(post.id);
  const nextAncestry = new Set(ancestry);
  nextAncestry.add(postKey);
  const replies = (childrenByParent.get(postKey) || []).filter(reply => !nextAncestry.has(String(reply.id)));
  const nestedReplies = includeReplies && replies.length
    ? `<div class="replies" data-replies-for="${post.id}">${replies.map(reply => renderPost(reply, childrenByParent, nextAncestry, true)).join('')}</div>`
    : '';

  return `<article id="murmurio-${post.id}" class="panel murmur-card ${sexClass}${post.parentPostId ? ' murmur-reply-card' : ''}" data-post-id="${post.id}">
    <div class="murmur-head">
      <a class="avatar murmur-profile-link" href="/perfil/${encodeURIComponent(post.author)}" aria-label="Abrir perfil de @${escapeHtml(post.author)}">${post.avatarUrl ? `<img src="${escapeHtml(post.avatarUrl)}" alt="Foto de @${escapeHtml(post.author)}" loading="lazy">` : escapeHtml(post.author.slice(0, 2).toUpperCase())}</a>
      <div class="murmur-author"><a href="/perfil/${encodeURIComponent(post.author)}"><strong>@${escapeHtml(post.author)}</strong></a><span>${new Date(post.createdAt).toLocaleString()}</span></div>
      ${renderPostHeaderActions(post)}
    </div>
    ${replyContext}
    <p class="murmur-text">${escapeHtml(post.text)}</p>
    <div class="score-line">
      <span class="score ${score < 0 ? 'negative' : ''}">${score}</span>
      <div class="murmur-actions">
        <button class="action-button ${post.myVote === 1 ? 'active' : ''}" data-vote="1" title="Ecoar" aria-label="Ecoar este murmúrio">${ICONS.echo}<span>${post.positive}</span></button>
        <button class="action-button ${post.myVote === -1 ? 'active' : ''}" data-vote="-1" title="Ignorar" aria-label="Ignorar este murmúrio">${ICONS.ignore}<span>${post.negative}</span></button>
        <button class="action-button" data-reply title="Responder" aria-label="Responder a este murmúrio">${ICONS.reply}<span>${post.replyCount || 0}</span></button>
        <button class="action-button" data-share title="Compartilhar link" aria-label="Compartilhar link deste murmúrio">${ICONS.share}<span>${post.shares}</span></button>
      </div>
    </div>
    <form class="reply-box" data-reply-form>
      <input maxlength="280" placeholder="Responder sem fazer barulho…" required>
      <button class="reply-send-button" type="submit" title="Enviar resposta" aria-label="Enviar resposta">${ICONS.send}</button>
    </form>
    ${nestedReplies}
  </article>`;
}

function renderLane(feed, posts, includeReplies = false) {
  if (!feed) return;
  const childrenByParent = groupPostsByParent(posts);
  const roots = getRootPosts(posts);
  feed.innerHTML = roots.length
    ? roots.map(post => renderPost(post, childrenByParent, new Set(), includeReplies)).join('')
    : '<p class="empty-state">Nenhum murmúrio nesta visualização.</p>';
}

function disconnectFeedColumnObservers() {
  feedColumnObservers.forEach(observer => observer.disconnect());
  feedColumnObservers = [];
}

function getColumnGroupMode() {
  return currentUser?.columnGroupCode === 'region' ? 'region' : 'sex';
}

function getColumnDefinitions() {
  return COLUMN_GROUPS[getColumnGroupMode()];
}

function getColumnItems(definition) {
  const roots = getRootPosts(posts);
  if (getColumnGroupMode() === 'region') {
    return roots.filter(post => (post.regionCode || '') === definition.code);
  }
  return roots.filter(post => (post.sexCode || '') === definition.code);
}

function renderSplitLane(feed, items, kind) {
  if (!feed) return;
  const limit = splitFeedLimits[kind] || FEED_BATCH_SIZE;
  const visible = items.slice(0, limit);
  const childrenByParent = groupPostsByParent(posts);
  const hasMore = items.length > visible.length;
  feed.innerHTML = visible.length
    ? `${visible.map(post => renderPost(post, childrenByParent)).join('')}${hasMore ? `<div class="feed-more-wrap"><button class="feed-more-button" type="button" data-feed-more="${kind}">Mostrar mais 20</button><div class="feed-more-sentinel" data-feed-more-sentinel="${kind}" aria-hidden="true"></div></div>` : ''}`
    : '<p class="empty-state">Nenhum murmúrio nesta coluna.</p>';
}

function renderSplitFeeds() {
  const columns = $('[data-feed-columns]');
  if (!columns) return;

  const definitions = getColumnDefinitions();
  columns.dataset.columnCount = String(definitions.length);
  columns.innerHTML = definitions.map(definition => {
    const key = `${getColumnGroupMode()}-${definition.code || 'none'}`;
    return `<section class="network-lane ${definition.className || ''}">
      <div class="feed lane-feed" data-feed-column="${key}"></div>
    </section>`;
  }).join('');

  definitions.forEach(definition => {
    const key = `${getColumnGroupMode()}-${definition.code || 'none'}`;
    renderSplitLane($(`[data-feed-column="${key}"]`), getColumnItems(definition), key);
  });
  setupFeedColumnAutoload();
}

function expandSplitFeed(kind) {
  const definition = getColumnDefinitions().find(item => `${getColumnGroupMode()}-${item.code || 'none'}` === kind);
  if (!definition) return;
  const items = getColumnItems(definition);
  splitFeedLimits[kind] = splitFeedLimits[kind] || FEED_BATCH_SIZE;
  if (splitFeedLimits[kind] >= items.length) return;
  splitFeedLimits[kind] += FEED_BATCH_SIZE;
  renderSplitFeeds();
}

function setupFeedColumnAutoload() {
  disconnectFeedColumnObservers();
  $$('[data-feed-more-sentinel]').forEach(sentinel => {
    const kind = sentinel.dataset.feedMoreSentinel;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) return;
      expandSplitFeed(kind);
    }, { root: null, threshold: 0.1, rootMargin: '0px 0px 240px 0px' });
    observer.observe(sentinel);
    feedColumnObservers.push(observer);
  });
}

function getFeedSignature(items) {
  return JSON.stringify(items.map(post => [
    post.id,
    post.sexCode,
    post.regionCode,
    post.text,
    post.positive,
    post.negative,
    post.shares,
    post.myVote,
    post.createdAt,
    post.parentPostId,
    post.parentAuthor,
    post.replyCount,
  ]));
}

function captureFeedAnchor() {
  if (window.scrollY <= 0) return null;
  const headerBottom = $('[data-site-header]')?.getBoundingClientRect().bottom || $('.topbar')?.getBoundingClientRect().bottom || 0;
  const cards = $$('[data-post-id]').filter(card => {
    const rect = card.getBoundingClientRect();
    return rect.bottom > headerBottom && rect.top < window.innerHeight;
  });
  if (!cards.length) return null;
  const anchor = cards.reduce((closest, card) => {
    const distance = Math.abs(card.getBoundingClientRect().top - headerBottom);
    return !closest || distance < closest.distance ? { card, distance } : closest;
  }, null)?.card;
  return anchor ? { postId: anchor.dataset.postId, top: anchor.getBoundingClientRect().top } : null;
}

function restoreFeedAnchor(anchor) {
  if (!anchor) return;
  const card = document.querySelector(`[data-post-id="${anchor.postId}"]`);
  if (!card) return;
  const delta = card.getBoundingClientRect().top - anchor.top;
  if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
}

async function loadFeed(force = false) {
  const columns = $('[data-feed-columns]');
  const allListFeed = $('[data-feed-all-list]');
  const profileFeed = $('[data-profile-feed]');
  if ((!columns && !allListFeed && !profileFeed) || feedRequestRunning) return;

  feedRequestRunning = true;
  try {
    const profileUsername = profileFeed?.dataset.profileUsername || '';
    const endpoint = profileUsername ? `/api/posts?username=${encodeURIComponent(profileUsername)}` : '/api/posts';
    const data = await api(endpoint);
    const nextPosts = data.posts || [];
    const nextSignature = getFeedSignature(nextPosts);
    if (!force && nextSignature === feedSignature) return;

    const anchor = captureFeedAnchor();
    posts = nextPosts;
    feedSignature = nextSignature;
    feedBuckets.all = posts;
    renderSplitFeeds();
    renderLane(allListFeed, feedBuckets.all, false);
    renderLane(profileFeed, feedBuckets.all, profileFeed?.dataset.feedIncludeReplies === 'true');
    restoreFeedAnchor(anchor);
  } finally {
    feedRequestRunning = false;
  }
}
function pinCardActions(postId) {
  const card = document.querySelector(`[data-post-id="${postId}"]`);
  if (!card) return;

  card.classList.add('actions-pinned');
  card.addEventListener('pointerleave', () => {
    card.classList.remove('actions-pinned');
  }, { once: true });
}

function startFeedPolling() {
  if (!$('[data-feed-columns]') && !$('[data-feed-all-list]') && !$('[data-profile-feed]')) return;

  clearInterval(feedTimer);
  feedTimer = setInterval(() => {
    if (document.visibilityState === 'visible') loadFeed().catch(() => {});
  }, MIN_SITE_REFRESH_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadFeed().catch(() => {});
  });
}

function bindFeedView() {
  const switcher = $('[data-feed-view-switch]');
  const board = $('[data-feed-board]');
  if (!switcher || !board) return;

  const panels = $$('[data-feed-view-panel]', board);
  const buttons = $$('[data-feed-view]', switcher);
  const validViews = new Set(['split', 'list']);

  const applyView = view => {
    const mode = validViews.has(view) ? view : 'split';
    board.dataset.feedViewMode = mode;
    buttons.forEach(button => {
      const active = button.dataset.feedView === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    panels.forEach(panel => {
      panel.hidden = panel.dataset.feedViewPanel !== mode;
    });
    if (mode === 'split') requestAnimationFrame(setupFeedColumnAutoload);
    try { localStorage.setItem('murmur_feed_view', mode); } catch {}
  };

  const initial = (() => {
    try { return localStorage.getItem('murmur_feed_view') || 'split'; } catch { return 'split'; }
  })();
  applyView(initial);

  switcher.addEventListener('click', event => {
    const button = event.target.closest('[data-feed-view]');
    if (!button) return;
    applyView(button.dataset.feedView);
  });
}

async function saveColumnGroupPreference(columnGroupCode) {
  if (!currentUser || !['sex', 'region'].includes(columnGroupCode)) return;
  await api('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({
      username: currentUser.username,
      email: currentUser.email,
      bio: currentUser.bio,
      sexCode: currentUser.sexCode,
      regionCode: currentUser.regionCode,
      columnGroupCode,
    }),
  });
  currentUser.columnGroupCode = columnGroupCode;
  const profileSelect = $('[data-profile-form] [name="columnGroupCode"]');
  if (profileSelect) profileSelect.value = columnGroupCode;
  Object.keys(splitFeedLimits).forEach(key => delete splitFeedLimits[key]);
  renderSplitFeeds();
}

function bindColumnGroup() {
  const select = $('[data-column-group-select]');
  if (!select) return;
  select.value = currentUser?.columnGroupCode || 'sex';
  select.addEventListener('change', async () => {
    const previous = currentUser?.columnGroupCode || 'sex';
    select.disabled = true;
    try {
      await saveColumnGroupPreference(select.value);
      toast('Agrupamento das colunas atualizado.');
    } catch (error) {
      select.value = previous;
      toast(error.message);
    } finally {
      select.disabled = false;
    }
  });
}

function openReplyForm(card, { toggle = false } = {}) {
  const form = card?.querySelector('[data-reply-form]');
  if (!form) return;

  if (toggle) form.classList.toggle('open');
  else form.classList.add('open');

  if (form.classList.contains('open')) {
    requestAnimationFrame(() => form.querySelector('input')?.focus({ preventScroll: true }));
  }
}

function openPostAuthorProfile(card) {
  const profileUrl = card?.querySelector('.murmur-profile-link')?.href;
  if (profileUrl) window.location.assign(profileUrl);
}

function bindFeed() {
  document.addEventListener('click', async event => {
    const target = event.target.closest('button');
    if (!target) return;
    const card = target.closest('[data-post-id]');
    try {
      if (target.matches('[data-reply]')) openReplyForm(card, { toggle: true });
      if (target.matches('[data-vote]')) {
        const postId = card.dataset.postId;
        card.classList.add('actions-pinned');
        await api(`/api/posts/${postId}/vote`, {
          method: 'POST',
          body: JSON.stringify({ value: Number(target.dataset.vote) }),
        });
        await loadFeed();
        pinCardActions(postId);
      }
      if (target.matches('[data-share]')) { await api(`/api/posts/${card.dataset.postId}/share`, { method: 'POST' }); await navigator.clipboard?.writeText(`${location.origin}/#murmurio-${card.dataset.postId}`); toast('Link copiado.'); await loadFeed(); }
      if (target.matches('[data-delete-reply]')) { await api(`/api/replies/${target.dataset.deleteReply}`, { method: 'DELETE' }); await loadFeed(true); toast('Murmúrio apagado.'); }
      if (target.matches('[data-delete-post]')) {
        const postId = target.dataset.deletePost;
        modal(`<h2>Apagar murmúrio?</h2><p class="modal-subtitle">O murmúrio inteiro e todas as respostas deixarão de aparecer.</p><div class="modal-actions murmur-delete-confirm-actions"><button class="button" type="button" data-modal-close>Cancelar</button><button class="button primary" type="button" data-confirm-delete-post="${postId}">Apagar</button></div>`, 'confirm-delete-modal');
      }
      if (target.matches('[data-confirm-delete-post]')) {
        target.disabled = true;
        await api(`/api/posts/${target.dataset.confirmDeletePost}`, { method: 'DELETE' });
        closeModal();
        await loadFeed(true);
        toast('Murmúrio apagado.');
      }
      if (target.matches('[data-feed-more]')) { expandSplitFeed(target.dataset.feedMore); }
      const directButton = target.closest('[data-direct-user]');
      if (directButton) openDirectComposer(Number(directButton.dataset.directUser), directButton.dataset.directName);
    } catch (error) { toast(error.message); }
  });

  document.addEventListener('dblclick', event => {
    if (event.target.closest('button, a, input, textarea, form')) return;
    const card = event.target.closest('[data-post-id]');
    if (!card) return;

    const replyForm = card.querySelector('[data-reply-form]');
    if (replyForm?.classList.contains('open')) {
      openPostAuthorProfile(card);
      return;
    }

    openReplyForm(card);
  });

  document.addEventListener('submit', async event => {
    const form = event.target;
    if (form.matches('[data-composer], [data-floating-composer]')) {
      event.preventDefault();
      const text = form.querySelector('textarea').value.trim();
      try { await api('/api/posts', { method: 'POST', body: JSON.stringify({ text }) }); form.reset(); closeModal(); await loadFeed(); toast('Murmúrio publicado.'); } catch (error) { toast(error.message); }
    }
    if (form.matches('[data-reply-form]')) {
      event.preventDefault();
      const card = form.closest('[data-post-id]');
      const text = form.querySelector('input').value.trim();
      try { await api(`/api/posts/${card.dataset.postId}/reply`, { method: 'POST', body: JSON.stringify({ text }) }); await loadFeed(); } catch (error) { toast(error.message); }
    }
  });
}

function closeModal() {
  $('[data-modal]')?.remove();
}

function focusModalField(selector) {
  const focus = () => {
    const field = $(selector);
    if (!field) return;
    field.focus({ preventScroll: true });
    const length = field.value.length;
    field.setSelectionRange?.(length, length);
  };

  requestAnimationFrame(() => requestAnimationFrame(focus));
  setTimeout(focus, 80);
}

function modal(content, className = '') {
  closeModal();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-modal role="dialog" aria-modal="true"><div class="panel modal-card ${className}"><button class="modal-close" type="button" data-modal-close aria-label="Fechar">×</button>${content}</div></div>`);
}

function openComposer() {
  modal(`<h2>Novo murmúrio</h2><form data-floating-composer><textarea maxlength="420" autofocus placeholder="O que está murmurando?" required></textarea><div class="modal-actions"><span>Até 420 caracteres</span><button class="button primary">Murmurar</button></div></form>`);
  focusModalField('[data-floating-composer] textarea');
}

function openDirectComposer(userId, username) {
  modal(`<h2>Enviar bilhete</h2><p class="modal-subtitle">Para @${escapeHtml(username)}</p><form data-direct-compose><input type="hidden" name="recipientId" value="${userId}"><textarea maxlength="256" autofocus placeholder="Escreva seu bilhete…" required></textarea><div class="modal-actions"><span>Entrega discreta</span><button class="button primary">Enviar bilhete</button></div></form>`, 'direct-compose-modal');
}

function bindUi() {
  document.addEventListener('click', event => {
    if (event.target.matches('[data-modal], [data-modal-close]')) closeModal();
    if (event.target.closest('[data-new-murmur]')) openComposer();
    if (event.target.closest('[data-scroll-top]')) window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.addEventListener('keydown', event => {
    const activeModal = $('[data-modal]');
    if (!activeModal) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (
      event.key === 'Enter'
      && !event.repeat
      && !event.isComposing
      && !event.ctrlKey
      && !event.altKey
      && !event.metaKey
      && !event.shiftKey
    ) {
      const confirmDeleteButton = activeModal.querySelector('[data-confirm-delete-post]');
      if (!confirmDeleteButton || confirmDeleteButton.disabled) return;
      event.preventDefault();
      confirmDeleteButton.click();
    }
  });
  window.addEventListener('scroll', () => $('[data-scroll-top]')?.classList.toggle('visible', scrollY > 500), { passive: true });
  $('[data-theme-toggle]')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.cookie = `murmurinho-theme=${next};path=/;max-age=31536000`;
  });
  $('[data-logout]')?.addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
}


const uploadProfileAvatar = async (blob, message) => {
  const formData = new FormData();
  formData.append('avatar', blob, 'avatar.jpg');
  await api('/api/auth/avatar', { method: 'POST', body: formData });
  await loadUser();
  setFormMessage(message, 'Foto atualizada.', 'success');
  toast('Foto de perfil atualizada.');
};

function openAvatarCropper(file, message, input) {
  const objectUrl = URL.createObjectURL(file);
  modal(`
    <h2>Ajustar foto</h2>
    <p class="modal-subtitle">Mova a imagem e ajuste o zoom para enquadrar o perfil.</p>
    <div class="avatar-crop-stage" data-avatar-crop-stage>
      <img src="${objectUrl}" alt="Imagem escolhida para recorte" draggable="false" data-avatar-crop-image>
      <span class="avatar-crop-mask" aria-hidden="true"></span>
    </div>
    <label class="avatar-crop-zoom">
      <span>Zoom</span>
      <input type="range" min="1" max="3" value="1" step="0.01" data-avatar-crop-zoom>
    </label>
    <div class="modal-actions avatar-crop-actions">
      <button class="button secondary" type="button" data-modal-close>Cancelar</button>
      <button class="button primary" type="button" data-avatar-crop-confirm>Usar esta foto</button>
    </div>
  `, 'avatar-crop-modal');

  const backdrop = $('[data-modal]');
  const stage = $('[data-avatar-crop-stage]', backdrop);
  const image = $('[data-avatar-crop-image]', backdrop);
  const zoomInput = $('[data-avatar-crop-zoom]', backdrop);
  const confirm = $('[data-avatar-crop-confirm]', backdrop);
  if (!stage || !image || !zoomInput || !confirm) return;

  const state = { x: 0, y: 0, zoom: 1, baseScale: 1, dragging: false, pointerX: 0, pointerY: 0 };
  const stageSize = () => stage.clientWidth;
  const clampPosition = () => {
    const size = stageSize();
    const width = image.naturalWidth * state.baseScale * state.zoom;
    const height = image.naturalHeight * state.baseScale * state.zoom;
    state.x = Math.max((size - width) / 2, Math.min((width - size) / 2, state.x));
    state.y = Math.max((size - height) / 2, Math.min((height - size) / 2, state.y));
  };
  const render = () => {
    clampPosition();
    image.style.transform = `translate(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px)) scale(${state.baseScale * state.zoom})`;
  };
  const initializeImage = () => {
    state.baseScale = Math.max(stageSize() / image.naturalWidth, stageSize() / image.naturalHeight);
    render();
  };
  if (image.complete && image.naturalWidth) initializeImage();
  else image.addEventListener('load', initializeImage, { once: true });
  const setZoom = value => {
    const min = Number(zoomInput.min);
    const max = Number(zoomInput.max);
    state.zoom = Math.max(min, Math.min(max, value));
    zoomInput.value = state.zoom.toFixed(2);
    render();
  };
  zoomInput.addEventListener('input', () => {
    setZoom(Number(zoomInput.value));
  });
  stage.addEventListener('wheel', event => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    setZoom(state.zoom + direction * 0.08);
  }, { passive: false });
  stage.addEventListener('pointerdown', event => {
    state.dragging = true;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    state.x += event.clientX - state.pointerX;
    state.y += event.clientY - state.pointerY;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    render();
  });
  const stopDragging = event => {
    state.dragging = false;
    stage.classList.remove('is-dragging');
    if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  };
  stage.addEventListener('pointerup', stopDragging);
  stage.addEventListener('pointercancel', stopDragging);

  confirm.addEventListener('click', async () => {
    setButtonLoading(confirm, true, 'Salvando…');
    try {
      const outputSize = 512;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível preparar a imagem.');
      const size = stageSize();
      const scale = state.baseScale * state.zoom;
      const displayedWidth = image.naturalWidth * scale;
      const displayedHeight = image.naturalHeight * scale;
      const left = (size - displayedWidth) / 2 + state.x;
      const top = (size - displayedHeight) / 2 + state.y;
      const sourceX = Math.max(0, -left / scale);
      const sourceY = Math.max(0, -top / scale);
      const sourceSize = size / scale;
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Não foi possível recortar a imagem.');
      await uploadProfileAvatar(blob, message);
      closeModal();
    } catch (error) {
      setFormMessage(message, error.message, 'error');
      setButtonLoading(confirm, false);
    }
  });

  const observer = new MutationObserver(() => {
    if (document.body.contains(backdrop)) return;
    URL.revokeObjectURL(objectUrl);
    input.value = '';
    observer.disconnect();
  });
  observer.observe(document.body, { childList: true });
}

function bindProfilePhotoViewer() {
  const trigger = $('[data-profile-photo-open]');
  const viewer = $('[data-profile-photo-viewer]');
  const largeImage = $('[data-profile-photo-large]', viewer);
  if (!trigger || !viewer || !largeImage) return;

  const close = () => {
    viewer.hidden = true;
    document.documentElement.classList.remove('profile-photo-viewer-open');
    trigger.focus({ preventScroll: true });
  };

  trigger.addEventListener('click', () => {
    const image = $('img', trigger);
    if (!image?.src) return;
    largeImage.src = image.src;
    largeImage.alt = image.alt || 'Foto de perfil ampliada';
    viewer.hidden = false;
    document.documentElement.classList.add('profile-photo-viewer-open');
    $('[data-profile-photo-close]', viewer)?.focus({ preventScroll: true });
  });

  $$('[data-profile-photo-close]', viewer).forEach(button => button.addEventListener('click', close));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !viewer.hidden) close();
  });
}

function bindProfile() {
  bindProfilePhotoViewer();
  const avatarForm = $('[data-avatar-form]');
  const avatarInput = $('[data-avatar-input]', avatarForm);
  const avatarTrigger = $('[data-avatar-trigger]');
  avatarTrigger?.addEventListener('click', () => avatarInput?.click());

  avatarInput?.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    const message = $('[data-form-message]', avatarForm);
    setFormMessage(message);
    if (file.size > 3 * 1024 * 1024) {
      setFormMessage(message, 'A imagem deve ter no máximo 3 MB.', 'error');
      avatarInput.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormMessage(message, 'Escolha uma imagem JPG, PNG ou WebP.', 'error');
      avatarInput.value = '';
      return;
    }
    openAvatarCropper(file, message, avatarInput);
  });

  const profileForm = $('[data-profile-form]');
  profileForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const message = $('[data-form-message]', profileForm);
    setFormMessage(message);
    const submit = $('button[type="submit"]', profileForm);
    setButtonLoading(submit, true, 'Salvando…');

    try {
      await api('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          username: profileForm.username.value,
          email: profileForm.email.value,
          sexCode: profileForm.sexCode.value,
          regionCode: profileForm.regionCode.value,
          columnGroupCode: profileForm.columnGroupCode.value,
          bio: profileForm.bio.value,
        }),
      });
      await loadUser();
      setFormMessage(message, 'Perfil salvo com sucesso.', 'success');
      toast('Perfil atualizado.');
    } catch (error) {
      setFormMessage(message, error.message, 'error');
    } finally {
      setButtonLoading(submit, false);
    }
  });

  const passwordForm = $('[data-password-form]');
  passwordForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const message = $('[data-form-message]', passwordForm);
    setFormMessage(message);
    const submit = $('button[type="submit"]', passwordForm);
    setButtonLoading(submit, true, 'Atualizando…');

    try {
      await api('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          password: passwordForm.password.value,
          confirmPassword: passwordForm.confirmPassword.value,
        }),
      });
      passwordForm.reset();
      await loadUser();
      setFormMessage(message, 'Senha atualizada com sucesso.', 'success');
      toast('Senha atualizada.');
    } catch (error) {
      setFormMessage(message, error.message, 'error');
    } finally {
      setButtonLoading(submit, false);
    }
  });
}

function bindAuth() {
  $('[data-signup-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = $('[data-form-message]', form);
    const submit = $('button[type="submit"]', form);

    setFormMessage(message);
    setButtonLoading(submit, true, 'Criando conta…');

    try {
      await api('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          username: form.username.value,
          email: form.email.value,
          password: form.password.value,
          confirmPassword: form.confirmPassword.value,
        }),
      });
      location.replace('/');
    } catch (error) {
      setFormMessage(message, error.message, 'error');
      setButtonLoading(submit, false);
    }
  });

  $('[data-login-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = $('[data-form-message]', form);
    const submit = $('button[type="submit"]', form);
    setFormMessage(message);
    setButtonLoading(submit, true, 'Verificando…');

    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: form.identifier.value,
          password: form.password.value,
          remember: form.remember.checked,
        }),
      });
      setFormMessage(message, 'Credenciais verificadas. Entrando…', 'success');
      location.href = '/';
    } catch (error) {
      setFormMessage(message, error.message, 'error');
      setButtonLoading(submit, false);
    }
  });

  const googleRoot = $('[data-google-login]');
  if (googleRoot) {
    const start = () => {
      if (!window.google?.accounts?.id) return setTimeout(start, 100);
      google.accounts.id.initialize({ client_id: googleRoot.dataset.googleClientId, callback: async response => {
        const message = $('[data-google-message]');
        setFormMessage(message, 'Verificando sua conta Google…', 'info');
        try {
          await api('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential: response.credential }) });
          setFormMessage(message, 'Conta confirmada. Entrando…', 'success');
          location.href = '/';
        } catch (error) {
          setFormMessage(message, error.message, 'error');
        }
      }});
      const googleButton = $('[data-google-button]');
      const availableWidth = googleButton.clientWidth || googleButton.getBoundingClientRect().width || 0;
      const safeWidth = Math.max(220, Math.floor(Math.min(380, availableWidth - 12)));
      google.accounts.id.renderButton(googleButton, {
        theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'pill',
        width: safeWidth,
        text: 'continue_with',
      });
    };
    start();
  }
}

async function pollDirects() {
  if (!currentUser) return;
  try {
    const data = await api('/api/directs/unread');
    const badge = $('[data-direct-badge]');
    if (badge) { badge.textContent = data.count || ''; badge.hidden = !data.count; }
    if (data.latestId && Number(sessionStorage.lastDirectId || 0) < data.latestId) {
      if (sessionStorage.lastDirectId) {
        document.body.classList.add('letter-arriving');
        setTimeout(() => document.body.classList.remove('letter-arriving'), 1800);
        toast('Um novo bilhete chegou.');
      }
      sessionStorage.lastDirectId = data.latestId;
    }
  } catch {}
}

function bindDirectsPage() {
  const root = $('[data-directs-page]');
  if (!root) return;

  const list = $('[data-direct-list]', root);
  const messages = $('[data-direct-messages]', root);
  const messageList = $('[data-direct-message-list]', root);
  const messagesTop = $('[data-direct-messages-top]', root);
  const loadMoreButton = $('[data-load-more-direct]', root);
  const empty = $('[data-direct-empty]', root);
  const stage = $('[data-direct-stage]', root);
  const form = $('[data-direct-form]', root);
  const textarea = $('textarea[name="contents"]', form);
  const locale = window.__MURMUR_LOCALE__ === 'en' ? 'en' : 'pt-BR';
  const pendingDeletes = new Map();
  const getUrlUserId = () => {
    const value = new URLSearchParams(window.location.search).get('userId');
    return value && /^\d+$/.test(value) ? value : '';
  };

  const setUrlUserId = (userId, replace = false) => {
    const url = new URL(window.location.href);
    if (userId) url.searchParams.set('userId', String(userId));
    else url.searchParams.delete('userId');
    window.history[replace ? 'replaceState' : 'pushState']({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  let activeUserId = getUrlUserId();
  let requestToken = 0;
  let oldestMessageId = 0;
  let hasMoreMessages = false;
  let loadingOlderMessages = false;
  let refreshingDirects = false;
  let directsRefreshTimer = null;

  const labels = locale === 'en'
    ? { remove: 'Delete', edit: 'Edit', save: 'Save', confirm: 'Confirm', cancel: 'Cancel', undo: 'Undo', deleted: 'Message deleted.', loadMore: 'Load 20 earlier', loadingMore: 'Loading…', edited: 'edited', pending: 'sending…' }
    : { remove: 'Excluir', edit: 'Editar', save: 'Salvar', confirm: 'Confirmar', cancel: 'Cancelar', undo: 'Desfazer', deleted: 'Bilhete excluído.', loadMore: 'Carregar 20 anteriores', loadingMore: 'Carregando…', edited: 'editado', pending: 'enviando…' };

  const sexClass = value => value === 'M' ? 'sex-m' : value === 'F' ? 'sex-f' : '';

  const renderConversations = conversations => {
    list.innerHTML = (conversations || []).map(item => `
      <button class="direct-thread ${String(item.otherUserId) === String(activeUserId) ? 'active' : ''} ${hasUnreadMessages(item.unreadCount) ? 'has-unread' : ''} ${sexClass(item.sexCode)}" data-open-direct="${item.otherUserId}" type="button">
        <span class="direct-thread-head"><strong>@${escapeHtml(item.username)}</strong><time>${formatDateTime(item.lastAt)}</time></span>
        <span class="direct-thread-preview">${escapeHtml(item.lastMessage)}</span>
        <small>${item.unreadCount ? `${item.unreadCount} novo(s)` : ''}</small>
      </button>
    `).join('');
  };

  const messageHtml = message => {
    const own = sameId(message.senderId, currentUser.id);
    const pending = Boolean(message.pending);
    const senderSexCode = message.senderSexCode || (own ? currentUser?.sexCode : '');
    const pendingAttribute = pending ? ' data-direct-pending="true"' : '';
    return `
      <article class="direct-note ${own ? 'sent' : 'received'} ${pending ? 'is-pending' : ''} ${sexClass(senderSexCode)}" data-direct-message="${message.id}" data-direct-sender-id="${message.senderId}"${pendingAttribute}>
        <p data-direct-contents>${escapeHtml(message.contents)}</p>
        <form class="direct-edit-form" data-direct-edit-form hidden>
          <textarea maxlength="256" required>${escapeHtml(message.contents)}</textarea>
          <button type="submit">${labels.save}</button>
          <button type="button" data-cancel-edit>${labels.cancel}</button>
        </form>
        <div class="direct-note-footer">
          <time>${new Date(message.updatedAt || message.createdAt).toLocaleString()}${message.updatedAt > message.createdAt ? ` · ${labels.edited}` : ''}${pending ? ` · ${labels.pending}` : ''}</time>
          ${own && !pending ? `<div class="direct-delete-zone">
            <button class="direct-edit-button" type="button" data-edit-direct="${message.id}" aria-label="${labels.edit}" title="${labels.edit}">✎</button>
            <div class="direct-delete-confirm" data-delete-confirm hidden>
              <button type="button" data-confirm-delete="${message.id}">${labels.confirm}</button>
              <button type="button" data-cancel-delete>${labels.cancel}</button>
            </div>
            <button class="direct-delete-button" type="button" data-delete-direct="${message.id}" aria-label="${labels.remove}" title="${labels.remove}">×</button>
          </div>` : ''}
        </div>
      </article>`;
  };

  const syncOldestMessageId = () => {
    const first = messageList.querySelector('[data-direct-message]:not([hidden])');
    oldestMessageId = first ? Number(first.dataset.directMessage) : 0;
  };

  const applyDirectGrouping = () => {
    const notes = $$('[data-direct-message]', messageList).filter(note => !note.hidden);
    notes.forEach((note, index) => {
      const prev = notes[index - 1];
      const next = notes[index + 1];
      const senderId = String(note.dataset.directSenderId || '');
      const sameAsPrev = prev && String(prev.dataset.directSenderId || '') === senderId;
      const sameAsNext = next && String(next.dataset.directSenderId || '') === senderId;

      note.classList.remove('group-single', 'group-start', 'group-middle', 'group-end');
      if (sameAsPrev && sameAsNext) note.classList.add('group-middle');
      else if (sameAsPrev) note.classList.add('group-end');
      else if (sameAsNext) note.classList.add('group-start');
      else note.classList.add('group-single');
    });

    syncOldestMessageId();
  };

  const updateLoadMore = () => {
    messagesTop.hidden = !hasMoreMessages;
    loadMoreButton.textContent = loadingOlderMessages ? labels.loadingMore : labels.loadMore;
    loadMoreButton.disabled = loadingOlderMessages;
  };

  const renderMessages = (items, prepend = false) => {
    const html = (items || []).map(messageHtml).join('');
    if (prepend) messageList.insertAdjacentHTML('afterbegin', html);
    else messageList.innerHTML = html;
    applyDirectGrouping();
  };

  const load = async (otherUserId = activeUserId, updateUrl = false, replaceUrl = false) => {
    const token = ++requestToken;
    const url = otherUserId ? `/api/directs?otherUserId=${otherUserId}&limit=20` : '/api/directs';
    const data = await api(url);
    if (token !== requestToken) return;

    activeUserId = otherUserId ? String(otherUserId) : '';
    if (updateUrl) setUrlUserId(activeUserId, replaceUrl);
    renderConversations(data.conversations || []);

    if (activeUserId) {
      renderMessages(data.messages || []);
      hasMoreMessages = Boolean(data.hasMore);
      updateLoadMore();
      form.dataset.recipientId = activeUserId;
      empty.hidden = true;
      stage.hidden = false;
      requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
    }
  };

  const refreshDirects = async () => {
    if (refreshingDirects || document.visibilityState !== 'visible') return;
    refreshingDirects = true;

    try {
      const requestedUserId = activeUserId;
      const renderedCount = $$('[data-direct-message]:not([data-direct-pending])', messageList).length;
      const refreshLimit = Math.max(20, renderedCount);
      const url = requestedUserId ? `/api/directs?otherUserId=${requestedUserId}&limit=${refreshLimit}` : '/api/directs';
      const data = await api(url);
      if (requestedUserId !== activeUserId) return;

      renderConversations(data.conversations || []);
      if (!requestedUserId) return;

      const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80;
      const existingNotes = $$('[data-direct-message]:not([data-direct-pending])', messageList);
      const existingIds = new Set(existingNotes.map(item => String(item.dataset.directMessage)));
      const refreshedMessages = data.messages || [];
      const refreshedIds = new Set(refreshedMessages.map(message => String(message.id)));

      // Reconcilia integralmente tudo que já está carregado na conversa.
      // Se o servidor não devolveu mais um ID, a mensagem foi excluída e
      // deve desaparecer também no outro navegador no próximo polling.
      existingNotes.forEach(note => {
        if (!refreshedIds.has(String(note.dataset.directMessage))) note.remove();
      });

      const newMessages = refreshedMessages.filter(message => !existingIds.has(String(message.id)));
      const newestExistingId = existingNotes.length
        ? Math.max(...existingNotes.map(note => Number(note.dataset.directMessage)))
        : 0;
      const hasActuallyNewMessage = newMessages.some(message => Number(message.id) > newestExistingId);

      newMessages.forEach(message => {
        const messageId = Number(message.id);
        const nextNote = $$('[data-direct-message]:not([data-direct-pending])', messageList)
          .find(note => Number(note.dataset.directMessage) > messageId);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = messageHtml(message).trim();
        const note = wrapper.firstElementChild;
        if (nextNote) messageList.insertBefore(note, nextNote);
        else messageList.appendChild(note);
      });

      applyDirectGrouping();

      if (hasActuallyNewMessage && nearBottom) {
        requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
      }

      hasMoreMessages = Boolean(data.hasMore);
      updateLoadMore();
    } catch {
      // A próxima atualização tenta novamente sem interromper o uso do chat.
    } finally {
      refreshingDirects = false;
    }
  };

  const startDirectsPolling = () => {
    clearInterval(directsRefreshTimer);
    directsRefreshTimer = setInterval(refreshDirects, MIN_SITE_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshDirects();
    });
  };

  const loadOlderMessages = async () => {
    if (!activeUserId || !oldestMessageId || !hasMoreMessages || loadingOlderMessages) return;
    loadingOlderMessages = true;
    updateLoadMore();
    const previousHeight = messages.scrollHeight;
    const previousTop = messages.scrollTop;

    try {
      const data = await api(`/api/directs?otherUserId=${activeUserId}&beforeId=${oldestMessageId}&limit=20`);
      renderMessages(data.messages || [], true);
      hasMoreMessages = Boolean(data.hasMore);
      requestAnimationFrame(() => {
        messages.scrollTop = previousTop + (messages.scrollHeight - previousHeight);
      });
    } catch (error) {
      toast(error.message);
    } finally {
      loadingOlderMessages = false;
      updateLoadMore();
    }
  };

  const showUndo = (message, messageId) => {
    const undo = document.createElement('div');
    undo.className = 'direct-undo';
    undo.innerHTML = `<span>${labels.deleted}</span><button type="button" data-undo-direct="${messageId}">${labels.undo}</button><span class="direct-undo-progress" aria-hidden="true"></span>`;
    message.insertAdjacentElement('beforebegin', undo);
    message.hidden = true;
    applyDirectGrouping();

    const timer = setTimeout(async () => {
      pendingDeletes.delete(String(messageId));
      try {
        await api(`/api/directs?messageId=${messageId}`, { method: 'DELETE' });
        undo.remove();
        message.remove();
        await load(activeUserId);
      } catch (error) {
        message.hidden = false;
        undo.remove();
        applyDirectGrouping();
        toast(error.message);
      }
    }, 5000);

    pendingDeletes.set(String(messageId), { timer, message, undo });
  };

  root.addEventListener('click', event => {
    const loadMore = event.target.closest('[data-load-more-direct]');
    if (loadMore) {
      loadOlderMessages();
      return;
    }

    const open = event.target.closest('[data-open-direct]');
    if (open) {
      load(open.dataset.openDirect, true).catch(error => toast(error.message));
      return;
    }

    const edit = event.target.closest('[data-edit-direct]');
    if (edit) {
      const note = edit.closest('[data-direct-message]');
      note.querySelector('[data-direct-contents]').hidden = true;
      note.querySelector('[data-direct-edit-form]').hidden = false;
      note.querySelector('[data-direct-edit-form] textarea').focus();
      return;
    }

    const cancelEdit = event.target.closest('[data-cancel-edit]');
    if (cancelEdit) {
      const note = cancelEdit.closest('[data-direct-message]');
      note.querySelector('[data-direct-edit-form]').hidden = true;
      note.querySelector('[data-direct-contents]').hidden = false;
      return;
    }

    const remove = event.target.closest('[data-delete-direct]');
    if (remove) {
      const note = remove.closest('[data-direct-message]');
      note.querySelector('[data-delete-confirm]').hidden = false;
      remove.hidden = true;
      return;
    }

    const cancel = event.target.closest('[data-cancel-delete]');
    if (cancel) {
      const zone = cancel.closest('.direct-delete-zone');
      zone.querySelector('[data-delete-confirm]').hidden = true;
      zone.querySelector('[data-delete-direct]').hidden = false;
      return;
    }

    const confirm = event.target.closest('[data-confirm-delete]');
    if (confirm) {
      const note = confirm.closest('[data-direct-message]');
      showUndo(note, confirm.dataset.confirmDelete);
      return;
    }

    const undoButton = event.target.closest('[data-undo-direct]');
    if (undoButton) {
      const pending = pendingDeletes.get(String(undoButton.dataset.undoDirect));
      if (!pending) return;
      clearTimeout(pending.timer);
      pending.message.hidden = false;
      pending.undo.remove();
      applyDirectGrouping();
      const zone = pending.message.querySelector('.direct-delete-zone');
      if (zone) {
        zone.querySelector('[data-delete-confirm]').hidden = true;
        zone.querySelector('[data-delete-direct]').hidden = false;
      }
      pendingDeletes.delete(String(undoButton.dataset.undoDirect));
    }
  });

  root.addEventListener('submit', async event => {
    const editForm = event.target.closest('[data-direct-edit-form]');
    if (!editForm) return;
    event.preventDefault();
    const note = editForm.closest('[data-direct-message]');
    const contents = editForm.querySelector('textarea').value.trim();
    if (!contents) return;
    const submit = editForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await api('/api/directs', {
        method: 'PUT',
        body: JSON.stringify({ messageId: Number(note.dataset.directMessage), contents }),
      });
      await load(activeUserId);
    } catch (error) {
      toast(error.message);
    } finally {
      submit.disabled = false;
    }
  });

  const addPendingDirect = contents => {
    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = messageHtml({
      id: pendingId,
      senderId: currentUser.id,
      senderSexCode: currentUser.sexCode,
      contents,
      createdAt: now,
      updatedAt: now,
      pending: true,
    }).trim();
    const note = wrapper.firstElementChild;
    messageList.appendChild(note);
    applyDirectGrouping();
    requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
    return pendingId;
  };

  const removePendingDirect = pendingId => {
    if (!pendingId) return;
    messageList.querySelector(`[data-direct-message="${CSS.escape(String(pendingId))}"]`)?.remove();
    applyDirectGrouping();
  };

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const contents = textarea.value.trim();
    if (!contents || !activeUserId) return;

    const submit = $('button[type="submit"]', form);
    setButtonLoading(submit, true, '');
    form.reset();
    scheduleDirectSend({
      recipientId: Number(activeUserId),
      contents,
      onPending: () => addPendingDirect(contents),
      onSent: async (_result, pendingId) => {
        removePendingDirect(pendingId);
        await load(activeUserId);
      },
      onUndone: pendingId => {
        removePendingDirect(pendingId);
        if (!textarea.value) textarea.value = contents;
        textarea.focus({ preventScroll: true });
      },
      onFailed: (_error, pendingId) => {
        removePendingDirect(pendingId);
        if (!textarea.value) textarea.value = contents;
      },
    });
    textarea.focus({ preventScroll: true });
    setButtonLoading(submit, false);
  });

  textarea?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    form.requestSubmit();
  });

  window.addEventListener('popstate', () => {
    const urlUserId = getUrlUserId();
    load(urlUserId).catch(error => toast(error.message));
  });

  load(activeUserId, Boolean(activeUserId), true).catch(error => toast(error.message));
  startDirectsPolling();
}

document.addEventListener('submit', async event => {
  if (!event.target.matches('[data-direct-compose]')) return;
  event.preventDefault();
  const form = event.target;
  const recipientId = Number(form.recipientId.value);
  const contents = form.querySelector('textarea').value.trim();
  if (!recipientId || !contents) return;

  closeModal();
  scheduleDirectSend({ recipientId, contents });
});

function showRuntimeError(error, context = 'Erro de execução') {
  const normalized = error instanceof Error ? error : new Error(String(error));
  console.error(context, normalized);

  let panel = document.querySelector('[data-runtime-error-panel]');
  if (!panel) {
    panel = document.createElement('section');
    panel.dataset.runtimeErrorPanel = '';
    panel.className = 'runtime-error-panel';
    panel.setAttribute('role', 'alert');
    document.body.prepend(panel);
  }

  const stack = normalized.stack || normalized.message || String(normalized);
  panel.innerHTML = `
    <div class="runtime-error-panel__header">${escapeHtml(context)}</div>
    <pre class="runtime-error-panel__details">${escapeHtml(stack)}</pre>
  `;
}

window.addEventListener('error', event => {
  showRuntimeError(event.error || event.message, 'Erro JavaScript na página');
});

window.addEventListener('unhandledrejection', event => {
  showRuntimeError(event.reason, 'Promise rejeitada sem tratamento');
});

document.addEventListener('DOMContentLoaded', async () => {
  try {
    bindUi();
    bindAuth();
    bindProfile();
    bindFeedView();
    bindFeed();
  } catch (error) {
    showRuntimeError(error, 'Erro ao inicializar a interface');
  }

  try {
    await loadUser();
    bindColumnGroup();
  } catch (error) {
    showRuntimeError(error, 'Erro ao carregar o usuário atual');
  }

  try {
    await loadFeed(true);
  } catch (error) {
    showRuntimeError(error, 'Erro ao carregar os murmúrios');
    const feeds = $$('[data-feed-column], [data-feed-all-list], [data-profile-feed]');
    feeds.forEach(feed => {
      feed.innerHTML = `<p class="empty-state">Erro ao carregar murmúrios: ${escapeHtml(error?.stack || error?.message || String(error))}</p>`;
    });
  }

  try {
    startFeedPolling();
    bindDirectsPage();
    pollDirects();
    setInterval(pollDirects, 7000);
  } catch (error) {
    showRuntimeError(error, 'Erro ao iniciar atualizações automáticas');
  }
});
