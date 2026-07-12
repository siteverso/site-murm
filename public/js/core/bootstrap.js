function showRuntimeError(error, context = 'Erro de execução') {
    const normalized = error instanceof Error ? error : new Error(String(error));
    console.error(context, normalized);

    let panel = document.querySelector('[data-runtime-error-panel]');
    if (!panel) {
        panel = document.createElement('section');
        panel.dataset.runtimeErrorPanel = '';
        panel.className = 'runtime-error-panel';
        panel.setAttribute('role', 'alert');
        document.body.prepend(panel);
    }

    const stack = normalized.stack || normalized.message || String(normalized);
    panel.innerHTML = `
    <div class="runtime-error-panel__header">${escapeHtml(context)}</div>
    <pre class="runtime-error-panel__details">${escapeHtml(stack)}</pre>
  `;
}

window.addEventListener('error', event => {
    showRuntimeError(event.error || event.message, 'Erro JavaScript na página');
});

window.addEventListener('unhandledrejection', event => {
    showRuntimeError(event.reason, 'Promise rejeitada sem tratamento');
});

async function initializeApplication() {
    try {
        bindUi();
        bindAuth();
        bindProfile();
        bindCountryPicker();
        bindFeedView();
        bindCardDeck();
        bindFeed();
    } catch (error) {
        showRuntimeError(error, 'Erro ao inicializar a interface');
    }

    try {
        await loadUser();
        renderReplyHistory();
    } catch (error) {
        showRuntimeError(error, 'Erro ao carregar o usuário atual');
    }

    try {
        await loadFeed(true);
    } catch (error) {
        showRuntimeError(error, 'Erro ao carregar os murmúrios');
        const feeds = $$('[data-feed-column], [data-feed-all-list], [data-profile-feed]');
        feeds.forEach(feed => {
            feed.innerHTML = `<p class="empty-state">Erro ao carregar murmúrios: ${escapeHtml(error?.stack || error?.message || String(error))}</p>`;
        });
    }

    try {

        startFeedPolling();
        bindDirectsPage();

        await pollDirects();
        setInterval(() => {
            void pollDirects().catch(error => {
                showRuntimeError(error, 'Erro ao atualizar mensagens diretas',);
            });
        }, 7000);
    } catch (error) {
        showRuntimeError(error, 'Erro ao iniciar atualizações automáticas',);
    }


}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication, {once: true});
} else {
    initializeApplication().catch(error => showRuntimeError(error, 'Erro ao inicializar a aplicação'));
}
