import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/index.astro', 'utf8');
const interactions = fs.readFileSync('public/js/feed/feed-interactions.js', 'utf8');
const renderer = fs.readFileSync('public/js/feed/feed-renderer.js', 'utf8');
const deck = fs.readFileSync('public/js/feed/card-deck.js', 'utf8');
const css = fs.readFileSync('src/styles/pages/home.css', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');

test('home offers isolated 3D deck mode', () => {
  assert.match(page, /data-feed-view="deck"/);
  assert.match(page, /data-feed-view-panel="deck"/);
  assert.match(page, /data-feed-deck/);
  assert.match(interactions, /'deck'/);
  assert.match(renderer, /renderDeck\(feedBuckets\.all\)/);
  assert.match(app, /\/js\/feed\/card-deck\.js/);
});

test('deck removes clipper and opens a full-width stage for the throw animation', () => {
  assert.match(interactions, /deck-stage-active/);
  assert.match(css, /\.network-board-page\.deck-stage-active \.deck-view/);
  assert.match(css, /overflow:\s*visible/);
  assert.match(css, /width:\s*calc\(100vw - max\(20px, var\(--page-gutter\)\)\)/);
});

test('deck uses 100 static cards without auto refresh and throws cards using drag velocity', () => {
  assert.match(deck, /DECK_MAX_CARDS = 100/);
  assert.match(deck, /slice\(0, DECK_MAX_CARDS\)/);
  assert.match(renderer, /if \(\$\('\[data-feed-deck\]'\)\) \{/);
  assert.match(deck, /measureDeckVelocity/);
  assert.match(deck, /animateDeckThrow/);
  assert.match(deck, /targetRotation/);
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
