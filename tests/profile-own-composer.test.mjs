import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const profileSource = readFileSync(new URL('../src/pages/perfil/[username].astro', import.meta.url), 'utf8');
const interactionsSource = readFileSync(new URL('../public/js/feed/feed-interactions.js', import.meta.url), 'utf8');

test('perfil próprio reutiliza o Composer sem duplicar formulário ou fluxo de publicação', () => {
  assert.match(profileSource, /import Composer from '\.\.\/\.\.\/components\/Composer\.astro'/);
  assert.match(profileSource, /isOwnProfile && !profilePostId && <div class=\"profile-own-composer\"><Composer \/><\/div>/);
  assert.match(interactionsSource, /form\.matches\('\[data-composer\], \[data-floating-composer\]'\)/);
  assert.match(interactionsSource, /await api\('\/api\/posts'/);
});

test('composer do perfil não aparece em perfis alheios nem na visualização isolada de um murmúrio', () => {
  assert.doesNotMatch(profileSource, /<Composer \/>(?!<\/div>)/);
  assert.match(profileSource, /isOwnProfile && !profilePostId/);
});
