const DECK_VISIBLE_CARDS = 5;
const DECK_MAX_CARDS = 100;
const DECK_SWIPE_THRESHOLD = 118;
const DECK_DRAG_ACTIVATION = 8;
const DECK_OPEN_THRESHOLD = 105;
const DECK_THROW_DISTANCE = 1.2;
const DECK_NEXT_CARD_READY_MS = 70;
let deckOrder = [];
let deckCursor = 0;
let deckSignature = '';
let deckDragging = null;
let deckSuppressClickUntil = 0;
let deckIncludeDecided = false;

function shuffleDeckIds(ids) {
    const shuffled = [...ids];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
}

function getDeckSourcePosts(items = []) {
    return getRootPosts(items)
        .filter(post => deckIncludeDecided || Number(post.myVote || 0) === 0)
        .slice(0, DECK_MAX_CARDS);
}

function resetDeckSession(items = feedBuckets.all, {includeDecided = false} = {}) {
    deckIncludeDecided = includeDecided;
    deckOrder = [];
    deckCursor = 0;
    deckSignature = '';
    renderDeck(items);
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
    const label = direction === 'right' ? 'Ecoar' : direction === 'left' ? 'Silenciar' : 'Abrir';
    const icon = direction === 'right'
        ? `<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><circle cx="6.8" cy="14" r="2.2" fill="currentColor"/><path d="M11 10.4C13.3 12 13.3 16 11 17.6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><path d="M16 7.6C21 11 21 17 16 20.4" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>`
        : direction === 'left'
            ? `<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M16.2 5.8C11.5 5.8 8.7 8.75 8.7 12.45c0 2.3 1.15 3.6 2.55 4.7 1.15.95 1.55 1.7 1.55 2.75 0 1.25 1.05 2.2 2.35 2.2 1.75 0 2.7-1.3 2.7-3" stroke="currentColor" stroke-width="2.05" stroke-linecap="round"/><path d="M12.7 12.85c0-1.9 1.15-3.1 2.95-3.1 1.7 0 2.85 1.1 2.85 2.65 0 1.15-.65 1.95-1.6 2.55" stroke="currentColor" stroke-width="2.05" stroke-linecap="round"/><path d="M5.6 6L22.4 22" stroke="currentColor" stroke-width="2.05" stroke-linecap="round"/></svg>`
            : `<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M14 21V7M8.5 12.5 14 7l5.5 5.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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
    deck.classList.toggle('is-empty', visible.length === 0);

    deck.innerHTML = visible.length
        ? visible.map((post, index) => `
            <div class="deck-card" data-deck-card="" data-deck-index="${index}" data-deck-post-id="${post.id}" style="--deck-index:${index}; --deck-count:${visible.length}">
              ${createDeckOverlay('left')}
              ${createDeckOverlay('right')}
              ${createDeckOverlay('up')}
              ${renderPost(post, childrenByParent, new Set(), {repliesMode: 'compact'})}
            </div>`).join('')
        : `<div class="deck-empty-state" role="status">
            <strong class="deck-empty-state__title">Não há novos murmúrios para decidir.</strong>
            <p>Aqui aparecem somente murmúrios que você ainda não ecoou nem silenciou.</p>
            <button class="button secondary deck-empty-state__restart" type="button" data-deck-restart>Reiniciar murmúrios</button>
          </div>`;

    setupLazyVisuals(deck);
}

function animateFreshDeck(items = []) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 70 : 300;
    const easing = 'cubic-bezier(.16, 1, .3, 1)';
    items.forEach(card => {
        const index = Number(card.dataset.deckIndex || 0);
        const fromIndex = index + 1;
        card.animate([
            {transform: deckRestTransform(fromIndex), opacity: Math.max(.18, 1 - fromIndex * .13), filter: `saturate(${Math.max(.55, 1 - fromIndex * .08)})`},
            {transform: deckRestTransform(index), opacity: Math.max(.18, 1 - index * .13), filter: `saturate(${Math.max(.55, 1 - index * .08)})`},
        ], {duration, easing, fill: 'none'});
    });
}

function consumeDeckCard({animate = true} = {}) {
    if (deckCursor >= deckOrder.length) return;
    deckCursor += 1;
    renderDeck(feedBuckets.all);
    if (animate) {
        const deck = $('[data-feed-deck]');
        if (deck) animateFreshDeck([...deck.querySelectorAll('[data-deck-card]')]);
    }
}

function getDeckDisplayedY(y = 0) {
    return y * 0.42;
}

function deckRestTransform(index) {
    return `translate3d(0, ${index * 11}px, ${index * -40}px) scale(${1 - index * .024})`;
}

function createFlyingDeckCard(card) {
    const visual = card.querySelector('.murmur-card');
    if (!visual) return null;
    const rect = visual.getBoundingClientRect();
    const clone = card.cloneNode(true);
    clone.classList.add('deck-card--flying-clone');
    clone.removeAttribute('data-deck-index');
    clone.style.position = 'fixed';
    clone.style.inset = 'auto';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = '0';
    clone.style.display = 'block';
    clone.style.transform = 'none';
    clone.style.opacity = '1';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '2147483000';
    clone.querySelector('.murmur-card')?.style.setProperty('width', '100%');
    clone.querySelector('.murmur-card')?.style.setProperty('height', '100%');
    document.body.append(clone);
    return {clone, rect};
}

function removeFlyingDeckCard(clone) {
    clone?.remove();
}


function getDeckVoteButton(card, voteValue) {
    return card?.querySelector(`.murmur-card [data-vote="${voteValue}"]`) || null;
}

function captureDeckVotePreview(card) {
    if (!card || card.dataset.deckVotePreviewCaptured === 'true') return;
    card.dataset.deckVotePreviewCaptured = 'true';
    card.querySelectorAll('.murmur-card [data-vote]').forEach(button => {
        button.dataset.deckOriginalPressed = button.getAttribute('aria-pressed') || 'false';
        const count = button.querySelector(':scope > .action-count');
        if (count) count.dataset.deckOriginalCount = count.textContent || '0';
    });
}

function setDeckVotePreview(card, voteValue = 0) {
    if (!card) return;
    captureDeckVotePreview(card);
    const selected = Number(voteValue || 0);

    card.querySelectorAll('.murmur-card [data-vote]').forEach(button => {
        const buttonVote = Number(button.dataset.vote || 0);
        const wasPressed = button.dataset.deckOriginalPressed === 'true';
        const shouldPress = selected === 0 ? wasPressed : buttonVote === selected;
        button.classList.toggle('active', shouldPress);
        button.classList.toggle('is-led-active', shouldPress);
        button.setAttribute('aria-pressed', shouldPress ? 'true' : 'false');

        const count = button.querySelector(':scope > .action-count');
        if (!count) return;
        const originalCount = Number(count.dataset.deckOriginalCount || count.textContent || 0);
        let previewCount = originalCount;
        if (selected !== 0) {
            if (wasPressed && buttonVote !== selected) previewCount = Math.max(0, originalCount - 1);
            if (!wasPressed && buttonVote === selected) previewCount = originalCount + 1;
        }
        count.textContent = String(previewCount);
    });

    if (selected === 0) delete card.dataset.deckVotePreview;
    else card.dataset.deckVotePreview = String(selected);
}

function clearDeckVotePreview(card) {
    if (!card || card.dataset.deckVotePreviewCaptured !== 'true') return;
    setDeckVotePreview(card, 0);
    card.querySelectorAll('.murmur-card [data-vote]').forEach(button => {
        delete button.dataset.deckOriginalPressed;
        const count = button.querySelector(':scope > .action-count');
        if (count) delete count.dataset.deckOriginalCount;
    });
    delete card.dataset.deckVotePreviewCaptured;
    delete card.dataset.deckVotePreview;
}

function updateDeckDragState(card, x = 0, y = 0) {
    if (!card) return;
    const opening = y <= -DECK_OPEN_THRESHOLD && Math.abs(y) > Math.abs(x) * 1.08;
    const progress = opening
        ? Math.min(1, Math.abs(y) / DECK_OPEN_THRESHOLD)
        : Math.min(1, Math.abs(x) / DECK_SWIPE_THRESHOLD);
    const direction = opening ? 'up' : x > 0 ? 'right' : x < 0 ? 'left' : '';
    const armed = opening || Math.abs(x) >= DECK_SWIPE_THRESHOLD;
    const displayedY = getDeckDisplayedY(y);
    card.dataset.deckDirection = direction;
    card.dataset.deckArmed = armed ? 'true' : 'false';
    if (armed && direction === 'right') setDeckVotePreview(card, 1);
    else if (armed && direction === 'left') setDeckVotePreview(card, -1);
    else setDeckVotePreview(card, 0);
    card.style.setProperty('--deck-drag-progress', String(progress));
    card.style.transform = `translate3d(${x}px, ${displayedY}px, ${opening ? 22 : -Math.min(34, Math.abs(x) * .08)}px) rotateX(${Math.max(-8, Math.min(8, -y / 34))}deg) rotateY(${Math.max(-9, Math.min(9, x / 34))}deg) rotateZ(${x / 24}deg)`;
}

function clearDeckDragState(card) {
    if (!card) return;
    delete card.dataset.deckDirection;
    delete card.dataset.deckArmed;
    card.style.removeProperty('--deck-drag-progress');
    clearDeckVotePreview(card);
    card.style.transform = '';
}


function animateDeckReturn(card, dragState = {}) {
    if (!card) return Promise.resolve();

    const {x = 0, y = 0} = dragState;
    const displayedY = getDeckDisplayedY(y);
    const fromTransform = card.style.transform
        || `translate3d(${x}px, ${displayedY}px, 0) rotateX(0deg) rotateY(0deg) rotateZ(${x / 24}deg)`;

    delete card.dataset.deckDirection;
    delete card.dataset.deckArmed;
    card.style.removeProperty('--deck-drag-progress');
    clearDeckVotePreview(card);

    return window.DeckReturnMotion.animateReturn(card, {
        x,
        y: displayedY,
        fromTransform,
        toTransform: deckRestTransform(0),
        clearTransform: true,
    });
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
    const targetPost = posts.find(post => String(post.id) === String(postId));
    const previous = targetPost ? {
        myVote: Number(targetPost.myVote || 0),
        positive: Number(targetPost.positive || 0),
        negative: Number(targetPost.negative || 0),
    } : null;

    if (targetPost && previous.myVote !== voteValue) {
        if (previous.myVote === 1) targetPost.positive = Math.max(0, previous.positive - 1);
        if (previous.myVote === -1) targetPost.negative = Math.max(0, previous.negative - 1);
        if (voteValue === 1) targetPost.positive = Number(targetPost.positive || 0) + 1;
        if (voteValue === -1) targetPost.negative = Number(targetPost.negative || 0) + 1;
        targetPost.myVote = voteValue;
    }

    return api(`/api/posts/${encodeURIComponent(postId)}/vote`, {
        method: 'POST',
        body: JSON.stringify({value: voteValue}),
    }).then(() => {
        toast(actionLabel);
    }).catch(error => {
        if (targetPost && previous) {
            targetPost.myVote = previous.myVote;
            targetPost.positive = previous.positive;
            targetPost.negative = previous.negative;
        }
        toast(error?.message || 'Não foi possível concluir a ação.');
    });
}

function animateDeckOpen(card, dragState) {
    const {x = 0, y = 0} = dragState || {};
    const href = card.querySelector('.murmur-text-link')?.href || '';
    const flying = createFlyingDeckCard(card);
    if (!flying) {
        if (href) window.location.assign(href);
        return Promise.resolve();
    }

    consumeDeckCard();
    const {clone, rect} = flying;
    const targetY = -Math.max(window.innerHeight * .95, rect.height * 1.25);
    const animation = clone.animate([
        {transform: 'translate3d(0,0,0) rotateX(4deg) rotateY(0deg) rotateZ(0deg)', opacity: 1, filter: 'blur(0px)'},
        {transform: `translate3d(${x * .18}px, ${targetY * .44}px, 70px) rotateX(9deg) rotateY(${x / 70}deg) rotateZ(${x / 55}deg)`, opacity: .98, filter: 'blur(0px)', offset: .46},
        {transform: `translate3d(${x * .08}px, ${targetY}px, -35px) rotateX(14deg) rotateY(0deg) rotateZ(0deg)`, opacity: 0, filter: 'blur(1.2px)'},
    ], {duration: 920, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards'});

    return animation.finished.catch(() => {}).then(() => {
        removeFlyingDeckCard(clone);
        if (href) window.location.assign(href);
    });
}

function animateDeckThrow(card, dragState, direction) {
    const {x = 0, y = 0, history = []} = dragState || {};
    const {vx, vy} = measureDeckVelocity(history);
    const speed = Math.max(.35, Math.min(2.2, Math.abs(vx)));
    const flying = createFlyingDeckCard(card);
    const postId = card.dataset.deckPostId || card.querySelector('[data-post-id]')?.dataset.postId || '';
    if (!flying) {
        consumeDeckCard();
        void applyDeckAction(direction, postId);
        return Promise.resolve();
    }

    consumeDeckCard();
    const {clone, rect} = flying;
    const travel = Math.max(window.innerWidth * 1.2, rect.width * 1.65);
    const targetX = direction * travel;
    const windLift = Math.max(-180, Math.min(180, (vy * 165) + (y * .14)));
    const targetRotateZ = direction * (24 + speed * 10) + (vy * 5);
    const targetRotateY = direction * (24 + speed * 8);
    const targetRotateX = Math.max(-20, Math.min(20, -vy * 10));
    const duration = Math.round(Math.max(1450, Math.min(2150, 2020 - speed * 200)));

    const p1x = targetX * .18;
    const p2x = targetX * .48;
    const p3x = targetX * .76;
    const p1y = windLift * .08 - 14;
    const p2y = windLift * .34 + 10;
    const p3y = windLift * .70 - 8;

    const animation = clone.animate([
        {transform: 'translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)', opacity: 1, filter: 'blur(0px)', offset: 0},
        {transform: `translate3d(${p1x}px, ${p1y}px, 30px) rotateX(-3deg) rotateY(${direction * 9}deg) rotateZ(${direction * 6}deg)`, opacity: 1, filter: 'blur(0px)', offset: .24},
        {transform: `translate3d(${p2x}px, ${p2y}px, 8px) rotateX(${targetRotateX * .55}deg) rotateY(${targetRotateY * .62}deg) rotateZ(${targetRotateZ * .52}deg)`, opacity: .96, filter: 'blur(.2px)', offset: .54},
        {transform: `translate3d(${p3x}px, ${p3y}px, -18px) rotateX(${targetRotateX * .82}deg) rotateY(${targetRotateY * .86}deg) rotateZ(${targetRotateZ * .82}deg)`, opacity: .72, filter: 'blur(.7px)', offset: .80},
        {transform: `translate3d(${targetX}px, ${windLift}px, -75px) rotateX(${targetRotateX}deg) rotateY(${targetRotateY}deg) rotateZ(${targetRotateZ}deg)`, opacity: 0, filter: 'blur(1.6px)', offset: 1},
    ], {duration, easing: 'cubic-bezier(.18, .52, .2, 1)', fill: 'forwards'});

    void applyDeckAction(direction, postId);
    return animation.finished.catch(() => {}).then(() => removeFlyingDeckCard(clone));
}

function bindCardDeck() {
    const deck = $('[data-feed-deck]');
    if (!deck || deck.dataset.deckBound === 'true') return;
    deck.dataset.deckBound = 'true';

    deck.addEventListener('click', event => {
        const restartButton = event.target.closest('[data-deck-restart]');
        if (!restartButton) return;
        restartButton.disabled = true;
        resetDeckSession(feedBuckets.all, {includeDecided: true});
        Promise.resolve(loadFeed(true)).then(() => {
            resetDeckSession(feedBuckets.all, {includeDecided: true});
        }).catch(error => {
            toast(error?.message || 'Não foi possível reiniciar os murmúrios.');
            resetDeckSession(feedBuckets.all, {includeDecided: true});
        });
    });

    deck.addEventListener('pointerdown', event => {
        const card = event.target.closest('[data-deck-card=""][data-deck-index="0"]');
        if (!card || card.classList.contains('is-returning') || event.button !== 0 || event.target.closest('button, input, textarea, select, form')) return;
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
        const {card, x, y} = dragState;
        deckDragging = null;
        card.classList.remove('is-dragging');
        card.releasePointerCapture?.(event.pointerId);

        const openMessage = y <= -DECK_OPEN_THRESHOLD && Math.abs(y) > Math.abs(x) * 1.08;
        if (openMessage) {
            deckSuppressClickUntil = Date.now() + DECK_NEXT_CARD_READY_MS;
            void animateDeckOpen(card, dragState);
            return;
        }

        if (Math.abs(x) >= DECK_SWIPE_THRESHOLD) {
            deckSuppressClickUntil = Date.now() + DECK_NEXT_CARD_READY_MS;
            void animateDeckThrow(card, dragState, x < 0 ? -1 : 1);
            return;
        }

        deckSuppressClickUntil = Date.now() + 120;
        void animateDeckReturn(card, dragState);
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
        deckSuppressClickUntil = Date.now() + DECK_NEXT_CARD_READY_MS;
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
