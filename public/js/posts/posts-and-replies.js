function groupPostsByParent(items) {
    const childrenByParent = new Map();
    items.forEach(post => {
        if (post.parentPostId == null) return;
        const key = String(post.parentPostId);
        const children = childrenByParent.get(key) || [];
        children.push(post);
        childrenByParent.set(key, children);
    });
    return childrenByParent;
}

function getRootPosts(items) {
    const posts = Array.from(items || []);
    const publishedIds = new Set(posts.map(post => String(post.id)));
    return posts.filter(post => post.parentPostId == null || !publishedIds.has(String(post.parentPostId)));
}


function compareRepliesByNewest(left, right) {
    const timeDifference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    if (timeDifference !== 0) return timeDifference;
    return Number(right.id || 0) - Number(left.id || 0);
}

function compareRepliesByOldest(left, right) {
    const timeDifference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    if (timeDifference !== 0) return timeDifference;
    return Number(left.id || 0) - Number(right.id || 0);
}

function getSpecificThreadState(rootPostId) {
    const key = String(rootPostId || '');
    if (!specificThreadStates.has(key)) {
        specificThreadStates.set(key, {
            expandedIds: new Set(),
            beforeExtra: 0,
            afterExtra: 0,
            animatePostIds: new Set(),
        });
    }
    return specificThreadStates.get(key);
}

function renderSiblingVacuumLine(post, direction = '') {
    const label = direction === 'before'
        ? 'Carregar murmúrio anterior'
        : direction === 'after'
            ? 'Carregar próximo murmúrio'
            : 'Carregar murmúrio';
    const dateTime = post.createdAt ? new Date(post.createdAt).toLocaleString() : '';
    const preview = String(post.textPreview || '').trim();
    const sexClass = post.sexCode === 'M' ? ' sex-m' : post.sexCode === 'F' ? ' sex-f' : ' sex-u';
    return `<button class="thread-sibling-line${sexClass}" type="button" data-inflate-post="${post.id}" aria-label="${label}">
    <span class="thread-sibling-line__pulse" aria-hidden="true"></span>
    <time class="thread-sibling-line__time">${escapeHtml(dateTime)}</time>
    <span class="thread-sibling-line__preview">${escapeHtml(preview)}</span>
  </button>`;
}

function getDistantAncestorChain(post, loadedById) {
    const ancestors = [];
    const visited = new Set([String(post?.id || '')]);
    let current = post;

    while (current?.parentPostId != null) {
        const parentId = String(current.parentPostId);
        if (!parentId || visited.has(parentId)) break;
        const parent = loadedById.get(parentId);
        if (!parent) break;
        visited.add(parentId);
        ancestors.push(parent);
        current = parent;
    }

    return ancestors.reverse();
}

function renderDistantAncestorLine(post) {
    const dateTime = post?.createdAt ? new Date(post.createdAt).toLocaleString() : '';
    const preview = post?.isDeleted ? 'Este murmúrio foi removido.' : String(post?.text || '').trim();
    const author = String(post?.author || '').trim();
    const href = author
        ? `/perfil/${encodeURIComponent(author)}?murmurio=${encodeURIComponent(post.id)}`
        : '#';
    const disabled = !author ? ' is-disabled' : '';
    return `<a class="thread-ancestor-line${disabled}" href="${href}"${!author ? ' aria-disabled="true" tabindex="-1"' : ''}>
    <time class="thread-ancestor-line__time">${escapeHtml(dateTime)}</time>
    <span class="thread-ancestor-line__preview">${escapeHtml(preview)}</span>
  </a>`;
}

function renderSpecificThread(parentPost, rootPost, allPosts, siblingStubs = []) {
    const rootId = String(rootPost.id);
    const state = getSpecificThreadState(rootId);
    const safePosts = Array.isArray(allPosts) ? allPosts : [];
    const safeSiblingStubs = Array.isArray(siblingStubs) ? siblingStubs : [];
    const loadedById = new Map(safePosts.map(post => [String(post.id), post]));
    const byParent = groupPostsByParent(safePosts);
    const siblings = [...safeSiblingStubs, rootPost]
        .map(post => loadedById.get(String(post.id)) || post)
        .sort(compareRepliesByOldest);
    const selectedIndex = siblings.findIndex(post => sameId(post.id, rootId));
    const beforeAll = selectedIndex > 0 ? siblings.slice(0, selectedIndex) : [];
    const afterAll = selectedIndex >= 0 ? siblings.slice(selectedIndex + 1) : [];
    const beforeVisible = beforeAll.slice(Math.max(0, beforeAll.length - (SPECIFIC_SIBLING_WINDOW + state.beforeExtra)));
    const afterVisible = afterAll.slice(0, SPECIFIC_SIBLING_WINDOW + state.afterExtra);
    const hiddenBeforeCount = Math.max(0, beforeAll.length - beforeVisible.length);
    const hiddenAfterCount = Math.max(0, afterAll.length - afterVisible.length);

    const renderSpecificItem = (post, direction = '') => {
        const postId = String(post?.id || '');
        const loadedPost = loadedById.get(postId);
        const isExpanded = Boolean(postId && state.expandedIds.has(postId) && loadedPost);
        if (!isExpanded) {
            if (postId && state.expandedIds.has(postId) && !loadedPost) {
                state.expandedIds.delete(postId);
                state.animatePostIds.delete(postId);
            }
            return renderSiblingVacuumLine(post, direction);
        }
        const animationClass = state.animatePostIds.has(postId) ? ' murmur-card-arriving' : '';
        return `<div class="thread-expanded-card${animationClass}" data-expanded-post="${postId}">${renderPost(loadedPost, byParent, new Set([String(parentPost.id)]), {
            repliesMode: 'recursive',
            depth: 2,
            maxDepth: 5,
            contextParentId: String(parentPost.id),
            collapsibleHeader: true,
        })}</div>`;
    };

    const beforeHtml = beforeVisible.map(post => renderSpecificItem(post, 'before')).join('');
    const afterHtml = afterVisible.map(post => renderSpecificItem(post, 'after')).join('');
    const loadBefore = hiddenBeforeCount > 0
        ? `<button class="thread-sibling-load thread-sibling-load--before" type="button" data-thread-load-direction="before" data-thread-root-id="${rootId}">Mostrar mais 5 acima · restam ${hiddenBeforeCount}</button>`
        : '';
    const loadAfter = hiddenAfterCount > 0
        ? `<button class="thread-sibling-load thread-sibling-load--after" type="button" data-thread-load-direction="after" data-thread-root-id="${rootId}">Mostrar mais 5 abaixo · restam ${hiddenAfterCount}</button>`
        : '';
    const selectedCard = renderPost(rootPost, byParent, new Set([String(parentPost.id)]), {
        repliesMode: 'recursive',
        depth: 2,
        maxDepth: 5,
        contextParentId: String(parentPost.id),
    });
    const parentShell = renderPost(parentPost, new Map([[String(parentPost.id), []]]), new Set(), {repliesMode: 'none', contextParentId: String(parentPost.id)});
    const specificReplies = `${loadBefore}<div class="thread-sibling-stack thread-sibling-stack--before">${beforeHtml}</div><div class="thread-selected-card">${selectedCard}</div><div class="thread-sibling-stack thread-sibling-stack--after">${afterHtml}</div>${loadAfter}`;
    const fullParentCard = parentShell.replace('</article>', `<div class="replies replies-recursive replies-specific-thread" data-specific-thread-root="${rootId}">${specificReplies}</div></article>`);
    const distantAncestors = getDistantAncestorChain(parentPost, loadedById);
    const ancestorContext = distantAncestors.length
        ? `<div class="thread-ancestor-context" aria-label="Murmúrios anteriores">${distantAncestors.map(renderDistantAncestorLine).join('')}</div>`
        : '';
    return `${ancestorContext}${fullParentCard}`;
}

function selectVisibleReplies(replies, limit = 3) {
    const newest = [...replies].sort(compareRepliesByNewest);
    if (newest.length <= limit) return newest;

    const ownReply = currentUser
        ? newest.find(reply => sameId(reply.userId, currentUser.id))
        : null;
    if (!ownReply) return newest.slice(0, limit);

    const otherNewest = newest
        .filter(reply => !sameId(reply.id, ownReply.id))
        .slice(0, Math.max(0, limit - 1));
    return [ownReply, ...otherNewest].sort(compareRepliesByNewest);
}

function renderReplyPreview(reply) {
    const deleteControls = sameId(currentUser?.id, reply.userId)
        ? `<div class="reply-inline-delete-zone" data-reply-delete-zone>
        <div class="reply-inline-delete-confirm" data-reply-delete-confirm hidden>
          <button type="button" data-confirm-delete-reply="${reply.id}">Apagar</button>
          <button type="button" data-cancel-delete-reply>Cancelar</button>
        </div>
        <button class="reply-inline-delete-button" type="button" data-toggle-delete-reply="${reply.id}" aria-label="Apagar resposta" title="Apagar resposta">×</button>
      </div>`
        : '';
    const replyProfileUrl = `/perfil/${encodeURIComponent(reply.author)}?murmurio=${encodeURIComponent(reply.id)}`;
    return `<li class="reply-preview-item${sameId(currentUser?.id, reply.userId) ? ' is-own-reply' : ''}" data-reply-preview-id="${reply.id}">
    <a class="reply-preview-content" href="${replyProfileUrl}" aria-label="Abrir esta resposta no perfil de @${escapeHtml(reply.author)}">
      <strong>@${escapeHtml(reply.author)}</strong>
      <span>${escapeHtml(reply.text)}</span>
    </a>
    ${deleteControls}
  </li>`;
}

function renderPost(post, childrenByParent = new Map(), ancestry = new Set(), options = {}) {
    const {
        repliesMode = 'none',
        depth = 1,
        maxDepth = 5,
        contextParentId = null,
        collapsibleHeader = false,
    } = options;
    const score = post.positive - post.negative;
    const sexClass = post.sexCode === 'M' ? 'sex-m' : post.sexCode === 'F' ? 'sex-f' : 'sex-u';
    const postKey = String(post.id);
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(postKey);
    const replies = (childrenByParent.get(postKey) || [])
        .filter(reply => !nextAncestry.has(String(reply.id)))
        .sort(compareRepliesByNewest);

    let nestedReplies = '';
    if (repliesMode === 'compact' && replies.length) {
        const visibleReplies = selectVisibleReplies(replies);
        nestedReplies = `<div class="replies replies-compact" data-replies-for="${post.id}"><ul class="reply-preview-list">${visibleReplies.map(reply => renderReplyPreview(reply, post)).join('')}</ul></div>`;
    }
    if (repliesMode === 'recursive' && replies.length && depth < maxDepth) {
        nestedReplies = `<div class="replies replies-recursive" data-replies-for="${post.id}">${replies.map(reply => renderPost(reply, childrenByParent, nextAncestry, {
            repliesMode: 'recursive',
            depth: depth + 1,
            maxDepth,
            contextParentId,
        })).join('')}</div>`;
    }

    const terminalProfile = repliesMode === 'recursive' && depth >= maxDepth;
    const terminalAttribute = terminalProfile
        ? ` data-terminal-profile="/perfil/${encodeURIComponent(post.author)}?murmurio=${encodeURIComponent(post.id)}"`
        : '';
    const terminalClass = terminalProfile ? ' murmur-terminal-level' : '';
    const contextParentClass = sameId(post.id, contextParentId) ? ' murmur-context-parent' : '';

    if (post.isDeleted) {
        return `<article id="murmurio-${post.id}" class="panel murmur-card lazy-reveal reply-history-parent-card--deleted${contextParentClass}" data-post-id="${post.id}" data-user-id="${post.userId || 0}">
      <div class="murmur-head">
        <span class="avatar murmur-profile-link reply-history-disabled-avatar" aria-hidden="true">××</span>
        <div class="murmur-author"><strong>Murmúrio removido</strong><span>${post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</span></div>
      </div>
      <div class="reply-history-deleted-copy"><p class="murmur-text">Este murmúrio foi removido.</p></div>
      ${nestedReplies}
    </article>`;
    }

    return `<article id="murmurio-${post.id}" class="panel murmur-card lazy-reveal ${sexClass}${post.parentPostId ? ' murmur-reply-card' : ''}${terminalClass}${contextParentClass}${collapsibleHeader ? ' murmur-card-collapsible' : ''}" data-post-id="${post.id}"${collapsibleHeader ? ` data-collapse-expanded-post="${post.id}"` : ''}${terminalAttribute}>
    <div class="murmur-head">
      <a class="avatar murmur-profile-link" href="/perfil/${encodeURIComponent(post.author)}" aria-label="Abrir perfil de @${escapeHtml(post.author)}">${post.avatarUrl ? `<img class="lazy-media" src="${escapeHtml(post.avatarUrl)}" alt="Foto de @${escapeHtml(post.author)}" loading="lazy" decoding="async">` : escapeHtml(userInitials(post.author))}</a>
      <div class="murmur-author"><a href="/perfil/${encodeURIComponent(post.author)}"><strong>@${escapeHtml(post.author)}</strong></a><span>${new Date(post.createdAt).toLocaleString()}</span></div>
      ${renderPostHeaderActions(post)}
    </div>
    <a class="murmur-text-link" href="/perfil/${encodeURIComponent(post.author)}?murmurio=${encodeURIComponent(post.id)}" aria-label="Abrir esta mensagem no perfil de @${escapeHtml(post.author)}"><p class="murmur-text">${escapeHtml(post.text)}</p></a>
    <div class="score-line">
      <span class="score ${score < 0 ? 'negative' : ''}">${score}</span>
      <div class="murmur-actions">
        <button class="action-button action-button--echo ${post.myVote === 1 ? 'active is-led-active' : ''}" data-vote="1" title="Ecoar" aria-label="Ecoar este murmúrio" aria-pressed="${post.myVote === 1 ? 'true' : 'false'}">${ICONS.echo}<span>${post.positive}</span></button>
        <button class="action-button action-button--ignore ${post.myVote === -1 ? 'active is-led-active' : ''}" data-vote="-1" title="Ignorar" aria-label="Ignorar este murmúrio" aria-pressed="${post.myVote === -1 ? 'true' : 'false'}">${ICONS.ignore}<span>${post.negative}</span></button>
        <button class="action-button" data-reply title="Responder" aria-label="Responder a este murmúrio">${ICONS.reply}<span>${post.replyCount || 0}</span></button>
        <button class="action-button" data-share title="Compartilhar link" aria-label="Compartilhar link deste murmúrio">${ICONS.share}<span>${post.shares}</span></button>
      </div>
    </div>
    <form class="reply-box" data-reply-form>
      <input maxlength="${TEXT_LIMIT}" placeholder="Responder sem fazer barulho…" required>
      <button class="reply-send-button" type="submit" title="Enviar resposta" aria-label="Enviar resposta">${ICONS.send}</button>
    </form>
    ${nestedReplies}
  </article>`;
}

function renderReplyHistoryGroup(group) {
    const threadPosts = Array.isArray(group?.posts) ? group.posts : [];
    if (!threadPosts.length) return '';

    const rootId = String(group?.rootPostId || '');
    const byId = new Map(threadPosts.map(post => [String(post.id), post]));
    const root = byId.get(rootId) || getRootPosts(threadPosts)[0] || null;
    if (!root) return '';

    const childrenByParent = groupPostsByParent(threadPosts);
    return `<div class="reply-history-group" data-reply-history-root="${escapeHtml(rootId)}">${renderPost(root, childrenByParent, new Set(), {
        repliesMode: 'recursive',
        depth: 1,
        maxDepth: 5,
        contextParentId: String(root.id),
    })}</div>`;
}

function readReplyHistoryGroups(dataNode = $('[data-reply-history-data]')) {
    if (!dataNode) return [];
    return JSON.parse(dataNode.textContent || '[]');
}

function renderReplyHistory() {
    const feed = $('[data-reply-history]');
    const dataNode = $('[data-reply-history-data]');
    if (!feed || !dataNode) return;

    try {
        feed.innerHTML = readReplyHistoryGroups(dataNode).map(renderReplyHistoryGroup).join('');
    } catch (error) {
        feed.innerHTML = `<p class="empty-state">Erro ao carregar respostas: ${escapeHtml(error?.message || String(error))}</p>`;
        return;
    }

    setupLazyVisuals(feed);
}

async function refreshReplyHistoryPage(affectedPostId = '') {
    const feed = $('[data-reply-history]');
    const dataNode = $('[data-reply-history-data]');
    if (!feed || !dataNode) return false;

    const escapedPostId = affectedPostId ? CSS.escape(String(affectedPostId)) : '';
    const affectedCard = escapedPostId ? feed.querySelector(`[data-post-id="${escapedPostId}"]`) : null;
    const currentGroup = affectedCard?.closest('[data-reply-history-root]') || null;
    const currentRootId = currentGroup?.dataset.replyHistoryRoot || '';
    const anchor = currentGroup || affectedCard;
    const anchorTop = anchor?.getBoundingClientRect().top ?? null;

    const response = await fetch(`${location.href}${location.href.includes('?') ? '&' : '?'}_partial=${Date.now()}`, {
        headers: {'X-Requested-With': 'reply-history-partial'},
        cache: 'no-store',
    });
    if (!response.ok) throw new Error('Erro ao atualizar as respostas.');

    const documentCopy = new DOMParser().parseFromString(await response.text(), 'text/html');
    const nextDataNode = documentCopy.querySelector('[data-reply-history-data]');
    if (!nextDataNode) throw new Error('Resposta atualizada inválida.');

    const nextGroups = readReplyHistoryGroups(nextDataNode);
    dataNode.textContent = nextDataNode.textContent || '[]';

    if (currentRootId) {
        const nextGroup = nextGroups.find(group => String(group?.rootPostId || '') === currentRootId);
        if (nextGroup) currentGroup.outerHTML = renderReplyHistoryGroup(nextGroup);
        else currentGroup.remove();
    } else {
        feed.innerHTML = nextGroups.map(renderReplyHistoryGroup).join('');
    }

    if (!feed.children.length) {
        feed.innerHTML = '<p class="empty-state">Ainda não há respostas publicadas.</p>';
    }

    setupLazyVisuals(feed);
    if (anchorTop != null && currentRootId) {
        const nextAnchor = feed.querySelector(`[data-reply-history-root="${CSS.escape(currentRootId)}"]`);
        if (nextAnchor) window.scrollBy(0, nextAnchor.getBoundingClientRect().top - anchorTop);
    }
    return true;
}

function collectPostSubtree(items, rootPostId) {
    const rootId = String(rootPostId || '');
    if (!rootId) return items;
    const byParent = groupPostsByParent(items);
    const byId = new Map(items.map(post => [String(post.id), post]));
    const root = byId.get(rootId);
    if (!root) return [];
    const selected = [];
    const visited = new Set();
    const visit = post => {
        const key = String(post.id);
        if (visited.has(key)) return;
        visited.add(key);
        selected.push(post);
        (byParent.get(key) || []).forEach(visit);
    };
    if (root.parentPostId != null) {
        const parent = byId.get(String(root.parentPostId));
        if (parent) {
            visited.add(String(parent.id));
            selected.push(parent);
        }
    }
    visit(root);
    return selected;
}

/*function getSpecificThreadContext(posts, rootPostId) {
    const rootId = String(rootPostId || '');
    if (!rootId) return {contextRootId: '', contextParentId: ''};
    const root = posts.find(post => sameId(post.id, rootId));
    if (!root) return {contextRootId: '', contextParentId: ''};
    const parent = root.parentPostId == null
        ? null
        : posts.find(post => sameId(post.id, root.parentPostId));
    return {
        contextRootId: parent ? String(parent.id) : String(root.id),
        contextParentId: parent ? String(parent.id) : '',
    };
}*/

function renderLane(feed, posts, repliesMode = 'none', rootPostId = '') {
    if (!feed) return;
    if (rootPostId) {
        const byId = new Map(posts.map(post => [String(post.id), post]));
        const root = byId.get(String(rootPostId));
        if (!root) {
            feed.innerHTML = '<p class="empty-state">Murmúrio não encontrado.</p>';
            return;
        }
        const parent = root.parentPostId == null ? null : byId.get(String(root.parentPostId));
        if (parent) {
            feed.innerHTML = renderSpecificThread(parent, root, posts, specificSiblingStubs);
            syncSpecificHoverControl();
            return;
        }
        const visiblePosts = collectPostSubtree(posts, rootPostId);
        const childrenByParent = groupPostsByParent(visiblePosts);
        const roots = visiblePosts.filter(post => sameId(post.id, rootPostId));
        feed.innerHTML = roots.length
            ? roots.map(post => renderPost(post, childrenByParent, new Set(), {repliesMode, contextParentId: ''})).join('')
            : '<p class="empty-state">Murmúrio não encontrado.</p>';
        syncSpecificHoverControl();
        return;
    }
    const childrenByParent = groupPostsByParent(posts);
    const roots = getRootPosts(posts);
    feed.innerHTML = roots.length
        ? roots.map(post => renderPost(post, childrenByParent, new Set(), {repliesMode, contextParentId: ''})).join('')
        : '<p class="empty-state">Murmúrio não encontrado.</p>';
    syncSpecificHoverControl();
}


