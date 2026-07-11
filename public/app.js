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

  function newId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `murm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  const starterPosts = [
    { id: newId(), author: 'murmurinho', text: 'O primeiro murmúrio está no ar. Aqui a comunidade ajuda a destacar o que vale a conversa.', positive: 126, negative: 8, shares: 14, createdAt: Date.now() - 480000, replies: [], votes: {} },
    { id: newId(), author: 'ana', text: 'Os limites podem crescer junto com a rede, sem deixar comunidades pequenas sem voz.', positive: 58, negative: 4, shares: 6, createdAt: Date.now() - 2520000, replies: [], votes: {} },
    { id: newId(), author: 'teste', text: 'Este murmúrio demonstra o recolhimento por rejeição da comunidade.', positive: 3, negative: 112, shares: 0, createdAt: Date.now() - 5400000, replies: [], votes: {} },
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
    const rawCurrent = session();
    if (!rawCurrent) return null;
    const current = typeof rawCurrent === 'object' ? rawCurrent : {};

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
          id: newId(),
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
  function normalizePost(post) {
    const positive = Number(post?.positive) || 0;
    const negative = Number(post?.negative) || 0;
    return {
      id: post?.id || newId(),
      author: normalizeUsername(post?.author || post?.handle || 'usuario'),
      text: String(post?.text || '').trim(),
      positive,
      negative,
      shares: Number(post?.shares) || 0,
      createdAt: Number(post?.createdAt) || Date.now(),
      replies: Array.isArray(post?.replies) ? post.replies.map(reply => ({
        id: reply?.id || newId(),
        authorId: reply?.authorId || '',
        author: normalizeUsername(reply?.author || reply?.handle || 'usuario'),
        text: String(reply?.text || '').trim(),
        createdAt: Number(reply?.createdAt) || Date.now(),
      })) : [],
      votes: post?.votes && typeof post.votes === 'object' ? post.votes : {},
      forceShow: Boolean(post?.forceShow),
    };
  }

  function getPosts() {
    const value = read(KEYS.posts, null);
    const source = Array.isArray(value) ? value : starterPosts;
    const normalized = source.map(normalizePost).filter(post => post.text);
    write(KEYS.posts, normalized);
    return normalized;
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
      button.addEventListener('click', () => {
        action.onClick();
        el.classList.remove('show');
      }, { once: true });
      el.append(button);
    }

    el.classList.add('show');
    clearTimeout(window.__murmurToast);
    window.__murmurToast = setTimeout(() => el.classList.remove('show'), action ? 6000 : 2400);
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
      const account = { id: newId(), username, email, bio: '', avatarUrl: '', passwordHash: hashPassword(password), providers: ['password'], createdAt: Date.now() };
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
              id: newId(),
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
    const form = $('[data-profile-form]');
    if (!form) return;

    const account = currentAccount();
    if (!account) return;

    const avatar = $('[data-profile-avatar]');
    const username = $('[data-profile-username]');
    const email = $('[data-profile-email]');
    const bio = $('[data-profile-bio]');

    if (avatar) avatar.textContent = initials(account.username);
    if (username) username.textContent = `@${account.username}`;
    if (email) email.textContent = account.email;
    if (bio) bio.textContent = account.bio || '';
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
    const authMethods = $('[data-auth-methods]');
    const authExplanation = $('[data-auth-explanation]');
    if (authMethods) authMethods.textContent = providers.map(provider => provider === 'google' ? tr('profile.authGoogle') : tr('profile.authPassword')).join(' + ');
    if (authExplanation) authExplanation.textContent = providers.includes('google') && !providers.includes('password') ? tr('profile.accountGoogle') : tr('profile.accountPassword');
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
    if (!target || !animationClass) return;
    target.classList.remove(animationClass);
    void target.offsetWidth;
    target.classList.add(animationClass);
    target.addEventListener('animationend', () => target.classList.remove(animationClass), { once: true });
  }

  function animateRenderedAction(postId, selector, animationClass) {
    requestAnimationFrame(() => {
      const card = document.querySelector(`[data-post-id="${postId}"]`);
      const target = card?.querySelector(selector);
      playActionAnimation(target, animationClass);
    });
  }

  function renderFeed() {
    const feed = $('[data-feed]');
    if (!feed) return;
    const posts = getPosts();
    const account = currentAccount();
    const limit = threshold(posts.length);
    const totalMurmurs = $('[data-total-murmurs]');
    const currentThreshold = $('[data-current-threshold]');
    const thresholdLabel = $('[data-threshold-label]');
    if (totalMurmurs) totalMurmurs.textContent = posts.length;
    if (currentThreshold) currentThreshold.textContent = limit;
    if (thresholdLabel) thresholdLabel.textContent = `${tr('feed.currentLimit')}: ${limit}`;
    feed.innerHTML = posts.slice().sort((a, b) => b.createdAt - a.createdAt).map(post => {
      const score = post.positive - post.negative;
      const hidden = score <= -limit;
      const highlighted = score >= limit;
      if (hidden && !post.forceShow) return `<article class="panel murmur-card hidden-score" data-post-id="${post.id}"><div class="hidden-message"><div><strong>${tr('feed.hiddenTitle')}</strong><br><span>${tr('feed.hiddenText')}</span></div><button class="button secondary small" data-show-post>${tr('feed.show')}</button></div></article>`;

      const replies = (post.replies || []).map(reply => {
        const ownReply = Boolean(account && (reply.authorId === account.id || (!reply.authorId && reply.author === account.username)));
        return `<div class="reply" data-reply-id="${reply.id}">
          <div class="reply-content"><strong>@${escapeHtml(reply.author)}</strong> <span>${escapeHtml(reply.text)}</span></div>
          ${ownReply ? `<div class="reply-actions"><button class="reply-delete" type="button" data-delete-reply title="${tr('feed.deleteReply')}" aria-label="${tr('feed.deleteReply')}">🗑️</button><button class="reply-confirm" type="button" data-confirm-delete-reply title="${tr('feed.confirmDeleteReplyLabel') || tr('feed.confirmDeleteReply')}" aria-label="${tr('feed.confirmDeleteReplyLabel') || tr('feed.confirmDeleteReply')}">✓</button><button class="reply-cancel" type="button" data-cancel-delete-reply title="${tr('feed.cancelDeleteReplyLabel') || 'Cancel'}" aria-label="${tr('feed.cancelDeleteReplyLabel') || 'Cancel'}">✕</button></div>` : ''}
        </div>`;
      }).join('');

      return `<article class="panel murmur-card ${highlighted ? 'highlighted' : ''}" data-post-id="${post.id}">
        <div class="murmur-head"><div class="avatar">${initials(post.author)}</div><div class="murmur-author"><strong>@${escapeHtml(post.author)}</strong><span>${ago(post.createdAt)}</span></div></div>
        <p class="murmur-text">${escapeHtml(post.text)}</p>
        <div class="score-line"><span class="score ${score < 0 ? 'negative' : ''}">${score >= 0 ? '+' : ''}${score}</span></div>
        <div class="murmur-actions">
          <button class="action-button" data-vote="positive" title="${tr('feed.positive')}" aria-label="${tr('feed.positive')}">${actionIcon('positive')} <span>${post.positive}</span></button>
          <button class="action-button" data-vote="negative" title="${tr('feed.negative')}" aria-label="${tr('feed.negative')}">${actionIcon('negative')} <span>${post.negative}</span></button>
          <button class="action-button" data-reply-toggle title="${tr('feed.reply')}" aria-label="${tr('feed.reply')}">${actionIcon('reply')} <span>${(post.replies || []).length}</span></button>
          <button class="action-button" data-share title="${tr('feed.share')}" aria-label="${tr('feed.share')}">${actionIcon('share')} <span>${post.shares}</span></button>
        </div>
        <form class="reply-box" data-reply-form><input name="reply" maxlength="280" placeholder="${tr('feed.replyPlaceholder')}" required><button class="button primary small">${tr('feed.send')}</button></form>
        <div class="replies">${replies}</div>
      </article>`;
    }).join('');

    $$('[data-show-post]', feed).forEach(button => button.addEventListener('click', () => updatePost(button, post => { post.forceShow = true; })));
    $$('[data-vote]', feed).forEach(button => button.addEventListener('click', () => {
      const current = currentAccount();
      if (!current) return location.href = '/login';
      const postId = button.closest('[data-post-id]')?.dataset.postId;
      const next = button.dataset.vote;
      updatePost(button, post => {
        post.votes ||= {};
        const previous = post.votes[current.id];
        if (previous === 'positive') post.positive -= 1;
        if (previous === 'negative') post.negative -= 1;
        if (previous === next) delete post.votes[current.id];
        else { post.votes[current.id] = next; post[next] += 1; }
      });
      animateRenderedAction(postId, `[data-vote="${next}"]`, next === 'positive' ? 'animate-smile' : 'animate-cry');
    }));
    $$('[data-reply-toggle]', feed).forEach(button => button.addEventListener('click', () => {
      playActionAnimation(button, 'animate-reply');
      const form = $('.reply-box', button.closest('[data-post-id]'));
      if (!form) return;
      form.classList.add('open');
      const input = $('input[name="reply"]', form);
      if (input) {
        input.focus();
        input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }));
    $$('[data-reply-form]', feed).forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      const current = currentAccount();
      if (!current) return location.href = '/login';
      const data = new FormData(form);
      const text = String(data.get('reply') || '').trim();
      if (!text) return;
      updatePost(form, post => {
        post.replies ||= [];
        post.replies.push({ id: newId(), authorId: current.id, author: current.username, text, createdAt: Date.now() });
      });
    }));
    $$('[data-delete-reply]', feed).forEach(button => button.addEventListener('click', () => {
      const actions = button.closest('.reply-actions');
      if (!actions) return;
      $$('.reply-actions.is-confirming', feed).forEach(item => {
        if (item !== actions) item.classList.remove('is-confirming');
      });
      actions.classList.toggle('is-confirming');
    }));
    $$('[data-cancel-delete-reply]', feed).forEach(button => button.addEventListener('click', () => {
      button.closest('.reply-actions')?.classList.remove('is-confirming');
    }));
    $$('[data-confirm-delete-reply]', feed).forEach(button => button.addEventListener('click', () => {
      const current = currentAccount();
      if (!current) return location.href = '/login';
      const card = button.closest('[data-post-id]');
      const replyElement = button.closest('[data-reply-id]');
      if (!card || !replyElement) return;
      const posts = getPosts();
      const post = posts.find(item => item.id === card.dataset.postId);
      const replyIndex = post?.replies?.findIndex(item => item.id === replyElement.dataset.replyId) ?? -1;
      if (!post || replyIndex < 0) return;
      const reply = post.replies[replyIndex];
      const ownsReply = reply.authorId === current.id || (!reply.authorId && reply.author === current.username);
      if (!ownsReply) return;

      const removed = post.replies.splice(replyIndex, 1)[0];
      write(KEYS.posts, posts);
      renderFeed();
      toast(tr('feed.replyDeleted'), {
        label: tr('feed.undo'),
        onClick: () => {
          const latestPosts = getPosts();
          const latestPost = latestPosts.find(item => item.id === post.id);
          if (!latestPost) return;
          latestPost.replies ||= [];
          latestPost.replies.splice(Math.min(replyIndex, latestPost.replies.length), 0, removed);
          write(KEYS.posts, latestPosts);
          renderFeed();
          toast(tr('feed.replyRestored'));
        },
      });
    }));
    $$('[data-share]', feed).forEach(button => button.addEventListener('click', async () => {
      const card = button.closest('[data-post-id]');
      const postId = card?.dataset.postId;
      const url = `${location.origin}/?murmur=${postId}`;
      playActionAnimation(button, 'animate-share');
      try { if (navigator.share) await navigator.share({ title: 'Murmurinho', url }); else await navigator.clipboard.writeText(url); } catch {}
      updatePost(button, post => { post.shares += 1; });
      animateRenderedAction(postId, '[data-share]', 'animate-share');
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
    if (!form) return;

    const account = currentAccount();
    const textarea = $('textarea', form);
    const submit = $('button[type="submit"]', form);

    if (!account) {
      if (submit) submit.disabled = true;
      toast(tr('login.invalid'));
      return;
    }

    const avatar = $('[data-user-avatar]');
    if (avatar) avatar.textContent = initials(account.username);
    if (!textarea) return;

    textarea.addEventListener('input', () => {
      const count = $('[data-char-count]');
      if (count) count.textContent = textarea.value.length;
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = textarea.value.trim();
      if (!text) {
        textarea.focus();
        return;
      }

      try {
        const posts = getPosts();
        posts.push({
          id: newId(),
          author: account.username,
          text,
          positive: 0,
          negative: 0,
          shares: 0,
          createdAt: Date.now(),
          replies: [],
          votes: {},
        });
        write(KEYS.posts, posts);
        form.reset();
        const count = $('[data-char-count]');
        if (count) count.textContent = '0';
        renderFeed();
        toast(tr('feed.published') === 'feed.published' ? 'Murmúrio publicado.' : tr('feed.published'));
      } catch (error) {
        console.error('Falha ao publicar murmúrio:', error);
        toast('Não foi possível publicar. Atualize a página e tente novamente.');
      }
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
