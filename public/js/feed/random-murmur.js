const RANDOM_MURMUR_INTERVAL_MS = 5000;
let randomMurmurTimer = null;
let currentRandomMurmurId = '';

function eligibleRandomMurmurs(items = posts) {
    return getRootPosts(Array.isArray(items) ? items : []).filter(post => {
        if (!post || post.isDeleted || post.isPrivate || post.canViewPrivate === false) return false;
        return Boolean(String(post.text || '').trim() && post.id && post.author);
    });
}

function chooseRandomMurmur(items) {
    if (!items.length) return null;
    const alternatives = items.length > 1
        ? items.filter(post => String(post.id) !== currentRandomMurmurId)
        : items;
    return alternatives[Math.floor(Math.random() * alternatives.length)] || items[0];
}

function showRandomMurmur({animate = true} = {}) {
    const root = $('[data-random-murmur]');
    const link = $('[data-random-murmur-link]', root);
    const text = $('[data-random-murmur-text]', root);
    const placeholder = $('[data-random-murmur-placeholder]', root);
    if (!root || !link || !text) return;

    const post = chooseRandomMurmur(eligibleRandomMurmurs());
    if (!post) {
        link.hidden = true;
        if (placeholder) placeholder.hidden = false;
        return;
    }

    const apply = () => {
        currentRandomMurmurId = String(post.id);
        text.textContent = String(post.text).trim();
        link.href = `/perfil/${encodeURIComponent(post.author)}?murmurio=${encodeURIComponent(post.id)}`;
        link.setAttribute('aria-label', 'Abrir este murmúrio');
        link.hidden = false;
        if (placeholder) placeholder.hidden = true;
        requestAnimationFrame(() => link.classList.remove('is-changing'));
    };

    if (animate && !link.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        link.classList.add('is-changing');
        window.setTimeout(apply, 220);
    } else {
        apply();
    }
}

function syncRandomMurmur() {
    if (!$('[data-random-murmur]')) return;
    showRandomMurmur({animate: Boolean(currentRandomMurmurId)});
    clearInterval(randomMurmurTimer);
    randomMurmurTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') showRandomMurmur();
    }, RANDOM_MURMUR_INTERVAL_MS);
}
