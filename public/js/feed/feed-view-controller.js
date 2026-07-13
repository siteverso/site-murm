function resolveFeedViewStorageKey(board) {
    const contextKey = String(board?.dataset?.feedContextKey || 'home').trim().toLowerCase() || 'home';
    return `murmur_feed_view:${contextKey}`;
}

function readStoredFeedView(board) {
    const storageKey = resolveFeedViewStorageKey(board);
    try {
        const contextualView = localStorage.getItem(storageKey);
        if (contextualView) return contextualView;

        // Compatibilidade: a preferência global antiga pertence somente à Home.
        if (board?.dataset?.feedContextKey === 'home') {
            return localStorage.getItem('murmur_feed_view') || 'split';
        }
    } catch {
    }
    return 'split';
}

function storeFeedView(board, mode) {
    try {
        localStorage.setItem(resolveFeedViewStorageKey(board), mode);
    } catch {
    }
}


function resolveColumnGroupStorageKey(board) {
    const contextKey = String(board?.dataset?.feedContextKey || 'home').trim().toLowerCase() || 'home';
    return `murmur_feed_columns:${contextKey}`;
}

function readStoredColumnGroup(board) {
    try {
        const value = localStorage.getItem(resolveColumnGroupStorageKey(board));
        return ['sex', 'age', 'users'].includes(value) ? value : 'sex';
    } catch {
        return 'sex';
    }
}

function storeColumnGroup(board, mode) {
    try {
        localStorage.setItem(resolveColumnGroupStorageKey(board), mode);
    } catch {
    }
}

function bindFeedView() {
    const switcher = $('[data-feed-view-switch]');
    const board = $('[data-feed-board]');
    if (!switcher || !board) return;

    const panels = $$('[data-feed-view-panel]', board);
    const buttons = $$('[data-feed-view]', switcher);
    const validViews = new Set(['deck', 'split', 'grid', 'list']);
    const columnGroupControl = $('[data-column-group-control]');
    const columnGroupSelect = $('[data-column-group-select]');
    if (columnGroupSelect) {
        const storedGroup = readStoredColumnGroup(board);
        columnGroupSelect.value = storedGroup;
        board.dataset.columnGroupMode = storedGroup;
        columnGroupSelect.addEventListener('change', () => {
            const groupMode = ['sex', 'age', 'users'].includes(columnGroupSelect.value) ? columnGroupSelect.value : 'sex';
            board.dataset.columnGroupMode = groupMode;
            storeColumnGroup(board, groupMode);
            if (board.dataset.feedViewMode === 'split' && typeof renderSplitFeeds === 'function') renderSplitFeeds();
        });
    }

    const applyView = view => {
        const legacyColumnMode = view === 'relevance' || view === 'users';
        const mode = legacyColumnMode ? 'split' : validViews.has(view) ? view : 'split';
        const previousMode = board.dataset.feedViewMode || '';
        board.dataset.feedViewMode = mode;
        const deckActive = mode === 'deck';
        if (columnGroupControl) columnGroupControl.hidden = mode !== 'split';
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
        if (previousMode === 'deck' && mode !== 'deck' && typeof renderNonDeckFeedsFromState === 'function') {
            renderNonDeckFeedsFromState();
        }
        if (mode === 'split') requestAnimationFrame(setupFeedColumnAutoload);
        storeFeedView(board, mode);
    };

    const initial = readStoredFeedView(board);
    applyView(initial);

    switcher.addEventListener('click', event => {
        const button = event.target.closest('[data-feed-view]');
        if (!button) return;
        applyView(button.dataset.feedView);
    });
}
