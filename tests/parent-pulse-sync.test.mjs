import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../public/js/feed/inline-post-editor.js', import.meta.url), 'utf8');

test('optimistic vote synchronizes every duplicate card for the same parent post', () => {
  assert.match(source, /document\.querySelectorAll\(`\[data-post-id=/);
  assert.match(source, /applyVoteStateToCard\(postCard, selectedValue, previousValue\)/);
});

test('optimistic vote updates counts and murmur pulse immediately', () => {
  assert.match(source, /count = Math\.max\(0, count - 1\)/);
  assert.match(source, /if \(nextValue === buttonValue\) count \+= 1/);
  assert.match(source, /updateCardPulse\(card\)/);
  assert.match(source, /pulse\.dataset\.pulseValue = String\(value\)/);
});


test('vote updates only the numeric count and never replaces the action icon', () => {
  assert.match(source, /querySelector\(':scope > \.action-count'\)/);
  assert.doesNotMatch(source, /button\.querySelector\('span'\)/);
});
