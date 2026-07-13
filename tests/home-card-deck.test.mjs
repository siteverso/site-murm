import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/components/FeedBoard.astro', 'utf8');
const interactions = fs.readFileSync('public/js/feed/feed-interactions.js', 'utf8');
const renderer = fs.readFileSync('public/js/feed/feed-renderer.js', 'utf8');
const deck = fs.readFileSync('public/js/feed/card-deck.js', 'utf8');
const css = fs.readFileSync('src/styles/pages/home.css', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');

test('deck uses 100 static cards without auto refresh and throws cards using drag velocity', () => {
  assert.match(deck, /DECK_MAX_CARDS = 100/);
  assert.match(deck, /slice\(0, DECK_MAX_CARDS\)/);
  assert.match(renderer, /if \(\$\('\[data-feed-deck\]'\)\) \{/);
  assert.match(deck, /measureDeckVelocity/);
  assert.match(deck, /animateDeckThrow/);
  assert.match(deck, /targetRotateZ/);
  assert.match(deck, /rotateY/);
  assert.match(deck, /duration = Math\.round\(Math\.max\(1450/);
  assert.match(page, /100 murmúrios carregados sem atualização automática/);
});

test('deck keeps visible action glow and commits vote after threshold release', () => {
  assert.match(deck, /DECK_SWIPE_THRESHOLD/);
  assert.match(deck, /applyDeckAction/);
  assert.match(deck, /value: voteValue/);
  assert.match(css, /data-deck-armed="true"/);
  assert.match(css, /0 0 56px/);
  assert.match(css, /deck-overlay/);
});

test('deck promotes the next cards fluidly and opens the message on upward drag', () => {
  assert.match(deck, /animateFreshDeck/);
  assert.match(deck, /createFlyingDeckCard/);
  assert.match(deck, /DECK_NEXT_CARD_READY_MS = 70/);
  assert.match(deck, /consumeDeckCard\(\);/);
  assert.match(deck, /DECK_OPEN_THRESHOLD/);
  assert.match(deck, /animateDeckOpen/);
  assert.match(deck, /window\.location\.assign\(href\)/);
  assert.match(css, /data-deck-direction="up"/);
  assert.match(css, /is-returning/);
  assert.match(page, /para cima para abrir o murmúrio/);
});


test('deck returns unconfirmed cards smoothly to the pile', () => {
  assert.match(deck, /animateDeckReturn/);
  assert.match(deck, /cubic-bezier\(\.16, 1, \.3, 1\)/);
  assert.match(deck, /deckRestTransform\(0\)/);
  assert.match(deck, /deckSuppressClickUntil = Date\.now\(\) \+ 120/);
});
