(() => {
  const KEYS = {
    accounts: 'murmurinho-accounts',
    session: 'murmurinho-session',
    posts: 'murmurinho-posts',
    theme: 'murmurinho-theme',
    legacyUser: 'murmurinho-user',
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const T = window.__MURMUR_I18N__ || {};
  const tr = path => path.split('.').reduce((value, key) => value?.[key], T) || path;

  const starterPosts = [
    { id: crypto.randomUUID(), author: 'murmurinho', text: 'O primeiro murmúrio está no ar. Aqui a comunidade ajuda a destacar o que vale a conversa.', positive: 126, negative: 8, shares: 14, createdAt: Date.now() - 480000, replies: [], votes: {} },
    { id: crypto.randomUUID(), author: 'ana', text: 'Os limites podem crescer junto com a rede, sem deixar comunidades pequenas sem voz.', positive: 58, negative: 4, shares: 6, createdAt: Date.now() - 2520000, replies: [], votes: {} },
    { id: crypto.randomUUID(), author: 'teste', text: 'Este murmúrio demonstra o recolhimento por rejeição da comunidade.', positive: 3, negative: 112, shares: 0, createdAt: Date.now() - 5400000, replies: [], votes: {} },
  ];

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function accounts() { return read(KEYS.accounts, []); }
  function saveAccounts(value) { write(KEYS.accounts, value); }
  function session() { return read(KEYS.session, null); }
  function currentAccount() {
    const current = session();
    if (!current) return null;

    const list = accounts();
    let account = current.accountId
      ? list.find(item => item.id === current.accountId)
      : null;

    if (!account && current.email) {
      account = list.find(item => item.email === normalizeEmail(current.email));
    }

    if (!account) {
      const legacyUser = read(KEYS.legacyUser, null);
      const email = normalizeEmail(current.email || legacyUser?.email);

      if (email) {
        account = {
          id: crypto.randomUUID(),
          username: uniqueUsername(legacyUser?.handle || email.split('@')[0], list),
          email,
          bio: legacyUser?.bio || '',
          avatarUrl: legacyUser?.picture || '',
          providers: current.provider === 'google' || legacyUser?.authProvider === 'google' ? ['google'] : [],
          createdAt: Date.now(),
        };

        list.push(account);
        saveAccounts(list);
      }
    }

    if (account && current.accountId !== account.id) {
      write(KEYS.session, { ...current, accountId: account.id });
    }

    return account || null;
  }
  function getPosts() {
    const value = read(KEYS.posts, null);
    if (value) return value;
    write(KEYS.posts, starterPosts);
    return starterPosts;
  }
  function threshold(total) { return 100 + Math.floor(total / 1000) * 10; }
  function initials(username) { return String(username || 'MU').slice(0, 2).toUpperCase(); }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
  function ago(timestamp) {
    const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
  }
  function normalizeUsername(value) { return String(value || '').trim().replace(/^@/, '').toLowerCase(); }
  function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
  function hashPassword(value) {
    let hash = 2166136261;
    for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return `local-${(hash >>> 0).toString(16)}`;
  }
  function toast(message) {
    const el = $('[data-toast]');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__murmurToast);
    window.__murmurToast = setTimeout(() => el.classList.remove('show'), 2400);
  }
  function message(form, value) { const el = $('[data-form-message]', form); if (el) el.textContent = value; }

  function enforceAuth() {
    if (document.body.dataset.authRequired !== 'true') return;
    if (!currentAccount()) location.replace('/login');
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
      localStorage.setItem(KEYS.theme, next);
    }));
  }

  function initLogout() {
    $$('[data-logout]').forEach(button => button.addEventListener('click', () => {
      localStorage.removeItem(KEYS.session);
      location.href = '/login';
    }));
  }

  function createSession(account, provider, remember = true) {
    write(KEYS.session, { accountId: account.id, provider, remember, loggedAt: Date.now() });
  }

  function initSignup() {
    const form = $('[data-signup-form]');
    if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const username = normalizeUsername(data.get('username'));
      const email = normalizeEmail(data.get('email'));
      const password = String(data.get('password') || '');
      const confirmPassword = String(data.get('confirmPassword') || '');
      const list = accounts();
      if (!/^[a-z0-9_]{3,30}$/.test(username)) return message(form, tr('signup.invalidUsername'));
      if (list.some(account => account.username === username)) return message(form, tr('signup.usernameTaken'));
      if (list.some(account => account.email === email)) return message(form, tr('signup.emailTaken'));
      if (password !== confirmPassword) return message(form, tr('signup.passwordMismatch'));
      const account = { id: crypto.randomUUID(), username, email, bio: '', avatarUrl: '', passwordHash: hashPassword(password), providers: ['password'], createdAt: Date.now() };
      list.push(account);
      saveAccounts(list);
      createSession(account, 'password');
      message(form, tr('signup.success'));
      setTimeout(() => location.href = '/', 300);
    });
  }

  function initLogin() {
    const form = $('[data-login-form]');
    if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const identifier = String(data.get('identifier') || '').trim().toLowerCase();
      const passwordHash = hashPassword(String(data.get('password') || ''));
      const account = accounts().find(item => (item.username === identifier || item.email === identifier) && item.passwordHash === passwordHash);
      if (!account) return message(form, tr('login.invalid'));
      createSession(account, 'password', data.get('remember') === 'on');
      message(form, tr('login.authorized'));
      setTimeout(() => location.href = '/', 250);
    });
  }

  function decodeGoogleCredential(credential) {
    try {
      const payload = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(payload).split('').map(char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
      return JSON.parse(json);
    } catch { return null; }
  }

  function uniqueUsername(base, list) {
    let username = normalizeUsername(base).replace(/[^a-z0-9_]/g, '').slice(0, 25) || 'usuario';
    let candidate = username;
    let number = 1;
    while (list.some(item => item.username === candidate)) candidate = `${username}${number++}`;
    return candidate;
  }

  function initGoogleLogin() {
    const container = $('[data-google-login]');
    if (!container) return;
    const clientId = container.dataset.googleClientId;
    const button = $('[data-google-button]', container);
    const status = $('[data-google-message]', container);
    let attempts = 0;
    const start = () => {
      attempts += 1;
      if (!window.google?.accounts?.id) {
        if (attempts < 80) return setTimeout(start, 100);
        status.textContent = tr('login.googleLoadingError');
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: response => {
          const profile = decodeGoogleCredential(response.credential);
          if (!profile?.sub || !profile?.email) { status.textContent = tr('login.googleInvalid'); return; }
          const list = accounts();
          let account = list.find(item => item.googleSub === profile.sub || item.email === normalizeEmail(profile.email));
          if (!account) {
            account = {
              id: crypto.randomUUID(),
              username: uniqueUsername(profile.email.split('@')[0], list),
              email: normalizeEmail(profile.email),
              bio: '',
              avatarUrl: profile.picture || '',
              googleSub: profile.sub,
              providers: ['google'],
              createdAt: Date.now(),
            };
            list.push(account);
          } else {
            account.googleSub = profile.sub;
            account.avatarUrl = account.avatarUrl || profile.picture || '';
            account.providers = [...new Set([...(account.providers || []), 'google'])];
          }
          saveAccounts(list);
          createSession(account, 'google');
          status.textContent = tr('login.authorized');
          setTimeout(() => location.href = '/', 250);
        },
      });
      window.google.accounts.id.renderButton(button, { theme: 'outline', size: 'large', width: Math.min(360, container.clientWidth), text: 'continue_with', shape: 'pill' });
    };
    start();
  }

  function initRecovery() {
    const form = $('[data-recovery-form]');
    if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const email = normalizeEmail(data.get('email'));
      const password = String(data.get('password') || '');
      const confirmPassword = String(data.get('confirmPassword') || '');
      if (password !== confirmPassword) return message(form, tr('signup.passwordMismatch'));
      const list = accounts();
      const account = list.find(item => item.email === email);
      if (!account) return message(form, tr('recovery.notFound'));
      account.passwordHash = hashPassword(password);
      account.providers = [...new Set([...(account.providers || []), 'password'])];
      saveAccounts(list);
      message(form, tr('recovery.success'));
    });
  }

  function initProfile() {
    const account = currentAccount();
    if (!account) return;
    $('[data-profile-avatar]').textContent = initials(account.username);
    $('[data-profile-username]').textContent = `@${account.username}`;
    $('[data-profile-email]').textContent = account.email;
    $('[data-profile-bio]').textContent = account.bio || '';
    const form = $('[data-profile-form]');
    if (form) {
      form.username.value = account.username;
      form.email.value = account.email;
      form.bio.value = account.bio || '';
      form.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(form);
        const username = normalizeUsername(data.get('username'));
        const list = accounts();
        if (!/^[a-z0-9_]{3,30}$/.test(username)) return message(form, tr('signup.invalidUsername'));
        if (list.some(item => item.id !== account.id && item.username === username)) return message(form, tr('signup.usernameTaken'));
        const item = list.find(entry => entry.id === account.id);
        item.username = username;
        item.bio = String(data.get('bio') || '').trim();
        saveAccounts(list);
        message(form, tr('profile.profileSaved'));
        setTimeout(() => location.reload(), 250);
      });
    }
    const providers = account.providers || [];
    $('[data-auth-methods]').textContent = providers.map(provider => provider === 'google' ? tr('profile.authGoogle') : tr('profile.authPassword')).join(' + ');
    $('[data-auth-explanation]').textContent = providers.includes('google') && !providers.includes('password') ? tr('profile.accountGoogle') : tr('profile.accountPassword');
    const passwordTitle = $('[data-password-title]');
    if (passwordTitle) passwordTitle.textContent = providers.includes('password') ? tr('profile.changePassword') : tr('profile.definePassword');
    const passwordForm = $('[data-password-form]');
    if (passwordForm) passwordForm.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(passwordForm);
      const password = String(data.get('password') || '');
      if (password !== String(data.get('confirmPassword') || '')) return message(passwordForm, tr('signup.passwordMismatch'));
      const list = accounts();
      const item = list.find(entry => entry.id === account.id);
      item.passwordHash = hashPassword(password);
      item.providers = [...new Set([...(item.providers || []), 'password'])];
      saveAccounts(list);
      message(passwordForm, tr('profile.passwordSaved'));
      setTimeout(() => location.reload(), 350);
    });
    const ownPosts = getPosts().filter(post => post.author === account.username);
    $('[data-profile-posts]').textContent = ownPosts.length;
    $('[data-profile-positive]').textContent = ownPosts.reduce((sum, post) => sum + post.positive, 0);
    $('[data-profile-shares]').textContent = ownPosts.reduce((sum, post) => sum + post.shares, 0);
  }

  function renderFeed() {
    const feed = $('[data-feed]');
    if (!feed) return;
    const posts = getPosts();
    const limit = threshold(posts.length);
    $('[data-total-murmurs]').textContent = posts.length;
    $('[data-current-threshold]').textContent = limit;
    $('[data-threshold-label]').textContent = `${tr('feed.currentLimit')}: ${limit}`;
    feed.innerHTML = posts.slice().sort((a, b) => b.createdAt - a.createdAt).map(post => {
      const score = post.positive - post.negative;
      const hidden = score <= -limit;
      const highlighted = score >= limit;
      if (hidden && !post.forceShow) return `<article class="panel murmur-card hidden-score" data-post-id="${post.id}"><div class="hidden-message"><div><strong>${tr('feed.hiddenTitle')}</strong><br><span>${tr('feed.hiddenText')}</span></div><button class="button secondary small" data-show-post>${tr('feed.show')}</button></div></article>`;
      return `<article class="panel murmur-card ${highlighted ? 'highlighted' : ''}" data-post-id="${post.id}">
        <div class="murmur-head"><div class="avatar">${initials(post.author)}</div><div class="murmur-author"><strong>@${escapeHtml(post.author)}</strong><span>${ago(post.createdAt)}</span></div></div>
        <p class="murmur-text">${escapeHtml(post.text)}</p>
        <div class="score-line"><span class="score ${score < 0 ? 'negative' : ''}">${score >= 0 ? '+' : ''}${score}</span><span class="score-rule">${post.positive} + · ${post.negative} −</span></div>
        <div class="murmur-actions">
          <button class="action-button" data-vote="positive">+ ${tr('feed.positive')} (${post.positive})</button>
          <button class="action-button" data-vote="negative">− ${tr('feed.negative')} (${post.negative})</button>
          <button class="action-button" data-reply-toggle>${tr('feed.reply')} (${post.replies.length})</button>
          <button class="action-button" data-share>${tr('feed.share')} (${post.shares})</button>
        </div>
        <form class="reply-box" data-reply-form><input name="reply" maxlength="280" placeholder="${tr('feed.replyPlaceholder')}" required><button class="button primary small">${tr('feed.send')}</button></form>
        <div class="replies">${post.replies.map(reply => `<div class="reply"><strong>@${escapeHtml(reply.author)}</strong> ${escapeHtml(reply.text)}</div>`).join('')}</div>
      </article>`;
    }).join('');

    $$('[data-show-post]', feed).forEach(button => button.addEventListener('click', () => updatePost(button, post => { post.forceShow = true; })));
    $$('[data-vote]', feed).forEach(button => button.addEventListener('click', () => {
      const account = currentAccount();
      updatePost(button, post => {
        post.votes ||= {};
        const previous = post.votes[account.id];
        if (previous === 'positive') post.positive -= 1;
        if (previous === 'negative') post.negative -= 1;
        const next = button.dataset.vote;
        if (previous === next) delete post.votes[account.id];
        else { post.votes[account.id] = next; post[next] += 1; }
      });
    }));
    $$('[data-reply-toggle]', feed).forEach(button => button.addEventListener('click', () => $('.reply-box', button.closest('[data-post-id]')).classList.toggle('open')));
    $$('[data-reply-form]', feed).forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      const account = currentAccount();
      const data = new FormData(form);
      updatePost(form, post => post.replies.push({ author: account.username, text: String(data.get('reply') || '').trim() }));
    }));
    $$('[data-share]', feed).forEach(button => button.addEventListener('click', async () => {
      const card = button.closest('[data-post-id]');
      const url = `${location.origin}/?murmur=${card.dataset.postId}`;
      try { if (navigator.share) await navigator.share({ title: 'Murmurinho', url }); else await navigator.clipboard.writeText(url); } catch {}
      updatePost(button, post => { post.shares += 1; });
      toast(tr('feed.shared'));
    }));
  }

  function updatePost(element, change) {
    const card = element.closest('[data-post-id]');
    const posts = getPosts();
    const post = posts.find(item => item.id === card.dataset.postId);
    if (!post) return;
    change(post);
    write(KEYS.posts, posts);
    renderFeed();
  }

  function initComposer() {
    const form = $('[data-composer]');
    const account = currentAccount();
    if (!form || !account) return;
    $('[data-user-avatar]').textContent = initials(account.username);
    const textarea = $('textarea', form);
    textarea.addEventListener('input', () => { $('[data-char-count]').textContent = textarea.value.length; });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = textarea.value.trim();
      if (!text) return;
      const posts = getPosts();
      posts.push({ id: crypto.randomUUID(), author: account.username, text, positive: 0, negative: 0, shares: 0, createdAt: Date.now(), replies: [], votes: {} });
      write(KEYS.posts, posts);
      form.reset();
      $('[data-char-count]').textContent = '0';
      renderFeed();
    });
  }

  enforceAuth();
  initLanguage();
  initTheme();
  initLogout();
  initSignup();
  initLogin();
  initGoogleLogin();
  initRecovery();
  initProfile();
  initComposer();
  renderFeed();
})();
