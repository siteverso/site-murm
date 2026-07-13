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

function animatePublishedReply(replyId) {
    const card = document.querySelector(`[data-post-id="${CSS.escape(String(replyId))}"]`);
    if (!card) return false;
    card.classList.add('reply-just-published');
    card.scrollIntoView({behavior: 'smooth', block: 'center'});
    setTimeout(() => card.classList.remove('reply-just-published'), 2600);
    return true;
}

function renderPublishedReplyReceipt(parentId, reply, replyId, conversationRoot = null) {
    const parentCard = document.querySelector(`[data-post-id="${CSS.escape(String(parentId))}"]`);
    if (!parentCard) return false;
    parentCard.querySelector('[data-published-reply-receipt]')?.remove();
    const author = String(reply?.author || currentUser?.username || 'você');
    const text = String(reply?.text || '').trim();
    const conversationAuthor = String(conversationRoot?.author || author);
    const conversationPostId = String(conversationRoot?.id || replyId);
    const href = `/perfil/${encodeURIComponent(conversationAuthor)}?murmurio=${encodeURIComponent(conversationPostId)}#murmurio-${encodeURIComponent(replyId)}`;
    const receipt = document.createElement('div');
    receipt.className = 'published-reply-receipt reply-just-published';
    receipt.dataset.publishedReplyReceipt = String(replyId);
    receipt.innerHTML = `<div class="published-reply-receipt__status">Resposta publicada</div><div class="published-reply-receipt__body"><strong>@${escapeHtml(author)}</strong><span>${escapeHtml(text)}</span></div><a href="${href}">Abrir conversa completa →</a>`;
    const replyForm = parentCard.querySelector(':scope > [data-reply-form]');
    if (replyForm) replyForm.insertAdjacentElement('afterend', receipt);
    else parentCard.append(receipt);
    receipt.scrollIntoView({behavior: 'smooth', block: 'center'});
    setTimeout(() => receipt.classList.remove('reply-just-published'), 2600);
    return true;
}

async function revealPublishedReply(replyId, parentId, submittedText = '') {
    const data = await api(`/api/posts/${encodeURIComponent(replyId)}`);
    const branchPosts = Array.isArray(data?.posts) ? data.posts : [];
    mergeReplyBranchIntoFeed(branchPosts);
    const path = getReplyPath(branchPosts, replyId);
    const conversationRoot = path[0] || null;
    const reply = branchPosts.find(post => sameId(post.id, replyId)) || {id: replyId, text: submittedText};
    const profileFeed = $('[data-profile-feed]');

    if (profileFeed) {
        const specificRootId = profileFeed.dataset.profilePostId || '';
        if (specificRootId) {
            renderLane(profileFeed, posts, 'recursive', specificRootId);
        } else {
            if (path.length > 1) profileCompactExpandedIds.add(String(path[1].id));
            renderLane(profileFeed, posts, 'compact');
        }
        setupLazyVisuals(profileFeed);
        if (animatePublishedReply(replyId)) return true;
    }

    if (await refreshReplyHistoryPage(parentId)) {
        if (animatePublishedReply(replyId)) return true;
    } else {
        await loadFeed(true);
        if (animatePublishedReply(replyId)) return true;
    }

    return renderPublishedReplyReceipt(parentId, reply, replyId, conversationRoot);
}
