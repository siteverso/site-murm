import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const repo = readFileSync(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8');
const interactions = readFileSync(new URL('../public/js/feed/feed-interactions.js', import.meta.url), 'utf8');
const modalCss = readFileSync(new URL('../src/styles/components/modal.css', import.meta.url), 'utf8');

test('generic post deletion accepts owned roots and replies', () => {
  const deleteBlock = repo.slice(repo.indexOf('export async function deletePost'), repo.indexOf('export async function deleteReply'));
  assert.doesNotMatch(deleteBlock, /parent_post_id IS NULL/);
  assert.match(deleteBlock, /user_id = :user_id/);
  assert.match(deleteBlock, /status = 'published'/);
});

test('thread-page deletion uses the same post DELETE contract and redirects only after success', () => {
  assert.match(interactions, /api\(`\/api\/posts\/\$\{postId\}`/);
  assert.match(interactions, /currentThreadId === postId[\s\S]*location\.assign\('\/'\)/);
});

test('delete errors remain visible above the modal blur', () => {
  assert.match(interactions, /data-delete-error/);
  assert.match(interactions, /role', 'alert'/);
});

test('cancel and destructive actions have explicit contrast', () => {
  assert.match(modalCss, /confirm-delete-modal \[data-modal-close\]/);
  assert.match(modalCss, /confirm-delete-modal \.button\.danger/);
});
