import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('conta oferece upload de avatar com formatos e limite indicados', async () => {
  const account = await read('src/pages/conta.astro');
  const sidebar = await read('src/components/ProfileSidebar.astro');
  assert.match(account, /<ProfileSidebar dynamic editableAvatar/);
  assert.match(sidebar, /data-avatar-form/);
  assert.match(sidebar, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(sidebar, /até 3 MB/);
});

test('upload valida imagem e salva em BLOB', async () => {
  const endpoint = await read('src/pages/api/auth/avatar.ts');
  assert.match(endpoint, /MAX_AVATAR_BYTES = 3 \* 1024 \* 1024/);
  assert.match(endpoint, /hasValidSignature/);
  assert.match(endpoint, /avatar_image = :avatar_image/);
});

test('avatar público é servido com proteção de tipo', async () => {
  const endpoint = await read('src/pages/api/users/[id]/avatar.ts');
  assert.match(endpoint, /X-Content-Type-Options/);
  assert.match(endpoint, /fetchInfo/);
});

test('patch de avatar é incremental', async () => {
  const patch = await read('murm-oracle/database/patches/20260712-0055-add-profile-avatar-image.sql');
  assert.match(patch, /^ALTER TABLE murm_user ADD/);
  assert.doesNotMatch(patch, /CREATE TABLE/i);
});


test('upload abre recorte circular com posicionamento e zoom antes de enviar', async () => {
  const app = await read('public/app.js');
  assert.match(app, /openAvatarCropper/);
  assert.match(app, /data-avatar-crop-stage/);
  assert.match(app, /data-avatar-crop-zoom/);
  assert.match(app, /canvas\.toBlob/);
  assert.match(app, /pointermove/);
  assert.match(app, /addEventListener\('wheel'/);
  assert.match(app, /passive: false/);
  assert.match(app, /event\.preventDefault\(\)/);
});


test('clicar na imagem da conta abre o seletor de foto existente', async () => {
  const account = await read('src/pages/conta.astro');
  const sidebar = await read('src/components/ProfileSidebar.astro');
  const app = await read('public/app.js');
  assert.match(account, /<ProfileSidebar dynamic editableAvatar/);
  assert.match(sidebar, /data-avatar-trigger/);
  assert.match(sidebar, /type="button"/);
  assert.match(app, /avatarTrigger\?\.addEventListener\('click'/);
  assert.match(app, /avatarInput\?\.click\(\)/);
});

test('foto do perfil público abre visualização ampliada simples', async () => {
  const sidebar = await read('src/components/ProfileSidebar.astro');
  const app = await read('public/app.js');
  const css = await read('src/styles/global.css');
  assert.match(sidebar, /data-profile-photo-open/);
  assert.match(sidebar, /data-profile-photo-viewer/);
  assert.match(sidebar, /data-profile-photo-large/);
  assert.match(app, /bindProfilePhotoViewer/);
  assert.match(app, /event\.key === 'Escape'/);
  assert.match(css, /profile-photo-viewer__backdrop/);
  assert.match(css, /border: 1px solid/);
  assert.match(css, /background: rgb\(0 0 0 \/ 78%\)/);
});
