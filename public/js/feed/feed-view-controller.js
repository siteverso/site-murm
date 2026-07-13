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
        const deckActive = mode === 'deck';
        board.closest('.network-board-page')?.classList.toggle('deck-stage-active', deckActive);
        document.documentElement.classList.toggle('deck-mode-active', deckActive);
        document.body.classList.toggle('deck-mode-active', deckActive);
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
