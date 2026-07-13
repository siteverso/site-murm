import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/ProfileSidebar.astro', import.meta.url), 'utf8');

test('profile sidebar username links to the displayed profile', () => {
  assert.match(source, /const profileUrl = `\/perfil\/\$\{encodeURIComponent\(username\)\}`/);
  assert.match(source, /class="public-profile-username-link" href=\{profileUrl\}/);
});
