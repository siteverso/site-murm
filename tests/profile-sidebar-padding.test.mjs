import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const accountCss = await readFile(new URL('../src/styles/pages/account.css', import.meta.url), 'utf8');
const profileCss = await readFile(new URL('../src/styles/pages/profile.css', import.meta.url), 'utf8');

test('profile lateral mantém margens visuais simétricas', () => {
  assert.match(accountCss, /\.profile-card\s*\{[^}]*padding:\s*24px;/s);
  assert.match(accountCss, /\.profile-card\s*\{[^}]*scrollbar-gutter:\s*auto;/s);
  assert.match(profileCss, /\.profile-direct-button\s*\{[^}]*top:\s*22px;[^}]*right:\s*22px;/s);
});
