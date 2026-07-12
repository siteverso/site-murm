import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('theme API validates and persists one of five theme codes', async () => {
  const source = await read('src/pages/api/auth/theme.ts');
  assert.match(source, /THEME_CODES\.includes\(themeCode\)/);
  assert.match(source, /UPDATE murm_user[\s\S]*theme_code = :theme_code/);
  assert.match(source, /murmurinho-theme/);
});

test('theme picker exposes exactly five visual themes and saves immediately', async () => {
  const source = await read('public/js/ui/ui.js');
  for (const code of ['pearl', 'graphite', 'ocean', 'forest', 'sunset']) {
    assert.match(source, new RegExp(`code: '${code}'`));
  }
  assert.match(source, /api\('\/api\/auth\/theme'/);
  const userSource = await read('public/js/user/user.js');
  assert.match(userSource, /applyTheme\(user\.themeCode\)/);
});

test('incremental Oracle patch migrates legacy values and constrains five themes', async () => {
  const patch = await read('murm-oracle/database/patches/20260713-0035-expand-user-themes.sql');
  assert.match(patch, /WHEN 'dark' THEN 'graphite'/);
  assert.match(patch, /WHEN 'light' THEN 'pearl'/);
  assert.match(patch, /CHECK \(theme_code IN \('pearl', 'graphite', 'ocean', 'forest', 'sunset'\)\)/);
});
