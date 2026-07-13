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
                const parentId = String(card.dataset.postId || '');
                const result = await api(`/api/posts/${parentId}/reply`, {method: 'POST', body: JSON.stringify({text, private: isPrivate})});
                announceFeedChanged();
                form.reset();
                form.classList.remove('open');
                const replyButton = card.querySelector('[data-reply]');
                const replyCount = replyButton?.querySelector('span');
                if (replyCount) replyCount.textContent = String(Number(replyCount.textContent || 0) + 1);
                replyButton?.classList.add('active', 'is-led-active');
                replyButton?.setAttribute('aria-pressed', 'true');
                await revealPublishedReply(result.id, parentId, text);
                toast('Resposta publicada.');
            } catch (error) {
                toast(error.message);
            }
        }
    });
}

