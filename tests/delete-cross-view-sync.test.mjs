import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const runtime = readFileSync(new URL('../public/js/core/runtime.js', import.meta.url), 'utf8');
const interactions = readFileSync(new URL('../public/js/feed/feed-interactions.js', import.meta.url), 'utf8');

test('deletion publishes a specific event through BroadcastChannel and storage fallback', () => {
  assert.match(runtime, /function announcePostDeleted\(postId\)/);
  assert.match(runtime, /type: 'post-deleted'/);
  assert.match(runtime, /localStorage\.setItem\(FEED_SYNC_STORAGE_KEY/);
});

test('all deletion entry points reuse the same synchronization contract', () => {
  assert.match(interactions, /announcePostDeleted\(target\.dataset\.confirmDeleteReply\)/);
  assert.match(interactions, /announcePostDeleted\(replyId\)/);
  assert.match(interactions, /announcePostDeleted\(postId\)/);
});

test('deleted posts and descendants are removed from local state before refresh', () => {
  assert.match(runtime, /function removeDeletedPostFromLocalState\(postId\)/);
  assert.match(runtime, /removedIds\.has\(String\(post\.parentPostId\)\)/);
  assert.match(runtime, /posts = posts\.filter/);
});

test('thread page redirects only when its own root was deleted and otherwise refreshes children', () => {
  assert.match(runtime, /currentThreadId === deletedId[\s\S]*location\.assign\('\/'\)/);
  assert.match(runtime, /refreshReplyHistoryPage\(deletedId\)/);
  assert.match(runtime, /await loadFeed\(true\)/);
});
