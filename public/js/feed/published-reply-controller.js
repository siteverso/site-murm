function createOptimisticReply(parentId, text, isPrivate = false, renderTarget = 'inline') {
    const parent = (Array.isArray(posts) ? posts : []).find(post => sameId(post.id, parentId));
    const temporaryId = `temp-reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const reply = {
        id: temporaryId,
        userId: Number(currentUser?.id || 0),
        parentPostId: Number(parentId),
        parentAuthor: String(parent?.author || ''),
        author: String(currentUser?.username || 'usuario'),
        sexCode: String(currentUser?.sexCode || '').trim().toUpperCase(),
        avatarUrl: String(currentUser?.avatarUrl || ''),
        text: String(text || ''),
        languageCode: String(currentUser?.languageCode || 'pt-BR'),
        positive: 0,
        negative: 0,
        shares: 0,
        myVote: 0,
        hasMyReply: false,
        createdAt: Date.now(),
        isPrivate: Boolean(isPrivate),
        canViewPrivate: true,
        isPrivateRedacted: false,
        replyCount: 0,
        optimistic: true,
    };

    posts.push(reply);
    if (parent) {
        parent.replyCount = Number(parent.replyCount || 0) + 1;
        parent.hasMyReply = true;
    }
    feedSignature = getFeedSignature(posts);

    insertOptimisticReply(reply, parentId, renderTarget);
    return reply;
}


function insertOptimisticReply(reply, parentId, renderTarget = 'inline') {
    if (renderTarget === 'children') {
        renderNonDeckFeedsFromState();
        if (typeof renderDeck === 'function') renderDeck(feedBuckets.all);
        return document.querySelector(`[data-post-id="${CSS.escape(String(reply.id))}"]`);
    }
    return insertOptimisticReplyCard(reply, parentId);
}

function ensureReplyContainer(parentCard, parentId) {
    let replies = parentCard.querySelector(`:scope > [data-replies-for="${CSS.escape(String(parentId))}"]`);
    if (!replies) {
        replies = document.createElement('div');
        replies.className = 'replies replies-compact';
        replies.dataset.repliesFor = String(parentId);
        replies.innerHTML = '<ul class="reply-preview-list"></ul>';
        parentCard.append(replies);
    }

    let list = replies.querySelector(':scope > .reply-preview-list');
    if (!list) {
        replies.classList.remove('replies-recursive');
        replies.classList.add('replies-compact');
        replies.replaceChildren();
        list = document.createElement('ul');
        list.className = 'reply-preview-list';
        replies.append(list);
    }
    return list;
}

function insertOptimisticReplyCard(reply, parentId) {
    const parentCard = document.querySelector(`[data-post-id="${CSS.escape(String(parentId))}"]`);
    if (!parentCard) return null;

    const replies = ensureReplyContainer(parentCard, parentId);
    const template = document.createElement('template');
    template.innerHTML = renderReplyPreview(reply).trim();

    const card = template.content.firstElementChild;
    if (!card) return null;
    card.classList.add('reply-optimistic', 'reply-just-published');
    card.dataset.optimisticReply = 'true';
    card.dataset.postId = String(reply.id);
    replies.prepend(card);
    setTimeout(() => card.classList.remove('reply-just-published'), 2600);
    return card;
}

function commitOptimisticReply(reply, realId) {
    const temporaryId = String(reply.id);
    const card = document.querySelector(`[data-reply-preview-id="${CSS.escape(temporaryId)}"], [data-post-id="${CSS.escape(temporaryId)}"]`);
    reply.id = Number(realId);
    delete reply.optimistic;

    if (card) {
        if (card.dataset.replyPreviewId !== undefined) card.dataset.replyPreviewId = String(realId);
        card.dataset.postId = String(realId);
        delete card.dataset.optimisticReply;
        card.classList.remove('reply-optimistic');

        card.querySelectorAll(`[href="/murmurio/${encodeURIComponent(temporaryId)}"]`).forEach(link => {
            link.href = `/murmurio/${encodeURIComponent(realId)}`;
        });
        card.querySelectorAll('[data-toggle-delete-reply]').forEach(button => {
            button.dataset.toggleDeleteReply = String(realId);
        });
        card.querySelectorAll('[data-confirm-delete-reply]').forEach(button => {
            button.dataset.confirmDeleteReply = String(realId);
        });
    }

    feedSignature = getFeedSignature(posts);
    return card;
}

function rollbackOptimisticReply(reply) {
    const replyId = String(reply.id);
    const card = document.querySelector(`[data-reply-preview-id="${CSS.escape(replyId)}"], [data-post-id="${CSS.escape(replyId)}"]`);
    const replies = card?.closest('[data-replies-for]');
    card?.remove();
    if (replies && !replies.querySelector('.reply-preview-item')) replies.remove();
    posts = posts.filter(post => !sameId(post.id, replyId));

    const parent = posts.find(post => sameId(post.id, reply.parentPostId));
    if (parent) {
        parent.replyCount = Math.max(0, Number(parent.replyCount || 0) - 1);
        parent.hasMyReply = posts.some(post => sameId(post.parentPostId, parent.id) && sameId(post.userId, currentUser?.id));
    }
    feedSignature = getFeedSignature(posts);
    if (document.querySelector('[data-feed-board][data-parent-id]')) {
        renderNonDeckFeedsFromState();
        if (typeof renderDeck === 'function') renderDeck(feedBuckets.all);
    }
}
