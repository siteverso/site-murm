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
    const activeUsername = $('[data-direct-active-username]', root);
    const conversationMenuButton = $('[data-direct-conversation-menu-button]', root);
    const conversationMenu = $('[data-direct-conversation-menu]', root);
    const blockedNotice = $('[data-direct-blocked-notice]', root);
    const blockMenuButton = $('[data-block-direct-user]', root);
    const archiveMenuButton = $('[data-archive-direct-conversation]', root);
    const restoreMenuButton = $('[data-restore-direct-conversation]', root);
    const archiveToggle = $('[data-direct-archive-toggle]', root);
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
    let activeConversationUsername = '';
    let activeBlockedByMe = false;
    let activeBlockedEither = false;
    let archivedView = new URLSearchParams(window.location.search).get('archived') === '1';

    const labels = locale === 'en'
        ? {remove: 'Delete', edit: 'Edit', save: 'Save', confirm: 'Confirm', cancel: 'Cancel', undo: 'Undo', deleted: 'Message deleted.', loadMore: 'Load 20 earlier', loadingMore: 'Loading…', edited: 'edited', pending: 'sending…', reportTitle: 'Report conversation', reportReason: 'Reason', reportDetails: 'Optional details', reportSubmit: 'Send report', reportSent: 'Report sent to @murmurinho.', block: 'Block person', unblock: 'Unblock person', archived: 'Conversation archived.', conversationDeleted: 'Conversation removed from your inbox.', blocked: 'Person blocked.', unblocked: 'Person unblocked.', showArchived: 'Show archived chats', showActive: 'Show active chats', restored: 'Conversation restored.', blockedLabel: 'Blocked'}
        : {remove: 'Excluir', edit: 'Editar', save: 'Salvar', confirm: 'Confirmar', cancel: 'Cancelar', undo: 'Desfazer', deleted: 'Bilhete excluído.', loadMore: 'Carregar 20 anteriores', loadingMore: 'Carregando…', edited: 'editado', pending: 'enviando…', reportTitle: 'Denunciar conversa', reportReason: 'Motivo', reportDetails: 'Detalhes opcionais', reportSubmit: 'Enviar denúncia', reportSent: 'Denúncia enviada para @murmurinho.', block: 'Bloquear pessoa', unblock: 'Desbloquear pessoa', archived: 'Conversa arquivada.', conversationDeleted: 'Conversa excluída da sua caixa.', blocked: 'Pessoa bloqueada.', unblocked: 'Pessoa desbloqueada.', showArchived: 'Exibir chats arquivados', showActive: 'Exibir chats ativos', restored: 'Conversa restaurada.', blockedLabel: 'Bloqueado'};

    const sexClass = value => value === 'M' ? 'sex-m' : value === 'F' ? 'sex-f' : '';

    const renderConversations = conversations => {
        const items = conversations || [];
        list.innerHTML = items.length ? items.map(item => `
      <button class="direct-thread ${String(item.otherUserId) === String(activeUserId) ? 'active' : ''} ${hasUnreadMessages(item.unreadCount) ? 'has-unread' : ''} ${item.blockedByMe ? 'is-blocked' : ''} ${sexClass(item.sexCode)}" data-open-direct="${item.otherUserId}" type="button">
        <span class="direct-thread-head"><strong>@${escapeHtml(item.username)}</strong><time>${formatDateTime(item.lastAt)}</time></span>
        <span class="direct-thread-preview">${escapeHtml(item.lastMessage)}</span>
        <small>${item.blockedByMe ? `<span class="direct-thread-blocked" aria-label="${labels.blockedLabel}">🔒 ${labels.blockedLabel}</span>` : (item.unreadCount ? `${item.unreadCount} novo(s)` : '')}</small>
      </button>
    `).join('') : `<div class="direct-list-empty">${archivedView ? (locale === 'en' ? 'No archived chats.' : 'Nenhum chat arquivado.') : (locale === 'en' ? 'No chats yet.' : 'Nenhum bilhete ainda.')}</div>`;
        if (archiveToggle) {
            archiveToggle.textContent = archivedView ? labels.showActive : labels.showArchived;
            archiveToggle.setAttribute('aria-pressed', String(archivedView));
        }
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
        const modeQuery = archivedView ? '&archived=1' : '';
        const url = otherUserId ? `/api/directs?otherUserId=${otherUserId}&limit=20${modeQuery}` : `/api/directs?archived=${archivedView ? 1 : 0}`;
        const data = await api(url);
        if (token !== requestToken) return;

        activeUserId = otherUserId ? String(otherUserId) : '';
        if (updateUrl) setUrlUserId(activeUserId, replaceUrl);
        const conversations = data.conversations || [];
        renderConversations(conversations);

        if (activeUserId) {
            const activeConversation = conversations.find(item => String(item.otherUserId) === String(activeUserId));
            activeConversationUsername = activeConversation?.username || '';
            activeBlockedByMe = Boolean(activeConversation?.blockedByMe);
            activeBlockedEither = Boolean(activeConversation?.blockedEither);
            if (activeUsername) activeUsername.textContent = activeConversationUsername ? `@${activeConversationUsername}` : '';
            if (blockMenuButton) blockMenuButton.textContent = activeBlockedByMe ? labels.unblock : labels.block;
            if (blockedNotice) blockedNotice.hidden = !activeBlockedByMe;
            if (archiveMenuButton) archiveMenuButton.hidden = archivedView;
            if (restoreMenuButton) restoreMenuButton.hidden = !archivedView;
            textarea.disabled = activeBlockedEither;
            form.querySelector('button[type="submit"]').disabled = activeBlockedEither;

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
            const modeQuery = archivedView ? '&archived=1' : '';
            const url = requestedUserId ? `/api/directs?otherUserId=${requestedUserId}&limit=${refreshLimit}${modeQuery}` : `/api/directs?archived=${archivedView ? 1 : 0}`;
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


    const closeConversationMenu = () => {
        if (!conversationMenu || !conversationMenuButton) return;
        conversationMenu.hidden = true;
        conversationMenuButton.setAttribute('aria-expanded', 'false');
    };

    const closeActiveConversation = async () => {
        activeUserId = '';
        activeConversationUsername = '';
        activeBlockedByMe = false;
        activeBlockedEither = false;
        setUrlUserId('', true);
        stage.hidden = true;
        empty.hidden = false;
        closeConversationMenu();
        await load('');
    };

    const runConversationAction = async (action, successMessage) => {
        if (!activeUserId) return;
        await api('/api/directs/conversation', {
            method: 'POST',
            body: JSON.stringify({otherUserId: Number(activeUserId), action}),
        });
        await closeActiveConversation();
        toast(successMessage);
    };

    const setBlockedState = async shouldBlock => {
        if (!activeUserId) return;
        const otherUserId = Number(activeUserId);
        if (shouldBlock) {
            await api('/api/directs/block', {
                method: 'POST',
                body: JSON.stringify({otherUserId}),
            });
        } else {
            await api(`/api/directs/block?otherUserId=${otherUserId}`, {method: 'DELETE'});
        }
        await load(activeUserId);
        toast(shouldBlock ? labels.blocked : labels.unblocked);
    };

    const openConversationConfirm = (kind) => {
        if (!activeUserId || !activeConversationUsername) return;
        closeConversationMenu();
        const isDelete = kind === 'delete';
        const isArchive = kind === 'archive';
        const isRestore = kind === 'restore';
        const title = isDelete ? 'Excluir conversa' : isArchive ? 'Arquivar conversa' : isRestore ? 'Restaurar conversa' : activeBlockedByMe ? 'Desbloquear pessoa' : 'Bloquear pessoa';
        const message = isDelete
            ? `A conversa com @${escapeHtml(activeConversationUsername)} será removida somente da sua caixa. A outra pessoa continuará vendo o histórico.`
            : isArchive
                ? `A conversa com @${escapeHtml(activeConversationUsername)} sairá da lista e reaparecerá quando chegar um novo bilhete.`
                : isRestore
                    ? `A conversa com @${escapeHtml(activeConversationUsername)} voltará para a lista de chats ativos.`
                : activeBlockedByMe
                    ? `@${escapeHtml(activeConversationUsername)} poderá voltar a enviar bilhetes para você.`
                    : `@${escapeHtml(activeConversationUsername)} não poderá trocar novos bilhetes com você. O bloqueio não será avisado diretamente.`;
        modal(`
          <h2>${title}</h2>
          <p class="modal-subtitle">${message}</p>
          <form data-direct-conversation-action data-action="${kind}">
            <div class="modal-actions">
              <button class="button" type="button" data-modal-close>Cancelar</button>
              <button class="button ${isDelete ? 'danger' : 'primary'}" type="submit">Confirmar</button>
            </div>
          </form>`, 'direct-conversation-action-modal');
    };

    const openReportDialog = () => {
        if (!activeUserId || !activeConversationUsername) return;
        closeConversationMenu();
        modal(`
          <h2>${labels.reportTitle}</h2>
          <p class="modal-subtitle">@${escapeHtml(activeConversationUsername)} · a denúncia será enviada por bilhete para @murmurinho</p>
          <form data-direct-report>
            <input type="hidden" name="reportedUserId" value="${escapeHtml(activeUserId)}">
            <label class="direct-report-field">
              <span>${labels.reportReason}</span>
              <select name="reason" required>
                <option value="Assédio">Assédio</option>
                <option value="Spam">Spam</option>
                <option value="Ameaça">Ameaça</option>
                <option value="Conteúdo impróprio">Conteúdo impróprio</option>
                <option value="Outro">Outro</option>
              </select>
            </label>
            <label class="direct-report-field">
              <span>${labels.reportDetails}</span>
              <textarea name="details" maxlength="600" placeholder="Descreva brevemente o ocorrido"></textarea>
            </label>
            <div class="modal-actions">
              <span>O usuário denunciado não será avisado.</span>
              <button class="button primary" type="submit">${labels.reportSubmit}</button>
            </div>
          </form>`, 'direct-report-modal');
    };

    root.addEventListener('click', event => {
        const menuToggle = event.target.closest('[data-direct-conversation-menu-button]');
        if (menuToggle) {
            const willOpen = conversationMenu.hidden;
            conversationMenu.hidden = !willOpen;
            conversationMenuButton.setAttribute('aria-expanded', String(willOpen));
            return;
        }

        const archiveConversationButton = event.target.closest('[data-archive-direct-conversation]');
        if (archiveConversationButton) {
            openConversationConfirm('archive');
            return;
        }

        const restoreConversationButton = event.target.closest('[data-restore-direct-conversation]');
        if (restoreConversationButton) {
            openConversationConfirm('restore');
            return;
        }

        const archiveViewToggle = event.target.closest('[data-direct-archive-toggle]');
        if (archiveViewToggle) {
            archivedView = !archivedView;
            const url = new URL(window.location.href);
            if (archivedView) url.searchParams.set('archived', '1');
            else url.searchParams.delete('archived');
            url.searchParams.delete('userId');
            window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
            activeUserId = '';
            stage.hidden = true;
            empty.hidden = false;
            load('').catch(error => toast(error.message));
            return;
        }

        const blockUserButton = event.target.closest('[data-block-direct-user]');
        if (blockUserButton) {
            openConversationConfirm('block');
            return;
        }

        const unblockUserButton = event.target.closest('[data-unblock-direct-user]');
        if (unblockUserButton) {
            openConversationConfirm('block');
            return;
        }

        const deleteConversationButton = event.target.closest('[data-delete-direct-conversation]');
        if (deleteConversationButton) {
            openConversationConfirm('delete');
            return;
        }

        const report = event.target.closest('[data-report-direct]');
        if (report) {
            openReportDialog();
            return;
        }

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

    document.addEventListener('submit', async event => {
        const actionForm = event.target.closest('[data-direct-conversation-action]');
        if (actionForm) {
            event.preventDefault();
            const submit = actionForm.querySelector('button[type="submit"]');
            setButtonLoading(submit, true, '');
            try {
                const action = actionForm.dataset.action;
                if (action === 'archive') await runConversationAction('archive', labels.archived);
                else if (action === 'restore') await runConversationAction('restore', labels.restored);
                else if (action === 'delete') await runConversationAction('delete', labels.conversationDeleted);
                else await setBlockedState(!activeBlockedByMe);
                closeModal();
            } catch (error) {
                toast(error.message);
                setButtonLoading(submit, false);
            }
            return;
        }

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
        archivedView = new URLSearchParams(window.location.search).get('archived') === '1';
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



document.addEventListener('submit', async event => {
    if (!event.target.matches('[data-direct-report]')) return;
    event.preventDefault();
    const form = event.target;
    const submit = form.querySelector('button[type="submit"]');
    const reportedUserId = Number(form.reportedUserId.value);
    const reason = String(form.reason.value || '').trim();
    const details = String(form.details.value || '').trim();
    if (!reportedUserId || !reason) return;

    setButtonLoading(submit, true, '');
    try {
        await api('/api/directs/report', {
            method: 'POST',
            body: JSON.stringify({reportedUserId, reason, details}),
        });
        closeModal();
        toast('Denúncia enviada para @murmurinho.');
    } catch (error) {
        toast(error.message);
        setButtonLoading(submit, false);
    }
});
