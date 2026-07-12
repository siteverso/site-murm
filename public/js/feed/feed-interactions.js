function bindFeedView() {
    const switcher = $('[data-feed-view-switch]');
    const board = $('[data-feed-board]');
    if (!switcher || !board) return;

    const panels = $$('[data-feed-view-panel]', board);
    const buttons = $$('[data-feed-view]', switcher);
    const validViews = new Set(['split', 'relevance', 'users', 'grid', 'deck', 'list']);

    const applyView = view => {
        const mode = validViews.has(view) ? view : 'split';
        board.dataset.feedViewMode = mode;
        board.closest('.network-board-page')?.classList.toggle('deck-stage-active', mode === 'deck');
        buttons.forEach(button => {
            const active = button.dataset.feedView === mode;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        panels.forEach(panel => {
            panel.hidden = panel.dataset.feedViewPanel !== mode;
        });
        if (mode === 'split' || mode === 'relevance' || mode === 'users') requestAnimationFrame(setupFeedColumnAutoload);
        try {
            localStorage.setItem('murmur_feed_view', mode);
        } catch {
        }
    };

    const initial = (() => {
        try {
            return localStorage.getItem('murmur_feed_view') || 'split';
        } catch {
            return 'split';
        }
    })();
    applyView(initial);

    switcher.addEventListener('click', event => {
        const button = event.target.closest('[data-feed-view]');
        if (!button) return;
        applyView(button.dataset.feedView);
    });
}

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

function openReplyForm(card, {toggle = false} = {}) {
    const form = card?.querySelector('[data-reply-form]');
    if (!form) return;

    if (toggle) form.classList.toggle('open');
    else form.classList.add('open');

    if (form.classList.contains('open')) focusReplyInput(form);
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

function closeInlineEditor(card) {
    const editor = card?.querySelector('[data-inline-edit-form]');
    const textLink = card?.querySelector(':scope > .murmur-text-link');
    editor?.remove();
    if (textLink) textLink.hidden = false;
    card?.classList.remove('is-editing');
}

function openInlineEditor(card) {
    if (!card || card.querySelector('[data-inline-edit-form]')) return;
    document.querySelectorAll('[data-inline-edit-form]').forEach(editor => closeInlineEditor(editor.closest('[data-post-id]')));
    const textLink = card.querySelector(':scope > .murmur-text-link');
    const textNode = textLink?.querySelector('.murmur-text');
    if (!textLink || !textNode) return;

    const form = document.createElement('form');
    form.className = 'murmur-inline-edit';
    form.dataset.inlineEditForm = '';
    form.innerHTML = `<textarea maxlength="${TEXT_LIMIT}" required aria-label="Texto do murmúrio"></textarea><div class="murmur-inline-edit-actions"><button class="button" type="button" data-cancel-edit-post>Cancelar</button><button class="button primary" type="submit">Salvar</button></div>`;
    const textarea = form.querySelector('textarea');
    textarea.value = textNode.textContent || '';
    textLink.hidden = true;
    textLink.insertAdjacentElement('afterend', form);
    card.classList.add('is-editing');
    textarea.focus({preventScroll: true});
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function applyOptimisticVoteState(card, selectedButton) {
    const selectedValue = Number(selectedButton?.dataset.vote || 0);
    const wasActive = selectedButton?.getAttribute('aria-pressed') === 'true';
    card?.querySelectorAll('[data-vote]').forEach(button => {
        const active = !wasActive && Number(button.dataset.vote) === selectedValue;
        button.classList.toggle('active', active);
        button.classList.toggle('is-led-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function bindFeed() {
    document.addEventListener('click', async event => {
        const target = event.target.closest('button');
        if (!target) {
            if (!event.target.closest('[data-reply-delete-zone]')) closeReplyDeleteConfirm();
            return;
        }
        const card = target.closest('[data-post-id]');
        try {
            if (target.matches('[data-edit-post]')) openInlineEditor(card);
            if (target.matches('[data-cancel-edit-post]')) closeInlineEditor(card);
            if (target.matches('[data-reply]')) openReplyForm(card, {toggle: true});
            if (target.matches('[data-vote]')) {
                const postId = card.dataset.postId;
                card.classList.add('actions-pinned');
                applyOptimisticVoteState(card, target);
                await api(`/api/posts/${postId}/vote`, {
                    method: 'POST',
                    body: JSON.stringify({value: Number(target.dataset.vote)}),
                });
                if (!(await refreshReplyHistoryPage(postId))) {
                    await loadFeed();
                    pinCardActions(postId);
                }
            }
            if (target.matches('[data-share]')) {
                await api(`/api/posts/${card.dataset.postId}/share`, {method: 'POST'});
                await navigator.clipboard?.writeText(`${location.origin}/#murmurio-${card.dataset.postId}`);
                toast('Link copiado.');
                if (!(await refreshReplyHistoryPage(card.dataset.postId))) await loadFeed();
            }
            if (target.matches('[data-toggle-delete-reply]')) {
                const confirm = target.parentElement?.querySelector('[data-reply-delete-confirm]');
                if (confirm) {
                    const willShow = confirm.hidden;
                    closeReplyDeleteConfirm(willShow ? target : null);
                    confirm.hidden = !willShow;
                }
            }
            if (target.matches('[data-cancel-delete-reply]')) {
                target.closest('[data-reply-delete-confirm]').hidden = true;
            }
            if (target.matches('[data-confirm-delete-reply]')) {
                target.disabled = true;
                await api(`/api/replies/${target.dataset.confirmDeleteReply}`, {method: 'DELETE'});
                announceFeedChanged();
                if (!(await refreshReplyHistoryPage(target.dataset.confirmDeleteReply))) await loadFeed(true);
                toast('Murmúrio apagado.');
            }
            if (target.matches('[data-delete-reply]')) {
                const replyId = target.dataset.deleteReply;
                modal(`<h2>Apagar resposta?</h2><p class="modal-subtitle">A resposta será removida. Se houver respostas abaixo dela, o lugar do card será preservado como murmúrio removido para não quebrar a conversa.</p><div class="modal-actions murmur-delete-confirm-actions"><button class="button" type="button" data-modal-close>Cancelar</button><button class="button primary" type="button" data-confirm-delete-reply-card="${replyId}">Apagar</button></div>`, 'confirm-delete-modal');
            }
            if (target.matches('[data-confirm-delete-reply-card]')) {
                target.disabled = true;
                const replyId = target.dataset.confirmDeleteReplyCard;
                const deletedCard = document.querySelector(`[data-post-id="${CSS.escape(String(replyId))}"]`);
                // noinspection JSUnresolvedReference
                deletedCard?.classList.add('is-deleting');
                try {
                    await api(`/api/replies/${replyId}`, {method: 'DELETE'});
                    announceFeedChanged();
                    closeModal();
                    if (!(await refreshReplyHistoryPage(replyId))) await loadFeed(true);
                    toast('Resposta apagada.');
                } catch (error) {
                    // noinspection JSUnresolvedReference
                    deletedCard?.classList.remove('is-deleting');
                    target.disabled = false;
                    toast(error instanceof Error ? error.message : 'Não foi possível apagar a resposta.');
                    return;
                }
            }
            if (target.matches('[data-delete-post]')) {
                const postId = target.dataset.deletePost;
                modal(`<h2>Apagar murmúrio?</h2><p class="modal-subtitle">O murmúrio inteiro e todas as respostas deixarão de aparecer.</p><div class="modal-actions murmur-delete-confirm-actions"><button class="button" type="button" data-modal-close>Cancelar</button><button class="button primary" type="button" data-confirm-delete-post="${postId}">Apagar</button></div>`, 'confirm-delete-modal');
            }
            if (target.matches('[data-confirm-delete-post]')) {
                target.disabled = true;
                await api(`/api/posts/${target.dataset.confirmDeletePost}`, {method: 'DELETE'});
                announceFeedChanged();
                closeModal();
                if (!(await refreshReplyHistoryPage(target.dataset.confirmDeletePost))) await loadFeed(true);
                toast('Murmúrio apagado.');
            }
            if (target.matches('[data-feed-more]')) {
                expandSplitFeed(target.dataset.feedMore);
            }
            if (target.matches('[data-thread-load-direction]')) {
                const profileFeed = $('[data-profile-feed]');
                const rootId = profileFeed?.dataset.profilePostId || target.dataset.threadRootId || '';
                if (rootId) {
                    const state = getSpecificThreadState(rootId);
                    if (target.dataset.threadLoadDirection === 'before') state.beforeExtra += SPECIFIC_SIBLING_WINDOW;
                    if (target.dataset.threadLoadDirection === 'after') state.afterExtra += SPECIFIC_SIBLING_WINDOW;
                    renderLane(profileFeed, posts, 'recursive', rootId);
                }
            }
            if (target.matches('[data-expand-on-hover]')) {
                applySpecificHoverPreference(!specificHoverExpandEnabled);
            }
            if (target.matches('[data-inflate-post]')) {
                const profileFeed = $('[data-profile-feed]');
                const rootId = profileFeed?.dataset.profilePostId || '';
                if (rootId) await expandOnlySpecificPost(rootId, String(target.dataset.inflatePost), target);
            }
            if (target.matches('[data-expand-profile-reply]')) {
                const profileFeed = target.closest('[data-profile-feed]');
                const replyId = String(target.dataset.expandProfileReply || '');
                if (profileFeed && replyId && !profileFeed.dataset.profilePostId) {
                    const sourceHeight = Math.max(32, Math.round(target.closest('[data-reply-preview-id]')?.getBoundingClientRect().height || 36));
                    profileCompactExpandedIds.add(replyId);
                    renderLane(profileFeed, posts, 'compact');
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    const expandedCard = profileFeed.querySelector(`[data-profile-expanded-reply="${CSS.escape(replyId)}"]`);
                    expandedCard?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
                    await animateInflatedCard(expandedCard, sourceHeight);
                }
            }
            const directButton = target.closest('[data-direct-user]');
            if (directButton) openDirectComposer(Number(directButton.dataset.directUser), directButton.dataset.directName);
        } catch (error) {
            toast(error.message);
        }
    });

    document.addEventListener('mouseover', event => {
        const line = event.target.closest?.('[data-inflate-post]');
        if (!line || event.relatedTarget?.closest?.('[data-inflate-post]') === line) return;
        scheduleSpecificHoverExpansion(line);
    });

    document.addEventListener('mouseout', event => {
        const line = event.target.closest?.('[data-inflate-post]');
        if (!line || event.relatedTarget?.closest?.('[data-inflate-post]') === line) return;
        if (specificHoverTarget === line) cancelSpecificHoverExpansion();
    });

    applySpecificHoverPreference(readSpecificHoverPreference());

    document.addEventListener('click', async event => {
        const profileExpandedReply = event.target.closest?.('[data-profile-expanded-reply]');
        if (profileExpandedReply) {
            const hotArea = event.target.closest('.murmur-profile-link, .murmur-author a, .murmur-text-link, .murmur-head-actions, .murmur-actions, button, input, textarea, form, [data-reply-delete-zone]');
            if (hotArea) return;
            const profileFeed = profileExpandedReply.closest('[data-profile-feed]');
            const replyId = String(profileExpandedReply.dataset.profileExpandedReply || '');
            if (profileFeed && replyId) {
                profileCompactExpandedIds.delete(replyId);
                renderLane(profileFeed, posts, 'compact');
            }
            return;
        }
        const collapsibleCard = event.target.closest?.('[data-collapse-expanded-post]');
        if (collapsibleCard) {
            const hotArea = event.target.closest('.murmur-profile-link, .murmur-author a, .murmur-text-link, .murmur-head-actions, .murmur-actions, button, input, textarea, form, [data-reply-delete-zone]');
            if (hotArea) return;
            const profileFeed = $('[data-profile-feed]');
            const rootId = profileFeed?.dataset.profilePostId || '';
            const postId = collapsibleCard.dataset.collapseExpandedPost || '';
            if (rootId && postId) await collapseExpandedSpecificPost(profileFeed, rootId, postId, collapsibleCard);
            return;
        }
        if (event.target.closest('button, a, input, textarea, form, [data-reply-delete-zone]')) return;
        const terminalCard = event.target.closest('[data-terminal-profile]');
        if (terminalCard?.dataset.terminalProfile) window.location.assign(terminalCard.dataset.terminalProfile);
    });

    document.addEventListener('dblclick', event => {
        if (event.target.closest('button, a, input, textarea, form')) return;
        const card = event.target.closest('[data-post-id]');
        if (!card) return;

        const replyForm = card.querySelector('[data-reply-form]');
        if (replyForm?.classList.contains('open')) {
            openPostAuthorProfile(card);
            return;
        }

        openReplyForm(card);
    });

    document.addEventListener('submit', async event => {
        const form = event.target;
        if (form.matches('[data-inline-edit-form]')) {
            event.preventDefault();
            const card = form.closest('[data-post-id]');
            const textarea = form.querySelector('textarea');
            const text = textarea.value.trim();
            if (!text) {
                toast('O murmúrio não pode ficar vazio.');
                textarea.focus();
                return;
            }
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            try {
                await api(`/api/posts/${card.dataset.postId}`, {method: 'PUT', body: JSON.stringify({text})});
                announceFeedChanged();
                if (!(await refreshReplyHistoryPage(card.dataset.postId))) await loadFeed(true);
                toast('Murmúrio atualizado.');
            } catch (error) {
                submitButton.disabled = false;
                toast(error.message);
            }
            return;
        }
        if (form.matches('[data-composer], [data-floating-composer]')) {
            event.preventDefault();
            const text = form.querySelector('textarea').value.trim();
            try {
                await api('/api/posts', {method: 'POST', body: JSON.stringify({text})});
                announceFeedChanged();
                form.reset();
                closeModal();
                await loadFeed(true);
                toast('Murmúrio publicado.');
            } catch (error) {
                toast(error.message);
            }
        }
        if (form.matches('[data-reply-form]')) {
            event.preventDefault();
            const card = form.closest('[data-post-id]');
            const text = form.querySelector('input:not([type="checkbox"])').value.trim();
            const isPrivate = Boolean(form.querySelector('input[name="private"]')?.checked);
            try {
                await api(`/api/posts/${card.dataset.postId}/reply`, {method: 'POST', body: JSON.stringify({text, private: isPrivate})});
                announceFeedChanged();
                if (!(await refreshReplyHistoryPage(card.dataset.postId))) await loadFeed(true);
            } catch (error) {
                toast(error.message);
            }
        }
    });
}

