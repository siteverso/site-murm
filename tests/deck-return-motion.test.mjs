import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const motion = fs.readFileSync('public/js/feed/deck-return-motion.js', 'utf8');
const deck = fs.readFileSync('public/js/feed/card-deck.js', 'utf8');
const page = fs.readFileSync('src/pages/teste-retorno-baralho.astro', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');

test('return motion stays decoupled and reusable', () => {
  assert.match(motion, /global\.DeckReturnMotion/);
  assert.match(motion, /animateReturn/);
  assert.match(motion, /buildReturnKeyframes/);
  assert.match(motion, /resolveOptions/);
  assert.match(app, /\/js\/feed\/deck-return-motion\.js/);
  assert.match(deck, /window\.DeckReturnMotion\.animateReturn/);
});

test('return motion exposes physical parameters and uses the same DOM node', () => {
  assert.match(motion, /velocityX/);
  assert.match(motion, /accelerationX/);
  assert.match(motion, /directionDeg/);
  assert.match(motion, /angularVelocity/);
  assert.match(motion, /overshoot/);
  assert.match(motion, /damping/);
  assert.match(motion, /element\.animate\(/);
  assert.doesNotMatch(motion, /cloneNode|replaceWith|innerHTML/);
  assert.match(motion, /await animation\.finished/);
});

test('isolated test page exposes full physics control panel', () => {
  assert.match(page, /Laboratório físico do retorno/);
  assert.match(page, /name="velocityX"/);
  assert.match(page, /name="accelerationY"/);
  assert.match(page, /name="directionDeg"/);
  assert.match(page, /name="rotateX"/);
  assert.match(page, /name="rotateY"/);
  assert.match(page, /name="rotateZ"/);
  assert.match(page, /name="angularVelocity"/);
  assert.match(page, /name="overshoot"/);
  assert.match(page, /name="damping"/);
  assert.match(page, /data-json/);
  assert.match(page, /mesmo nó/);
});
