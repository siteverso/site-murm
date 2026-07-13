import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const profileSource = readFileSync(new URL('../src/pages/perfil/[username].astro', import.meta.url), 'utf8');
const boardSource = readFileSync(new URL('../src/components/FeedBoard.astro', import.meta.url), 'utf8');

test('perfil próprio reutiliza o FeedBoard compartilhado sem formulário paralelo', () => {
  assert.match(profileSource, /import FeedBoard from '\.\.\/\.\.\/components\/FeedBoard\.astro'/);
  assert.match(profileSource, /<FeedBoard profileUsername=\{profile\.username\}/);
  assert.doesNotMatch(profileSource, /<form[^>]+data-composer/);
  assert.match(boardSource, /data-feed-board/);
});
