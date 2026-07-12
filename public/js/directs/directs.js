// noinspection JSUnresolvedReference

async function pollDirects() {
    if (!currentUser) return;
    try {
        const data = await api('/api/directs/unread');
        const badge = $('[data-direct-badge]');
        if (badge) {
            badge.textContent = data.count || '';
            badge.hidden = !data.count;
        }
        if (data.latestId && Number(sessionStorage.lastDirectId || 0) < data.latestId) {
            if (sessionStorage.lastDirectId) {
                document.body.classList.add('letter-arriving');
                setTimeout(() => document.body.classList.remove('letter-arriving'), 1800);
                toast('Um novo bilhete chegou.');
            }
            sessionStorage.lastDirectId = data.latestId;
        }
    } catch {
    }
}

function bindDirectsPage() {
    const root = $('[data-directs-page]');
    if (!root) return;

    const list = $('[data-direct-list]', root);
    const messages = $('[data-direct-messages]', root);
    const messageList = $('[data-direct-message-list]', root);
    const messagesTop = $('[data-direct-messages-top]', root);
    const loadMoreButton = $('[data-load-more-direct]', root);
    const empty = $('[data-direct-empty]', root);
    const stage = $('[data-direct-stage]', root);
    const form = $('[data-direct-form]', root);
    const textarea = $('textarea[name="contents"]', form);
    const locale = window.__MURMUR_LOCALE__ === 'en' ? 'en' : 'pt-BR';
    const pendingDeletes = new Map();
    const getUrlUserId = () => {
        const value = new URLSearchParams(window.location.search).get('userId');
        return value && /^\d+$/.test(value) ? value : '';
    };

    const setUrlUserId = (userId, replace = false) => {
        const url = new URL(window.location.href);
        if (userId) url.searchParams.set('userId', String(userId));
        else url.searchParams.delete('userId');
        window.history[replace ? 'replaceState' : 'pushState']({}, '', `${url.pathname}${url.search}${url.hash}`);
    };

    let activeUserId = getUrlUserId();
    let requestToken = 0;
    let oldestMessageId = 0;
    let hasMoreMessages = false;
    let loadingOlderMessages = false;
    let refreshingDirects = false;
    let directsRefreshTimer = null;

    const labels = locale === 'en'
        ? {remove: 'Delete', edit: 'Edit', save: 'Save', confirm: 'Confirm', cancel: 'Cancel', undo: 'Undo', deleted: 'Message deleted.', loadMore: 'Load 20 earlier', loadingMore: 'Loading…', edited: 'edited', pending: 'sending…'}
        : {remove: 'Excluir', edit: 'Editar', save: 'Salvar', confirm: 'Confirmar', cancel: 'Cancelar', undo: 'Desfazer', deleted: 'Bilhete excluído.', loadMore: 'Carregar 20 anteriores', loadingMore: 'Carregando…', edited: 'editado', pending: 'enviando…'};

    const sexClass = value => value === 'M' ? 'sex-m' : value === 'F' ? 'sex-f' : '';

    const renderConversations = conversations => {
        list.innerHTML = (conversations || []).map(item => `
      <button class="direct-thread ${String(item.otherUserId) === String(activeUserId) ? 'active' : ''} ${hasUnreadMessages(item.unreadCount) ? 'has-unread' : ''} ${sexClass(item.sexCode)}" data-open-direct="${item.otherUserId}" type="button">
        <span class="direct-thread-head"><strong>@${escapeHtml(item.username)}</strong><time>${formatDateTime(item.lastAt)}</time></span>
        <span class="direct-thread-preview">${escapeHtml(item.lastMessage)}</span>
        <small>${item.unreadCount ? `${item.unreadCount} novo(s)` : ''}</small>
      </button>
    `).join('');
    };

    const messageHtml = message => {
        const own = sameId(message.senderId, currentUser.id);
        const pending = Boolean(message.pending);
        const senderSexCode = message.senderSexCode || (own ? currentUser?.sexCode : '');
        const pendingAttribute = pending ? ' data-direct-pending="true"' : '';
        return `
      <article class="direct-note ${own ? 'sent' : 'received'} ${pending ? 'is-pending' : ''} ${sexClass(senderSexCode)}" data-direct-message="${message.id}" data-direct-sender-id="${message.senderId}"${pendingAttribute}>
        <p data-direct-contents>${escapeHtml(message.contents)}</p>
        <form class="direct-edit-form" data-direct-edit-form hidden>
          <textarea maxlength="${TEXT_LIMIT}" required>${escapeHtml(message.contents)}</textarea>
          <button type="submit">${labels.save}</button>
          <button type="button" data-cancel-edit>${labels.cancel}</button>
        </form>
        <div class="direct-note-footer">
          <time>${new Date(message.updatedAt || message.createdAt).toLocaleString()}${message.updatedAt > message.createdAt ? ` · ${labels.edited}` : ''}${pending ? ` · ${labels.pending}` : ''}</time>
          ${own && !pending ? `<div class="direct-delete-zone">
            <button class="direct-edit-button" type="button" data-edit-direct="${message.id}" aria-label="${labels.edit}" title="${labels.edit}">✎</button>
            <div class="direct-delete-confirm" data-delete-confirm hidden>
              <button type="button" data-confirm-delete="${message.id}">${labels.confirm}</button>
              <button type="button" data-cancel-delete>${labels.cancel}</button>
            </div>
            <button class="direct-delete-button" type="button" data-delete-direct="${message.id}" aria-label="${labels.remove}" title="${labels.remove}">×</button>
          </div>` : ''}
        </div>
      </article>`;
    };

    const syncOldestMessageId = () => {
        const first = messageList.querySelector('[data-direct-message]:not([hidden])');
        oldestMessageId = first ? Number(first.dataset.directMessage) : 0;
    };

    const applyDirectGrouping = () => {
        const notes = $$('[data-direct-message]', messageList).filter(note => !note.hidden);
        notes.forEach((note, index) => {
            const prev = notes[index - 1];
            const next = notes[index + 1];
            const senderId = String(note.dataset.directSenderId || '');
            const sameAsPrev = prev && String(prev.dataset.directSenderId || '') === senderId;
            const sameAsNext = next && String(next.dataset.directSenderId || '') === senderId;

            note.classList.remove('group-single', 'group-start', 'group-middle', 'group-end');
            if (sameAsPrev && sameAsNext) note.classList.add('group-middle');
            else if (sameAsPrev) note.classList.add('group-end');
            else if (sameAsNext) note.classList.add('group-start');
            else note.classList.add('group-single');
        });

        syncOldestMessageId();
    };

    const updateLoadMore = () => {
        messagesTop.hidden = !hasMoreMessages;
        loadMoreButton.textContent = loadingOlderMessages ? labels.loadingMore : labels.loadMore;
        loadMoreButton.disabled = loadingOlderMessages;
    };

    const renderMessages = (items, prepend = false) => {
        const html = (items || []).map(messageHtml).join('');
        if (prepend) messageList.insertAdjacentHTML('afterbegin', html);
        else messageList.innerHTML = html;
        applyDirectGrouping();
    };

    const load = async (otherUserId = activeUserId, updateUrl = false, replaceUrl = false) => {
        const token = ++requestToken;
        const url = otherUserId ? `/api/directs?otherUserId=${otherUserId}&limit=20` : '/api/directs';
        const data = await api(url);
        if (token !== requestToken) return;

        activeUserId = otherUserId ? String(otherUserId) : '';
        if (updateUrl) setUrlUserId(activeUserId, replaceUrl);
        renderConversations(data.conversations || []);

        if (activeUserId) {
            renderMessages(data.messages || []);
            hasMoreMessages = Boolean(data.hasMore);
            updateLoadMore();
            form.dataset.recipientId = activeUserId;
            empty.hidden = true;
            stage.hidden = false;
            requestAnimationFrame(() => {
                messages.scrollTop = messages.scrollHeight;
            });
        }
    };

    const refreshDirects = async () => {
        if (refreshingDirects || document.visibilityState !== 'visible') return;
        refreshingDirects = true;

        try {
            const requestedUserId = activeUserId;
            const renderedCount = $$('[data-direct-message]:not([data-direct-pending])', messageList).length;
            const refreshLimit = Math.max(20, renderedCount);
            const url = requestedUserId ? `/api/directs?otherUserId=${requestedUserId}&limit=${refreshLimit}` : '/api/directs';
            const data = await api(url);
            if (requestedUserId !== activeUserId) return;

            renderConversations(data.conversations || []);
            if (!requestedUserId) return;

            const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80;
            const existingNotes = $$('[data-direct-message]:not([data-direct-pending])', messageList);
            const existingIds = new Set(existingNotes.map(item => String(item.dataset.directMessage)));
            const refreshedMessages = data.messages || [];
            const refreshedIds = new Set(refreshedMessages.map(message => String(message.id)));

            // Reconcilia integralmente tudo que já está carregado na conversa.
            // Se o servidor não devolveu mais um ID, a mensagem foi excluída e
            // deve desaparecer também no outro navegador no próximo polling.
            existingNotes.forEach(note => {
                if (!refreshedIds.has(String(note.dataset.directMessage))) note.remove();
            });

            const newMessages = refreshedMessages.filter(message => !existingIds.has(String(message.id)));
            const newestExistingId = existingNotes.length
                ? Math.max(...existingNotes.map(note => Number(note.dataset.directMessage)))
                : 0;
            const hasActuallyNewMessage = newMessages.some(message => Number(message.id) > newestExistingId);

            newMessages.forEach(message => {
                const messageId = Number(message.id);
                const nextNote = $$('[data-direct-message]:not([data-direct-pending])', messageList)
                    .find(note => Number(note.dataset.directMessage) > messageId);
                const wrapper = document.createElement('div');
                wrapper.innerHTML = messageHtml(message).trim();
                const note = wrapper.firstElementChild;
                if (nextNote) messageList.insertBefore(note, nextNote);
                else messageList.appendChild(note);
            });

            applyDirectGrouping();

            if (hasActuallyNewMessage && nearBottom) {
                requestAnimationFrame(() => {
                    messages.scrollTop = messages.scrollHeight;
                });
            }

            hasMoreMessages = Boolean(data.hasMore);
            updateLoadMore();
        } catch {
            // A próxima atualização tenta novamente sem interromper o uso do chat.
        } finally {
            refreshingDirects = false;
        }
    };

    const startDirectsPolling = () => {

        clearInterval(directsRefreshTimer);
        directsRefreshTimer = setInterval(() => {
            void refreshDirects();
        }, MIN_SITE_REFRESH_INTERVAL_MS);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                void refreshDirects();
            }
        });
    };

    const loadOlderMessages = async () => {
        if (!activeUserId || !oldestMessageId || !hasMoreMessages || loadingOlderMessages) return;
        loadingOlderMessages = true;
        updateLoadMore();
        const previousHeight = messages.scrollHeight;
        const previousTop = messages.scrollTop;

        try {
            const data = await api(`/api/directs?otherUserId=${activeUserId}&beforeId=${oldestMessageId}&limit=20`);
            renderMessages(data.messages || [], true);
            hasMoreMessages = Boolean(data.hasMore);
            requestAnimationFrame(() => {
                messages.scrollTop = previousTop + (messages.scrollHeight - previousHeight);
            });
        } catch (error) {
            toast(error.message);
        } finally {
            loadingOlderMessages = false;
            updateLoadMore();
        }
    };

    const showUndo = (message, messageId) => {
        const undo = document.createElement('div');
        undo.className = 'direct-undo';
        undo.innerHTML = `<span>${labels.deleted}</span><button type="button" data-undo-direct="${messageId}">${labels.undo}</button><span class="direct-undo-progress" aria-hidden="true"></span>`;
        message.insertAdjacentElement('beforebegin', undo);
        message.hidden = true;
        applyDirectGrouping();

        const timer = setTimeout(async () => {
            pendingDeletes.delete(String(messageId));
            try {
                await api(`/api/directs?messageId=${messageId}`, {method: 'DELETE'});
                undo.remove();
                message.remove();
                await load(activeUserId);
            } catch (error) {
                message.hidden = false;
                undo.remove();
                applyDirectGrouping();
                toast(error.message);
            }
        }, 5000);

        pendingDeletes.set(String(messageId), {timer, message, undo});
    };

    root.addEventListener('click', event => {
        const loadMore = event.target.closest('[data-load-more-direct]');
        if (loadMore) {
            void loadOlderMessages();
            return;
        }

        const open = event.target.closest('[data-open-direct]');
        if (open) {
            load(open.dataset.openDirect, true).catch(error => toast(error.message));
            return;
        }

        const edit = event.target.closest('[data-edit-direct]');
        if (edit) {
            const note = edit.closest('[data-direct-message]');
            note.querySelector('[data-direct-contents]').hidden = true;
            note.querySelector('[data-direct-edit-form]').hidden = false;
            note.querySelector('[data-direct-edit-form] textarea').focus();
            return;
        }

        const cancelEdit = event.target.closest('[data-cancel-edit]');
        if (cancelEdit) {
            const note = cancelEdit.closest('[data-direct-message]');
            note.querySelector('[data-direct-edit-form]').hidden = true;
            note.querySelector('[data-direct-contents]').hidden = false;
            return;
        }

        const remove = event.target.closest('[data-delete-direct]');
        if (remove) {
            const note = remove.closest('[data-direct-message]');
            note.querySelector('[data-delete-confirm]').hidden = false;
            remove.hidden = true;
            return;
        }

        const cancel = event.target.closest('[data-cancel-delete]');
        if (cancel) {
            const zone = cancel.closest('.direct-delete-zone');
            zone.querySelector('[data-delete-confirm]').hidden = true;
            zone.querySelector('[data-delete-direct]').hidden = false;
            return;
        }

        const confirm = event.target.closest('[data-confirm-delete]');
        if (confirm) {
            const note = confirm.closest('[data-direct-message]');
            showUndo(note, confirm.dataset.confirmDelete);
            return;
        }

        const undoButton = event.target.closest('[data-undo-direct]');
        if (undoButton) {
            const pending = pendingDeletes.get(String(undoButton.dataset.undoDirect));
            if (!pending) return;
            clearTimeout(pending.timer);
            pending.message.hidden = false;
            pending.undo.remove();
            applyDirectGrouping();
            const zone = pending.message.querySelector('.direct-delete-zone');
            if (zone) {
                zone.querySelector('[data-delete-confirm]').hidden = true;
                zone.querySelector('[data-delete-direct]').hidden = false;
            }
            pendingDeletes.delete(String(undoButton.dataset.undoDirect));
        }
    });

    root.addEventListener('submit', async event => {
        const editForm = event.target.closest('[data-direct-edit-form]');
        if (!editForm) return;
        event.preventDefault();
        const note = editForm.closest('[data-direct-message]');
        const contents = editForm.querySelector('textarea').value.trim();
        if (!contents) return;
        const submit = editForm.querySelector('button[type="submit"]');
        submit.disabled = true;
        try {
            await api('/api/directs', {
                method: 'PUT',
                body: JSON.stringify({messageId: Number(note.dataset.directMessage), contents}),
            });
            await load(activeUserId);
        } catch (error) {
            toast(error.message);
        } finally {
            submit.disabled = false;
        }
    });

    const addPendingDirect = contents => {
        const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const now = new Date().toISOString();
        const wrapper = document.createElement('div');
        wrapper.innerHTML = messageHtml({
            id: pendingId,
            senderId: currentUser.id,
            senderSexCode: currentUser.sexCode,
            contents,
            createdAt: now,
            updatedAt: now,
            pending: true,
        }).trim();
        const note = wrapper.firstElementChild;
        messageList.appendChild(note);
        applyDirectGrouping();
        requestAnimationFrame(() => {
            messages.scrollTop = messages.scrollHeight;
        });
        return pendingId;
    };

    const removePendingDirect = pendingId => {
        if (!pendingId) return;
        messageList.querySelector(`[data-direct-message="${CSS.escape(String(pendingId))}"]`)?.remove();
        applyDirectGrouping();
    };

    form?.addEventListener('submit', async event => {
        event.preventDefault();
        const contents = textarea.value.trim();
        if (!contents || !activeUserId) return;

        const submit = $('button[type="submit"]', form);
        setButtonLoading(submit, true, '');
        form.reset();
        scheduleDirectSend({
            recipientId: Number(activeUserId),
            contents,
            onPending: () => addPendingDirect(contents),
            onSent: async (_result, pendingId) => {
                removePendingDirect(pendingId);
                await load(activeUserId);
            },
            onUndone: pendingId => {
                removePendingDirect(pendingId);
                if (!textarea.value) textarea.value = contents;
                textarea.focus({preventScroll: true});
            },
            onFailed: (_error, pendingId) => {
                removePendingDirect(pendingId);
                if (!textarea.value) textarea.value = contents;
            },
        });
        textarea.focus({preventScroll: true});
        setButtonLoading(submit, false);
    });

    textarea?.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
        event.preventDefault();
        form.requestSubmit();
    });

    window.addEventListener('popstate', () => {
        const urlUserId = getUrlUserId();
        load(urlUserId).catch(error => toast(error.message));
    });

    load(activeUserId, Boolean(activeUserId), true).catch(error => toast(error.message));
    startDirectsPolling();
}

document.addEventListener('submit', async event => {
    if (!event.target.matches('[data-direct-compose]')) return;
    event.preventDefault();
    const form = event.target;
    const recipientId = Number(form.recipientId.value);
    const contents = form.querySelector('textarea').value.trim();
    if (!recipientId || !contents) return;

    closeModal();
    scheduleDirectSend({recipientId, contents});
});

