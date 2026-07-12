import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('graphite is the first theme and deterministic client fallback', async () => {
  const ui = await read('public/js/ui/ui.js');
  const layout = await read('src/layouts/AppLayout.astro');
  assert.ok(ui.indexOf("code: 'graphite'") < ui.indexOf("code: 'pearl'"));
  assert.match(ui, /return 'graphite';/);
  assert.match(layout, /const allowed = \['graphite', 'pearl', 'ocean', 'forest', 'sunset', 'rose', 'purple'\]/);
  assert.match(layout, /allowed\.includes\(candidate\) \? candidate : 'graphite'/);
});

test('server and database use graphite for users without a saved choice', async () => {
  const theme = await read('src/lib/theme.ts');
  const session = await read('src/lib/server/session.ts');
  const patch = await read('murm-oracle/database/patches/20260713-0200-default-graphite-theme.sql');
  assert.match(theme, /return 'graphite';/);
  assert.match(session, /NVL\(u\.theme_code, 'graphite'\)/);
  assert.match(patch, /DEFAULT 'graphite'/);
  assert.match(patch, /theme_code IS NULL[\s\S]*'auto'/);
});
