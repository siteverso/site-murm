function renderFeedSkeletons() {
    const columns = $('[data-feed-columns]');
    const allListFeed = $('[data-feed-all-list]');
    const profileFeed = $('[data-profile-feed]');
    const skeletonCard = () => `<article class="panel murmur-card skeleton-card" aria-hidden="true">
    <div class="skeleton-head">
      <span class="skeleton-block skeleton-avatar"></span>
      <span class="skeleton-author">
        <span class="skeleton-block skeleton-name"></span>
        <span class="skeleton-block skeleton-date"></span>
      </span>
    </div>
    <span class="skeleton-block skeleton-line skeleton-line--long"></span>
    <span class="skeleton-block skeleton-line"></span>
    <span class="skeleton-block skeleton-line skeleton-line--short"></span>
    <div class="skeleton-actions">
      <span class="skeleton-block skeleton-score"></span>
      <span class="skeleton-block skeleton-pill"></span>
      <span class="skeleton-block skeleton-pill"></span>
    </div>
  </article>`;
    const cards = (count = 3) => Array.from({length: count}, skeletonCard).join('');

    if (columns) {
        const definitions = getColumnDefinitions();
        columns.dataset.columnCount = String(definitions.length);
        columns.innerHTML = definitions.map(definition => `<section class="network-lane ${definition.className || ''}">
      <div class="feed lane-feed feed-skeleton" aria-label="Carregando murmúrios">${cards(3)}</div>
    </section>`).join('');
    }
    if (allListFeed) allListFeed.innerHTML = `<div class="feed-skeleton" aria-label="Carregando murmúrios">${cards(4)}</div>`;
    if (profileFeed) profileFeed.innerHTML = `<div class="feed-skeleton" aria-label="Carregando murmúrios">${cards(3)}</div>`;
}

function setupLazyVisuals(root = document) {
    const cards = $$('.lazy-reveal:not(.is-visible)', root);
    if (cards.length) {
        if (!('IntersectionObserver' in window)) {
            cards.forEach(card => card.classList.add('is-visible'));
        } else {
            feedRevealObserver ||= new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-visible');
                    feedRevealObserver.unobserve(entry.target);
                });
            }, {rootMargin: '160px 0px', threshold: 0.01});
            cards.forEach(card => feedRevealObserver.observe(card));
        }
    }

    $$('.lazy-media:not([data-lazy-bound])', root).forEach(image => {
        image.dataset.lazyBound = 'true';
        const markLoaded = () => image.classList.add('is-loaded');
        if (image.complete) markLoaded();
        else {
            image.addEventListener('load', markLoaded, {once: true});
            image.addEventListener('error', markLoaded, {once: true});
        }
    });
}

function disconnectFeedColumnObservers() {
    feedColumnObservers.forEach(observer => observer.disconnect());
    feedColumnObservers = [];
}

function getColumnGroupMode() {
    return 'sex';
}

function getColumnDefinitions() {
    return COLUMN_GROUPS[getColumnGroupMode()];
}

function getColumnItems(definition) {
    const roots = getRootPosts(posts);
    return roots.filter(post => (post.sexCode || '') === definition.code);
}

function renderSplitLane(feed, items, kind) {
    if (!feed) return;
    const limit = splitFeedLimits[kind] || FEED_BATCH_SIZE;
    const visible = items.slice(0, limit);
    const childrenByParent = groupPostsByParent(posts);
    const hasMore = items.length > visible.length;
    feed.innerHTML = visible.length
        ? `${visible.map(post => renderPost(post, childrenByParent, new Set(), {repliesMode: 'compact'})).join('')}${hasMore ? `<div class="feed-more-wrap"><button class="feed-more-button" type="button" data-feed-more="${kind}">Mostrar mais 20</button><div class="feed-more-sentinel" data-feed-more-sentinel="${kind}" aria-hidden="true"></div></div>` : ''}`
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
    setupLazyVisuals(columns);
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
        }, {root: null, threshold: 0.1, rootMargin: '0px 0px 240px 0px'});
        observer.observe(sentinel);
        feedColumnObservers.push(observer);
    });
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
        return !closest || distance < closest.distance ? {card, distance} : closest;
    }, null)?.card;
    return anchor ? {postId: anchor.dataset.postId, top: anchor.getBoundingClientRect().top} : null;
}

function restoreFeedAnchor(anchor) {
    if (!anchor) return;
    const card = document.querySelector(`[data-post-id="${anchor.postId}"]`);
    if (!card) return;
    const delta = card.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
}

async function hydrateExpandedSpecificPosts(rootId, basePosts) {
    if (!rootId) return Array.isArray(basePosts) ? basePosts : [];

    const state = getSpecificThreadState(rootId);
    const expandedIds = [...state.expandedIds].filter(Boolean);
    if (!expandedIds.length) return Array.isArray(basePosts) ? basePosts : [];

    const hydratedGroups = await Promise.all(expandedIds.map(async postId => {
        try {
            const data = await api(`/api/posts/${encodeURIComponent(postId)}`);
            return Array.isArray(data?.posts) ? data.posts : [];
        } catch {
            // Uma falha isolada não deve fechar os outros cards que continuam expandidos.
            return [];
        }
    }));

    const byId = new Map((Array.isArray(basePosts) ? basePosts : []).map(post => [String(post.id), post]));
    hydratedGroups.flat().forEach(post => byId.set(String(post.id), post));
    return [...byId.values()];
}

//
let feedRequestRunning = false;
let feedSignature = '';

async function loadFeed(force = false) {
    const columns = $('[data-feed-columns]');
    const allListFeed = $('[data-feed-all-list]');
    const profileFeed = $('[data-profile-feed]');
    if ((!columns && !allListFeed && !profileFeed) || feedRequestRunning) return;

    feedRequestRunning = true;
    if (!hasRenderedFeed) renderFeedSkeletons();
    try {
        const profileUsername = profileFeed?.dataset.profileUsername || '';
        const profilePostId = profileFeed?.dataset.profilePostId || '';
        const endpoint = profilePostId
            ? `/api/posts?specificId=${encodeURIComponent(profilePostId)}`
            : profileUsername
                ? `/api/posts?username=${encodeURIComponent(profileUsername)}`
                : '/api/posts';
        const data = await api(endpoint);
        const nextPosts = profilePostId
            ? await hydrateExpandedSpecificPosts(profilePostId, data.posts || [])
            : (data.posts || []);
        specificSiblingStubs = profilePostId ? (data.siblingStubs || []) : [];
        const nextSignature = getFeedSignature(nextPosts);
        if (!force && nextSignature === feedSignature) return;

        const anchor = captureFeedAnchor();
        posts = nextPosts;
        feedSignature = nextSignature;
        feedBuckets.all = posts;
        renderSplitFeeds();
        renderLane(allListFeed, feedBuckets.all, 'compact');
        const profileRepliesMode = profilePostId
            ? 'recursive'
            : profileFeed?.dataset.feedIncludeReplies === 'true'
                ? 'compact'
                : 'none';
        renderLane(profileFeed, feedBuckets.all, profileRepliesMode, profilePostId);
        restoreFeedAnchor(anchor);
        setupLazyVisuals();
        hasRenderedFeed = true;
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
    }, {once: true});
}

function startFeedPolling() {
    if (!$('[data-feed-columns]') && !$('[data-feed-all-list]') && !$('[data-profile-feed]')) return;

    bindFeedSyncEvents();
    clearInterval(feedTimer);
    feedTimer = setInterval(() => {
        if (document.visibilityState === 'visible') loadFeed().catch(() => {
        });
    }, MIN_SITE_REFRESH_INTERVAL_MS);

}

