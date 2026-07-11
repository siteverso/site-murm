(() => {
  const KEYS = {
    user: 'murmurinho-user',
    session: 'murmurinho-session',
    posts: 'murmurinho-posts',
    theme: 'murmurinho-theme'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const defaultUser = {
    name: 'Daniel Maia',
    handle: 'daniel',
    email: 'daniel@murmu.local',
    bio: 'Construindo coisas simples que funcionam.'
  };

  const starterPosts = [
    {
      id: crypto.randomUUID(),
      author: 'Murmurinho',
      handle: 'murmurinho',
      text: 'O primeiro murmúrio está no ar. Aqui a comunidade ajuda a destacar o que vale a conversa.',
      positive: 126,
      negative: 8,
      shares: 14,
      createdAt: Date.now() - 1000 * 60 * 8,
      replies: [{ author: 'Daniel Maia', text: 'Simples e direto. É esse o caminho.' }],
      votes: {}
    },
    {
      id: crypto.randomUUID(),
      author: 'Ana Souza',
      handle: 'anasouza',
      text: 'Uma ideia: os limites de destaque e bloqueio podem crescer junto com a rede, sem deixar comunidades pequenas sem voz.',
      positive: 58,
      negative: 4,
      shares: 6,
      createdAt: Date.now() - 1000 * 60 * 42,
      replies: [],
      votes: {}
    },
    {
      id: crypto.randomUUID(),
      author: 'Conta de teste',
      handle: 'teste',
      text: 'Este murmúrio demonstra o recolhimento por rejeição da comunidade.',
      positive: 3,
      negative: 112,
      shares: 0,
      createdAt: Date.now() - 1000 * 60 * 90,
      replies: [],
      votes: {}
    }
  ];

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUser() {
    return { ...defaultUser, ...read(KEYS.user, {}) };
  }

  function getPosts() {
    const posts = read(KEYS.posts, null);
    if (posts) return posts;
    write(KEYS.posts, starterPosts);
    return starterPosts;
  }

  function threshold(total) {
    // Começa em 100 e cresce 10 pontos a cada 1.000 murmúrios.
    return 100 + Math.floor(total / 1000) * 10;
  }

  function initials(name) {
    return name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function ago(timestamp) {
    const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} d`;
  }

  function toast(message) {
    const el = $('[data-toast]');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__murmurToast);
    window.__murmurToast = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function enforceAuth() {
    if (document.body.dataset.authRequired !== 'true') return;
    if (!read(KEYS.session, false)) location.replace('/login');
  }

  function initTheme() {
    $$('[data-theme-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        localStorage.setItem(KEYS.theme, next);
      });
    });
  }

  function initLogout() {
    $$('[data-logout]').forEach(button => button.addEventListener('click', () => {
      localStorage.removeItem(KEYS.session);
      location.href = '/login';
    }));
  }

  function initLogin() {
    const form = $('[data-login-form]');
    if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const email = String(data.get('email') || '').trim();
      const current = getUser();
      write(KEYS.user, { ...current, email });
      write(KEYS.session, { email, loggedAt: Date.now(), remember: data.get('remember') === 'on' });
      $('[data-form-message]', form).textContent = 'Acesso autorizado. Entrando...';
      setTimeout(() => location.href = '/', 250);
    });
  }

  function initRecovery() {
    const form = $('[data-recovery-form]');
    if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const email = String(new FormData(form).get('email') || '').trim();
      $('[data-form-message]', form).textContent = `Instruções simuladas enviadas para ${email}.`;
      form.reset();
    });
  }

  function renderFeed() {
    const feed = $('[data-feed]');
    if (!feed) return;
    const posts = getPosts().sort((a, b) => b.createdAt - a.createdAt);
    const limit = threshold(posts.length);
    $('[data-total-murmurs]') && ($('[data-total-murmurs]').textContent = posts.length.toLocaleString('pt-BR'));
    $('[data-current-threshold]') && ($('[data-current-threshold]').textContent = limit);
    $('[data-threshold-label]') && ($('[data-threshold-label]').textContent = `limite atual: ${limit}`);

    feed.innerHTML = posts.map(post => {
      const score = post.positive - post.negative;
      const hidden = score <= -limit;
      const highlighted = score >= limit;
      if (hidden) {
        return `<article class="panel murmur-card hidden-score" data-post-id="${post.id}">
          <div class="hidden-message">
            <span><strong>Murmúrio recolhido</strong><br>diferença de ${score}; limite negativo: -${limit}</span>
            <button class="button ghost small" data-reveal>Ver mesmo assim</button>
          </div>
          <div data-hidden-content hidden>${fullCard(post, score, highlighted)}</div>
        </article>`;
      }
      return `<article class="panel murmur-card ${highlighted ? 'highlighted' : ''}" data-post-id="${post.id}">${fullCard(post, score, highlighted)}</article>`;
    }).join('');

    bindFeedActions();
  }

  function fullCard(post, score) {
    const replies = (post.replies || []).map(reply => `<div class="reply"><strong>${escapeHtml(reply.author)}</strong> ${escapeHtml(reply.text)}</div>`).join('');
    return `<div class="murmur-head">
      <div class="avatar">${escapeHtml(initials(post.author))}</div>
      <div class="murmur-author"><strong>${escapeHtml(post.author)}</strong><span>@${escapeHtml(post.handle)} · ${ago(post.createdAt)}</span></div>
    </div>
    <p class="murmur-text">${escapeHtml(post.text)}</p>
    <div class="score-line">
      <span class="score ${score < 0 ? 'negative' : ''}">diferença ${score > 0 ? '+' : ''}${score}</span>
      <span class="score-rule">${post.positive} positivos · ${post.negative} negativos</span>
    </div>
    <div class="murmur-actions">
      <button class="action-button" data-vote="positive">＋ positivo</button>
      <button class="action-button" data-vote="negative">− negativo</button>
      <button class="action-button" data-reply-toggle>Responder (${(post.replies || []).length})</button>
      <button class="action-button" data-share>Compartilhar (${post.shares || 0})</button>
    </div>
    <form class="reply-box" data-reply-form>
      <input name="reply" maxlength="240" placeholder="Escreva uma resposta..." required />
      <button class="button primary small" type="submit">Enviar</button>
    </form>
    <div class="replies">${replies}</div>`;
  }

  function bindFeedActions() {
    $$('[data-reveal]').forEach(button => button.addEventListener('click', () => {
      const card = button.closest('[data-post-id]');
      $('.hidden-message', card).hidden = true;
      const content = $('[data-hidden-content]', card);
      content.hidden = false;
      card.classList.remove('hidden-score');
    }));

    $$('[data-vote]').forEach(button => button.addEventListener('click', () => {
      const id = button.closest('[data-post-id]').dataset.postId;
      const type = button.dataset.vote;
      const posts = getPosts();
      const post = posts.find(item => item.id === id);
      const voter = getUser().handle;
      post.votes ||= {};
      const previous = post.votes[voter];
      if (previous === type) {
        post[type] = Math.max(0, post[type] - 1);
        delete post.votes[voter];
      } else {
        if (previous) post[previous] = Math.max(0, post[previous] - 1);
        post[type] += 1;
        post.votes[voter] = type;
      }
      write(KEYS.posts, posts);
      renderFeed();
    }));

    $$('[data-reply-toggle]').forEach(button => button.addEventListener('click', () => {
      const form = $('[data-reply-form]', button.closest('[data-post-id]'));
      form.classList.toggle('open');
      if (form.classList.contains('open')) $('input', form).focus();
    }));

    $$('[data-reply-form]').forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      const id = form.closest('[data-post-id]').dataset.postId;
      const input = $('input', form);
      const text = input.value.trim();
      if (!text) return;
      const posts = getPosts();
      const post = posts.find(item => item.id === id);
      post.replies ||= [];
      post.replies.push({ author: getUser().name, text });
      write(KEYS.posts, posts);
      renderFeed();
      toast('Resposta publicada.');
    }));

    $$('[data-share]').forEach(button => button.addEventListener('click', async () => {
      const id = button.closest('[data-post-id]').dataset.postId;
      const posts = getPosts();
      const post = posts.find(item => item.id === id);
      post.shares = (post.shares || 0) + 1;
      write(KEYS.posts, posts);
      const text = `${post.author} no Murmurinho: ${post.text}`;
      try {
        if (navigator.share) await navigator.share({ title: 'Murmurinho', text, url: location.href });
        else await navigator.clipboard.writeText(text);
        toast(navigator.share ? 'Compartilhado.' : 'Murmúrio copiado.');
      } catch {}
      renderFeed();
    }));
  }

  function initComposer() {
    const form = $('[data-composer]');
    if (!form) return;
    const textarea = $('textarea', form);
    const counter = $('[data-char-count]', form);
    textarea.addEventListener('input', () => counter.textContent = textarea.value.length);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = textarea.value.trim();
      if (!text) return;
      const user = getUser();
      const posts = getPosts();
      posts.push({
        id: crypto.randomUUID(), author: user.name, handle: user.handle, text,
        positive: 0, negative: 0, shares: 0, createdAt: Date.now(), replies: [], votes: {}
      });
      write(KEYS.posts, posts);
      form.reset();
      counter.textContent = '0';
      renderFeed();
      toast('Murmúrio publicado.');
    });
  }

  function initProfile() {
    const form = $('[data-profile-form]');
    if (!form) return;
    const user = getUser();
    form.name.value = user.name;
    form.handle.value = user.handle;
    form.bio.value = user.bio;
    $('[data-profile-avatar]').textContent = initials(user.name);
    $('[data-profile-name]').textContent = user.name;
    $('[data-profile-handle]').textContent = `@${user.handle}`;
    $('[data-profile-bio]').textContent = user.bio;
    const own = getPosts().filter(post => post.handle === user.handle);
    $('[data-profile-posts]').textContent = own.length;
    $('[data-profile-positive]').textContent = own.reduce((sum, post) => sum + post.positive, 0);
    $('[data-profile-shares]').textContent = own.reduce((sum, post) => sum + (post.shares || 0), 0);

    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const next = {
        ...user,
        name: String(data.get('name')).trim(),
        handle: String(data.get('handle')).trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase(),
        bio: String(data.get('bio')).trim()
      };
      write(KEYS.user, next);
      $('[data-form-message]', form).textContent = 'Perfil salvo.';
      setTimeout(() => location.reload(), 350);
    });
  }

  function fillUserVisuals() {
    const user = getUser();
    $$('[data-user-avatar]').forEach(el => el.textContent = initials(user.name));
  }

  enforceAuth();
  initTheme();
  initLogout();
  initLogin();
  initRecovery();
  initComposer();
  initProfile();
  fillUserVisuals();
  renderFeed();
})();
