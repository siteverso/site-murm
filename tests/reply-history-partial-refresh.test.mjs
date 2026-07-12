import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('pagina de respostas atualiza apenas a thread afetada sem refresh total', () => {
  assert.match(app, /async function refreshReplyHistoryPage\(affectedPostId = ''\)/);
  assert.match(app, /const currentGroup = affectedCard\?\.closest\('\[data-reply-history-root\]'\)/);
  assert.match(app, /const nextGroup = nextGroups\.find/);
  assert.match(app, /currentGroup\.outerHTML = renderReplyHistoryGroup\(nextGroup\)/);
  assert.match(app, /window\.scrollBy\(0, nextAnchor\.getBoundingClientRect\(\)\.top - anchorTop\)/);
  assert.doesNotMatch(app, /window\.location\.reload\(\)/);
});
