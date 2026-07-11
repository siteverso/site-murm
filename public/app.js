(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const T = window.__MURMUR_I18N__ || {};
  const tr = path => path.split('.').reduce((value, key) => value?.[key], T) || path;
  let currentUser = null;
  let posts = [];

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Erro ao comunicar com o servidor.');
    return data;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function initials(username) {
    return String(username || 'MU').slice(0, 2).toUpperCase();
  }

  function ago(timestamp) {
    const minutes = Math.max(1, Math.floor((Date.now() - Number(timestamp)) / 60000));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
  }

  function toast(message, action = null) {
    const el = $('[data-toast]');
    if (!el) return;
    el.replaceChildren();
    const text = document.createElement('span');
    text.textContent = message;
    el.append(text);
    if (action?.label && typeof action.onClick === 'function') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'toast-action';
      button.textContent = action.label;
      button.addEventListener('click', async () => {
        await action.onClick();
        el.classList.remove('show');
      }, { once: true });
      el.append(button);
    }
    el.classList.add('show');
    clearTimeout(window.__murmurToast);
    window.__murmurToast = setTimeout(() => el.classList.remove('show'), action ? 6000 : 2600);
  }

  function message(form, value) {
    const el = $('[data-form-message]', form);
    if (el) el.textContent = value;
  }

  function actionIcon(type) {
    const icons = {
      positive: '<span class="emoji-icon emoji-smile" aria-hidden="true"><span class="emoji-face"></span><span class="emoji-eyes"></span><span class="emoji-mouth"></span></span>',
      negative: '<span class="emoji-icon emoji-cry" aria-hidden="true"><span class="emoji-face"></span><span class="emoji-eyes"></span><span class="emoji-mouth"></span><span class="emoji-tear"></span></span>',
      reply: '<span class="emoji-icon emoji-reply" aria-hidden="true"><span class="bubble-body"></span><span class="bubble-dot bubble-dot-a"></span><span class="bubble-dot bubble-dot-b"></span><span class="bubble-dot bubble-dot-c"></span><span class="bubble-tail"></span></span>',
      share: '<span class="emoji-icon emoji-share" aria-hidden="true"><span class="share-line share-line-a"></span><span class="share-line share-line-b"></span><span class="share-dot share-dot-a"></span><span class="share-dot share-dot-b"></span><span class="share-dot share-dot-c"></span></span>',
    };
    return icons[type] || '';
  }

  function playActionAnimation(target, animationClass) {
    if (!target) return;
    target.classList.remove(animationClass);
    void target.offsetWidth;
    target.classList.add(animationClass);
    target.addEventListener('animationend', () => target.classList.remove(animationClass), { once: true });
  }

  function threshold(total) {
    return 100 + Math.floor(total / 1000) * 10;
  }

  async function loadCurrentUser() {
    try {
      const data = await api('/api/auth/me');
      currentUser = data.user;
      return currentUser;
    } catch {
      currentUser = null;
      return null;
    }
  }

  async function enforceAuth() {
    if (document.body.dataset.authRequired !== 'true') return;
    const user = await loadCurrentUser();
    if (!user) location.replace('/login');
  }

  function initLanguage() {
    $$('[data-language]').forEach(button => button.addEventListener('click', () => {
      const language = button.dataset.language === 'en' ? 'en' : 'pt-BR';
      document.cookie = `murmurinho-language=${language}; path=/; max-age=31536000; SameSite=Lax`;
      location.reload();
    }));
  }

  function initTheme() {
    $$('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      document.cookie = `murmurinho-theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    }));
  }

  function initLogout() {
    $$('[data-logout]').forEach(button => button.addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {}
      location.href = '/login';
    }));
  }

  function initSignup() {
    const form = $('[data-signup-form]');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      try {
        await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) });
        message(form, tr('signup.success'));
        location.href = '/';
      } catch (error) {
        message(form, error.message);
      }
    });
  }

  function initLogin() {
    const form = $('[data-login-form]');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(form);
      const submit = $('button[type="submit"]', form);
      const originalText = submit?.textContent || '';

      message(form, 'Conectando ao Oracle...');
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Entrando...';
      }

      try {
        await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            identifier: formData.get('identifier'),
            password: formData.get('password'),
            remember: formData.get('remember') === 'on',
          }),
        });
        message(form, tr('login.authorized'));
        location.href = '/';
      } catch (error) {
        message(form, error.message);
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = originalText;
        }
      }
    });
  }

  function initGoogleLogin() {
    const container = $('[data-google-login]');
    if (!container) return;
    const clientId = container.dataset.googleClientId;
    const messageEl = $('[data-google-message]', container);
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (!window.google?.accounts?.id) {
        if (attempts > 50) {
          clearInterval(timer);
          if (messageEl) messageEl.textContent = tr('login.googleLoadingError');
        }
        return;
      }
      clearInterval(timer);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async response => {
          try {
            await api('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential: response.credential }) });
            location.href = '/';
          } catch (error) {
            if (messageEl) messageEl.textContent = error.message;
          }
        },
      });
      window.google.accounts.id.renderButton($('[data-google-button]', container), {
        theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        width: Math.min(380, container.clientWidth || 380),
        text: 'continue_with',
      });
    }, 100);
  }

  function initRecovery() {
    const form = $('[data-recovery-form]');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      } catch (error) {
        message(form, error.message);
      }
    });
  }

  async function initProfile() {
    const form = $('[data-profile-form]');
    if (!form) return;
    const user = currentUser || await loadCurrentUser();
    if (!user) return location.replace('/login');

    $('[data-profile-avatar]').textContent = initials(user.username);
    $('[data-profile-username]').textContent = `@${user.username}`;
    $('[data-profile-email]').textContent = user.email;
    $('[data-profile-bio]').textContent = user.bio || '';
    $('[data-profile-posts]').textContent = user.postCount || 0;
    $('[data-profile-positive]').textContent = user.positiveCount || 0;
    $('[data-profile-shares]').textContent = user.shareCount || 0;
    form.username.value = user.username;
    form.email.value = user.email;
    form.bio.value = user.bio || '';

    const methods = [];
    if (user.hasGoogle) methods.push(tr('profile.authGoogle'));
    if (user.hasPassword) methods.push(tr('profile.authPassword'));
    $('[data-auth-methods]').textContent = methods.join(' + ');
    $('[data-auth-explanation]').textContent = user.hasGoogle && !user.hasPassword ? tr('profile.accountGoogle') : tr('profile.accountPassword');
    $('[data-password-title]').textContent = user.hasPassword ? tr('profile.changePassword') : tr('profile.definePassword');

    form.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        await api('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        message(form, tr('profile.profileSaved'));
        setTimeout(() => location.reload(), 300);
      } catch (error) {
        message(form, error.message);
      }
    });

    const passwordForm = $('[data-password-form]');
    passwordForm?.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        await api('/api/auth/password', { method: 'PATCH', body: JSON.stringify(Object.fromEntries(new FormData(passwordForm))) });
        message(passwordForm, tr('profile.passwordSaved'));
        passwordForm.reset();
      } catch (error) {
        message(passwordForm, error.message);
      }
    });
  }

  async function loadPosts() {
    const data = await api('/api/posts');
    posts = data.posts || [];
    renderFeed();
  }

  function renderFeed() {
    const feed = $('[data-feed]');
    if (!feed) return;
    const limit = threshold(posts.length);
    const label = $('[data-threshold-label]');
    if (label) label.textContent = `${tr('feed.currentLimit')}: ${limit}`;

    feed.innerHTML = posts.map(post => {
      const score = post.positive - post.negative;
      const hidden = score <= -limit;
      const highlighted = score >= limit;
      if (hidden) return `<article class="panel murmur-card hidden-score" data-post-id="${post.id}"><div class="hidden-message"><div><strong>${tr('feed.hiddenTitle')}</strong><br><span>${tr('feed.hiddenText')}</span></div><button class="button secondary small" data-show-post>${tr('feed.show')}</button></div></article>`;

      const replies = (post.replies || []).map(reply => {
        const own = currentUser && reply.userId === currentUser.id;
        return `<div class="reply" data-reply-id="${reply.id}"><div class="reply-content"><strong>@${escapeHtml(reply.author)}</strong> <span>${escapeHtml(reply.text)}</span></div>${own ? `<div class="reply-actions"><button class="reply-delete" type="button" data-delete-reply aria-label="${tr('feed.deleteReply')}">🗑️</button><button class="reply-confirm" type="button" data-confirm-delete-reply aria-label="${tr('feed.confirmDeleteReplyLabel')}">✓</button><button class="reply-cancel" type="button" data-cancel-delete-reply aria-label="${tr('feed.cancelDeleteReplyLabel')}">✕</button></div>` : ''}</div>`;
      }).join('');

      return `<article class="panel murmur-card ${highlighted ? 'highlighted' : ''}" data-post-id="${post.id}">
        <div class="murmur-head"><div class="avatar">${initials(post.author)}</div><div class="murmur-author"><strong>@${escapeHtml(post.author)}</strong><span>${ago(post.createdAt)}</span></div></div>
        <p class="murmur-text">${escapeHtml(post.text)}</p>
        <div class="score-line"><span class="score ${score < 0 ? 'negative' : ''}">${score >= 0 ? '+' : ''}${score}</span></div>
        <div class="murmur-actions">
          <button class="action-button ${post.myVote === 1 ? 'active' : ''}" data-vote="1" aria-label="${tr('feed.positive')}">${actionIcon('positive')} <span>${post.positive}</span></button>
          <button class="action-button ${post.myVote === -1 ? 'active' : ''}" data-vote="-1" aria-label="${tr('feed.negative')}">${actionIcon('negative')} <span>${post.negative}</span></button>
          <button class="action-button" data-reply-toggle aria-label="${tr('feed.reply')}">${actionIcon('reply')} <span>${post.replies?.length || 0}</span></button>
          <button class="action-button" data-share aria-label="${tr('feed.share')}">${actionIcon('share')} <span>${post.shares}</span></button>
        </div>
        <form class="reply-box" data-reply-form><input name="reply" maxlength="280" placeholder="${tr('feed.replyPlaceholder')}" required><button class="button primary small">${tr('feed.send')}</button></form>
        <div class="replies">${replies}</div>
      </article>`;
    }).join('');

    bindFeedActions();
  }

  function bindFeedActions() {
    const feed = $('[data-feed]');
    $$('[data-show-post]', feed).forEach(button => button.addEventListener('click', () => button.closest('.murmur-card').classList.remove('hidden-score')));

    $$('[data-vote]', feed).forEach(button => button.addEventListener('click', async () => {
      const postId = button.closest('[data-post-id]').dataset.postId;
      const value = Number(button.dataset.vote);
      try {
        await api(`/api/posts/${postId}/vote`, { method: 'POST', body: JSON.stringify({ value }) });
        playActionAnimation(button, value === 1 ? 'animate-smile' : 'animate-cry');
        await loadPosts();
      } catch (error) { toast(error.message); }
    }));

    $$('[data-reply-toggle]', feed).forEach(button => button.addEventListener('click', () => {
      playActionAnimation(button, 'animate-reply');
      const form = $('.reply-box', button.closest('[data-post-id]'));
      form.classList.add('open');
      const input = $('input', form);
      input.focus();
      input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));

    $$('[data-reply-form]', feed).forEach(form => form.addEventListener('submit', async event => {
      event.preventDefault();
      const postId = form.closest('[data-post-id]').dataset.postId;
      const text = new FormData(form).get('reply');
      try {
        await api(`/api/posts/${postId}/reply`, { method: 'POST', body: JSON.stringify({ text }) });
        await loadPosts();
      } catch (error) { toast(error.message); }
    }));

    $$('[data-delete-reply]', feed).forEach(button => button.addEventListener('click', () => {
      const actions = button.closest('.reply-actions');
      $$('.reply-actions.is-confirming', feed).forEach(item => item !== actions && item.classList.remove('is-confirming'));
      actions.classList.toggle('is-confirming');
    }));
    $$('[data-cancel-delete-reply]', feed).forEach(button => button.addEventListener('click', () => button.closest('.reply-actions').classList.remove('is-confirming')));
    $$('[data-confirm-delete-reply]', feed).forEach(button => button.addEventListener('click', async () => {
      const replyId = button.closest('[data-reply-id]').dataset.replyId;
      try {
        await api(`/api/replies/${replyId}`, { method: 'DELETE' });
        await loadPosts();
        toast(tr('feed.replyDeleted'), {
          label: tr('feed.undo'),
          onClick: async () => {
            await api(`/api/replies/${replyId}`, { method: 'PATCH', body: '{}' });
            await loadPosts();
            toast(tr('feed.replyRestored'));
          },
        });
      } catch (error) { toast(error.message); }
    }));

    $$('[data-share]', feed).forEach(button => button.addEventListener('click', async () => {
      const postId = button.closest('[data-post-id]').dataset.postId;
      const url = `${location.origin}/?murmur=${postId}`;
      playActionAnimation(button, 'animate-share');
      try {
        if (navigator.share) await navigator.share({ title: 'Murmurinho', url });
        else await navigator.clipboard.writeText(url);
        await api(`/api/posts/${postId}/share`, { method: 'POST', body: '{}' });
        await loadPosts();
        toast(tr('feed.shared'));
      } catch (error) {
        if (error.name !== 'AbortError') toast(error.message);
      }
    }));
  }

  function initComposer() {
    const form = $('[data-composer]');
    if (!form) return;
    const textarea = $('textarea', form);
    textarea.addEventListener('input', () => $('[data-char-count]').textContent = textarea.value.length);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        await api('/api/posts', { method: 'POST', body: JSON.stringify({ text: textarea.value.trim() }) });
        form.reset();
        $('[data-char-count]').textContent = '0';
        await loadPosts();
        toast(tr('feed.published') === 'feed.published' ? 'Murmúrio publicado.' : tr('feed.published'));
      } catch (error) { toast(error.message); }
    });
  }

  async function init() {
    initLanguage();
    initTheme();
    initLogout();
    initSignup();
    initLogin();
    initGoogleLogin();
    initRecovery();
    await enforceAuth();
    if (!currentUser) await loadCurrentUser();
    const avatar = $('[data-user-avatar]');
    if (avatar && currentUser) avatar.textContent = initials(currentUser.username);
    initComposer();
    await initProfile();
    if ($('[data-feed]')) {
      try { await loadPosts(); } catch (error) { toast(error.message); }
    }
  }

  init();
})();
