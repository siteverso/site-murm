import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const controller = fs.readFileSync(new URL('../public/js/feed/published-reply-controller.js', import.meta.url), 'utf8');
const interactions = fs.readFileSync(new URL('../public/js/feed/feed-interactions.js', import.meta.url), 'utf8');

test('reply component accepts a render target parameter without duplicating persistence flow', () => {
  assert.match(controller, /createOptimisticReply\(parentId, text, isPrivate = false, renderTarget = 'inline'\)/);
  assert.match(controller, /insertOptimisticReply\(reply, parentId, renderTarget\)/);
});

test('thread parent replies render in children while other contexts remain inline', () => {
  assert.match(interactions, /replyRenderTarget = threadBoard && sameId\(threadBoard\.dataset\.parentId, parentId\) \? 'children' : 'inline'/);
  assert.match(interactions, /createOptimisticReply\(parentId, text, isPrivate, replyRenderTarget\)/);
});

test('children target reuses the normal feed renderer', () => {
  assert.match(controller, /renderTarget === 'children'/);
  assert.match(controller, /renderNonDeckFeedsFromState\(\)/);
  assert.match(controller, /renderDeck\(feedBuckets\.all\)/);
});
