const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erro inesperado.');
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


const setFormMessage = (element, message = '', type = 'info') => {
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
};

const setButtonLoading = (button, loading, label = 'Verificando…') => {
  if (!button) return;
  if (loading) {
    button.dataset.originalLabel = button.textContent.trim();
    button.disabled = true;
    button.classList.add('is-loading');
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span><span>${label}</span>`;
    return;
  }
  button.disabled = false;
  button.classList.remove('is-loading');
  button.removeAttribute('aria-busy');
  button.textContent = button.dataset.originalLabel || button.textContent;
  delete button.dataset.originalLabel;
};

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

let currentUser = null;
let posts = [];
let feedSignature = '';
let feedRequestRunning = false;
let feedTimer = null;

function userInitials(username = '') {
  return String(username).trim().slice(0, 2).toUpperCase() || 'MU';
}

function renderUser(user) {
  if (!user) return;

  $$('[data-user-avatar]').forEach(el => { el.textContent = userInitials(user.username); });
  $$('[data-user-name]').forEach(el => { el.textContent = `@${user.username}`; });
  $$('[data-profile-avatar]').forEach(el => { el.textContent = userInitials(user.username); });
  $$('[data-profile-username]').forEach(el => { el.textContent = `@${user.username}`; });
  $$('[data-profile-email]').forEach(el => { el.textContent = user.email; });
  $$('[data-profile-sex]').forEach(el => { el.textContent = user.sexCode === 'M' ? 'Macho' : user.sexCode === 'F' ? 'Fêmea' : 'Sexo não informado'; });
  $$('[data-profile-bio]').forEach(el => { el.textContent = user.bio || 'Sem biografia ainda.'; });
  $$('[data-profile-posts]').forEach(el => { el.textContent = user.postCount; });
  $$('[data-profile-positive]').forEach(el => { el.textContent = user.positiveCount; });
  $$('[data-profile-shares]').forEach(el => { el.textContent = user.shareCount; });

  const profileForm = $('[data-profile-form]');
  if (profileForm) {
    profileForm.username.value = user.username;
    profileForm.email.value = user.email;
    profileForm.sexCode.value = user.sexCode || '';
    profileForm.bio.value = user.bio || '';
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
  } catch {
    currentUser = null;
    if (document.body.dataset.authRequired === 'true' && !location.pathname.startsWith('/login')) {
      location.href = '/login';
    }
    return null;
  }
}

function renderPost(post) {
  const score = post.positive - post.negative;
  const replies = (post.replies || []).map(reply => `
    <div class="reply">
      <div class="reply-content"><strong>@${escapeHtml(reply.author)}</strong> ${escapeHtml(reply.text)}</div>
      ${currentUser?.id === reply.userId ? `<button class="reply-delete" data-delete-reply="${reply.id}" aria-label="Excluir resposta">×</button>` : ''}
    </div>`).join('');

  return `<article class="panel murmur-card" data-post-id="${post.id}">
    <div class="murmur-head">
      <div class="avatar">${escapeHtml(post.author.slice(0, 2).toUpperCase())}</div>
      <div class="murmur-author"><strong>@${escapeHtml(post.author)}</strong><span>${new Date(post.createdAt).toLocaleString()}</span></div>
      <button class="letter-button" data-direct-user="${post.userId}" data-direct-name="${escapeHtml(post.author)}" title="Enviar bilhete" aria-label="Enviar bilhete">✉</button>
    </div>
    <p class="murmur-text">${escapeHtml(post.text)}</p>
    <div class="score-line"><span class="score ${score < 0 ? 'negative' : ''}">${score}</span></div>
    <div class="murmur-actions">
      <button class="action-button ${post.myVote === 1 ? 'active' : ''}" data-vote="1">☺ <span>${post.positive}</span></button>
      <button class="action-button ${post.myVote === -1 ? 'active' : ''}" data-vote="-1">☹ <span>${post.negative}</span></button>
      <button class="action-button" data-reply>↩ <span>${post.replies?.length || 0}</span></button>
      <button class="action-button" data-share>↗ <span>${post.shares}</span></button>
    </div>
    <form class="reply-box" data-reply-form><input maxlength="280" placeholder="Responder sem fazer barulho…" required><button class="button primary small">Enviar</button></form>
    <div class="replies">${replies}</div>
  </article>`;
}

function renderLane(feed, posts) {
  if (!feed) return;
  feed.innerHTML = posts.length
    ? posts.map(renderPost).join('')
    : '<p class="empty-state">Nenhum murmúrio nesta coluna.</p>';
}

function renderNetworkInfo(posts, malePosts, femalePosts, otherPosts) {
  const side = $('[data-feed-other-info]');
  if (!side) return;

  const topMixed = otherPosts.slice(0, 4).map(post => `
    <article class="network-mini-card">
      <strong>@${escapeHtml(post.author)}</strong>
      <span>${escapeHtml(post.text).slice(0, 88)}</span>
    </article>
  `).join('') || '<p class="empty-state compact">Nenhum murmúrio sem sexo informado.</p>';

  side.innerHTML = `
    <div class="network-stat-grid">
      <article class="network-stat-card"><strong>${posts.length}</strong><span>Total de murmúrios</span></article>
      <article class="network-stat-card"><strong>${malePosts.length}</strong><span>Machos</span></article>
      <article class="network-stat-card"><strong>${femalePosts.length}</strong><span>Fêmeas</span></article>
      <article class="network-stat-card"><strong>${otherPosts.length}</strong><span>Sem sexo</span></article>
    </div>
    <section class="network-mini-section">
      <h3>Sem sexo informado</h3>
      <div class="network-mini-list">${topMixed}</div>
    </section>
  `;
}

function getFeedSignature(items) {
  return JSON.stringify(items.map(post => [
    post.id,
    post.sexCode,
    post.text,
    post.positive,
    post.negative,
    post.shares,
    post.myVote,
    post.createdAt,
    (post.replies || []).map(reply => [reply.id, reply.text, reply.createdAt]),
  ]));
}

function captureFeedAnchor() {
  if (window.scrollY <= 0) return null;

  const headerBottom = $('[data-site-header]')?.getBoundingClientRect().bottom
    || $('.topbar')?.getBoundingClientRect().bottom
    || 0;
  const cards = $$('[data-post-id]').filter(card => {
    const rect = card.getBoundingClientRect();
    return rect.bottom > headerBottom && rect.top < window.innerHeight;
  });

  if (!cards.length) return null;

  const anchor = cards.reduce((closest, card) => {
    const distance = Math.abs(card.getBoundingClientRect().top - headerBottom);
    return !closest || distance < closest.distance ? { card, distance } : closest;
  }, null)?.card;

  if (!anchor) return null;

  return {
    postId: anchor.dataset.postId,
    top: anchor.getBoundingClientRect().top,
  };
}

function restoreFeedAnchor(anchor) {
  if (!anchor) return;

  const card = document.querySelector(`[data-post-id="${anchor.postId}"]`);
  if (!card) return;

  const delta = card.getBoundingClientRect().top - anchor.top;
  if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
}

async function loadFeed(force = false) {
  const maleFeed = $('[data-feed-male]');
  const femaleFeed = $('[data-feed-female]');
  const side = $('[data-feed-other-info]');
  if ((!maleFeed && !femaleFeed && !side) || feedRequestRunning) return;

  feedRequestRunning = true;
  try {
    const data = await api('/api/posts');
    const nextPosts = data.posts || [];
    const nextSignature = getFeedSignature(nextPosts);

    if (!force && nextSignature === feedSignature) return;

    const anchor = captureFeedAnchor();

    posts = nextPosts;
    feedSignature = nextSignature;

    const malePosts = posts.filter(post => post.sexCode === 'M');
    const femalePosts = posts.filter(post => post.sexCode === 'F');
    const otherPosts = posts.filter(post => post.sexCode !== 'M' && post.sexCode !== 'F');

    renderLane(maleFeed, malePosts);
    renderLane(femaleFeed, femalePosts);
    renderNetworkInfo(posts, malePosts, femalePosts, otherPosts);

    $('[data-count-male]')?.replaceChildren(document.createTextNode(`${malePosts.length} murmúrios`));
    $('[data-count-female]')?.replaceChildren(document.createTextNode(`${femalePosts.length} murmúrios`));
    $('[data-count-other]')?.replaceChildren(document.createTextNode(`${otherPosts.length} sem sexo`));
    $('[data-threshold-label]')?.replaceChildren(document.createTextNode(`Total na rede: ${posts.length}`));

    restoreFeedAnchor(anchor);
  } finally {
    feedRequestRunning = false;
  }
}

function startFeedPolling() {
  if (!$('[data-feed-male]') && !$('[data-feed-female]') && !$('[data-feed-other-info]')) return;

  clearInterval(feedTimer);
  feedTimer = setInterval(() => {
    if (document.visibilityState === 'visible') loadFeed().catch(() => {});
  }, 1000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadFeed().catch(() => {});
  });
}

function bindFeed() {
  document.addEventListener('click', async event => {
    const target = event.target.closest('button');
    if (!target) return;
    const card = target.closest('[data-post-id]');
    try {
      if (target.matches('[data-reply]')) card.querySelector('[data-reply-form]').classList.toggle('open');
      if (target.matches('[data-vote]')) { await api(`/api/posts/${card.dataset.postId}/vote`, { method: 'POST', body: JSON.stringify({ value: Number(target.dataset.vote) }) }); await loadFeed(); }
      if (target.matches('[data-share]')) { await api(`/api/posts/${card.dataset.postId}/share`, { method: 'POST' }); await navigator.clipboard?.writeText(`${location.origin}/#murmurio-${card.dataset.postId}`); toast('Link copiado.'); await loadFeed(); }
      if (target.matches('[data-delete-reply]')) { await api(`/api/replies/${target.dataset.deleteReply}`, { method: 'DELETE' }); await loadFeed(); }
      if (target.matches('[data-direct-user]')) openDirectComposer(Number(target.dataset.directUser), target.dataset.directName);
    } catch (error) { toast(error.message); }
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

function closeModal() { $('[data-modal]')?.remove(); }
function modal(content, className = '') {
  closeModal();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-modal><div class="panel modal-card ${className}"><button class="modal-close" data-modal-close aria-label="Fechar">×</button>${content}</div></div>`);
}

function openComposer() {
  modal(`<h2>Novo murmúrio</h2><form data-floating-composer><textarea maxlength="420" autofocus placeholder="O que está murmurando?" required></textarea><div class="modal-actions"><span>Até 420 caracteres</span><button class="button primary">Murmurar</button></div></form>`);
}

function openDirectComposer(userId, username) {
  modal(`<h2>Enviar bilhete</h2><p class="modal-subtitle">Para @${escapeHtml(username)}</p><form data-direct-compose><input type="hidden" name="recipientId" value="${userId}"><textarea maxlength="1000" autofocus placeholder="Escreva seu bilhete…" required></textarea><div class="modal-actions"><span>Entrega discreta</span><button class="button primary">Enviar bilhete</button></div></form>`, 'direct-compose-modal');
}

function bindUi() {
  document.addEventListener('click', event => {
    if (event.target.matches('[data-modal], [data-modal-close]')) closeModal();
    if (event.target.closest('[data-new-murmur]')) openComposer();
    if (event.target.closest('[data-scroll-top]')) window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  window.addEventListener('scroll', () => $('[data-scroll-top]')?.classList.toggle('visible', scrollY > 500), { passive: true });
  $('[data-theme-toggle]')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.cookie = `murmurinho-theme=${next};path=/;max-age=31536000`;
  });
  $('[data-logout]')?.addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
}


function bindProfile() {
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
          sexCode: profileForm.sexCode.value,
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
  const load = async (otherUserId = '') => {
    const url = otherUserId ? `/api/directs?otherUserId=${otherUserId}` : '/api/directs';
    const data = await api(url);
    $('[data-direct-list]').innerHTML = (data.conversations || []).map(item => `<button class="direct-thread ${String(item.otherUserId) === String(otherUserId) ? 'active' : ''}" data-open-direct="${item.otherUserId}"><strong>@${escapeHtml(item.username)}</strong><span>${escapeHtml(item.lastMessage)}</span><small>${item.unreadCount ? `${item.unreadCount} novo(s)` : ''}</small></button>`).join('');
    if (data.messages) $('[data-direct-messages]').innerHTML = data.messages.map(message => `<article class="direct-note ${message.senderId === currentUser.id ? 'sent' : 'received'}"><span>${message.senderId === currentUser.id ? 'Você' : '@' + escapeHtml(message.senderName)}</span><p>${escapeHtml(message.contents)}</p><time>${new Date(message.createdAt).toLocaleString()}</time></article>`).join('');
    if (otherUserId) { $('[data-direct-form]').dataset.recipientId = otherUserId; $('[data-direct-empty]').hidden = true; $('[data-direct-stage]').hidden = false; }
  };
  root.addEventListener('click', event => { const button = event.target.closest('[data-open-direct]'); if (button) load(button.dataset.openDirect); });
  $('[data-direct-form]')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget; const contents = form.contents.value.trim();
    try { await api('/api/directs', { method: 'POST', body: JSON.stringify({ recipientId: Number(form.dataset.recipientId), contents }) }); form.reset(); await load(form.dataset.recipientId); } catch (error) { toast(error.message); }
  });
  load();
}

document.addEventListener('submit', async event => {
  if (!event.target.matches('[data-direct-compose]')) return;
  event.preventDefault();
  const form = event.target;
  try { await api('/api/directs', { method: 'POST', body: JSON.stringify({ recipientId: Number(form.recipientId.value), contents: form.querySelector('textarea').value.trim() }) }); closeModal(); toast('Bilhete enviado.'); } catch (error) { toast(error.message); }
});

document.addEventListener('DOMContentLoaded', async () => {
  bindUi(); bindAuth(); bindProfile(); bindFeed();
  await loadUser();
  await loadFeed(true).catch(() => {});
  startFeedPolling();
  bindDirectsPage();
  pollDirects();
  setInterval(pollDirects, 7000);
});
