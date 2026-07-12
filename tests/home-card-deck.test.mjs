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

test('deck supports tinder-like swipe actions and visible threshold glow', () => {
  assert.match(deck, /DECK_SWIPE_THRESHOLD/);
  assert.match(deck, /deckDirection/);
  assert.match(deck, /deckArmed/);
  assert.match(deck, /applyDeckAction/);
  assert.match(deck, /value: voteValue/);
  assert.match(css, /deck-overlay/);
  assert.match(css, /data-deck-armed="true"/);
  assert.match(css, /box-shadow: 0 0 0 1px/);
});

test('deck keeps a rotating buffered queue up to 100 items and refills while swiping', () => {
  assert.match(deck, /DECK_BUFFER_LIMIT = 100/);
  assert.match(deck, /DECK_REPLENISH_THRESHOLD/);
  assert.match(deck, /refillDeckQueue/);
  assert.match(deck, /consumeDeckCard/);
  assert.match(deck, /shuffleDeckIds/);
  assert.match(page, /direita para Ecoar, esquerda para Silenciar/);
});
