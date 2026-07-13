import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const renderer = fs.readFileSync(new URL('../public/js/feed/feed-renderer.js', import.meta.url), 'utf8');
const controller = fs.readFileSync(new URL('../public/js/feed/reply-thread-controller.js', import.meta.url), 'utf8');

test('thread page opens only the parent reply form after rendering', () => {
  assert.match(renderer, /const threadParentId = board\?\.dataset\.parentId \|\| ''/);
  assert.match(renderer, /querySelectorAll\(`\[data-post-id="\$\{CSS\.escape\(String\(threadParentId\)\)\}"\]`\)/);
  assert.match(renderer, /openReplyForm\(card, \{focus: false\}\)/);
});

test('shared reply form opener supports opening without stealing focus', () => {
  assert.match(controller, /function openReplyForm\(card, \{toggle = false, focus = true\} = \{\}\)/);
  assert.match(controller, /if \(focus && form\.classList\.contains\('open'\)\) focusReplyInput\(form\)/);
});
