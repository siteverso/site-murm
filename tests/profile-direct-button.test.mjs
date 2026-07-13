import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('perfil público oferece bilhete no mesmo padrão circular dos cards', async () => {
  const sidebar = await readFile(new URL('../src/components/ProfileSidebar.astro', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/pages/perfil/[username].astro', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/styles/pages/profile.css', import.meta.url), 'utf8');

  assert.match(sidebar, /showDirectAction = false/);
  assert.match(sidebar, /direct-card-button profile-direct-button/);
  assert.match(sidebar, /data-direct-user=\{profile\?\.id\}/);
  assert.match(page, /showDirectAction=\{!isOwnProfile\}/);
  assert.match(css, /\.profile-direct-button \{[\s\S]*position: absolute;[\s\S]*top: 22px;[\s\S]*right: 22px;/);
});
