import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../public/js/feed/feed-interactions.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/styles/components/modal.css', import.meta.url), 'utf8');

test('deleting the open thread redirects instead of refreshing a deleted root', () => {
  assert.match(source, /currentThreadId === postId/);
  assert.match(source, /location\.assign\('\/'\)/);
});

test('delete confirmation restores the button on API failure', () => {
  assert.match(source, /target\.disabled = false/);
  assert.match(source, /Não foi possível apagar o murmúrio/);
});

test('delete button has explicit high-contrast danger styling', () => {
  assert.match(source, /class="button danger"/);
  assert.match(css, /\.confirm-delete-modal \.button\.danger/);
  assert.match(css, /color: #fff/);
});
