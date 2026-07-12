import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('mantem cards ocultos expandidos após responder', () => {
  assert.match(appSource, /async function hydrateExpandedSpecificPosts\(rootId, basePosts\)/);
  assert.match(appSource, /const expandedIds = \[\.\.\.state\.expandedIds\]/);
  assert.match(appSource, /await api\(`\/api\/posts\/\$\{encodeURIComponent\(postId\)\}`\)/);
  assert.match(appSource, /await hydrateExpandedSpecificPosts\(profilePostId, data\.posts \|\| \[\]\)/);
});

test('não remove estado expandido ao atualizar dados completos da thread', () => {
  const hydrateStart = appSource.indexOf('async function hydrateExpandedSpecificPosts');
  const loadFeedStart = appSource.indexOf('async function loadFeed', hydrateStart);
  const hydrateSource = appSource.slice(hydrateStart, loadFeedStart);
  assert.doesNotMatch(hydrateSource, /expandedIds\.delete/);
  assert.match(hydrateSource, /byId\.set\(String\(post\.id\), post\)/);
});
