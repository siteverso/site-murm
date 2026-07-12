import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const themeCodes = ['pearl', 'graphite', 'ocean', 'forest', 'sunset', 'rose', 'purple'];

test('theme API validates and persists a supported theme code', async () => {
  const source = await read('src/pages/api/auth/theme.ts');
  assert.match(source, /THEME_CODES\.includes\(themeCode\)/);
  assert.match(source, /UPDATE murm_user[\s\S]*theme_code = :theme_code/);
  assert.match(source, /murmurinho-theme/);
});

test('theme picker exposes seven visual themes and saves immediately', async () => {
  const source = await read('public/js/ui/ui.js');
  for (const code of themeCodes) assert.match(source, new RegExp(`code: '${code}'`));
  assert.match(source, /api\('\/api\/auth\/theme'/);
  const userSource = await read('public/js/user/user.js');
  assert.match(userSource, /applyTheme\(user\.themeCode\)/);
});

test('initial theme bootstrap accepts every current theme', async () => {
  const source = await read('src/layouts/AppLayout.astro');
  for (const code of themeCodes) assert.match(source, new RegExp(`'${code}'`));
});

test('incremental Oracle patches preserve legacy migration and allow seven themes', async () => {
  const legacyPatch = await read('murm-oracle/database/patches/20260713-0035-expand-user-themes.sql');
  assert.match(legacyPatch, /WHEN 'dark' THEN 'graphite'/);
  assert.match(legacyPatch, /WHEN 'light' THEN 'pearl'/);
  const patch = await read('murm-oracle/database/patches/20260713-0115-add-rose-purple-themes.sql');
  assert.match(patch, /CHECK \(theme_code IN \('pearl', 'graphite', 'ocean', 'forest', 'sunset', 'rose', 'purple'\)\)/);
});
