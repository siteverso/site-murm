import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/js/posts/posts-and-replies.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/components/murmur-card.css', import.meta.url), 'utf8');

test('card rendered from backend state keeps actions visible after reload', () => {
  assert.match(source, /const hasPersistentAction = post\.myVote === 1 \|\| post\.myVote === -1 \|\| Boolean\(post\.hasMyReply\);/);
  assert.match(source, /\$\{hasPersistentAction \? ' actions-pinned' : ''\}/);
});

test('pinned cards bypass hover-only action hiding', () => {
  assert.match(css, /\.murmur-card\.actions-pinned \.murmur-actions\s*\{/);
  assert.match(css, /opacity:\s*1;/);
  assert.match(css, /pointer-events:\s*auto;/);
});

test('cards without persisted interaction remain hover-driven', () => {
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /\.murmur-actions\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?pointer-events:\s*none;/);
});
