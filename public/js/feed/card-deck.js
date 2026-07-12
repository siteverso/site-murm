const DECK_VISIBLE_CARDS = 5;
const DECK_SWIPE_THRESHOLD = 118;
const DECK_BUFFER_LIMIT = 100;
const DECK_REPLENISH_THRESHOLD = 24;
let deckQueue = [];
let deckSourceIds = [];
let deckFeedCursor = 0;
let deckDragging = null;
let deckSuppressClickUntil = 0;

function shuffleDeckIds(ids) {
    const shuffled = [...ids];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
}

function getDeckSourcePosts(items = []) {
    return shuffleDeckIds(getRootPosts(items));
}

function initializeDeckState(items = []) {
    const roots = getDeckSourcePosts(items);
    deckSourceIds = roots.map(post => String(post.id));
    deckFeedCursor = 0;
    deckQueue = [];
    refillDeckQueue();
}

function refillDeckQueue() {
    if (!deckSourceIds.length) {
        deckQueue = [];
        deckFeedCursor = 0;
        return;
    }

    while (deckQueue.length < DECK_BUFFER_LIMIT && deckSourceIds.length) {
        if (deckFeedCursor >= deckSourceIds.length) {
            deckSourceIds = shuffleDeckIds(deckSourceIds);
            deckFeedCursor = 0;
        }
        const nextId = deckSourceIds[deckFeedCursor];
        deckFeedCursor += 1;
        deckQueue.push(nextId);
    }
}

function syncDeckPool(items = []) {
    const roots = getDeckSourcePosts(items);
    const nextIds = roots.map(post => String(post.id));
    const currentSet = new Set(deckQueue);
    const samePopulation = nextIds.length === deckSourceIds.length
        && nextIds.every(id => deckSourceIds.includes(id));

    if (!samePopulation) {
        initializeDeckState(items);
        return;
    }

    deckSourceIds = nextIds;
    deckQueue = deckQueue.filter(id => deckSourceIds.includes(id));
    if (!deckQueue.length) refillDeckQueue();
    if (deckQueue.length < DECK_REPLENISH_THRESHOLD) refillDeckQueue();
}

function getDeckPosts(items) {
    syncDeckPool(items);
    const byId = new Map(getRootPosts(items).map(post => [String(post.id), post]));
    return deckQueue
        .slice(0, DECK_VISIBLE_CARDS)
        .map(id => byId.get(id))
        .filter(Boolean);
}

function createDeckOverlay(direction) {
    const label = direction === 'right' ? 'Ecoar' : 'Silenciar';
    const icon = direction === 'right'
        ? `<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><circle cx="6.8" cy="14" r="2.2" fill="currentColor"/><path d="M11 10.4C13.3 12 13.3 16 11 17.6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><path d="M16 7.6C21 11 21 17 16 20.4" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>`
        : `<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M16.2 5.8C11.5 5.8 8.7 8.75 8.7 12.45c0 2.3 1.15 3.6 2.55 4.7 1.15.95 1.55 1.7 1.55 2.75 0 1.25 1.05 2.2 2.35 2.2 1.75 0 2.7-1.3 2.7-3" stroke="currentColor" stroke-width="2.05" stroke-linecap="round"/><path d="M12.7 12.85c0-1.9 1.15-3.1 2.95-3.1 1.7 0 2.85 1.1 2.85 2.65 0 1.15-.65 1.95-1.6 2.55" stroke="currentColor" stroke-width="2.05" stroke-linecap="round"/><path d="M5.6 6L22.4 22" stroke="currentColor" stroke-width="2.05" stroke-linecap="round"/></svg>`;
    return `<div class="deck-overlay deck-overlay--${direction}" aria-hidden="true"><div class="deck-overlay__badge">${icon}<span>${label}</span></div></div>`;
}

function renderDeck(items = []) {
    const deck = $('[data-feed-deck]');
    if (!deck) return;
    const visible = getDeckPosts(items);
    const childrenByParent = groupPostsByParent(posts);
    deck.innerHTML = visible.length
        ? visible.map((post, index) => `
            <div class="deck-card" data-deck-card="" data-deck-index="${index}" data-deck-post-id="${post.id}" style="--deck-index:${index}; --deck-count:${visible.length}">
              ${createDeckOverlay('left')}
              ${createDeckOverlay('right')}
              ${renderPost(post, childrenByParent, new Set(), {repliesMode: 'compact'})}
            </div>`).join('')
        : '<p class="empty-state">Nenhum murmúrio no baralho.</p>';
    deck.dataset.deckCount = String(visible.length);
    setupLazyVisuals(deck);
}

function consumeDeckCard() {
    if (!deckQueue.length) return;
    deckQueue.shift();
    if (deckQueue.length < DECK_REPLENISH_THRESHOLD) refillDeckQueue();
    renderDeck(feedBuckets.all);
}

function updateDeckDragState(card, x = 0, y = 0) {
    if (!card) return;
    const progress = Math.min(1, Math.abs(x) / DECK_SWIPE_THRESHOLD);
    const direction = x > 0 ? 'right' : x < 0 ? 'left' : '';
    const armed = Math.abs(x) >= DECK_SWIPE_THRESHOLD;
    card.dataset.deckDirection = direction;
    card.dataset.deckArmed = armed ? 'true' : 'false';
    card.style.setProperty('--deck-drag-progress', String(progress));
    card.style.setProperty('--deck-drag-x', `${x}px`);
    card.style.setProperty('--deck-drag-y', `${y}px`);
    card.style.transform = `translate3d(${x}px, ${y * .15}px, 0) rotate(${x / 22}deg)`;
}

function clearDeckDragState(card) {
    if (!card) return;
    delete card.dataset.deckDirection;
    delete card.dataset.deckArmed;
    card.style.removeProperty('--deck-drag-progress');
    card.style.removeProperty('--deck-drag-x');
    card.style.removeProperty('--deck-drag-y');
    card.style.transform = '';
}

function applyDeckAction(direction, postId) {
    if (!postId) return Promise.resolve();
    const voteValue = direction > 0 ? 1 : -1;
    const actionLabel = direction > 0 ? 'Ecoado.' : 'Silenciado.';
    return api(`/api/posts/${encodeURIComponent(postId)}/vote`, {
        method: 'POST',
        body: JSON.stringify({value: voteValue}),
    }).then(() => {
        toast(actionLabel);
        const targetPost = posts.find(post => String(post.id) === String(postId));
        if (targetPost) {
            const previousVote = Number(targetPost.myVote || 0);
            if (previousVote !== voteValue) {
                if (previousVote === 1) targetPost.positive = Math.max(0, Number(targetPost.positive || 0) - 1);
                if (previousVote === -1) targetPost.negative = Math.max(0, Number(targetPost.negative || 0) - 1);
                if (voteValue === 1) targetPost.positive = Number(targetPost.positive || 0) + 1;
                if (voteValue === -1) targetPost.negative = Number(targetPost.negative || 0) + 1;
                targetPost.myVote = voteValue;
            }
        }
    }).catch(error => {
        toast(error?.message || 'Não foi possível concluir a ação.');
    });
}

function animateDeckDismiss(card, direction) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const postId = card.dataset.deckPostId || card.querySelector('[data-post-id]')?.dataset.postId || '';
    card.dataset.deckDirection = direction > 0 ? 'right' : 'left';
    card.dataset.deckArmed = 'true';
    const width = Math.max(window.innerWidth * 1.08, card.getBoundingClientRect().width * 2.2);
    const targetX = direction * width;
    const animation = card.animate([
        {transform: card.style.transform || 'translate3d(0,0,0) rotate(0deg)', opacity: 1},
        {transform: `translate3d(${targetX}px, ${direction > 0 ? -16 : 10}px, 0) rotate(${direction * 18}deg)`, opacity: 0},
    ], {duration: reducedMotion ? 1 : 280, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards'});
    return animation.finished.catch(() => {}).then(() => {
        consumeDeckCard();
        void applyDeckAction(direction, postId);
    });
}

function bindCardDeck() {
    const deck = $('[data-feed-deck]');
    if (!deck || deck.dataset.deckBound === 'true') return;
    deck.dataset.deckBound = 'true';

    deck.addEventListener('pointerdown', event => {
        const card = event.target.closest('[data-deck-card=""][data-deck-index="0"]');
        if (!card || event.button !== 0 || event.target.closest('button, input, textarea, select, a')) return;
        deckDragging = {card, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: 0, y: 0};
        card.classList.add('is-dragging');
        card.setPointerCapture?.(event.pointerId);
    });

    deck.addEventListener('pointermove', event => {
        if (!deckDragging || deckDragging.pointerId !== event.pointerId) return;
        const {card, startX, startY} = deckDragging;
        const x = event.clientX - startX;
        const y = event.clientY - startY;
        deckDragging.x = x;
        deckDragging.y = y;
        updateDeckDragState(card, x, y);
        if (Math.abs(x) > 8) event.preventDefault();
    });

    const finishDrag = event => {
        if (!deckDragging || deckDragging.pointerId !== event.pointerId) return;
        const {card, x, y} = deckDragging;
        deckDragging = null;
        card.classList.remove('is-dragging');
        card.releasePointerCapture?.(event.pointerId);
        if (Math.abs(x) >= DECK_SWIPE_THRESHOLD) {
            deckSuppressClickUntil = Date.now() + 500;
            updateDeckDragState(card, x, y);
            void animateDeckDismiss(card, x < 0 ? -1 : 1);
            return;
        }
        clearDeckDragState(card);
    };
    deck.addEventListener('pointerup', finishDrag);
    deck.addEventListener('pointercancel', finishDrag);

    deck.addEventListener('click', event => {
        if (Date.now() < deckSuppressClickUntil) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    deck.addEventListener('keydown', event => {
        if (!event.target.closest('[data-feed-deck]')) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const topCard = deck.querySelector('[data-deck-card=""][data-deck-index="0"]');
        if (topCard) {
            deckSuppressClickUntil = Date.now() + 500;
            void animateDeckDismiss(topCard, event.key === 'ArrowLeft' ? -1 : 1);
        }
    });
}
