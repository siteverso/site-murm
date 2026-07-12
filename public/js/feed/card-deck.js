const DECK_VISIBLE_CARDS = 5;
const DECK_MAX_CARDS = 100;
const DECK_SWIPE_THRESHOLD = 118;
const DECK_DRAG_ACTIVATION = 8;
const DECK_THROW_DISTANCE = 1.2;
let deckOrder = [];
let deckCursor = 0;
let deckSignature = '';
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
    return getRootPosts(items).slice(0, DECK_MAX_CARDS);
}

function syncDeckOrder(items = []) {
    const roots = getDeckSourcePosts(items);
    const ids = roots.map(post => String(post.id));
    const nextSignature = ids.join(',');
    if (nextSignature !== deckSignature) {
        deckSignature = nextSignature;
        deckOrder = shuffleDeckIds(ids);
        deckCursor = 0;
    }
    return roots;
}

function getDeckPosts(items = []) {
    const roots = syncDeckOrder(items);
    const byId = new Map(roots.map(post => [String(post.id), post]));
    return deckOrder
        .slice(deckCursor, deckCursor + DECK_VISIBLE_CARDS)
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
    const remaining = Math.max(0, deckOrder.length - deckCursor);
    deck.dataset.deckRemaining = String(remaining);
    deck.dataset.deckTotal = String(deckOrder.length);

    deck.innerHTML = visible.length
        ? visible.map((post, index) => `
            <div class="deck-card" data-deck-card="" data-deck-index="${index}" data-deck-post-id="${post.id}" style="--deck-index:${index}; --deck-count:${visible.length}">
              ${createDeckOverlay('left')}
              ${createDeckOverlay('right')}
              ${renderPost(post, childrenByParent, new Set(), {repliesMode: 'compact'})}
            </div>`).join('')
        : '<p class="empty-state">Os 100 murmúrios carregados acabaram.</p>';

    setupLazyVisuals(deck);
}

function consumeDeckCard() {
    if (deckCursor >= deckOrder.length) return;
    deckCursor += 1;
    renderDeck(feedBuckets.all);
}

function getDeckDisplayedY(y = 0) {
    return y * 0.16;
}

function updateDeckDragState(card, x = 0, y = 0) {
    if (!card) return;
    const progress = Math.min(1, Math.abs(x) / DECK_SWIPE_THRESHOLD);
    const direction = x > 0 ? 'right' : x < 0 ? 'left' : '';
    const armed = Math.abs(x) >= DECK_SWIPE_THRESHOLD;
    const displayedY = getDeckDisplayedY(y);
    card.dataset.deckDirection = direction;
    card.dataset.deckArmed = armed ? 'true' : 'false';
    card.style.setProperty('--deck-drag-progress', String(progress));
    card.style.transform = `translate3d(${x}px, ${displayedY}px, ${-Math.min(34, Math.abs(x) * .08)}px) rotateX(${Math.max(-5, Math.min(5, -y / 45))}deg) rotateY(${Math.max(-9, Math.min(9, x / 34))}deg) rotateZ(${x / 24}deg)`;
}

function clearDeckDragState(card) {
    if (!card) return;
    delete card.dataset.deckDirection;
    delete card.dataset.deckArmed;
    card.style.removeProperty('--deck-drag-progress');
    card.style.transform = '';
}

function measureDeckVelocity(history = []) {
    if (history.length < 2) return {vx: 0, vy: 0};
    const end = history[history.length - 1];
    let start = history[0];
    for (let index = history.length - 2; index >= 0; index -= 1) {
        if (end.t - history[index].t > 90) break;
        start = history[index];
    }
    const dt = Math.max(16, end.t - start.t);
    return {
        vx: (end.x - start.x) / dt,
        vy: (end.y - start.y) / dt,
    };
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
        if (!targetPost) return;
        const previousVote = Number(targetPost.myVote || 0);
        if (previousVote === voteValue) return;
        if (previousVote === 1) targetPost.positive = Math.max(0, Number(targetPost.positive || 0) - 1);
        if (previousVote === -1) targetPost.negative = Math.max(0, Number(targetPost.negative || 0) - 1);
        if (voteValue === 1) targetPost.positive = Number(targetPost.positive || 0) + 1;
        if (voteValue === -1) targetPost.negative = Number(targetPost.negative || 0) + 1;
        targetPost.myVote = voteValue;
    }).catch(error => {
        toast(error?.message || 'Não foi possível concluir a ação.');
    });
}

function animateDeckThrow(card, dragState, direction) {
    const {x = 0, y = 0, history = []} = dragState || {};
    const {vx, vy} = measureDeckVelocity(history);
    const startY = getDeckDisplayedY(y);
    const startRotateZ = x / 24;
    const startRotateY = Math.max(-9, Math.min(9, x / 34));
    const startRotateX = Math.max(-5, Math.min(5, -y / 45));
    const speed = Math.max(.35, Math.min(2.2, Math.abs(vx)));
    const travel = Math.max(window.innerWidth * 1.16, card.getBoundingClientRect().width * 1.45);
    const targetX = x + direction * travel;
    const windLift = Math.max(-150, Math.min(150, (vy * 150) + (y * .12)));
    const targetY = startY + windLift;
    const targetRotateZ = startRotateZ + direction * (20 + speed * 9) + (vy * 5);
    const targetRotateY = direction * (22 + speed * 7);
    const targetRotateX = Math.max(-18, Math.min(18, startRotateX - vy * 9));
    const duration = Math.round(Math.max(820, Math.min(1320, 1180 - speed * 150)));
    const postId = card.dataset.deckPostId || card.querySelector('[data-post-id]')?.dataset.postId || '';

    card.dataset.deckDirection = direction > 0 ? 'right' : 'left';
    card.dataset.deckArmed = 'true';
    card.classList.add('is-flying');

    const p1x = x + (targetX - x) * .18;
    const p2x = x + (targetX - x) * .48;
    const p3x = x + (targetX - x) * .76;
    const p1y = startY + windLift * .08 - 14;
    const p2y = startY + windLift * .34 + 10;
    const p3y = startY + windLift * .70 - 8;

    const animation = card.animate([
        {
            transform: `translate3d(${x}px, ${startY}px, -18px) rotateX(${startRotateX}deg) rotateY(${startRotateY}deg) rotateZ(${startRotateZ}deg)`,
            opacity: 1,
            filter: 'blur(0px)',
            offset: 0,
        },
        {
            transform: `translate3d(${p1x}px, ${p1y}px, 28px) rotateX(${startRotateX - 3}deg) rotateY(${startRotateY + direction * 8}deg) rotateZ(${startRotateZ + direction * 5}deg)`,
            opacity: 1,
            filter: 'blur(0px)',
            offset: .24,
        },
        {
            transform: `translate3d(${p2x}px, ${p2y}px, 6px) rotateX(${targetRotateX * .55}deg) rotateY(${targetRotateY * .62}deg) rotateZ(${targetRotateZ * .52}deg)`,
            opacity: .96,
            filter: 'blur(.2px)',
            offset: .54,
        },
        {
            transform: `translate3d(${p3x}px, ${p3y}px, -18px) rotateX(${targetRotateX * .82}deg) rotateY(${targetRotateY * .86}deg) rotateZ(${targetRotateZ * .82}deg)`,
            opacity: .72,
            filter: 'blur(.7px)',
            offset: .80,
        },
        {
            transform: `translate3d(${targetX}px, ${targetY}px, -70px) rotateX(${targetRotateX}deg) rotateY(${targetRotateY}deg) rotateZ(${targetRotateZ}deg)`,
            opacity: 0,
            filter: 'blur(1.6px)',
            offset: 1,
        },
    ], {
        duration,
        easing: 'cubic-bezier(.12, .62, .18, 1)',
        fill: 'forwards',
    });

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
        if (!card || event.button !== 0 || event.target.closest('button, input, textarea, select, form')) return;
        deckDragging = {
            card,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            x: 0,
            y: 0,
            moved: false,
            history: [{x: event.clientX, y: event.clientY, t: performance.now()}],
        };
        card.classList.add('is-dragging');
        card.setPointerCapture?.(event.pointerId);
    });

    deck.addEventListener('pointermove', event => {
        if (!deckDragging || deckDragging.pointerId !== event.pointerId) return;
        const {card, startX, startY, history} = deckDragging;
        const x = event.clientX - startX;
        const y = event.clientY - startY;
        deckDragging.x = x;
        deckDragging.y = y;
        deckDragging.moved ||= Math.abs(x) > DECK_DRAG_ACTIVATION || Math.abs(y) > DECK_DRAG_ACTIVATION;
        history.push({x: event.clientX, y: event.clientY, t: performance.now()});
        if (history.length > 8) history.shift();
        updateDeckDragState(card, x, y);
        if (deckDragging.moved) event.preventDefault();
    });

    const finishDrag = event => {
        if (!deckDragging || deckDragging.pointerId !== event.pointerId) return;
        const dragState = deckDragging;
        const {card, x} = dragState;
        deckDragging = null;
        card.classList.remove('is-dragging');
        card.releasePointerCapture?.(event.pointerId);

        if (Math.abs(x) >= DECK_SWIPE_THRESHOLD) {
            deckSuppressClickUntil = Date.now() + 520;
            void animateDeckThrow(card, dragState, x < 0 ? -1 : 1);
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
        if (!topCard) return;
        deckSuppressClickUntil = Date.now() + 520;
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        void animateDeckThrow(topCard, {
            x: direction * (DECK_SWIPE_THRESHOLD + 12),
            y: 0,
            history: [
                {x: 0, y: 0, t: performance.now() - 64},
                {x: direction * 160, y: 0, t: performance.now()},
            ],
        }, direction);
    });
}
