import test from 'node:test';
import assert from 'node:assert/strict';
import { readAppSource } from './js-source-test-utils.mjs';

const app = await readAppSource();

test('pagina de respostas atualiza apenas a thread afetada sem refresh total', () => {
  assert.match(app, /async function refreshReplyHistoryPage\(affectedPostId = ''\)/);
  assert.match(app, /const currentGroup = affectedCard\?\.closest\('\[data-reply-history-root\]'\)/);
  assert.match(app, /const nextGroup = nextGroups\.find/);
  assert.match(app, /currentGroup\.outerHTML = renderReplyHistoryGroup\(nextGroup\)/);
  assert.match(app, /window\.scrollBy\(0, nextAnchor\.getBoundingClientRect\(\)\.top - anchorTop\)/);
  assert.doesNotMatch(app, /window\.location\.reload\(\)/);
});
