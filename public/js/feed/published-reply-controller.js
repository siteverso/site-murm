function createOptimisticReply(parentId, text, isPrivate = false) {
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

    insertOptimisticReplyCard(reply, parentId);
    return reply;
}

function ensureReplyContainer(parentCard, parentId) {
    let replies = parentCard.querySelector(`:scope > [data-replies-for="${CSS.escape(String(parentId))}"]`);
    if (replies) return replies;

    replies = document.createElement('div');
    replies.className = 'replies replies-recursive';
    replies.dataset.repliesFor = String(parentId);
    parentCard.append(replies);
    return replies;
}

function insertOptimisticReplyCard(reply, parentId) {
    const parentCard = document.querySelector(`[data-post-id="${CSS.escape(String(parentId))}"]`);
    if (!parentCard) return null;

    const replies = ensureReplyContainer(parentCard, parentId);
    const template = document.createElement('template');
    template.innerHTML = renderPost(reply, new Map(), new Set([String(parentId)]), {
        repliesMode: 'recursive',
        depth: 1,
        maxDepth: 100,
        contextParentId: String(parentId),
    }).trim();

    const card = template.content.firstElementChild;
    if (!card) return null;
    card.classList.add('reply-optimistic', 'reply-just-published');
    card.dataset.optimisticReply = 'true';
    replies.prepend(card);
    setupLazyVisuals(card);
    setTimeout(() => card.classList.remove('reply-just-published'), 2600);
    return card;
}

function commitOptimisticReply(reply, realId) {
    const temporaryId = String(reply.id);
    const card = document.querySelector(`[data-post-id="${CSS.escape(temporaryId)}"]`);
    reply.id = Number(realId);
    delete reply.optimistic;

    if (card) {
        card.id = `murmurio-${realId}`;
        card.dataset.postId = String(realId);
        delete card.dataset.optimisticReply;
        card.classList.remove('reply-optimistic');

        card.querySelectorAll(`[href="/murmurio/${encodeURIComponent(temporaryId)}"]`).forEach(link => {
            link.href = link.href.replace(`/murmurio/${encodeURIComponent(temporaryId)}`, `/murmurio/${encodeURIComponent(realId)}`);
        });
        card.querySelectorAll('[data-delete-reply]').forEach(button => {
            button.dataset.deleteReply = String(realId);
        });
    }

    feedSignature = getFeedSignature(posts);
    return card;
}

function rollbackOptimisticReply(reply) {
    const replyId = String(reply.id);
    document.querySelector(`[data-post-id="${CSS.escape(replyId)}"]`)?.remove();
    posts = posts.filter(post => !sameId(post.id, replyId));

    const parent = posts.find(post => sameId(post.id, reply.parentPostId));
    if (parent) {
        parent.replyCount = Math.max(0, Number(parent.replyCount || 0) - 1);
        parent.hasMyReply = posts.some(post => sameId(post.parentPostId, parent.id) && sameId(post.userId, currentUser?.id));
    }
    feedSignature = getFeedSignature(posts);
}
