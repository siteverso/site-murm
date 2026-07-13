function mergeReplyBranchIntoFeed(branchPosts = []) {
    const byId = new Map((Array.isArray(posts) ? posts : []).map(post => [String(post.id), post]));
    (Array.isArray(branchPosts) ? branchPosts : []).forEach(post => byId.set(String(post.id), post));
    posts = [...byId.values()];
}

function getReplyPath(branchPosts, replyId) {
    const byId = new Map((Array.isArray(branchPosts) ? branchPosts : []).map(post => [String(post.id), post]));
    const path = [];
    const visited = new Set();
    let current = byId.get(String(replyId));
    while (current && !visited.has(String(current.id))) {
        visited.add(String(current.id));
        path.unshift(current);
        current = current.parentPostId == null ? null : byId.get(String(current.parentPostId));
    }
    return path;
}

function captureReplyViewportAnchor(parentId) {
    const card = document.querySelector(`[data-post-id="${CSS.escape(String(parentId))}"]`);
    return {
        parentId: String(parentId),
        top: card?.getBoundingClientRect().top ?? null,
        scrollY: window.scrollY,
    };
}

let cancelReplyViewportStabilizer = null;

function keepReplyViewportAnchorStable(anchor, maxDurationMs = 15000) {
    cancelReplyViewportStabilizer?.();

    let cancelled = false;
    let frameId = 0;
    const startedAt = performance.now();
    const cancelOnUserIntent = () => stop();
    const userIntentEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

    function stop() {
        if (cancelled) return;
        cancelled = true;
        cancelAnimationFrame(frameId);
        userIntentEvents.forEach(type => window.removeEventListener(type, cancelOnUserIntent, true));
        document.documentElement.classList.remove('reply-viewport-locked');
        if (cancelReplyViewportStabilizer === stop) cancelReplyViewportStabilizer = null;
    }

    function correctPosition() {
        if (cancelled) return;
        const card = document.querySelector(`[data-post-id="${CSS.escape(anchor.parentId)}"]`);
        if (card && anchor.top != null) {
            const delta = card.getBoundingClientRect().top - anchor.top;
            if (Math.abs(delta) > 0.5) {
                window.scrollBy({top: delta, left: 0, behavior: 'auto'});
            }
        } else if (Math.abs(window.scrollY - anchor.scrollY) > 0.5) {
            window.scrollTo({top: anchor.scrollY, left: 0, behavior: 'auto'});
        }

        const now = performance.now();
        const reachedSafetyLimit = now - startedAt >= maxDurationMs;
        if (reachedSafetyLimit) {
            stop();
            return;
        }
        frameId = requestAnimationFrame(correctPosition);
    }

    document.documentElement.classList.add('reply-viewport-locked');
    userIntentEvents.forEach(type => window.addEventListener(type, cancelOnUserIntent, true));
    frameId = requestAnimationFrame(correctPosition);
    cancelReplyViewportStabilizer = stop;
    return stop;
}

async function restoreReplyViewportAnchor(anchor) {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const card = document.querySelector(`[data-post-id="${CSS.escape(anchor.parentId)}"]`);
    if (card && anchor.top != null) {
        const delta = card.getBoundingClientRect().top - anchor.top;
        if (Math.abs(delta) > 0.5) window.scrollBy({top: delta, left: 0, behavior: 'auto'});
    } else {
        window.scrollTo({top: anchor.scrollY, left: 0, behavior: 'auto'});
    }
    keepReplyViewportAnchorStable(anchor);
}

function animatePublishedReply(replyId) {
    const card = document.querySelector(`[data-post-id="${CSS.escape(String(replyId))}"]`);
    if (!card) return false;
    card.classList.add('reply-just-published');
    setTimeout(() => card.classList.remove('reply-just-published'), 2600);
    return true;
}

async function revealPublishedReply(replyId, parentId, submittedText = '') {
    const viewportAnchor = captureReplyViewportAnchor(parentId);
    const data = await api(`/api/posts/${encodeURIComponent(replyId)}`);
    const branchPosts = Array.isArray(data?.posts) ? data.posts : [];
    mergeReplyBranchIntoFeed(branchPosts);
    const path = getReplyPath(branchPosts, replyId);
    const profileFeed = $('[data-profile-feed]');

    if (profileFeed) {
        const specificRootId = profileFeed.dataset.profilePostId || '';
        if (specificRootId) {
            const state = getSpecificThreadState(specificRootId);
            path
                .filter(post => String(post.id) !== String(specificRootId))
                .forEach(post => state.expandedIds.add(String(post.id)));
            renderLane(profileFeed, posts, 'recursive', specificRootId);
            feedSignature = getFeedSignature(posts);
        } else {
            if (path.length > 1) profileCompactExpandedIds.add(String(path[1].id));
            renderLane(profileFeed, posts, 'compact');
        }
        setupLazyVisuals(profileFeed);
        await restoreReplyViewportAnchor(viewportAnchor);
        if (animatePublishedReply(replyId)) return true;
    }

    if (await refreshReplyHistoryPage(parentId)) {
        await restoreReplyViewportAnchor(viewportAnchor);
        if (animatePublishedReply(replyId)) return true;
    } else {
        await loadFeed(true);
        await restoreReplyViewportAnchor(viewportAnchor);
        if (animatePublishedReply(replyId)) return true;
    }

    return false;
}
