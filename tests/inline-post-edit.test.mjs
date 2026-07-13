import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const userSource = fs.readFileSync(new URL('../public/js/user/user.js', import.meta.url), 'utf8');
const interactionsSource = [
  '../public/js/feed/inline-post-editor.js',
  '../public/js/feed/feed-interactions.js',
].map(path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const runtimeSource = fs.readFileSync(new URL('../public/js/core/runtime.js', import.meta.url), 'utf8');
const apiSource = fs.readFileSync(new URL('../src/pages/api/posts/[id]/index.ts', import.meta.url), 'utf8');
const repositorySource = fs.readFileSync(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8');

 test('owner receives edit icon before delete icon', () => {
  assert.match(runtimeSource, /edit:\s*`/);
  assert.match(userSource, /murmur-head-actions\">\$\{editButton\}\$\{deleteButton\}/);
  assert.match(userSource, /data-edit-post=/);
});

test('post editing is inline and persists through owner-checked endpoint', () => {
  assert.match(interactionsSource, /data-inline-edit-form/);
  assert.match(interactionsSource, /method: 'PUT'/);
  assert.match(apiSource, /export async function PUT/);
  assert.match(repositorySource, /AND user_id = :user_id/);
  assert.match(repositorySource, /SET contents = :contents/);
});
