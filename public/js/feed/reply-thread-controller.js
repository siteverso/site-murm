function focusReplyInput(form) {
    const input = form?.querySelector('input');
    if (!input) return;

    const focus = () => {
        if (!form.classList.contains('open')) return;
        input.focus({preventScroll: true});
    };

    focus();
    requestAnimationFrame(focus);
    setTimeout(focus, 60);
}

function openReplyForm(card, {toggle = false, focus = true} = {}) {
    const form = card?.querySelector('[data-reply-form]');
    if (!form) return;

    if (toggle) form.classList.toggle('open');
    else form.classList.add('open');

    if (focus && form.classList.contains('open')) focusReplyInput(form);
}

function openPostAuthorProfile(card) {
    const profileUrl = card?.querySelector('.murmur-profile-link')?.href;
    if (profileUrl) window.location.assign(profileUrl);
}

function closeReplyDeleteConfirm(exceptButton = null) {
    $$('[data-reply-delete-confirm]').forEach(confirm => {
        const toggleButton = confirm.parentElement?.querySelector('[data-toggle-delete-reply]');
        if (exceptButton && toggleButton === exceptButton) return;
        confirm.hidden = true;
    });
}

// const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function animateInflatedCard(element, _fromHeight = 36) {
    if (!element) return Promise.resolve();
    const content = element.firstElementChild || element;

    // O wrapper já entra com a altura natural do card. Assim, durante a abertura,
    // nunca existe uma área vazia reservada por uma altura animada maior que o conteúdo.
    const animation = content.animate([
        {opacity: 0.38, transform: 'translateY(-7px) scaleY(.985)', clipPath: 'inset(0 0 10% 0 round 16px)'},
        {opacity: 0.78, transform: 'translateY(-2px) scaleY(.995)', clipPath: 'inset(0 0 2% 0 round 16px)', offset: 0.42},
        {opacity: 1, transform: 'translateY(0) scaleY(1)', clipPath: 'inset(0 0 0 0 round 16px)'},
    ], {
        duration: 420,
        easing: 'cubic-bezier(.16, 1, .3, 1)',
    });

    return animation.finished.catch(() => {
    }).finally(() => animation.cancel());
}

async function loadAndExpandSpecificPost(rootId, inflateId) {
    const profileFeed = $('[data-profile-feed]');
    if (!profileFeed || !rootId || !inflateId) return;
    const sourceLine = profileFeed.querySelector(`[data-inflate-post="${CSS.escape(String(inflateId))}"]`);
    const sourceHeight = Math.max(32, Math.round(sourceLine?.getBoundingClientRect().height || 36));
    const state = getSpecificThreadState(rootId);
    const data = await api(`/api/posts/${encodeURIComponent(inflateId)}`);
    const loadedPosts = Array.isArray(data?.posts) ? data.posts : [];
    if (!loadedPosts.length) throw new Error('Murmúrio não encontrado.');
    const byId = new Map((Array.isArray(posts) ? posts : []).map(post => [String(post.id), post]));
    loadedPosts.forEach(post => byId.set(String(post.id), post));
    posts = [...byId.values()];
    state.expandedIds.add(String(inflateId));
    renderLane(profileFeed, posts, 'recursive', rootId);
    await new Promise(resolve => requestAnimationFrame(resolve));
    const expandedCard = profileFeed.querySelector(`[data-expanded-post="${CSS.escape(String(inflateId))}"]`);
    expandedCard?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    await animateInflatedCard(expandedCard, sourceHeight);
}

async function expandOnlySpecificPost(rootId, inflateId, sourceLine = null) {
    const state = getSpecificThreadState(rootId);
    if (state.expandedIds.has(String(inflateId))) return;
    sourceLine?.classList.add('is-loading');
    try {
        await loadAndExpandSpecificPost(rootId, String(inflateId));
    } finally {
        sourceLine?.classList.remove('is-loading');
    }
}

async function collapseExpandedSpecificPost(profileFeed, rootId, postId, card) {
    if (!profileFeed || !rootId || !postId || !card) return;
    const wrapper = card.closest('[data-expanded-post]') || card;
    const startHeight = Math.max(36, Math.round(wrapper.getBoundingClientRect().height));
    wrapper.style.overflow = 'hidden';
    const animation = wrapper.animate([
        {height: `${startHeight}px`, opacity: 1, transform: 'translateY(0)'},
        {height: '36px', opacity: .42, transform: 'translateY(-5px)'},
    ], {
        duration: 420,
        easing: 'cubic-bezier(.4, 0, .2, 1)',
        fill: 'forwards',
    });
    await animation.finished.catch(() => {
    });
    const state = getSpecificThreadState(rootId);
    state.expandedIds.delete(String(postId));
    state.animatePostIds.delete(String(postId));
    renderLane(profileFeed, posts, 'recursive', rootId);
    syncSpecificHoverControl();
}

function readSpecificHoverPreference() {
    try {
        return localStorage.getItem('murmur_expand_on_hover') === 'true';
    } catch {
        return false;
    }
}

function syncSpecificHoverControl() {
    const button = $('[data-expand-on-hover]');
    if (!button) return;
    const profileFeed = $('[data-profile-feed]');
    const hasCollapsedLines = Boolean(profileFeed?.querySelector('[data-inflate-post]'));
    button.hidden = !hasCollapsedLines;
    if (!hasCollapsedLines) cancelSpecificHoverExpansion();
}

function applySpecificHoverPreference(enabled) {
    specificHoverExpandEnabled = Boolean(enabled);
    const button = $('[data-expand-on-hover]');
    if (button) {
        button.setAttribute('aria-pressed', specificHoverExpandEnabled ? 'true' : 'false');
        button.classList.toggle('active', specificHoverExpandEnabled);
        const label = $('[data-expand-on-hover-label]', button);
        if (label) label.textContent = specificHoverExpandEnabled ? 'Hover ligado' : 'Hover desligado';
    }
    try {
        localStorage.setItem('murmur_expand_on_hover', specificHoverExpandEnabled ? 'true' : 'false');
    } catch {
    }
    syncSpecificHoverControl();
}

function cancelSpecificHoverExpansion() {
    clearTimeout(specificHoverTimer);
    specificHoverTimer = null;
    specificHoverTarget = null;
}

function scheduleSpecificHoverExpansion(line) {
    if (!specificHoverExpandEnabled || !line || line.classList.contains('is-loading')) return;
    cancelSpecificHoverExpansion();
    specificHoverTarget = line;
    specificHoverTimer = setTimeout(async () => {
        const profileFeed = $('[data-profile-feed]');
        const rootId = profileFeed?.dataset.profilePostId || '';
        if (!rootId || specificHoverTarget !== line || !line.isConnected) return;
        try {
            await expandOnlySpecificPost(rootId, String(line.dataset.inflatePost), line);
        } catch (error) {
            toast(error.message);
        } finally {
            cancelSpecificHoverExpansion();
        }
    }, SPECIFIC_HOVER_DELAY_MS);
}
