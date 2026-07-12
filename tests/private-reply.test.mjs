import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderer = readFileSync(new URL('../public/js/posts/posts-and-replies.js', import.meta.url), 'utf8');
const interactions = readFileSync(new URL('../public/js/feed/feed-interactions.js', import.meta.url), 'utf8');
const repository = readFileSync(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8');

test('renders subtle private reply LED control', () => {
  assert.match(renderer, /reply-private-toggle/);
  assert.match(renderer, /name="private"/);
  assert.match(renderer, /reply-private-badge/);
});

test('submits and persists private replies', () => {
  assert.match(interactions, /private: isPrivate/);
  assert.match(repository, /visibility_code/);
  assert.match(repository, /parent_post\.user_id = :current_user_id/);
});
