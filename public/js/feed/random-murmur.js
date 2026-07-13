const DEFAULT_RANDOM_MURMUR_INTERVAL_MS = 4000;

function getRandomMurmurIntervalMs(root) {
    const configured = Number.parseInt(root?.dataset?.randomMurmurIntervalMs || '', 10);
    return Number.isFinite(configured) && configured >= 250
        ? configured
        : DEFAULT_RANDOM_MURMUR_INTERVAL_MS;
}
let randomMurmurTimer = null;
let randomMurmurQueue = [];
let randomMurmurIndex = 0;
let randomMurmurSignature = '';

function eligibleRandomMurmurs(items = posts) {
    return getRootPosts(Array.isArray(items) ? items : []).filter(post => {
        if (!post || post.isDeleted || post.isPrivate || post.canViewPrivate === false) return false;
        return Boolean(String(post.text || '').trim() && post.id && post.author);
    });
}

function shuffleRandomMurmurs(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
}

function syncRandomMurmurQueue(items) {
    const signature = items.map(post => String(post.id)).sort().join('|');
    if (signature === randomMurmurSignature && randomMurmurQueue.length) return;

    randomMurmurSignature = signature;
    randomMurmurQueue = shuffleRandomMurmurs(items);
    randomMurmurIndex = 0;
}

function nextRandomMurmur(items) {
    if (!items.length) return null;
    syncRandomMurmurQueue(items);

    if (randomMurmurIndex >= randomMurmurQueue.length) {
        randomMurmurQueue = shuffleRandomMurmurs(items);
        randomMurmurIndex = 0;
    }

    const post = randomMurmurQueue[randomMurmurIndex] || null;
    randomMurmurIndex += 1;
    return post;
}

function showRandomMurmur({animate = true} = {}) {
    const root = $('[data-random-murmur]');
    const content = $('[data-random-murmur-content]', root);
    const userLink = $('[data-random-murmur-user]', root);
    const textLink = $('[data-random-murmur-link]', root);
    const text = $('[data-random-murmur-text]', root);
    const placeholder = $('[data-random-murmur-placeholder]', root);
    if (!root || !content || !userLink || !textLink || !text) return;

    const post = nextRandomMurmur(eligibleRandomMurmurs());
    if (!post) {
        content.hidden = true;
        if (placeholder) placeholder.hidden = false;
        return;
    }

    const apply = () => {
        const author = String(post.author).trim().replace(/^@+/, '');
        const postUrl = `/murmurio/${encodeURIComponent(post.id)}`;

        userLink.textContent = `@${author}`;
        userLink.href = `/perfil/${encodeURIComponent(author)}`;
        userLink.setAttribute('aria-label', `Abrir perfil de @${author}`);

        text.textContent = String(post.text).trim();
        textLink.href = postUrl;
        textLink.setAttribute('aria-label', 'Abrir este murmúrio');

        content.hidden = false;
        if (placeholder) placeholder.hidden = true;
        requestAnimationFrame(() => content.classList.remove('is-changing'));
    };

    if (animate && !content.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        content.classList.add('is-changing');
        window.setTimeout(apply, 180);
    } else {
        apply();
    }
}

function syncRandomMurmur() {
    if (!$('[data-random-murmur]')) return;
    showRandomMurmur({animate: false});
    clearInterval(randomMurmurTimer);
    const root = $('[data-random-murmur]');
    randomMurmurTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') showRandomMurmur();
    }, getRandomMurmurIntervalMs(root));
}
